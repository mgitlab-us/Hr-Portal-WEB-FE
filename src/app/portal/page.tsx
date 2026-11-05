'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import {
  Clock,
  Coffee,
  CheckCircle2,
  AlertCircle,
  MapPin,
  TrendingUp,
  FileCheck,
  CalendarDays,
  Wallet,
  Loader2,
  RefreshCw,
  type LucideIcon,
} from 'lucide-react';

export type AttendanceStatus = 'IDLE' | 'PENDING' | 'ON_BREAK' | 'COMPLETE';

interface BreakSession {
  id: string;
  startTime: string;
  endTime?: string | null;
  durationMinutes?: number | null;
}

interface TodayRecord {
  id?: string;
  status: AttendanceStatus;
  checkinTime?: string | null;
  checkoutTime?: string | null;
  breakSessions?: BreakSession[];
  dailySummary?: {
    totalWorkMinutes?: number;
    totalBreakMinutes?: number;
  } | null;
  config?: {
    expectedCheckin?: string;
    expectedWorkMinutes?: number;
    breakMinutesAllocated?: number;
    totalShiftMinutes?: number;
    scheduleSource?: 'company' | 'department' | 'employee';
  };
}

const BREAK_LIMIT_MINUTES = 60;

// ── Per-status presentation (kept in one place so the JSX stays flat)
const STATUS_UI: Record<
  AttendanceStatus,
  {
    pill: string;
    pillClass: string;
    title: string;
    hint: string;
    Icon: LucideIcon;
    button: string;
    halo: string;
    ring: string;
  }
> = {
  IDLE: {
    pill: 'Not checked in',
    pillClass: 'bg-white/10 text-blue-100 ring-1 ring-white/20',
    title: 'Check in',
    hint: 'Tap to start',
    Icon: Clock,
    button: 'bg-blue-600 shadow-blue-600/30 hover:bg-blue-700',
    halo: 'bg-blue-50',
    ring: 'bg-blue-100/70',
  },
  PENDING: {
    pill: 'Checked in',
    pillClass: 'bg-sky-500 text-white',
    title: 'Check out',
    hint: 'Tap when leaving',
    Icon: Clock,
    button: 'bg-rose-600 shadow-rose-600/30 hover:bg-rose-700',
    halo: 'bg-rose-50',
    ring: 'bg-rose-100/70',
  },
  ON_BREAK: {
    pill: 'On break',
    pillClass: 'bg-amber-500 text-white',
    title: 'On break',
    hint: 'Resume from Break card',
    Icon: Coffee,
    button: 'bg-amber-500 shadow-amber-500/30',
    halo: 'bg-amber-50',
    ring: 'bg-amber-100/70',
  },
  COMPLETE: {
    pill: 'Shift complete',
    pillClass: 'bg-emerald-500 text-white',
    title: 'Shift done',
    hint: 'Recorded',
    Icon: CheckCircle2,
    button: 'bg-emerald-600 shadow-emerald-600/30',
    halo: 'bg-emerald-50',
    ring: 'bg-emerald-100/70',
  },
};

const SHORTCUTS: Array<{
  href: string;
  label: string;
  hint: string;
  Icon: LucideIcon;
  tone: string;
}> = [
  { href: '/portal/leaves', label: 'Apply for leave', hint: 'Check balance', Icon: CalendarDays, tone: 'bg-blue-50 text-blue-600' },
  { href: '/portal/corrections', label: 'Correction', hint: 'Missed punch', Icon: FileCheck, tone: 'bg-violet-50 text-violet-600' },
  { href: '/portal/payslips', label: 'My payslips', hint: 'Download PDF', Icon: Wallet, tone: 'bg-emerald-50 text-emerald-600' },
  { href: '/portal/attendance', label: 'My attendance', hint: 'Monthly logs', Icon: TrendingUp, tone: 'bg-amber-50 text-amber-600' },
];

function formatTime(isoString?: string | null) {
  if (!isoString) return '--:--';
  const d = new Date(isoString);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
}

// Compact shift time, e.g. "11:00 AM" -> "11 AM", "11:30 AM" -> "11:30 AM"
function formatShiftTime(date: Date) {
  return date
    .toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })
    .replace(':00', '');
}

