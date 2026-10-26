'use client';

import React, { useEffect, useState } from 'react';
import {
  Users,
  TrendingUp,
  CalendarCheck,
  UserX,
  Clock,
  Plane,
  FileText,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import { formatWeekdayDateDMY } from '@/lib/datetime';
import DashboardLayout from '@/components/layout/DashboardLayout';
import HeaderActions, { type NotificationItem } from '@/components/layout/HeaderActions';
import StatsDrilldownDialog, { type DrilldownMetric } from '@/components/dashboard/StatsDrilldownDialog';
import { io } from 'socket.io-client';

// ── Status tones — used by the live activity feed (badges + avatars).
// Green is on-track, yellow is a soft flag, red is a hard flag.
const TONES = {
  blue: { bg: '#DBEAFE', chip: '#93C5FD', icon: '#1D4ED8', accent: '#2563EB', dark: '#1E3A8A' },
  green: { bg: '#DCFCE7', chip: '#86EFAC', icon: '#15803D', accent: '#16A34A', dark: '#052E16' },
  yellow: { bg: '#FEF9C3', chip: '#FDE047', icon: '#A16207', accent: '#CA8A04', dark: '#422006' },
  red: { bg: '#FEE2E2', chip: '#FCA5A5', icon: '#B91C1C', accent: '#DC2626', dark: '#450A0A' },
} as const;

type Tone = keyof typeof TONES;

// ── Stat card palettes — soft tinted wash, matching icon circle
const STAT_STYLES = {
  blue: { wash: '#F0F5FF', circle: '#DCE8FF', icon: '#2F6BFF', border: '#E1EAFB' },
  green: { wash: '#F0FBF5', circle: '#D3F3E3', icon: '#12A06B', border: '#DCF1E6' },
  purple: { wash: '#F6F3FF', circle: '#E6DFFF', icon: '#6D4AFF', border: '#E8E2FB' },
  amber: { wash: '#FFF9EE', circle: '#FFE8BF', icon: '#F59E0B', border: '#F8EAD0' },
  rose: { wash: '#FFF3F5', circle: '#FFDCE3', icon: '#E8405A', border: '#F8E0E5' },
} as const;

type StatStyle = keyof typeof STAT_STYLES;

const CARD = 'rounded-xl border border-line bg-white shadow-2xs';

// ── Stat card
function StatCard({
  label,
  value,
  icon: Icon,
  style,
  sub,
  subColor,
  onClick,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  style: StatStyle;
  sub: string;
  subColor?: string;
  onClick?: () => void;
}) {
  const s = STAT_STYLES[style];
  return (
    <button
      type="button"
      onClick={onClick}
      title={`View ${label} details`}
      className="w-full cursor-pointer rounded-xl text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 hover:ring-1 hover:ring-blue-200"
    >
      <div
        className="rounded-xl border p-3.5 shadow-2xs transition-all hover:shadow-xs"
        style={{
          background: `linear-gradient(135deg, ${s.wash} 0%, #FFFFFF 100%)`,
          borderColor: s.border,
        }}
      >
        <div className="flex items-start justify-between">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ backgroundColor: s.circle }}
          >
            <Icon size={17} style={{ color: s.icon }} />
          </div>
          <TrendingUp size={14} style={{ color: s.icon }} aria-hidden="true" />
        </div>
        <div className="mt-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">{label}</p>
          <p className="mt-1 text-2xl font-bold leading-none tracking-tight text-ink">{value}</p>
          <p className="mt-1.5 text-xs font-medium text-ink-soft" style={subColor ? { color: subColor } : undefined}>
            {sub}
          </p>
        </div>
      </div>
    </button>
  );
}

