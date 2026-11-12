'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import {
  CalendarCheck,
  Calendar,
  Download,
  FileCheck,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface AttendanceRecord {
  id: string;
  date: string;
  checkinTime?: string | null;
  checkoutTime?: string | null;
  status: string;
  dailySummary?: {
    totalWorkMinutes?: number;
    lateMinutes?: number;
    totalBreakMinutes?: number;
    netDeltaMinutes?: number;
  } | null;
  breakSessions?: Array<{
    id: string;
    startTime: string;
    endTime?: string | null;
  }>;
}

function formatTime(isoString?: string | null) {
  if (!isoString) return '--:--';
  const d = new Date(isoString);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDuration(totalMinutes?: number | null) {
  if (totalMinutes === null || totalMinutes === undefined || totalMinutes === 0) return '--';
  return `${Math.floor(totalMinutes / 60)}h ${Math.abs(totalMinutes % 60)}m`;
}

/** Compact label: 45 -> "45m", 60 -> "1h", 61 -> "1h 1m". */
function formatMinutesCompact(totalMinutes?: number | null) {
  const minutes = Math.round(totalMinutes ?? 0);
  if (minutes <= 0) return '0m';
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours === 0) return `${remainder}m`;
  if (remainder === 0) return `${hours}h`;
  return `${hours}h ${remainder}m`;
}

function formatSignedDuration(totalMinutes?: number | null) {
  if (totalMinutes === null || totalMinutes === undefined || totalMinutes === 0) return '0m';
  const sign = totalMinutes < 0 ? '-' : '+';
  const absoluteMinutes = Math.abs(totalMinutes);
  return `${sign}${Math.floor(absoluteMinutes / 60)}h ${absoluteMinutes % 60}m`;
}

function formatStatus(status: string) {
  return status.toLowerCase().replace(/_/g, ' ');
}

