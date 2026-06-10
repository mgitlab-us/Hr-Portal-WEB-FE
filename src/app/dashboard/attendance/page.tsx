'use client';

import React, { useEffect, useState } from 'react';
import {
  Clock,
  Calendar,
  Search,
  Download,
  Loader2,
  CheckCircle2,
  Timer,
  UserMinus,
  X,
  FileText,
  MapPin,
} from 'lucide-react';
import { api } from '@/lib/api';
import DashboardLayout from '@/components/layout/DashboardLayout';

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
  checkoutLat?: number;
  checkoutLng?: number;
  color: string;
}

const AVATAR_COLORS = [
  { bg: '#ECEFFE', text: '#5B6EF5' },
  { bg: '#E0F7F1', text: '#0D9E7A' },
  { bg: '#FEF6E4', text: '#D97706' },
  { bg: '#F4EFFE', text: '#8B5CF6' },
  { bg: '#FEE9ED', text: '#E8405A' },
  { bg: '#E0F0FF', text: '#2563EB' },
];
function avatarColor(name: string) {
  const i = (name.charCodeAt(0) + (name.charCodeAt(1) || 0)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[i];
}

function StatusBadge({ status }: { status: string }) {
  const s = status?.toUpperCase();
  if (s === 'PRESENT' || s === 'ON-TIME')
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md uppercase tracking-wide">
        <CheckCircle2 size={9} /> On time
      </span>
    );
  if (s === 'LATE')
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-md uppercase tracking-wide">
        <Timer size={9} /> Late
      </span>
    );
  if (s === 'ABSENT')
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-500 bg-red-50 border border-red-100 px-2 py-0.5 rounded-md uppercase tracking-wide">
        <UserMinus size={9} /> Absent
      </span>
    );
  return (
    <span className="inline-flex items-center text-[10px] font-semibold text-slate-500 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md uppercase tracking-wide">
      {status}
    </span>
  );
}

function StatCard({
  label, value, icon: Icon, accent,
}: {
  label: string; value: number; icon: React.ElementType; accent: string;
}) {
  return (
    <div className="bg-white border border-slate-100 rounded-xl p-5 flex items-center gap-4">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${accent}14` }}
      >
        <Icon size={14} style={{ color: accent }} />
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

export default function AttendanceLogsPage() {
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [search, setSearch] = useState('');
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/attendance/logs/daily?date=${date}`);
      setLogs(res.data);
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
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
      alert('Failed to generate report. Only Admins can export data.');
    } finally {
      setExporting(null);
    }
  };

  const filteredLogs = logs.filter(
    (log) =>
      log.name.toLowerCase().includes(search.toLowerCase()) ||
      log.id.toLowerCase().includes(search.toLowerCase())
  );

  const present = logs.filter(
    (l) => l.status === 'PRESENT' || l.status === 'ON-TIME' || l.status === 'LATE'
  ).length;
  const late = logs.filter((l) => l.status === 'LATE').length;
  const absent = logs.filter((l) => l.status === 'ABSENT').length;

  const displayDate = new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6">

        {/* ── Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">
              Admin · Attendance
            </p>
            <h1 className="text-2xl font-semibold text-slate-800 tracking-tight">
              Attendance Logs
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">{displayDate}</p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm">
              <Calendar size={13} className="text-slate-400" />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-transparent text-slate-700 text-sm focus:outline-none"
              />
            </div>
            <button
              onClick={() => handleExport('excel')}
              disabled={!!exporting}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-800 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {exporting === 'excel'
                ? <Loader2 size={13} className="animate-spin" />
                : <Download size={13} />}
              Excel
            </button>
            <button
              onClick={() => handleExport('pdf')}
              disabled={!!exporting}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 shadow-sm"
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
          <StatCard label="Present" value={present} icon={CheckCircle2} accent="#0D9E7A" />
          <StatCard label="Late arrivals" value={late} icon={Timer} accent="#F59E0B" />
          <StatCard label="Absent" value={absent} icon={UserMinus} accent="#E8405A" />
        </div>

        {/* ── Table Card */}
        <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">

          {/* Toolbar */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
            <div className="relative flex-1 max-w-sm">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search staff name or ID…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-8 pr-8 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
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

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={20} className="text-slate-400 animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100">
                    <th className="px-5 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                      Staff Member
                    </th>
                    <th className="px-5 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-widest text-center">
                      Status
                    </th>
                    <th className="px-5 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                      Check-in
                    </th>
                    <th className="px-5 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                      Check-out
                    </th>
                    <th className="px-5 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-widest hidden lg:table-cell">
                      Duration
                    </th>
                    <th className="px-5 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-widest text-center">
                      Location
                    </th>
                    <th className="px-5 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-widest text-right">
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
                          <p className="text-sm text-slate-400">No logs for this date</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => {
                      const av = avatarColor(log.name);

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
                          duration = `${h}h ${m}m`;
                        }
                      }

                      return (
                        <tr
                          key={log.id}
                          className="hover:bg-slate-50/60 transition-colors group"
                        >
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold flex-shrink-0"
                                style={{ backgroundColor: av.bg, color: av.text }}
                              >
                                {log.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-slate-700">
                                  {log.name}
                                </p>
                                <p className="text-xs text-slate-400 mt-0.5">
                                  {log.designation || '—'}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <StatusBadge status={log.status} />
                          </td>
                          <td className="px-5 py-3.5">
                            <p className="text-sm font-medium text-slate-700 tabular-nums">
                              {log.checkin || '—'}
                            </p>
                          </td>
                          <td className="px-5 py-3.5">
                            <p className="text-sm font-medium text-slate-700 tabular-nums">
                              {log.checkout || '—'}
                            </p>
                          </td>
                          <td className="px-5 py-3.5 hidden lg:table-cell">
                            <p className="text-sm text-slate-500 tabular-nums">
                              {duration}
                            </p>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center justify-center gap-2">
                              {log.checkinLat && log.checkinLng && (
                                <a
                                  href={`https://www.google.com/maps?q=${log.checkinLat},${log.checkinLng}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="w-7 h-7 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-100 transition-colors"
                                  title="Check-in Location"
                                >
                                  <MapPin size={14} />
                                  <span className="text-[8px] font-bold absolute -top-1 -right-1 bg-white border border-emerald-200 rounded-full px-1">IN</span>
                                </a>
                              )}
                              {log.checkoutLat && log.checkoutLng && (
                                <a
                                  href={`https://www.google.com/maps?q=${log.checkoutLat},${log.checkoutLng}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="w-7 h-7 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-100 transition-colors"
                                  title="Check-out Location"
                                >
                                  <MapPin size={14} />
                                  <span className="text-[8px] font-bold absolute -top-1 -right-1 bg-white border border-indigo-200 rounded-full px-1">OUT</span>
                                </a>
                              )}
                              {!log.checkinLat && !log.checkoutLat && (
                                <span className="text-[10px] font-medium text-slate-300 italic">No GPS</span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-right">
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
                                  alert('Failed to download report.');
                                }
                              }}
                              className="p-1.5 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
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
    </DashboardLayout>
  );
}