// ── Pulse status badge — green on time, yellow late, red absent/missing
function StatusBadge({ action }: { action: string }) {
  const lower = action?.toLowerCase() || '';
  const base = 'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold';

  if (lower.includes('late'))
    return (
      <span className={base} style={{ color: TONES.yellow.icon, backgroundColor: TONES.yellow.bg }}>
        Late
      </span>
    );
  if (lower.includes('absent') || lower.includes('missing'))
    return (
      <span className={base} style={{ color: TONES.red.icon, backgroundColor: TONES.red.bg }}>
        Absent
      </span>
    );
  if (lower.includes('check') || lower.includes('in'))
    return (
      <span className={base} style={{ color: TONES.green.icon, backgroundColor: TONES.green.bg }}>
        Present
      </span>
    );
  return (
    <span className={`${base} border border-line bg-slate-50 text-ink-soft`}>{action}</span>
  );
}

// Avatar tone follows the same status logic as the badge, not a name hash,
// so a person's chip color always matches what happened.
function statusTone(action: string): Tone {
  const lower = action?.toLowerCase() || '';
  if (lower.includes('late')) return 'yellow';
  if (lower.includes('absent') || lower.includes('missing')) return 'red';
  return 'green';
}

type PulseItem = {
  name?: string;
  action: string;
  time?: string;
  color?: string;
  companyId?: string;
};

