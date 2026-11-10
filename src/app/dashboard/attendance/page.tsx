'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileText,
  Loader2,
  MapPin,
  RotateCcw,
  Search,
  Timer,
  UserMinus,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import {
  formatDateDMY,
  formatWeekdayDateDMY,
  todayDateKey,
} from '@/lib/datetime';
import DashboardLayout from '@/components/layout/DashboardLayout';
import FilterChips from '@/components/filters/FilterChips';
import { useAuthStore } from '@/store/authStore';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';

// ── Same two-tone system as the overview dashboard — teal for on-track, coral for attention-needed.
const TONES = {
  teal: { bg: '#E1F5EE', chip: '#9FE1CB', icon: '#0F6E56', accent: '#1D9E75', dark: '#04342C' },
  coral: { bg: '#FAECE7', chip: '#F0997B', icon: '#993C1D', accent: '#D85A30', dark: '#4A1B0C' },
} as const;

type Tone = keyof typeof TONES;

interface AttendanceLog {
  id: string;
  name: string;
  designation: string;
  departmentId?: string | null;
  department?: string | null;
  status: string;
  checkin: string;
  checkout: string;
  checkinAt: string;
  checkoutAt: string;
  totalBreakMinutes?: number | null;
  checkinLat?: number | null;
  checkinLng?: number | null;
  checkinAccuracy?: number | null;
  checkoutLat?: number | null;
  checkoutLng?: number | null;
  checkoutAccuracy?: number | null;
  color?: string;
  dateKey?: string; // used when displaying in range mode
}

type StatusFilter = 'ALL' | 'PRESENT' | 'LATE' | 'ABSENT';
type ViewMode = 'DAILY' | 'RANGE';

function avatarTone(name: string): Tone {
  const i = (name?.charCodeAt(0) || 0) + (name?.charCodeAt(1) || 0);
  return i % 2 === 0 ? 'teal' : 'coral';
}

function StatusBadge({ status }: { status: string }) {
  const s = status?.toUpperCase();
  if (s === 'PRESENT' || s === 'ON-TIME') {
    return (
      <span
        className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-wide"
        style={{ color: TONES.teal.icon, backgroundColor: TONES.teal.bg }}
      >
        <CheckCircle2 size={9} /> On time
      </span>
    );
  }
  if (s === 'LATE') {
    return (
      <span
        className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-wide"
        style={{ color: TONES.coral.icon, backgroundColor: TONES.coral.bg }}
      >
        <Timer size={9} /> Late
      </span>
    );
  }
  if (s === 'ABSENT') {
    return (
      <span
        className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-wide"
        style={{ color: TONES.coral.icon, backgroundColor: TONES.coral.bg }}
      >
        <UserMinus size={9} /> Absent
      </span>
    );
  }
  return (
    <span className="inline-flex items-center text-[10px] font-semibold text-slate-500 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-full uppercase tracking-wide">
      {status}
    </span>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  tone: Tone;
}) {
  const t = TONES[tone];
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-5 flex items-center gap-4 shadow-2xs">
      <div
        className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: t.bg }}
      >
        <Icon size={16} style={{ color: t.icon }} />
      </div>
      <div>
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-0.5">
          {label}
        </p>
        <p className="text-2xl font-bold text-slate-800 tracking-tight leading-none">
          {value}
        </p>
      </div>
    </div>
  );
}

function LocationPin({
  lat,
  lng,
  accuracy,
  label,
}: {
  lat?: number | null;
  lng?: number | null;
  accuracy?: number | null;
  label: string;
}) {
  if (!lat || !lng) {
    return (
      <span
        className="w-7 h-7 rounded-full flex items-center justify-center text-slate-300"
        title={`No GPS coordinate recorded for ${label}`}
      >
        <MapPin size={13} />
      </span>
    );
  }
  const imprecise = !!accuracy && accuracy > 100;
  const tone = imprecise ? TONES.coral : TONES.teal;
  return (
    <a
      href={`https://www.google.com/maps?q=${lat},${lng}`}
      target="_blank"
      rel="noopener noreferrer"
      className="w-7 h-7 rounded-full flex items-center justify-center transition-colors hover:opacity-80"
      style={{ backgroundColor: tone.bg, color: tone.icon }}
      title={`${label}${accuracy ? ` · accuracy ${Math.round(accuracy)}m` : ''} (Click to open map)`}
    >
      <MapPin size={13} />
    </a>
  );
}

