'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Users,
  TrendingUp,
  CalendarCheck,
  UserX,
  Clock,
  Plane,
  FileText,
  BarChart3,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
} from 'recharts';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import { getSocketUrl } from '@/lib/socketUrl';
import { formatDateDMY, formatWeekdayDateDMY } from '@/lib/datetime';
import DashboardLayout from '@/components/layout/DashboardLayout';
import HeaderActions, { type NotificationItem } from '@/components/layout/HeaderActions';
import StatsDrilldownDialog, { type DrilldownMetric } from '@/components/dashboard/StatsDrilldownDialog';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart';
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

type Bucket = 'onTime' | 'late' | 'absent' | 'leave';

const trendChartConfig = {
  onTime: { label: 'On time', color: 'var(--chart-1)' },
  leave: { label: 'On leave', color: 'var(--chart-2)' },
  late: { label: 'Late', color: 'var(--chart-3)' },
  absent: { label: 'Absent', color: 'var(--chart-4)' },
} satisfies ChartConfig;

const checkinChartConfig = {
  avgCheckinMinutes: { label: 'Avg check-in', color: 'var(--chart-1)' },
} satisfies ChartConfig;

function classifyStatus(status?: string): Bucket {
  const s = status?.toUpperCase() ?? '';
  if (s === 'LATE') return 'late';
  if (s === 'ABSENT') return 'absent';
  if (s === 'PRESENT' || s === 'ON-TIME') return 'onTime';
  return 'leave';
}

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function getDateList(from: string, to: string): string[] {
  const dates: string[] = [];
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return dates;
  const cursor = new Date(start);
  while (cursor <= end) {
    dates.push(toISODate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

function formatShortDate(iso: string) {
  return formatDateDMY(iso);
}

function minutesToClock(mins: number) {
  const h24 = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  const period = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

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
  const [trendData, setTrendData] = useState<Array<{
    date: string;
    label: string;
    onTime: number;
    late: number;
    absent: number;
    leave: number;
    avgCheckinMinutes: number | null;
  }>>([]);
  const [isOverviewLoading, setIsOverviewLoading] = useState(true);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [drilldownMetric, setDrilldownMetric] = useState<DrilldownMetric | null>(null);

  const range = useMemo(() => {
    const now = new Date();
    const to = toISODate(now);
    const from = toISODate(new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000));
    return { from, to };
  }, []);

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
        const [statsRes, pulseRes, trendRes] = await Promise.all([
          api.get('/attendance/stats/company'),
          api.get('/attendance/stats/company-pulse'),
          api.get(`/attendance/logs/range?from=${range.from}&to=${range.to}`),
        ]);
        setStats(statsRes.data);
        setPulse(pulseRes.data);

        const dates = getDateList(range.from, range.to);
        const trend = dates.map((date) => {
          const logs = trendRes.data?.[date] || [];
          const counts: Record<Bucket, number> = { onTime: 0, late: 0, absent: 0, leave: 0 };
          let checkinMinutesSum = 0;
          let checkinCount = 0;

          logs.forEach((log: { status?: string; checkinAt?: string | null }) => {
            counts[classifyStatus(log.status)] += 1;
            if (log.checkinAt) {
              const t = new Date(log.checkinAt);
              if (!Number.isNaN(t.getTime())) {
                checkinMinutesSum += t.getHours() * 60 + t.getMinutes();
                checkinCount += 1;
              }
            }
          });

          return {
            date,
            label: formatShortDate(date),
            ...counts,
            avgCheckinMinutes: checkinCount > 0 ? checkinMinutesSum / checkinCount : null,
          };
        });

        setTrendData(trend);
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

    const socket = io(getSocketUrl(), {
      // Resolve the token at handshake/reconnect time. The Axios interceptor
      // refreshes localStorage but not the Zustand snapshot, so a token grabbed
      // once at mount would make every reconnect fail after a refresh.
      auth: (cb) =>
        cb({
          token: localStorage.getItem('accessToken') || useAuthStore.getState().accessToken,
        }),
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });

    socket.on('connect', () => {
      // Catch up on activity that happened while the socket was offline.
      scheduleDashboardRefresh();
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
  }, [range, user]);

  const overallAvgCheckin = useMemo(() => {
    const withData = trendData.filter((d) => d.avgCheckinMinutes !== null);
    if (withData.length === 0) return null;
    const sum = withData.reduce((acc, d) => acc + (d.avgCheckinMinutes || 0), 0);
    return sum / withData.length;
  }, [trendData]);

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

        <div className="grid grid-cols-1 gap-4.5 lg:grid-cols-2">
          <section className={`${CARD} p-4.5`}>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">Attendance</p>
                <h2 className="mt-0.5 text-sm font-bold text-ink">Trend overview</h2>
              </div>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EAF4FF] text-[#2563EB]">
                <BarChart3 size={14} aria-hidden="true" />
              </div>
            </div>

            {trendData.length > 0 ? (
              <ChartContainer config={trendChartConfig} className="h-[240px] w-full">
                <AreaChart data={trendData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="fillOnTimeOverview" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-onTime)" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="var(--color-onTime)" stopOpacity={0.08} />
                    </linearGradient>
                    <linearGradient id="fillLeaveOverview" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-leave)" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="var(--color-leave)" stopOpacity={0.08} />
                    </linearGradient>
                    <linearGradient id="fillLateOverview" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-late)" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="var(--color-late)" stopOpacity={0.08} />
                    </linearGradient>
                    <linearGradient id="fillAbsentOverview" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-absent)" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="var(--color-absent)" stopOpacity={0.08} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Area type="monotone" dataKey="onTime" stackId="1" stroke="var(--color-onTime)" fill="url(#fillOnTimeOverview)" />
                  <Area type="monotone" dataKey="leave" stackId="1" stroke="var(--color-leave)" fill="url(#fillLeaveOverview)" />
                  <Area type="monotone" dataKey="late" stackId="1" stroke="var(--color-late)" fill="url(#fillLateOverview)" />
                  <Area type="monotone" dataKey="absent" stackId="1" stroke="var(--color-absent)" fill="url(#fillAbsentOverview)" />
                </AreaChart>
              </ChartContainer>
            ) : (
              <div className="flex h-[240px] items-center justify-center text-sm text-ink-soft">No attendance data for this range</div>
            )}
          </section>

          <section className={`${CARD} p-4.5`}>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">Timing</p>
                <h2 className="mt-0.5 text-sm font-bold text-ink">Average check-in</h2>
              </div>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#E8F7F3] text-[#12A06B]">
                <Clock size={14} aria-hidden="true" />
              </div>
            </div>

            {trendData.some((d) => d.avgCheckinMinutes !== null) ? (
              <ChartContainer config={checkinChartConfig} className="h-[240px] w-full">
                <LineChart data={trendData.filter((d) => d.avgCheckinMinutes !== null)} margin={{ top: 12, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis
                    width={52}
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => minutesToClock(v)}
                    domain={['dataMin - 15', 'dataMax + 15']}
                    tickMargin={4}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="line" formatter={(value) => minutesToClock(Number(value))} />}
                  />
                  <Line
                    type="monotone"
                    dataKey="avgCheckinMinutes"
                    stroke="var(--color-avgCheckinMinutes)"
                    strokeWidth={2}
                    dot={{ r: 3, fill: 'var(--color-avgCheckinMinutes)', strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ChartContainer>
            ) : (
              <div className="flex h-[240px] items-center justify-center text-sm text-ink-soft">No check-in trend data</div>
            )}

            {overallAvgCheckin !== null && (
              <p className="mt-2 text-xs text-ink-soft">
                Average check-in: <span className="font-semibold text-ink">{minutesToClock(overallAvgCheckin)}</span>
              </p>
            )}
          </section>
        </div>
      </div>

      <StatsDrilldownDialog
        metric={drilldownMetric}
        onClose={() => setDrilldownMetric(null)}
      />
    </DashboardLayout>
  );
}