function formatDuration(totalMinutes?: number | null) {
  if (!totalMinutes) return '--';
  return `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;
}

function getGreeting(date: Date) {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function extractErrorMessage(err: unknown, defaultMsg: string): string {
  const errorObj = err as { response?: { data?: { message?: string } }; message?: string };
  return errorObj?.response?.data?.message || errorObj?.message || defaultMsg;
}

function getEffectiveStatus(record: TodayRecord | null): AttendanceStatus {
  if (!record) return 'IDLE';
  if (record.checkoutTime) return 'COMPLETE';
  if (record.breakSessions?.some((session) => !session.endTime)) return 'ON_BREAK';
  if (record.checkinTime) return 'PENDING';
  return 'IDLE';
}

// ── Inline feedback banner
const NOTICE_TONES = {
  error: {
    wrapper: 'border-red-200 bg-red-50 text-red-800',
    icon: 'text-red-600',
    body: 'text-red-700',
    action: 'text-red-600 hover:text-red-800',
    Icon: AlertCircle,
  },
  success: {
    wrapper: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    icon: 'text-emerald-600',
    body: 'text-emerald-700',
    action: 'text-emerald-600 hover:text-emerald-800',
    Icon: CheckCircle2,
  },
} as const;

function Notice({
  tone,
  title,
  message,
  onDismiss,
}: {
  tone: keyof typeof NOTICE_TONES;
  title: string;
  message: string;
  onDismiss: () => void;
}) {
  const styles = NOTICE_TONES[tone];
  const Icon = styles.Icon;

  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`flex items-start gap-3 rounded-xl border p-3.5 text-sm sm:p-4 ${styles.wrapper}`}
    >
      <Icon size={18} className={`mt-0.5 flex-shrink-0 ${styles.icon}`} />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{title}</p>
        <p className={`mt-0.5 text-[13px] leading-snug ${styles.body}`}>{message}</p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className={`flex-shrink-0 text-xs font-semibold transition-colors ${styles.action}`}
      >
        Dismiss
      </button>
    </div>
  );
}

export default function EmployeePortalHomePage() {
  const { user } = useAuthStore();
  const [record, setRecord] = useState<TodayRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [breakLoading, setBreakLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [nowTime, setNowTime] = useState(new Date());

  // Clock tick every second
  useEffect(() => {
    const timer = setInterval(() => setNowTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch today attendance
  const fetchToday = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await api.get('/attendance/today');
      const payload = res.data?.record ?? res.data ?? null;
      setRecord(
        payload || {
          status: 'IDLE',
          config: {
            expectedCheckin: '12:00',
            expectedWorkMinutes: 480,
            breakMinutesAllocated: 60,
            totalShiftMinutes: 540,
          },
        }
      );
    } catch (err: unknown) {
      console.error('Failed to load today record:', err);
      // If 404 or empty, default to IDLE while preserving a valid shift window.
      setRecord({
        status: 'IDLE',
        config: {
          expectedCheckin: '12:00',
          expectedWorkMinutes: 480,
          breakMinutesAllocated: 60,
          totalShiftMinutes: 540,
        },
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchToday();
  }, [fetchToday]);

  // Derived metrics
  const activeBreak = useMemo(() => {
    return record?.breakSessions?.find((b) => !b.endTime) || null;
  }, [record]);

  // Active break live elapsed stopwatch
  const [activeBreakElapsed, setActiveBreakElapsed] = useState(0);

  useEffect(() => {
    if (!activeBreak?.startTime) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveBreakElapsed(0);
      return;
    }
    const updateElapsed = () => {
      const diff = Math.floor((Date.now() - new Date(activeBreak.startTime).getTime()) / 1000);
      setActiveBreakElapsed(Math.max(0, diff));
    };
    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [activeBreak]);

  const totalBreakSeconds = useMemo(() => {
    if (!record?.breakSessions) return 0;
    return record.breakSessions.reduce((sum, b) => {
      if (b.endTime) {
        const diff = Math.floor((new Date(b.endTime).getTime() - new Date(b.startTime).getTime()) / 1000);
        return sum + Math.max(0, diff);
      }
      return sum;
    }, 0);
  }, [record]);

  // Shift timings
  const shiftDisplay = useMemo(() => {
    const expectedCheckinStr = record?.config?.expectedCheckin || '12:00';
    const expectedWorkMinutes = record?.config?.expectedWorkMinutes ?? 480;
    const breakMinutesAllocated = record?.config?.breakMinutesAllocated ?? 60;
    const totalShiftMinutes =
      record?.config?.totalShiftMinutes ?? expectedWorkMinutes + breakMinutesAllocated;
    const [h, m] = expectedCheckinStr.split(':').map(Number);
    const start = new Date();
    start.setHours(Number.isFinite(h) ? h : 12, Number.isFinite(m) ? m : 0, 0, 0);

    const end = new Date(start.getTime() + (Number.isFinite(totalShiftMinutes) ? totalShiftMinutes : 540) * 60000);
    return {
      startFormatted: formatShiftTime(start),
      endFormatted: formatShiftTime(end),
    };
  }, [record]);

  // Helper to fetch geolocation
  const getCoordinates = (): Promise<{ lat: number; lng: number; accuracy?: number }> => {
    return new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) {
        reject(new Error('Geolocation is not supported by your browser.'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          });
        },
        (err) => {
          let msg = 'Failed to retrieve location.';
          if (err.code === 1) msg = 'Location access was denied. Please allow location in your browser settings to punch in/out.';
          else if (err.code === 2) msg = 'Location unavailable. Please check your network or GPS.';
          else if (err.code === 3) msg = 'Location request timed out. Please try again.';
          reject(new Error(msg));
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
      );
    });
  };

  // Check In / Check Out Handler
  const handlePunch = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setActionLoading(true);

    try {
      const coords = await getCoordinates();
      const currentStatus = getEffectiveStatus(record);

      if (currentStatus === 'IDLE') {
        await api.post('/attendance/checkin', {
          lat: coords.lat,
          lng: coords.lng,
          accuracy: coords.accuracy,
        });
        setSuccessMsg('Successfully checked in! Have a great workday.');
      } else if (currentStatus === 'PENDING') {
        await api.post('/attendance/checkout', {
          lat: coords.lat,
          lng: coords.lng,
          accuracy: coords.accuracy,
        });
        setSuccessMsg('Successfully checked out! Shift completed.');
      }

      await fetchToday();
    } catch (err: unknown) {
      console.error('Punch action failed:', err);
      setErrorMsg(extractErrorMessage(err, 'An error occurred during punch action.'));
    } finally {
      setActionLoading(false);
    }
  };

  // Break Handler
  const handleToggleBreak = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setBreakLoading(true);

    try {
      if (activeBreak) {
        await api.post('/attendance/breaks/end', {});
        setSuccessMsg('Break ended. Welcome back!');
      } else {
        await api.post('/attendance/breaks/start', {});
        setSuccessMsg('Break started. Enjoy your break!');
      }
      await fetchToday();
    } catch (err: unknown) {
      console.error('Break action failed:', err);
      setErrorMsg(extractErrorMessage(err, 'An error occurred during break action.'));
    } finally {
      setBreakLoading(false);
    }
  };

  const status = getEffectiveStatus(record);
  const ui = STATUS_UI[status];
  const StatusIcon = ui.Icon;

  // Format active break stopwatch
  const breakMinutes = Math.floor(activeBreakElapsed / 60);
  const breakSeconds = activeBreakElapsed % 60;
  const breakTimerString = `${String(breakMinutes).padStart(2, '0')}:${String(breakSeconds).padStart(2, '0')}`;

  const totalBreakSecondsSoFar = totalBreakSeconds + activeBreakElapsed;
  const totalBreakMinutesSoFar = Math.floor(totalBreakSecondsSoFar / 60);
  const breakUsagePct = Math.min(100, Math.round((totalBreakSecondsSoFar / (BREAK_LIMIT_MINUTES * 60)) * 100));
  const breakOverLimit = totalBreakMinutesSoFar >= BREAK_LIMIT_MINUTES;
  const scheduleSourceLabel =
    record?.config?.scheduleSource === 'department'
      ? 'Department shift'
      : record?.config?.scheduleSource === 'employee'
        ? 'Employee shift'
        : 'Company default';

  const firstName = user?.name?.split(' ')[0] || 'there';
  const punchDisabled = actionLoading || loading || status === 'ON_BREAK' || status === 'COMPLETE';

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* ── Welcome banner: greeting | time | shift | status
          Mobile: greeting + status on top, time + shift below */}
      <section className="rounded-2xl bg-[#0b1b4d] text-white shadow-sm ring-1 ring-white/5">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-5 p-4 sm:items-center sm:gap-x-4 sm:p-5 lg:grid-cols-[minmax(0,1.3fr)_auto_auto_auto] lg:gap-x-0 lg:gap-y-0 lg:px-6 lg:py-5">
          {/* Greeting + employee ID (wraps on mobile so the full ID stays visible) */}
          <div className="order-1 min-w-0 lg:pr-6">
            <p className="truncate text-sm text-blue-100/90 sm:text-[15px]">
              {getGreeting(nowTime)}, <span className="font-semibold text-white">{firstName}</span>
            </p>
            {user?.employeeCode && (
              <p className="mt-0.5 break-all text-xs leading-snug text-blue-200/80 sm:text-sm">
                ID {user.employeeCode}
              </p>
            )}
          </div>

          {/* Status pill (compact on mobile) */}
          <div className="order-2 justify-self-end lg:order-4 lg:border-l lg:border-white/15 lg:pl-6">
            <span
              className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-1 text-[10px] font-semibold shadow-sm sm:gap-2 sm:px-4 sm:py-2 sm:text-sm ${ui.pillClass}`}
            >
              <StatusIcon size={16} strokeWidth={2.25} className="h-3 w-3 flex-shrink-0 sm:h-4 sm:w-4" />
              {ui.pill}
            </span>
          </div>

          {/* Live time + date */}
          <div className="order-3 min-w-0 lg:order-2 lg:border-l lg:border-white/15 lg:px-8">
            <p className="text-2xl font-semibold tabular-nums tracking-tight sm:text-3xl">
              {nowTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
            </p>
            <p className="mt-0.5 text-xs text-blue-200/80 sm:text-sm">
              {nowTime.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          </div>

          {/* Shift window */}
          <div className="order-4 min-w-0 border-l border-white/15 pl-4 text-right lg:order-3 lg:px-8 lg:pl-8 lg:text-center">
            <p className="flex items-center justify-end gap-1.5 whitespace-nowrap text-base font-semibold sm:text-lg lg:justify-center">
              <Clock size={15} className="flex-shrink-0 text-blue-200" />
              <span>
                {shiftDisplay.startFormatted} – {shiftDisplay.endFormatted}
              </span>
            </p>
            <p className="mt-0.5 text-xs text-blue-200/80 sm:text-sm">{scheduleSourceLabel}</p>
          </div>
        </div>
      </section>

      {/* ── Alerts */}
      {errorMsg && (
        <Notice tone="error" title="Attendance alert" message={errorMsg} onDismiss={() => setErrorMsg('')} />
      )}
      {successMsg && (
        <Notice tone="success" title="Success" message={successMsg} onDismiss={() => setSuccessMsg('')} />
      )}

      {/* ── Main row */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-12 lg:items-start">
        {/* Punch terminal */}
        <section className="rounded-2xl border border-line bg-white p-5 shadow-xs sm:p-6 lg:col-span-7">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Punch terminal</h2>
            <button
              type="button"
              onClick={fetchToday}
              disabled={loading}
              className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-60"
              title="Refresh status"
              aria-label="Refresh status"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Circular punch button */}
          <div className="mt-2 flex justify-center">
            <div className="relative flex h-56 w-56 items-center justify-center sm:h-64 sm:w-64">
              <div className={`absolute inset-0 rounded-full transition-colors duration-500 ${ui.halo}`} />
              <div className={`absolute inset-6 rounded-full transition-colors duration-500 sm:inset-7 ${ui.ring}`} />

              <button
                type="button"
                disabled={punchDisabled}
                onClick={handlePunch}
                aria-label={ui.title}
                className={`relative z-10 flex h-36 w-36 flex-col items-center justify-center rounded-full text-white shadow-xl transition duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-300 active:scale-95 disabled:cursor-not-allowed disabled:active:scale-100 sm:h-40 sm:w-40 ${ui.button}`}
              >
                {actionLoading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 size={32} className="animate-spin" />
                    <span className="text-xs font-medium">Verifying GPS…</span>
                  </div>
                ) : (
                  <>
                    <StatusIcon size={32} strokeWidth={2} className="mb-1.5" />
                    <span className="text-lg font-semibold leading-tight tracking-tight">{ui.title}</span>
                    <span className="mt-0.5 px-3 text-center text-[11px] leading-tight text-white/80">{ui.hint}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Location note */}
          <p className="mx-auto mt-3 flex w-fit max-w-full items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
            <MapPin size={14} className="flex-shrink-0 text-blue-500" />
            <span>Your location is verified with GPS when you punch</span>
          </p>

          {/* Today's summary */}
          <dl className="mt-5 grid grid-cols-3 gap-2 border-t border-line pt-5 sm:gap-3">
            <div className="rounded-xl bg-slate-50 px-3 py-2.5 sm:px-4 sm:py-3">
              <dt className="text-xs text-slate-500">Check in</dt>
              <dd className="mt-0.5 text-sm font-semibold text-slate-900 sm:text-base">
                {formatTime(record?.checkinTime)}
              </dd>
            </div>
            <div className="rounded-xl bg-slate-50 px-3 py-2.5 sm:px-4 sm:py-3">
              <dt className="text-xs text-slate-500">Check out</dt>
              <dd className="mt-0.5 text-sm font-semibold text-slate-900 sm:text-base">
                {formatTime(record?.checkoutTime)}
              </dd>
            </div>
            <div className="rounded-xl bg-slate-50 px-3 py-2.5 sm:px-4 sm:py-3">
              <dt className="text-xs text-slate-500">Net work</dt>
              <dd className="mt-0.5 text-sm font-semibold text-blue-600 sm:text-base">
                {formatDuration(record?.dailySummary?.totalWorkMinutes)}
              </dd>
            </div>
          </dl>
        </section>

        {/* Right column: break + shortcuts (side by side on tablets, stacked on desktop) */}
        <div className="grid gap-4 sm:gap-6 md:grid-cols-2 md:items-start lg:col-span-5 lg:grid-cols-1">
          {/* Break management */}
          <section className="rounded-2xl border border-line bg-white p-5 shadow-xs sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                  <Coffee size={18} />
                </span>
                <h2 className="truncate text-base font-semibold text-slate-900">Break management</h2>
              </div>
            </div>

            {/* Usage meter */}
            <div className="mt-4">
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-slate-500">Break time used</span>
                <span className={`font-semibold ${breakOverLimit ? 'text-rose-600' : 'text-slate-700'}`}>
                  {totalBreakMinutesSoFar}m / {BREAK_LIMIT_MINUTES}m
                </span>
              </div>
              <div
                className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={BREAK_LIMIT_MINUTES}
                aria-valuenow={Math.min(totalBreakMinutesSoFar, BREAK_LIMIT_MINUTES)}
                aria-label="Break time used"
              >
                <div
                  className={`h-full rounded-full transition-all duration-500 ${breakOverLimit ? 'bg-rose-500' : 'bg-amber-500'}`}
                  style={{ width: `${breakUsagePct}%` }}
                />
              </div>
            </div>

            {activeBreak ? (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
                <p className="text-xs font-medium uppercase tracking-wider text-amber-700">Active break</p>
                <p className="my-1 text-3xl font-semibold tabular-nums text-amber-800">{breakTimerString}</p>
                <p className="text-xs text-amber-700">Started at {formatTime(activeBreak.startTime)}</p>
              </div>
            ) : (
              <p className="mt-4 text-[13px] leading-relaxed text-slate-500">
                Take your meal or rest breaks here, and end the break to resume your work session.
              </p>
            )}

            <button
              type="button"
              disabled={breakLoading || status === 'IDLE' || status === 'COMPLETE'}
              onClick={handleToggleBreak}
              className={`mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed ${
                activeBreak
                  ? 'bg-amber-600 hover:bg-amber-700 focus-visible:ring-amber-500'
                  : 'bg-slate-900 hover:bg-slate-800 focus-visible:ring-slate-900 disabled:bg-slate-200 disabled:text-slate-400'
              }`}
            >
              {breakLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : activeBreak ? (
                <>
                  <CheckCircle2 size={16} />
                  <span>End break</span>
                </>
              ) : (
                <>
                  <Coffee size={16} />
                  <span>Start break</span>
                </>
              )}
            </button>
          </section>

          {/* Shortcuts */}
          <section className="rounded-2xl border border-line bg-white p-5 shadow-xs sm:p-6">
            <h2 className="text-base font-semibold text-slate-900">Shortcuts</h2>
            <div className="mt-4 grid grid-cols-2 gap-2.5 sm:gap-3">
              {SHORTCUTS.map(({ href, label, hint, Icon, tone }) => (
                <Link
                  key={href}
                  href={href}
                  className="group flex flex-col rounded-xl border border-line p-3 transition-colors hover:border-blue-200 hover:bg-blue-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${tone}`}>
                    <Icon size={18} />
                  </span>
                  <span className="mt-3 text-[13px] font-semibold leading-tight text-slate-900">{label}</span>
                  <span className="mt-0.5 text-xs text-slate-500">{hint}</span>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}