const computeDuration = (checkinAt?: string, checkoutAt?: string) => {
  if (!checkinAt || !checkoutAt) return '—';
  const diff = (new Date(checkoutAt).getTime() - new Date(checkinAt).getTime()) / 1000 / 60;
  if (diff <= 0) return '—';
  const h = Math.floor(diff / 60);
  const m = Math.floor(diff % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const formatBreakMinutes = (totalBreakMinutes?: number | null) => {
  const breakMinutes = Number(totalBreakMinutes ?? 0);
  if (!breakMinutes || breakMinutes <= 0) return '0m';
  const h = Math.floor(breakMinutes / 60);
  const m = breakMinutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

export default function AttendanceLogsPage() {
  const { toast } = useToast();
  const { user } = useAuthStore();
  const canExport = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  const [viewMode, setViewMode] = useState<ViewMode>('DAILY');
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(todayDateKey());
  const [rangeFrom, setRangeFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return todayDateKey(d);
  });
  const [rangeTo, setRangeTo] = useState(todayDateKey());
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null);
  const [inspectLog, setInspectLog] = useState<AttendanceLog | null>(null);

  useEffect(() => {
    api
      .get('/departments')
      .then((res) => setDepartments(Array.isArray(res.data) ? res.data : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let discarded = false;
    const loadingTimer = window.setTimeout(() => {
      if (!discarded) {
        setLoading(true);
      }
    }, 0);

    if (viewMode === 'DAILY') {
      api
        .get(`/attendance/logs/daily?date=${date}`)
        .then((res) => {
          if (!discarded) {
            setLogs(Array.isArray(res.data) ? res.data : []);
          }
        })
        .catch((err) => {
          if (!discarded) {
            console.error('Failed to fetch daily attendance logs:', err);
            toast.error('Unable to load attendance logs.');
          }
        })
        .finally(() => {
          if (!discarded) setLoading(false);
        });
    } else {
      api
        .get('/attendance/logs/range', { params: { from: rangeFrom, to: rangeTo } })
        .then((res) => {
          if (!discarded) {
            const data = res.data;
            if (data && typeof data === 'object' && !Array.isArray(data)) {
              // Flatten dictionary { "2026-10-29": [logs] }
              const flattened: AttendanceLog[] = [];
              Object.entries(data).forEach(([dKey, dayLogs]) => {
                if (Array.isArray(dayLogs)) {
                  dayLogs.forEach((item) => flattened.push({ ...item, dateKey: dKey }));
                }
              });
              setLogs(flattened);
            } else if (Array.isArray(data)) {
              setLogs(data);
            } else {
              setLogs([]);
            }
          }
        })
        .catch((err) => {
          if (!discarded) {
            console.error('Failed to fetch attendance range logs:', err);
            toast.error('Unable to load range attendance logs.');
          }
        })
        .finally(() => {
          if (!discarded) setLoading(false);
        });
    }

    return () => {
      discarded = true;
      window.clearTimeout(loadingTimer);
    };
  }, [viewMode, date, rangeFrom, rangeTo, toast]);

  const handleExport = async (type: 'pdf' | 'excel') => {
    setExporting(type);
    const targetDate = viewMode === 'DAILY' ? date : rangeTo;
    const [year, month] = targetDate.split('-').map(Number);
    const endpoint = type === 'pdf' ? '/reports/monthly-pdf' : '/reports/monthly';
    const filename = `attendance-${targetDate}.${type === 'pdf' ? 'pdf' : 'xlsx'}`;
    try {
      const response = await api.get(`${endpoint}?year=${year}&month=${month}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to generate the report. Only admins can export data.');
    } finally {
      setExporting(null);
    }
  };

  const filteredLogs = useMemo(() => {
    const q = search.trim().toLowerCase();
    const selectedDepartmentName =
      departmentFilter === 'ALL'
        ? null
        : departments.find((d) => d.id === departmentFilter)?.name ?? null;

    return logs.filter((log) => {
      const matchesSearch =
        !q ||
        log.name.toLowerCase().includes(q) ||
        log.id.toLowerCase().includes(q) ||
        (log.designation && log.designation.toLowerCase().includes(q));

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'PRESENT'
          ? log.status === 'PRESENT' || log.status === 'ON-TIME'
          : log.status === statusFilter);

      const matchesDept =
        departmentFilter === 'ALL' ||
        log.departmentId === departmentFilter ||
        (selectedDepartmentName !== null && log.department === selectedDepartmentName);

      return matchesSearch && matchesStatus && matchesDept;
    });
  }, [logs, search, statusFilter, departmentFilter, departments]);

  const present = filteredLogs.filter(
    (l) => l.status === 'PRESENT' || l.status === 'ON-TIME' || l.status === 'LATE'
  ).length;
  const onTime = filteredLogs.filter(
    (l) => l.status === 'PRESENT' || l.status === 'ON-TIME'
  ).length;
  const late = filteredLogs.filter((l) => l.status === 'LATE').length;
  const absent = filteredLogs.filter((l) => l.status === 'ABSENT').length;

  const statusOptions = [
    { label: 'All', value: 'ALL', count: filteredLogs.length },
    { label: 'On time', value: 'PRESENT', count: onTime },
    { label: 'Late', value: 'LATE', count: late },
    { label: 'Absent', value: 'ABSENT', count: absent },
  ];

  const hasActiveFilters =
    !!search || departmentFilter !== 'ALL' || statusFilter !== 'ALL';

  const resetFilters = () => {
    setSearch('');
    setDepartmentFilter('ALL');
    setStatusFilter('ALL');
  };

  const applyPreset = (preset: 'today' | 'yesterday' | 'last7' | 'thisMonth') => {
    const now = new Date();
    if (preset === 'today') {
      setViewMode('DAILY');
      setDate(todayDateKey(now));
    } else if (preset === 'yesterday') {
      setViewMode('DAILY');
      const y = new Date();
      y.setDate(y.getDate() - 1);
      setDate(todayDateKey(y));
    } else if (preset === 'last7') {
      setViewMode('RANGE');
      const start = new Date();
      start.setDate(start.getDate() - 6);
      setRangeFrom(todayDateKey(start));
      setRangeTo(todayDateKey(now));
    } else if (preset === 'thisMonth') {
      setViewMode('RANGE');
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      setRangeFrom(todayDateKey(start));
      setRangeTo(todayDateKey(now));
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8">
        <div className="max-w-[1440px] mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Clock size={13} className="text-slate-400" />
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                  Workforce Attendance
                </p>
              </div>
              <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
                Attendance Logs
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">
                {viewMode === 'DAILY'
                  ? formatWeekdayDateDMY(date)
                  : `Date Range: ${formatDateDMY(rangeFrom)} – ${formatDateDMY(rangeTo)}`}
              </p>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* View Mode Toggle */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setViewMode('DAILY')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    viewMode === 'DAILY'
                      ? 'bg-white text-slate-800 shadow-xs'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Single Day
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('RANGE')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    viewMode === 'RANGE'
                      ? 'bg-white text-slate-800 shadow-xs'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Date Range
                </button>
              </div>

              {/* Date pickers */}
              {viewMode === 'DAILY' ? (
                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-sm shadow-xs">
                  <Calendar size={14} className="text-slate-400 flex-shrink-0" />
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="bg-transparent text-slate-700 text-xs font-medium focus:outline-none border-0"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-700 shadow-xs">
                  <Calendar size={13} className="text-slate-400 flex-shrink-0" />
                  <input
                    type="date"
                    value={rangeFrom}
                    onChange={(e) => setRangeFrom(e.target.value)}
                    className="bg-transparent text-slate-700 text-xs focus:outline-none border-0"
                  />
                  <span className="text-slate-300">→</span>
                  <input
                    type="date"
                    value={rangeTo}
                    onChange={(e) => setRangeTo(e.target.value)}
                    className="bg-transparent text-slate-700 text-xs focus:outline-none border-0"
                  />
                </div>
              )}

              {/* Exports */}
              {canExport && (
                <>
                  <button
                    type="button"
                    onClick={() => handleExport('excel')}
                    disabled={!!exporting}
                    className="inline-flex items-center gap-1.5 px-3 py-2 btn-secondary text-xs font-semibold rounded-xl"
                  >
                    {exporting === 'excel' ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Download size={13} />
                    )}
                    Excel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExport('pdf')}
                    disabled={!!exporting}
                    className="inline-flex items-center gap-1.5 px-3 py-2 btn-primary text-xs font-semibold rounded-xl"
                  >
                    {exporting === 'pdf' ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Download size={13} />
                    )}
                    PDF
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Quick Presets Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <span className="text-slate-400 font-medium mr-1">Quick presets:</span>
            <button
              type="button"
              onClick={() => applyPreset('today')}
              className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-300 font-medium transition-colors"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => applyPreset('yesterday')}
              className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-300 font-medium transition-colors"
            >
              Yesterday
            </button>
            <button
              type="button"
              onClick={() => applyPreset('last7')}
              className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-300 font-medium transition-colors"
            >
              Last 7 Days
            </button>
            <button
              type="button"
              onClick={() => applyPreset('thisMonth')}
              className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-300 font-medium transition-colors"
            >
              This Month
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard label="Present" value={present} icon={CheckCircle2} tone="teal" />
            <StatCard label="Late arrivals" value={late} icon={Timer} tone="coral" />
            <StatCard label="Absent" value={absent} icon={UserMinus} tone="coral" />
          </div>

          {/* Table Container */}
          <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
            {/* Filter Toolbar */}
            <div className="border-b border-slate-100 p-4 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[220px]">
                  <Search
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    placeholder="Search staff name, code or designation…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-8 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-400 transition-all"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                {/* Department filter */}
                <div className="flex items-center gap-1.5 min-w-[170px]">
                  <Building2 size={14} className="text-slate-400 flex-shrink-0" />
                  <select
                    value={departmentFilter}
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                    className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-700 outline-none focus:border-blue-400"
                  >
                    <option value="ALL">All Departments</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    <RotateCcw size={12} />
                    Reset
                  </button>
                )}

                <div className="ml-auto text-xs text-slate-400 flex items-center gap-1.5">
                  <Clock size={13} />
                  <span>
                    {filteredLogs.length} record{filteredLogs.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              {/* Status Chips */}
              <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-slate-50">
                <FilterChips
                  options={statusOptions}
                  value={statusFilter}
                  onChange={(value) => setStatusFilter(value as StatusFilter)}
                />
                <span className="ml-auto text-[11px] font-medium text-slate-400">
                  Filter by status
                </span>
              </div>
            </div>

            {/* Table */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <Loader2 size={24} className="text-blue-600 animate-spin mb-2" />
                <p className="text-xs">Loading attendance logs…</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left table-fixed border-collapse min-w-[800px]">
                  <colgroup>
                    <col style={{ width: viewMode === 'RANGE' ? '28%' : '34%' }} />
                    {viewMode === 'RANGE' && <col style={{ width: '12%' }} />}
                    <col style={{ width: '14%' }} />
                    <col style={{ width: '22%' }} />
                    <col style={{ width: '12%' }} />
                    <col style={{ width: '14%' }} />
                  </colgroup>
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-100">
                      <th className="px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                        Staff Member
                      </th>
                      {viewMode === 'RANGE' && (
                        <th className="px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                          Date
                        </th>
                      )}
                      <th className="px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-widest text-center">
                        Status
                      </th>
                      <th className="px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                        Check-in → Out
                      </th>
                      <th className="px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-widest text-center">
                        GPS
                      </th>
                      <th className="px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-widest text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredLogs.length === 0 ? (
                      <tr>
                        <td
                          colSpan={viewMode === 'RANGE' ? 6 : 5}
                          className="px-5 py-16 text-center"
                        >
                          <div className="flex flex-col items-center gap-2 text-slate-300">
                            <Clock size={28} />
                            <p className="text-sm font-medium text-slate-600">
                              No attendance records match your filters
                            </p>
                            <p className="text-xs text-slate-400">
                              Try another date range or reset status and department filters.
                            </p>
                            {hasActiveFilters && (
                              <button
                                type="button"
                                onClick={resetFilters}
                                className="mt-2 text-xs font-semibold text-blue-600 hover:text-blue-700"
                              >
                                Reset All Filters
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredLogs.map((log) => {
                        const tone = TONES[avatarTone(log.name)];
                        const duration = computeDuration(log.checkinAt, log.checkoutAt);

                        return (
                          <tr
                            key={`${log.id}-${log.dateKey || date}`}
                            className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                            onClick={() => setInspectLog(log)}
                          >
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-3 min-w-0">
                                <div
                                  className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
                                  style={{ backgroundColor: tone.bg, color: tone.icon }}
                                >
                                  {log.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-slate-800 truncate">
                                    {log.name}
                                  </p>
                                  <p className="text-xs text-slate-400 truncate">
                                    {log.designation || 'Staff'}
                                    {log.department ? ` • ${log.department}` : ''}
                                  </p>
                                </div>
                              </div>
                            </td>

                            {viewMode === 'RANGE' && (
                              <td className="px-4 py-3.5 text-xs font-medium text-slate-700">
                                {log.dateKey ? formatDateDMY(log.dateKey) : '—'}
                              </td>
                            )}

                            <td className="px-4 py-3.5 text-center">
                              <StatusBadge status={log.status} />
                            </td>

                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 tabular-nums whitespace-nowrap">
                                <span>{log.checkin || '—'}</span>
                                <ArrowRight size={11} className="text-slate-300 flex-shrink-0" />
                                <span>{log.checkout || '—'}</span>
                              </div>
                              <p className="text-[11px] text-slate-400 mt-0.5 tabular-nums">
                                {duration !== '—' ? `Duration: ${duration}` : ''}
                                {duration !== '—' && (log.totalBreakMinutes ?? 0) > 0 ? ` • Break: ${formatBreakMinutes(log.totalBreakMinutes)}` : ''}
                              </p>
                            </td>

                            <td
                              className="px-4 py-3.5"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex items-center justify-center gap-1.5">
                                <LocationPin
                                  lat={log.checkinLat}
                                  lng={log.checkinLng}
                                  accuracy={log.checkinAccuracy}
                                  label="Check-in location"
                                />
                                <LocationPin
                                  lat={log.checkoutLat}
                                  lng={log.checkoutLng}
                                  accuracy={log.checkoutAccuracy}
                                  label="Check-out location"
                                />
                              </div>
                            </td>

                            <td
                              className="px-4 py-3.5 text-right"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => setInspectLog(log)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                  title="Inspect log details"
                                >
                                  <Eye size={14} />
                                </button>
                                {canExport && (
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      try {
                                        const activeDate = log.dateKey || date;
                                        const [y, m] = activeDate.split('-').map(Number);
                                        const res = await api.get(
                                          `/reports/employee-pdf?employeeId=${log.id}&year=${y}&month=${m}`,
                                          { responseType: 'blob' }
                                        );
                                        const url = window.URL.createObjectURL(
                                          new Blob([res.data])
                                        );
                                        const link = document.createElement('a');
                                        link.href = url;
                                        link.setAttribute(
                                          'download',
                                          `${log.name}-attendance-${activeDate}.pdf`
                                        );
                                        document.body.appendChild(link);
                                        link.click();
                                        link.remove();
                                        window.URL.revokeObjectURL(url);
                                      } catch (err) {
                                        console.error('PDF download failed:', err);
                                        toast.error('Failed to download the monthly report.');
                                      }
                                    }}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                                    title="Download Monthly Attendance Report"
                                  >
                                    <FileText size={14} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Attendance Detail Inspection Modal */}
      <Dialog open={!!inspectLog} onOpenChange={(open) => !open && setInspectLog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Attendance Record</span>
              {inspectLog && <StatusBadge status={inspectLog.status} />}
            </DialogTitle>
            <DialogDescription>
              {inspectLog?.name} •{' '}
              {inspectLog?.dateKey ? formatDateDMY(inspectLog.dateKey) : formatWeekdayDateDMY(date)}
            </DialogDescription>
          </DialogHeader>

          {inspectLog && (
            <div className="space-y-4 pt-2">
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Check-in Time
                  </span>
                  <span className="text-sm font-bold text-slate-800">
                    {inspectLog.checkin || 'Not recorded'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Check-out Time
                  </span>
                  <span className="text-sm font-bold text-slate-800">
                    {inspectLog.checkout || 'Not recorded'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Total Time Logged
                  </span>
                  <span className="text-sm font-semibold text-blue-700">
                    {computeDuration(inspectLog.checkinAt, inspectLog.checkoutAt)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Break Taken
                  </span>
                  <span className="text-sm font-semibold text-slate-700">
                    {formatBreakMinutes(inspectLog.totalBreakMinutes)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Department
                  </span>
                  <span className="text-sm font-medium text-slate-700">
                    {inspectLog.department || '—'}
                  </span>
                </div>
              </div>

              {/* GPS Coordinates Section */}
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Location & Geo Verification
                </p>

                <div className="border border-slate-200 rounded-xl p-3 bg-white space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Check-in Location:</span>
                    {inspectLog.checkinLat && inspectLog.checkinLng ? (
                      <a
                        href={`https://www.google.com/maps?q=${inspectLog.checkinLat},${inspectLog.checkinLng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-600 hover:underline font-semibold"
                      >
                        <MapPin size={12} />
                        <span>
                          {inspectLog.checkinLat.toFixed(4)}, {inspectLog.checkinLng.toFixed(4)}
                        </span>
                      </a>
                    ) : (
                      <span className="text-slate-400">No GPS data</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Check-out Location:</span>
                    {inspectLog.checkoutLat && inspectLog.checkoutLng ? (
                      <a
                        href={`https://www.google.com/maps?q=${inspectLog.checkoutLat},${inspectLog.checkoutLng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-600 hover:underline font-semibold"
                      >
                        <MapPin size={12} />
                        <span>
                          {inspectLog.checkoutLat.toFixed(4)}, {inspectLog.checkoutLng.toFixed(4)}
                        </span>
                      </a>
                    ) : (
                      <span className="text-slate-400">No GPS data</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
