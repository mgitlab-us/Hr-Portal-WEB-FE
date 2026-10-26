'use client';

import React, { useEffect, useState } from 'react';
import { Clock, Calendar, Search, Download, Loader2, CheckCircle2, Timer, UserMinus, X, FileText, MapPin, ArrowRight, } from 'lucide-react';
import { api } from '@/lib/api';
import { formatWeekdayDateDMY, todayDateKey } from '@/lib/datetime';
import DashboardLayout from '@/components/layout/DashboardLayout';
import FilterChips from '@/components/filters/FilterChips';
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
  status: string;
  checkin: string;
  checkout: string;
  checkinAt: string;
  checkoutAt: string;
  checkinLat?: number;
  checkinLng?: number;
  checkinAccuracy?: number;
  checkoutLat?: number;
  checkoutLng?: number;
  checkoutAccuracy?: number;
  color: string;
}

type StatusFilter = 'ALL' | 'PRESENT' | 'LATE' | 'ABSENT';

// ── Identity color for the avatar — alternates teal/coral by name, purely for
// telling rows apart at a glance. Status still lives in the badge, not here.
function avatarTone(name: string): Tone {
  const i = (name?.charCodeAt(0) || 0) + (name?.charCodeAt(1) || 0);
  return i % 2 === 0 ? 'teal' : 'coral';
}

function StatusBadge({ status }: { status: string }) {
  const s = status?.toUpperCase();
  if (s === 'PRESENT' || s === 'ON-TIME')
    return (
      <span
        className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-wide"
        style={{ color: TONES.teal.icon, backgroundColor: TONES.teal.bg }}
      >
        <CheckCircle2 size={9} /> On time
      </span>
    );
  if (s === 'LATE')
    return (
      <span
        className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-wide"
        style={{ color: TONES.coral.icon, backgroundColor: TONES.coral.bg }}
      >
        <Timer size={9} /> Late
      </span>
    );
  if (s === 'ABSENT')
    return (
      <span
        className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-wide"
        style={{ color: TONES.coral.icon, backgroundColor: TONES.coral.bg }}
      >
        <UserMinus size={9} /> Absent
      </span>
    );
  return (
    <span className="inline-flex items-center text-[10px] font-semibold text-slate-500 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-full uppercase tracking-wide">
      {status}
    </span>
  );
}

function StatCard({
  label, value, icon: Icon, tone,
}: {
  label: string; value: number; icon: React.ElementType; tone: Tone;
}) {
  const t = TONES[tone];
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-5 flex items-center gap-4">
      <div
        className="w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: t.bg }}
      >
        <Icon size={15} style={{ color: t.icon }} />
      </div>
      <div>
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-0.5">
          {label}
        </p>
        <p className="text-2xl font-semibold text-slate-800 tracking-tight leading-none">
          {value}
        </p>
      </div>
    </div>
  );
}