// ── Circular attendance gauge with the percentage centred inside
function AttendanceRing({ percent }: { percent: number }) {
  const clamped = Math.max(0, Math.min(100, percent));
  const size = 84;
  const stroke = 7;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${Math.round(clamped)}% attendance`}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#DCE6FF" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={TONES.blue.accent}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 700ms ease' }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-base font-bold text-ink">
        {Math.round(clamped)}%
      </span>
    </div>
  );
}

// ── Empty state for the live feed
function EmptyActivity() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-10 text-center">
      <div className="relative mb-3 flex h-16 w-16 items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-gradient-to-b from-[#EEF4FF] to-[#E3EDFF]" />
        <svg
          aria-hidden="true"
          viewBox="0 0 100 100"
          className="absolute inset-0 motion-safe:animate-[spin_8s_linear_infinite]"
        >
          <circle
            cx="50"
            cy="50"
            r="47"
            fill="none"
            stroke="#BFD3FF"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray="70 226"
          />
          <circle cx="50" cy="3" r="3.5" fill="#BFD3FF" />
        </svg>
        <FileText size={22} className="relative text-[#2563EB]" />
      </div>
      <p className="text-sm font-bold text-ink">No recent activity</p>
      <p className="mt-1 max-w-xs text-xs text-ink-soft">
        When staff check in, their activity will appear here.
      </p>
    </div>
  );
}

// Assumes the API sends average work time as decimal hours (e.g. "7.5").
function formatWorkHours(raw: string | number): string {
  const hours = Number(raw);
  if (!Number.isFinite(hours) || hours <= 0) return '0m';
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

const NOTIFICATIONS_KEY = 'tapin_notifications';

export default function DashboardOverview() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState({
    overallAttendance: 0,
    present: 0,
    total: 0,
    absent: 0,
    late: 0,
    onLeave: 0,
    avgWorkHours: '0.0',
    attendanceChange: null as number | null,
  });
  const [pulse, setPulse] = useState<PulseItem[]>([]);
  const [isOverviewLoading, setIsOverviewLoading] = useState(true);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [drilldownMetric, setDrilldownMetric] = useState<DrilldownMetric | null>(null);

  useEffect(() => {
    const init = () => {
      const saved = localStorage.getItem(NOTIFICATIONS_KEY);
      if (saved) {
        try {
          setNotifications(JSON.parse(saved));
        } catch (e) {
          console.error('Failed to parse notifications:', e);
        }
      }
    };
    init();
  }, []);

  const saveNotifications = (next: NotificationItem[]) => {
    setNotifications(next);
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(next));
  };

  useEffect(() => {
    if (!user?.companyId || user?.mustChangePassword) return;

    const fetchDashboard = async () => {
      setIsOverviewLoading(true);
      try {
        const [statsRes, pulseRes] = await Promise.all([
          api.get('/attendance/stats/company'),
          api.get('/attendance/stats/company-pulse'),
        ]);
        setStats(statsRes.data);
        setPulse(pulseRes.data);
      } catch (err) {
        console.error('Overview data fetch failed:', err);
      } finally {
        setIsOverviewLoading(false);
      }
    };

    fetchDashboard();

    // Coalesce bursts of socket events into at most one refresh every few seconds.
    // A busy company can produce many check-ins at once; without this the dashboard
    // burns through the API rate limit.
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleDashboardRefresh = () => {
      if (refreshTimer) return;
      refreshTimer = setTimeout(() => {
        refreshTimer = null;
        fetchDashboard();
      }, 4000);
    };

    const socketUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1').replace(/\/api\/v1$/, '');
    const socket = io(socketUrl, {
      auth: { token: useAuthStore.getState().accessToken },
      transports: ['websocket'],
    });

    const makeId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    const addNotification = (notif: NotificationItem) => {
      setNotifications((prev) => {
        const updated = [notif, ...prev];
        localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated));
        return updated;
      });
    };

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
    });

    socket.on('activity:pulse', (data) => {
      if (data.companyId !== user.companyId) return;
      setPulse((prev) => [data, ...prev].slice(0, 8));
      scheduleDashboardRefresh();
    });

    socket.on('stats:update', (data) => {
      if (data.companyId !== user.companyId) return;
      scheduleDashboardRefresh();
    });

    socket.on('notification:geofence', (data) => {
      addNotification({
        id: data.id || makeId('geofence'),
        title: data.title || 'Geofence Alert',
        message: data.message,
        timestamp: data.timestamp || new Date().toISOString(),
        type: 'geofence',
        read: false,
      });
    });

    socket.on('notification:new', (data) => {
      addNotification({
        id: data.id || makeId('notif'),
        title: data.title,
        message: data.message,
        timestamp: data.timestamp || new Date().toISOString(),
        type: data.type || 'notice',
        read: false,
      });
    });

    socket.on('notice:new', (data) => {
      addNotification({
        id: data.id || makeId('notice'),
        title: 'New Announcement',
        message: data.title,
        timestamp: data.createdAt || new Date().toISOString(),
        type: 'notice',
        read: false,
      });
    });

    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      socket.disconnect();
    };
  }, [user]);

  const [today] = useState(() => formatWeekdayDateDMY(new Date()));

  const attendanceRounded = Math.round(stats.overallAttendance);

  return (
    <DashboardLayout
      headerActions={
        <HeaderActions
          notifications={notifications}
          onNotificationsChange={saveNotifications}
          showProfile={false}
        />
      }
    >
      <div className="min-h-screen space-y-5 bg-canvas px-4 py-5 sm:px-6 lg:py-6">
        {/* ── Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold leading-tight tracking-tight text-ink">Dashboard</h1>
            <p className="mt-0.5 text-xs text-ink-soft">{today}</p>
          </div>
        </div>

        {/* ── Stat cards */}
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <StatCard
            label="Total Staff"
            value={isOverviewLoading ? '—' : stats.total}
            icon={Users}
            style="blue"
            sub={isOverviewLoading ? 'Loading...' : 'Active personnel'}
            onClick={() => setDrilldownMetric('total')}
          />
          <StatCard
            label="Present Today"
            value={isOverviewLoading ? '—' : stats.present}
            icon={CalendarCheck}
            style="green"
            sub={isOverviewLoading ? 'Loading...' : `${attendanceRounded}% attendance`}
            onClick={() => setDrilldownMetric('present')}
          />
          <StatCard
            label="On Leave"
            value={isOverviewLoading ? '—' : stats.onLeave}
            icon={Plane}
            style="purple"
            sub={isOverviewLoading ? 'Loading...' : 'Approved leave'}
            subColor="#6D4AFF"
            onClick={() => setDrilldownMetric('on-leave')}
          />
          <StatCard
            label="Late Arrivals"
            value={isOverviewLoading ? '—' : stats.late}
            icon={Clock}
            style="amber"
            sub={isOverviewLoading ? 'Loading...' : 'Flagged today'}
            onClick={() => setDrilldownMetric('late')}
          />
          <StatCard
            label="Absent"
            value={isOverviewLoading ? '—' : stats.absent}
            icon={UserX}
            style="rose"
            sub={isOverviewLoading ? 'Loading...' : 'Not checked in'}
            onClick={() => setDrilldownMetric('absent')}
          />
        </div>

        {/* ── Main grid */}
        <div className="grid grid-cols-1 gap-4.5 lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)]">
          {/* Live activity */}
          <section className={`${CARD} flex min-h-[380px] flex-col overflow-hidden`}>
            <div className="flex items-center justify-between border-b border-line px-4.5 py-3">
              <h2 className="text-sm font-bold text-ink">Staff Activity</h2>
              <div className="flex items-center gap-1.5">
                <span
                  className="h-1.5 w-1.5 rounded-full motion-safe:animate-pulse"
                  style={{ backgroundColor: '#12B76A' }}
                />
                <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">Live</span>
              </div>
            </div>

            {pulse.length > 0 ? (
              <div className="divide-y divide-line">
                {pulse.map((item, i) => {
                  const tone = TONES[statusTone(item.action)];
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-3 px-4.5 py-2.5 transition-colors hover:bg-[#F7F9FF]"
                    >
                      <div
                        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-2xs"
                        style={{ backgroundColor: tone.accent }}
                      >
                        {item.name?.charAt(0)?.toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-ink">{item.name}</p>
                        <p className="truncate text-[11px] text-ink-soft">{item.action}</p>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-2.5">
                        <StatusBadge action={item.action} />
                        <span className="w-14 text-right text-[11px] font-medium tabular-nums text-ink-faint">
                          {item.time}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyActivity />
            )}
          </section>

          {/* Right column */}
          <div className="flex flex-col gap-4">
            {/* Attendance rate */}
            <section className={`${CARD} p-4.5`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">Monthly Pulse</p>
                  <h2 className="mt-0.5 text-sm font-bold text-ink">Attendance Rate</h2>
                </div>
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#E8F0FF] text-[#2563EB]">
                  <TrendingUp size={14} aria-hidden="true" />
                </div>
              </div>

              <div className="mt-3.5 flex items-center gap-4">
                <AttendanceRing percent={stats.overallAttendance} />
                <div className="flex h-20 min-w-0 flex-1 flex-col justify-center border-b border-line pb-1">
                  <span className="text-xl font-bold leading-none tracking-tight text-ink">
                    {attendanceRounded}%
                  </span>
                  <p className="mt-1 text-xs text-ink-soft">On-time arrivals this month</p>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-1.5 text-xs font-medium">
                {stats.attendanceChange === null ? (
                  <>
                    <TrendingUp size={14} className="text-[#2563EB]" aria-hidden="true" />
                    <span className="text-ink-soft">Monitoring on-time trends...</span>
                  </>
                ) : stats.attendanceChange >= 0 ? (
                  <>
                    <TrendingUp size={14} style={{ color: TONES.green.accent }} aria-hidden="true" />
                    <span style={{ color: TONES.green.icon }}>+{stats.attendanceChange}% vs last month</span>
                  </>
                ) : (
                  <>
                    <TrendingUp size={14} className="rotate-180" style={{ color: TONES.red.accent }} aria-hidden="true" />
                    <span style={{ color: TONES.red.icon }}>{stats.attendanceChange}% vs last month</span>
                  </>
                )}
              </div>
            </section>

            {/* Avg work hours */}
            <section className={`${CARD} flex-1 p-4.5`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">Productivity</p>
                  <h2 className="mt-0.5 text-sm font-bold text-ink">Avg. Work Hours</h2>
                </div>
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#EDE8FF] text-[#6D4AFF]">
                  <Clock size={14} aria-hidden="true" />
                </div>
              </div>
              <p className="mt-3 text-2xl font-bold leading-none tracking-tight text-ink">
                {formatWorkHours(stats.avgWorkHours)}
              </p>
              <p className="mt-1 text-xs text-ink-soft">Daily team average</p>
            </section>
          </div>
        </div>
      </div>

      <StatsDrilldownDialog
        metric={drilldownMetric}
        onClose={() => setDrilldownMetric(null)}
      />
    </DashboardLayout>
  );
}