'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart3, Calendar, CheckCircle2, Timer, UserMinus, Palmtree, Loader2,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid,
} from 'recharts';
import {
  ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import DashboardLayout from '@/components/layout/DashboardLayout';

interface AttendanceLog {
  id: string;
  name: string;
  designation: string;
  status: string;
  checkinAt: string;
  checkoutAt: string;
}

interface Employee {
  id: string;
  name: string;
  departmentId?: string | null;
  department?: { id: string; name: string } | null;
}

interface Department {
  id: string;
  name: string;
}

type Bucket = 'present' | 'late' | 'absent' | 'leave';

// Shared config drives both the chart colors (via CSS vars set in
// globals.css: --chart-1..4) and the legend/tooltip labels.
const trendChartConfig = {
  present: { label: 'Present', color: 'var(--chart-1)' },
  leave: { label: 'On leave', color: 'var(--chart-2)' },
  late: { label: 'Late', color: 'var(--chart-3)' },
  absent: { label: 'Absent', color: 'var(--chart-4)' },
} satisfies ChartConfig;

const checkinChartConfig = {
  avgCheckinMinutes: { label: 'Avg check-in', color: 'var(--chart-1)' },
} satisfies ChartConfig;

const deptChartConfig = {
  present: { label: 'Present', color: 'var(--chart-1)' },
  late: { label: 'Late', color: 'var(--chart-3)' },
  absent: { label: 'Absent', color: 'var(--chart-4)' },
} satisfies ChartConfig;

const STAT_TONES = {
  present: { bg: '#EFF6FF', icon: '#2563EB' },   // blue-50 / blue-600
  leave: { bg: '#ECFDF5', icon: '#059669' },      // emerald-50 / emerald-600
  late: { bg: '#FFFBEB', icon: '#D97706' },       // amber-50 / amber-600
  absent: { bg: '#FFF1F2', icon: '#E11D48' },     // rose-50 / rose-600
} as const;

// NOTE: /attendance/logs/daily is assumed to return a `status` of
// PRESENT/ON-TIME, LATE, or ABSENT for normal days, and something else
// (e.g. LEAVE / ON_LEAVE / HOLIDAY) on days an employee is on approved
// leave or the office is closed — that "anything else" bucket is what
// this page reports as "On leave". If your backend uses a different
// value, adjust the checks below.
function classifyStatus(status: string): Bucket {
  const s = status?.toUpperCase();
  if (s === 'LATE') return 'late';
  if (s === 'ABSENT') return 'absent';
  if (s === 'PRESENT' || s === 'ON-TIME') return 'present';
  return 'leave';
}

function toISODate(d: Date) {
  return d.toISOString().split('T')[0];
}

function getDateList(from: string, to: string): string[] {
  const dates: string[] = [];
  const start = new Date(from + 'T00:00:00');
  const end = new Date(to + 'T00:00:00');
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return dates;
  const cursor = new Date(start);
  while (cursor <= end) {
    dates.push(toISODate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

function formatShortDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function minutesToClock(mins: number) {
  const h24 = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  const period = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetches one day's logs with retry-on-429 (exponential backoff, honors
 * Retry-After if the server sends one).
 */
async function fetchDayWithRetry(date: string, maxRetries = 3): Promise<readonly [string, AttendanceLog[]]> {
  let attempt = 0;
  for (;;) {
    try {
      const res = await api.get(`/attendance/logs/daily?date=${date}`);
      return [date, res.data] as const;
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 429 && attempt < maxRetries) {
        const retryAfterHeader = err?.response?.headers?.['retry-after'];
        const retryAfterMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 : null;
        const backoffMs = retryAfterMs ?? 500 * 2 ** attempt;
        attempt += 1;
        await sleep(backoffMs);
        continue;
      }
      throw err;
    }
  }
}

/**
 * Runs async tasks with a bounded number of in-flight requests at once,
 * instead of firing all of them simultaneously (which is what triggered
 * the 429s on ranges of 30+ days).
 */
async function fetchLogsInBatches(
  dates: string[],
  concurrency: number
): Promise<Array<readonly [string, AttendanceLog[]]>> {
  const results: Array<readonly [string, AttendanceLog[]]> = [];
  for (let i = 0; i < dates.length; i += concurrency) {
    const batch = dates.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map((d) => fetchDayWithRetry(d)));
    results.push(...batchResults);
  }
  return results;
}

function StatCard({
  label, value, icon: Icon, tone,
}: {
  label: string; value: number; icon: React.ElementType; tone: keyof typeof STAT_TONES;
}) {
  const t = STAT_TONES[tone];
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-5 flex items-center gap-4">
      <div className="w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: t.bg }}>
        <Icon size={15} style={{ color: t.icon }} />
      </div>
      <div>
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
        <p className="text-2xl font-semibold text-slate-800 tracking-tight leading-none">{value}</p>
      </div>
    </div>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

const MAX_RANGE_DAYS = 92;
const FETCH_CONCURRENCY = 6; // in-flight requests per batch — tune to your backend's rate limit

export default function AnalyticsPage() {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  // Lazy initializers run once during the component's first render and are
  // the accepted pattern for one-time impure reads (Date.now()) feeding
  // initial state — avoids the react-hooks/purity violation from calling
  // Date.now()/new Date() directly in the component body.
  const [range, setRange] = useState(() => {
    const now = new Date();
    const to = toISODate(now);
    const from = toISODate(new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000));
    return { from, to };
  });
  const [today] = useState(() => toISODate(new Date()));

  const [logsByDate, setLogsByDate] = useState<Record<string, AttendanceLog[]>>({});
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Employees (and departments, for Super Admins) don't depend on the date
  // range, so they're fetched once on mount.
  useEffect(() => {
    let discarded = false;

    const loadReference = async () => {
      try {
        const requests: Promise<any>[] = [api.get('/employees')];
        if (isSuperAdmin) requests.push(api.get('/departments'));
        const results = await Promise.all(requests);
        if (discarded) return;
        setEmployees(results[0].data);
        if (isSuperAdmin && results[1]) setDepartments(results[1].data);
      } catch (err) {
        if (!discarded) console.error('Failed to fetch reference data:', err);
      }
    };

    loadReference();
    return () => { discarded = true; };
  }, [isSuperAdmin]);

  // Range validity is a pure derivation of `range` — computed via useMemo
  // rather than pushed into state inside an effect, avoiding a synchronous
  // setState-in-effect and an extra render pass.
  const dateList = useMemo(() => getDateList(range.from, range.to), [range.from, range.to]);

  const rangeError = useMemo(() => {
    if (dateList.length === 0) return 'Pick a valid "from" date that is on or before the "to" date.';
    if (dateList.length > MAX_RANGE_DAYS) return `Range is too large (${dateList.length} days). Please pick ${MAX_RANGE_DAYS} days or fewer.`;
    return null;
  }, [dateList]);

  // Attendance logs, fetched in bounded-concurrency batches with 429 retry.
  // There's no bulk range endpoint on the backend today — if the date range
  // grows large in practice, a dedicated `/attendance/logs/range` endpoint
  // would be far cheaper than this fan-out.
  useEffect(() => {
    if (rangeError) return; // invalid range — nothing to fetch, UI shows the error instead of the loader

    let discarded = false;

    const loadLogs = async () => {
      setLoading(true);
      setFetchError(null);
      try {
        const results = await fetchLogsInBatches(dateList, FETCH_CONCURRENCY);
        if (discarded) return;
        const map: Record<string, AttendanceLog[]> = {};
        results.forEach(([d, data]) => { map[d] = data; });
        setLogsByDate(map);
      } catch (err: any) {
        if (discarded) return;
        console.error('Failed to fetch attendance logs:', err);
        if (err?.response?.status === 429) {
          setFetchError('The server is rate-limiting requests. Try a shorter date range or wait a moment and retry.');
        } else {
          setFetchError('Failed to load attendance data. Please try again.');
        }
      } finally {
        if (!discarded) setLoading(false);
      }
    };

    loadLogs();
    return () => { discarded = true; };
  }, [dateList, rangeError]);

  const employeeDeptMap = useMemo(() => {
    const map = new Map<string, string>();
    employees.forEach((e) => {
      const deptName = e.department?.name
        || departments.find((d) => d.id === e.departmentId)?.name
        || 'Unassigned';
      map.set(e.id, deptName);
    });
    return map;
  }, [employees, departments]);

  // ── Daily trend: present / late / absent / leave counts, plus average
  // check-in time (minutes since midnight) among employees who checked in.
  const trendData = useMemo(() => {
    const dates = Object.keys(logsByDate).sort();
    return dates.map((date) => {
      const logs = logsByDate[date] || [];
      const counts: Record<Bucket, number> = { present: 0, late: 0, absent: 0, leave: 0 };
      let checkinMinutesSum = 0;
      let checkinCount = 0;

      logs.forEach((log) => {
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
  }, [logsByDate]);

  const checkinTrendData = useMemo(
    () => trendData.filter((d) => d.avgCheckinMinutes !== null),
    [trendData]
  );

  const totals = useMemo(() => {
    return trendData.reduce(
      (acc, d) => ({
        present: acc.present + d.present,
        late: acc.late + d.late,
        absent: acc.absent + d.absent,
        leave: acc.leave + d.leave,
      }),
      { present: 0, late: 0, absent: 0, leave: 0 }
    );
  }, [trendData]);

  const overallAvgCheckin = useMemo(() => {
    const withData = checkinTrendData;
    if (withData.length === 0) return null;
    const sum = withData.reduce((acc, d) => acc + (d.avgCheckinMinutes || 0), 0);
    return sum / withData.length;
  }, [checkinTrendData]);

  // ── Department comparison (Super Admin only — an Admin's employee list is
  // already scoped to their own department, so a breakdown wouldn't add much).
  const departmentData = useMemo(() => {
    if (!isSuperAdmin) return [];
    const byDept = new Map<string, Record<Bucket, number>>();

    Object.values(logsByDate).forEach((logs) => {
      logs.forEach((log) => {
        const deptName = employeeDeptMap.get(log.id) || 'Unassigned';
        const bucket = classifyStatus(log.status);
        const current = byDept.get(deptName) || { present: 0, late: 0, absent: 0, leave: 0 };
        current[bucket] += 1;
        byDept.set(deptName, current);
      });
    });

    return Array.from(byDept.entries())
      .map(([department, counts]) => ({ department, ...counts }))
      .sort((a, b) => (b.present + b.late) - (a.present + a.late));
  }, [logsByDate, employeeDeptMap, isSuperAdmin]);

  const displayRange = `${formatShortDate(range.from)} – ${formatShortDate(range.to)}`;

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8">
        <div className="max-w-[1440px] mx-auto space-y-6">

          {/* ── Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">
                {isSuperAdmin ? 'Super Admin' : 'Admin'} · Analytics
              </p>
              <h1 className="text-2xl font-semibold text-slate-800 tracking-tight">Analytics</h1>
              <p className="text-sm text-slate-400 mt-0.5">{displayRange}</p>
            </div>

            {/* Date range controls */}
            <div className="flex items-center flex-wrap gap-2">
              <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm">
                <Calendar size={13} className="text-slate-400 flex-shrink-0" />
                <input
                  type="date"
                  value={range.from}
                  max={range.to}
                  onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
                  style={{ colorScheme: 'light' }}
                  className="bg-transparent text-slate-700 text-sm focus:outline-none border-0"
                />
                <span className="text-slate-300">→</span>
                <input
                  type="date"
                  value={range.to}
                  min={range.from}
                  max={today}
                  onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
                  style={{ colorScheme: 'light' }}
                  className="bg-transparent text-slate-700 text-sm focus:outline-none border-0"
                />
              </div>
              <div className="inline-flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg">
                {[
                  { label: '7D', days: 7 },
                  { label: '30D', days: 30 },
                  { label: '90D', days: 90 },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => setRange({
                      from: toISODate(new Date(Date.now() - (preset.days - 1) * 24 * 60 * 60 * 1000)),
                      to: today,
                    })}
                    className="px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-white rounded-md transition-colors"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {rangeError ? (
            <div className="bg-amber-50 border border-amber-100 text-amber-700 text-sm rounded-xl px-4 py-3">
              {rangeError}
            </div>
          ) : fetchError ? (
            <div className="bg-rose-50 border border-rose-100 text-rose-700 text-sm rounded-xl px-4 py-3">
              {fetchError}
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 size={20} className="text-slate-400 animate-spin" />
            </div>
          ) : (
            <>
              {/* ── Summary stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Present" value={totals.present} icon={CheckCircle2} tone="present" />
                <StatCard label="On leave" value={totals.leave} icon={Palmtree} tone="leave" />
                <StatCard label="Late arrivals" value={totals.late} icon={Timer} tone="late" />
                <StatCard label="Absent" value={totals.absent} icon={UserMinus} tone="absent" />
              </div>

              {/* ── Present / Absent / Late / Leave trend */}
              <ChartCard title="Attendance trend" subtitle="Daily breakdown across the selected range">
                {trendData.length === 0 ? (
                  <EmptyChartState />
                ) : (
                  <ChartContainer config={trendChartConfig} className="h-[280px] w-full">
                    <AreaChart data={trendData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                      <defs>
                        <linearGradient id="fillPresent" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--color-present)" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="var(--color-present)" stopOpacity={0.08} />
                        </linearGradient>
                        <linearGradient id="fillLeave" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--color-leave)" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="var(--color-leave)" stopOpacity={0.08} />
                        </linearGradient>
                        <linearGradient id="fillLate" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--color-late)" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="var(--color-late)" stopOpacity={0.08} />
                        </linearGradient>
                        <linearGradient id="fillAbsent" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--color-absent)" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="var(--color-absent)" stopOpacity={0.08} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                      <ChartLegend content={<ChartLegendContent />} />
                      <Area type="monotone" dataKey="present" stackId="1" stroke="var(--color-present)" fill="url(#fillPresent)" />
                      <Area type="monotone" dataKey="leave" stackId="1" stroke="var(--color-leave)" fill="url(#fillLeave)" />
                      <Area type="monotone" dataKey="late" stackId="1" stroke="var(--color-late)" fill="url(#fillLate)" />
                      <Area type="monotone" dataKey="absent" stackId="1" stroke="var(--color-absent)" fill="url(#fillAbsent)" />
                    </AreaChart>
                  </ChartContainer>
                )}
              </ChartCard>

              <div className={`grid grid-cols-1 ${isSuperAdmin ? 'lg:grid-cols-2' : ''} gap-6`}>
                {/* ── Average check-in time trend */}
                <ChartCard
                  title="Average check-in time"
                  subtitle={overallAvgCheckin !== null ? `Averaging ${minutesToClock(overallAvgCheckin)} across the range` : undefined}
                >
                  {checkinTrendData.length === 0 ? (
                    <EmptyChartState />
                  ) : (
                    <ChartContainer config={checkinChartConfig} className="h-[260px] w-full">
                      <LineChart data={checkinTrendData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                        <YAxis
                          tick={{ fontSize: 11, fill: '#94a3b8' }}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={(v: number) => minutesToClock(v)}
                          domain={['dataMin - 15', 'dataMax + 15']}
                        />
                        <ChartTooltip
                          cursor={false}
                          content={
                            <ChartTooltipContent
                              indicator="line"
                              formatter={(value) => minutesToClock(Number(value))}
                            />
                          }
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
                  )}
                </ChartCard>

                {/* ── Department comparison (Super Admin only) */}
                {isSuperAdmin && (
                  <ChartCard title="Department comparison" subtitle="Present / late / absent totals across the range">
                    {departmentData.length === 0 ? (
                      <EmptyChartState />
                    ) : (
                      <ChartContainer config={deptChartConfig} className="h-[260px] w-full">
                        <BarChart data={departmentData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                          <XAxis dataKey="department" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                          <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                          <ChartLegend content={<ChartLegendContent />} />
                          <Bar dataKey="present" stackId="d" fill="var(--color-present)" radius={[0, 0, 0, 0]} />
                          <Bar dataKey="late" stackId="d" fill="var(--color-late)" />
                          <Bar dataKey="absent" stackId="d" fill="var(--color-absent)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ChartContainer>
                    )}
                  </ChartCard>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

function EmptyChartState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-300">
      <BarChart3 size={26} />
      <p className="text-sm text-slate-400 mt-2">No data for this range</p>
    </div>
  );
}