// ── One rounded pin button used for both check-in and check-out location.
function LocationPin({
  lat, lng, accuracy, label,
}: {
  lat?: number; lng?: number; accuracy?: number; label: string;
}) {
  if (!lat || !lng) {
    return (
      <span className="w-7 h-7 rounded-full flex items-center justify-center text-slate-300" title={`No GPS for ${label}`}>
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
      title={`${label}${accuracy ? ` · accuracy ${Math.round(accuracy)}m` : ''}`}
    >
      <MapPin size={13} />
    </a>
  );
}

export default function AttendanceLogsPage() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(todayDateKey());
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null);

  // Fetch is defined inline inside the effect (rather than calling out to a
  // component-scope function) so the setState calls that happen before the
  // first `await` are recognized as effect-local and don't trip
  // react-hooks/set-state-in-effect. `discarded` guards against a stale
  // response overwriting a newer one if the date changes again mid-request.
  useEffect(() => {
    let discarded = false;

    const loadLogs = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/attendance/logs/daily?date=${date}`);
        if (!discarded) setLogs(res.data);
      } catch (err) {
        if (!discarded) console.error('Failed to fetch logs:', err);
      } finally {
        if (!discarded) setLoading(false);
      }
    };

    loadLogs();

    return () => {
      discarded = true;
    };
  }, [date]);

  const handleExport = async (type: 'pdf' | 'excel') => {
    setExporting(type);
    const [year, month] = date.split('-').map(Number);
    const endpoint = type === 'pdf' ? '/reports/monthly-pdf' : '/reports/monthly';
    const filename = `attendance-${date}.${type === 'pdf' ? 'pdf' : 'xlsx'}`;
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
    } catch {
      toast.error('Failed to generate the report. Only admins can export data.');
    } finally {
      setExporting(null);
    }
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.name.toLowerCase().includes(search.toLowerCase()) ||
      log.id.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'PRESENT'
        ? log.status === 'PRESENT' || log.status === 'ON-TIME'
        : log.status === statusFilter);
    return matchesSearch && matchesStatus;
  });

  const present = logs.filter(
    (l) => l.status === 'PRESENT' || l.status === 'ON-TIME' || l.status === 'LATE'
  ).length;
  const onTime = logs.filter(
    (l) => l.status === 'PRESENT' || l.status === 'ON-TIME'
  ).length;
  const late = logs.filter((l) => l.status === 'LATE').length;
  const absent = logs.filter((l) => l.status === 'ABSENT').length;

  const statusOptions = [
    { label: 'All', value: 'ALL', count: logs.length },
    { label: 'On time', value: 'PRESENT', count: onTime },
    { label: 'Late', value: 'LATE', count: late },
    { label: 'Absent', value: 'ABSENT', count: absent },
  ];

  const activeStatusLabel =
    statusOptions.find((option) => option.value === statusFilter)?.label ?? 'All';

  const displayDate = formatWeekdayDateDMY(date);

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8">
        <div className="max-w-[1440px] mx-auto space-y-6">

        {/* ── Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-800 tracking-tight">
              Attendance Logs
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">{displayDate}</p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm">
              <Calendar size={13} className="text-slate-400 flex-shrink-0" />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{ colorScheme: 'light' }}
                className="bg-transparent text-slate-700 text-sm focus:outline-none border-0"
              />
            </div>
            <button
              onClick={() => handleExport('excel')}
              disabled={!!exporting}
              className="inline-flex items-center gap-1.5 px-3 py-2 btn-secondary text-sm font-medium rounded-xl"
            >
              {exporting === 'excel'
                ? <Loader2 size={13} className="animate-spin" />
                : <Download size={13} />}
              Excel
            </button>
            <button
              onClick={() => handleExport('pdf')}
              disabled={!!exporting}
              className="inline-flex items-center gap-1.5 px-3 py-2 btn-primary text-sm font-medium rounded-xl"
            >
              {exporting === 'pdf'
                ? <Loader2 size={13} className="animate-spin" />
                : <Download size={13} />}
              PDF
            </button>
          </div>
        </div>

        {/* ── Stats */}
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Present" value={present} icon={CheckCircle2} tone="teal" />
          <StatCard label="Late arrivals" value={late} icon={Timer} tone="coral" />
          <StatCard label="Absent" value={absent} icon={UserMinus} tone="coral" />
        </div>

        {/* ── Table Card */}
        <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">

          {/* Toolbar */}
          <div className="border-b border-slate-100">
            <div className="flex items-center gap-3 px-5 py-4">
              <div className="relative flex-1 max-w-sm">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search staff name or ID…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-8 pr-8 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/15 focus:border-[#2563EB]/40 transition-all"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 btn-ghost rounded-md"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
              <div className="ml-auto text-xs text-slate-400 flex items-center gap-1.5">
                <Clock size={12} />
                <span>{filteredLogs.length} record{filteredLogs.length !== 1 ? 's' : ''}</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 border-t border-slate-50 bg-slate-50/40 px-5 py-3">
              <FilterChips
                options={statusOptions}
                value={statusFilter}
                onChange={(value) => setStatusFilter(value as StatusFilter)}
              />
              <span className="ml-auto text-[11px] font-medium text-slate-400">
                Filter by attendance status
              </span>
            </div>
          </div>

          {/* Table — fixed layout with percentage columns so it always fits the
              card width instead of growing wider than the screen. Check-in/out
              and the two location pins are each consolidated into a single
              column to keep the column count (and total width) down. */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={20} className="text-slate-400 animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left table-fixed border-collapse">
                <colgroup>
                  <col style={{ width: '32%' }} />
                  <col style={{ width: '14%' }} />
                  <col style={{ width: '24%' }} />
                  <col style={{ width: '16%' }} />
                  <col style={{ width: '14%' }} />
                </colgroup>
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100">
                    <th className="px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                      Staff Member
                    </th>
                    <th className="px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-widest text-center">
                      Status
                    </th>
                    <th className="px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                      Check-in → out
                    </th>
                    <th className="px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-widest text-center">
                      Location
                    </th>
                    <th className="px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-widest text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-16 text-center">
                        <div className="flex flex-col items-center gap-2 text-slate-300">
                          <Clock size={26} />
                          <p className="text-sm text-slate-400">
                            {statusFilter === 'ALL'
                              ? 'No logs for this date'
                              : `No ${activeStatusLabel.toLowerCase()} logs for this date`}
                          </p>
                          {statusFilter !== 'ALL' && (
                            <button
                              onClick={() => setStatusFilter('ALL')}
                              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                            >
                              Show all statuses
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => {
                      const tone = TONES[avatarTone(log.name)];

                      // Compute duration
                      let duration = '—';
                      if (log.checkinAt && log.checkoutAt) {
                        const diff =
                          (new Date(log.checkoutAt).getTime() -
                            new Date(log.checkinAt).getTime()) /
                          1000 / 60;
                        if (diff > 0) {
                          const h = Math.floor(diff / 60);
                          const m = Math.floor(diff % 60);
                          duration = h > 0 ? `${h}h ${m}m` : `${m}m`;
                        }
                      }

                      return (
                        <tr
                          key={log.id}
                          className="hover:bg-slate-50/60 transition-colors group"
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
                                <p className="text-sm font-medium text-slate-700 truncate">
                                  {log.name}
                                </p>
                                <p className="text-xs text-slate-400 mt-0.5 truncate">
                                  {log.designation || '—'}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <StatusBadge status={log.status} />
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700 tabular-nums whitespace-nowrap">
                              <span>{log.checkin || '—'}</span>
                              <ArrowRight size={11} className="text-slate-300 flex-shrink-0" />
                              <span>{log.checkout || '—'}</span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5 tabular-nums">
                              {duration}
                            </p>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center justify-center gap-2">
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
                          <td className="px-4 py-3.5 text-right">
                            <button
                              onClick={async () => {
                                try {
                                  const [y, m] = date.split('-').map(Number);
                                  const res = await api.get(
                                    `/reports/employee-pdf?employeeId=${log.id}&year=${y}&month=${m}`,
                                    { responseType: 'blob' }
                                  );
                                  const url = window.URL.createObjectURL(new Blob([res.data]));
                                  const link = document.createElement('a');
                                  link.href = url;
                                  link.setAttribute('download', `${log.name}-attendance-${date}.pdf`);
                                  document.body.appendChild(link);
                                  link.click();
                                  link.remove();
                                } catch (err) {
                                  console.error('PDF download failed:', err);
                                  toast.error('Failed to download the report.');
                                }
                              }}
                              className="p-1.5 rounded-lg btn-ghost"
                              title="Download Monthly Report"
                            >
                              <FileText size={14} />
                            </button>
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
    </DashboardLayout>
  );
}