export default function MyAttendancePage() {
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMode, setFilterMode] = useState<'ALL' | 'ISSUES'>('ALL');
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await api.get('/attendance/history');
      setHistory(res.data || []);
    } catch (err: unknown) {
      console.error('Failed to load attendance history:', err);
      setErrorMsg('Failed to load your attendance records.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchHistory();
  }, [fetchHistory]);

  // Handle PDF report download
  const handleDownloadReport = async () => {
    try {
      setDownloadingPdf(true);
      const response = await api.get('/reports/my-monthly-pdf', {
        params: {
          year: selectedYear,
          month: selectedMonth,
        },
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `my-attendance-${selectedYear}-${String(selectedMonth).padStart(2, '0')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: unknown) {
      console.error('Download report error:', err);
      alert('Could not download your monthly PDF report right now.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  // Filter records
  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      if (item.date) {
        const itemDate = new Date(item.date);
        const matchesMonth =
          itemDate.getFullYear() === selectedYear && itemDate.getMonth() + 1 === selectedMonth;
        if (!matchesMonth) return false;
      }

      if (filterMode === 'ISSUES') {
        const isLate = (item.dailySummary?.lateMinutes || 0) > 0;
        const missedCheckout = !item.checkoutTime;
        return isLate || missedCheckout;
      }
      return true;
    });
  }, [history, selectedYear, selectedMonth, filterMode]);

  // Summary statistics
  const stats = useMemo(() => {
    const monthRecords = history.filter((item) => {
      if (!item.date) return false;
      const d = new Date(item.date);
      return d.getFullYear() === selectedYear && d.getMonth() + 1 === selectedMonth;
    });

    const totalDays = monthRecords.length;
    const daysPresent = monthRecords.filter((r) => r.status !== 'ABSENT' && r.status !== 'ON_LEAVE').length;
    const daysLate = monthRecords.filter((r) => (r.dailySummary?.lateMinutes || 0) > 0).length;
    const daysAbsent = monthRecords.filter((r) => r.status === 'ABSENT').length;
    const missedPunches = monthRecords.filter((r) => !r.checkoutTime).length;
    const totalMinutesWorked = monthRecords.reduce(
      (sum, r) => sum + (r.dailySummary?.totalWorkMinutes || 0),
      0
    );
    const totalNetMinutes = monthRecords.reduce(
      (sum, r) => sum + (r.dailySummary?.netDeltaMinutes || 0),
      0
    );

    return {
      totalDays,
      daysPresent,
      daysLate,
      daysAbsent,
      missedPunches,
      totalHours: `${Math.floor(totalMinutesWorked / 60)}h ${totalMinutesWorked % 60}m`,
      totalNet: totalNetMinutes,
      totalNetLabel:
        totalNetMinutes === 0
          ? '0h 0m'
          : `${Math.sign(totalNetMinutes) === -1 ? '-' : '+'}${Math.floor(Math.abs(totalNetMinutes) / 60)}h ${Math.abs(totalNetMinutes) % 60}m`,
    };
  }, [history, selectedYear, selectedMonth]);

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  const monthName = new Date(selectedYear, selectedMonth - 1, 1).toLocaleString('default', {
    month: 'long',
  });

  const kpis = [
    { label: 'Days present', value: String(stats.daysPresent), tone: 'text-slate-900' },
    { label: 'Days absent', value: String(stats.daysAbsent), tone: 'text-rose-600' },
    { label: 'Total work hours', value: stats.totalHours, tone: 'text-blue-600' },
    {
      label: 'Monthly net',
      value: stats.totalNetLabel,
      tone: stats.totalNet >= 0 ? 'text-emerald-600' : 'text-rose-600',
    },
    { label: 'Days late', value: String(stats.daysLate), tone: stats.daysLate > 0 ? 'text-amber-600' : 'text-slate-900' },
    {
      label: 'Missed checkouts',
      value: String(stats.missedPunches),
      tone: stats.missedPunches > 0 ? 'text-rose-600' : 'text-slate-900',
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* ── Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2.5 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
            <CalendarCheck className="flex-shrink-0 text-blue-600" size={24} />
            <span>My attendance</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Daily punches, working hours and monthly reports.
          </p>
        </div>

        <button
          type="button"
          onClick={handleDownloadReport}
          disabled={downloadingPdf}
          className="inline-flex w-full flex-shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-60 sm:w-auto"
        >
          {downloadingPdf ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Generating PDF…</span>
            </>
          ) : (
            <>
              <Download size={16} />
              <span>Download monthly PDF</span>
            </>
          )}
        </button>
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm font-medium text-red-700 sm:p-4"
        >
          {errorMsg}
        </div>
      )}

      {/* ── Month navigator + filter */}
      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-3 shadow-xs sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <div className="flex items-center justify-between gap-2 sm:justify-start">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="rounded-lg border border-line p-2 text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label="Previous month"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="min-w-[10rem] flex-1 rounded-lg bg-slate-50 px-4 py-2 text-center text-sm font-semibold text-slate-900 sm:flex-none">
            {monthName} {selectedYear}
          </div>
          <button
            type="button"
            onClick={handleNextMonth}
            className="rounded-lg border border-line p-2 text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label="Next month"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="grid grid-cols-2 rounded-lg bg-slate-100 p-1 sm:inline-grid">
          <button
            type="button"
            onClick={() => setFilterMode('ALL')}
            aria-pressed={filterMode === 'ALL'}
            className={`rounded-md px-4 py-1.5 text-xs font-semibold transition-colors ${
              filterMode === 'ALL'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All logs
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('ISSUES')}
            aria-pressed={filterMode === 'ISSUES'}
            className={`rounded-md px-4 py-1.5 text-xs font-semibold transition-colors ${
              filterMode === 'ISSUES'
                ? 'bg-white text-rose-600 shadow-xs'
                : 'text-slate-600 hover:text-rose-600'
            }`}
          >
            Needs attention
          </button>
        </div>
      </div>

      {/* ── KPI strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="rounded-2xl border border-line bg-white p-4 shadow-xs">
            <p className="text-xs text-slate-500">{kpi.label}</p>
            <p className={`mt-1 text-2xl font-semibold tabular-nums tracking-tight ${kpi.tone}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* ── Records */}
      <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-xs">
        <div className="flex items-center justify-between border-b border-line px-4 py-3.5 sm:px-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Attendance logs ({filteredHistory.length})
          </h2>
        </div>

        {loading ? (
          <div className="px-4 py-14 text-center text-slate-400">
            <Loader2 size={28} className="mx-auto mb-2 animate-spin text-blue-600" />
            <p className="text-sm font-medium">Loading attendance records…</p>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="px-4 py-14 text-center">
            <Calendar size={32} className="mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">No records for this period</p>
            <p className="mt-0.5 text-xs text-slate-500">Punches for this month will appear here automatically.</p>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {filteredHistory.map((item) => {
              const hasLate = (item.dailySummary?.lateMinutes || 0) > 0;
              const hasMissedCheckout = !item.checkoutTime;
              const hasIssue = hasLate || hasMissedCheckout;

              return (
                <li
                  key={item.id}
                  className="grid gap-4 px-4 py-4 transition-colors hover:bg-slate-50/70 sm:px-6 md:grid-cols-[minmax(11rem,1fr)_minmax(0,1.6fr)_auto] md:items-center md:gap-6"
                >
                  {/* Date + badges */}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{formatDate(item.date)}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex items-center rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold capitalize text-blue-700">
                        {formatStatus(item.status)}
                      </span>
                      {hasLate && (
                        <span className="inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                          {formatMinutesCompact(item.dailySummary?.lateMinutes)} late
                        </span>
                      )}
                      {hasMissedCheckout && (
                        <span className="inline-flex items-center rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                          Missed checkout
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Check-in / check-out / duration / break */}
                  <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">
                    <div>
                      <dt className="text-xs text-slate-500">Check in</dt>
                      <dd className="mt-0.5 font-semibold text-slate-900">{formatTime(item.checkinTime)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">Check out</dt>
                      <dd className={`mt-0.5 font-semibold ${hasMissedCheckout ? 'text-rose-600' : 'text-slate-900'}`}>
                        {item.checkoutTime ? formatTime(item.checkoutTime) : 'Missed'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">Duration</dt>
                      <dd className="mt-0.5 font-semibold text-blue-600">
                        {formatDuration(item.dailySummary?.totalWorkMinutes)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">Break</dt>
                      <dd className="mt-0.5 font-semibold text-amber-600">
                        {formatDuration(item.dailySummary?.totalBreakMinutes)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">Net</dt>
                      <dd
                        className={`mt-0.5 font-semibold ${
                          (item.dailySummary?.netDeltaMinutes ?? 0) >= 0
                            ? 'text-emerald-600'
                            : 'text-rose-600'
                        }`}
                      >
                        {formatSignedDuration(item.dailySummary?.netDeltaMinutes)}
                      </dd>
                    </div>
                  </dl>

                  {/* Action */}
                  <div className="md:justify-self-end">
                    <Link
                      href={`/portal/corrections?recordId=${item.id}&date=${item.date}`}
                      className={`inline-flex w-full items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 md:w-auto ${
                        hasIssue
                          ? 'border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-300 hover:bg-blue-100'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <FileCheck size={14} />
                      <span>Fix issue</span>
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}