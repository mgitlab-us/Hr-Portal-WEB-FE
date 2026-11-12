'use client';

import React, { useEffect, useState, useCallback, Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { APP_TIMEZONE, formatTime12hInZone, zonedWallTimeToIso } from '@/lib/tz';
import { useAuthStore } from '@/store/authStore';
import {
  FileCheck,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  ChevronRight,
  Loader2,
  X,
} from 'lucide-react';

interface AttendanceDate {
  date: string;
  checkinTime?: string | null;
  checkoutTime?: string | null;
}

interface CorrectionRequest {
  id: string;
  attendanceRecordId?: string;
  originalCheckin?: string | null;
  originalCheckout?: string | null;
  requestedCheckin?: string | null;
  requestedCheckout?: string | null;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewNote?: string | null;
  createdAt: string;
  attendanceRecord?: AttendanceDate;
}

interface AttendanceOption {
  id: string;
  date: string;
  checkinTime?: string | null;
  checkoutTime?: string | null;
}

/** Instant -> "09:00 AM" in the company timezone. */
function formatTime(isoString?: string | null, timeZone: string = APP_TIMEZONE) {
  if (!isoString) return '--:--';
  return formatTime12hInZone(isoString, timeZone);
}

/** Instant -> "HH:mm" for a native time input in the company timezone. */
function toTimeInputValue(value?: string | null, timeZone: string = APP_TIMEZONE) {
  if (!value) return '';
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(new Date(value));
  const hour = parts.find((part) => part.type === 'hour')?.value ?? '00';
  const minute = parts.find((part) => part.type === 'minute')?.value ?? '00';
  return `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
}

/** "YYYY-MM-DD" calendar key in the company timezone. */
function dateKeyInZone(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** Date-only value stored at 00:00Z -> "Tue, Nov 11, 2026". Formatted in UTC so it never shifts a day. */
function formatDateOnly(dateStr?: string | null) {
  if (!dateStr) return 'N/A';
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(dateStr));
}

/** Instant -> calendar date in Pakistan time (fallback when no attendance date exists). */
function formatInstantDate(isoString: string) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIMEZONE,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(isoString));
}

/** "YYYY-MM-DD" part of a date-only value. */
function dateOnlyKey(dateStr: string) {
  return new Date(dateStr).toISOString().slice(0, 10);
}

function extractErrorMessage(err: unknown, defaultMsg: string): string {
  const errorObj = err as { response?: { data?: { message?: string } }; message?: string };
  return errorObj?.response?.data?.message || errorObj?.message || defaultMsg;
}

function TimeComparison({
  label,
  checkin,
  checkout,
  timeZone,
  variant,
}: {
  label: string;
  checkin?: string | null;
  checkout?: string | null;
  timeZone: string;
  variant: 'current' | 'requested';
}) {
  const isRequested = variant === 'requested';
  return (
    <div
      className={`rounded-xl border px-3 py-2 ${
        isRequested ? 'border-blue-100 bg-blue-50' : 'border-slate-100 bg-white'
      }`}
    >
      <p
        className={`mb-1.5 text-[9px] font-bold uppercase tracking-widest ${
          isRequested ? 'text-blue-400' : 'text-slate-400'
        }`}
      >
        {label}
      </p>
      <div className="flex items-center gap-2">
        <div>
          <p
            className={`text-[8px] font-semibold uppercase ${
              isRequested ? 'text-blue-300' : 'text-slate-400'
            }`}
          >
            In
          </p>
          <p
            className={`whitespace-nowrap text-xs font-bold tabular-nums ${
              isRequested ? 'text-blue-700' : 'text-slate-600'
            }`}
          >
            {formatTime(checkin, timeZone)}
          </p>
        </div>
        <ChevronRight
          size={10}
          className={isRequested ? 'text-blue-200' : 'text-slate-300'}
        />
        <div>
          <p
            className={`text-[8px] font-semibold uppercase ${
              isRequested ? 'text-blue-300' : 'text-slate-400'
            }`}
          >
            Out
          </p>
          <p
            className={`whitespace-nowrap text-xs font-bold tabular-nums ${
              isRequested ? 'text-blue-700' : 'text-slate-600'
            }`}
          >
            {formatTime(checkout, timeZone)}
          </p>
        </div>
      </div>
    </div>
  );
}

function CorrectionsContent() {
  const searchParams = useSearchParams();
  const prefillRecordId = searchParams.get('recordId') || '';
  const prefillDate = searchParams.get('date') || '';
  const { user } = useAuthStore();
  const companyTz = user?.company?.timezone || APP_TIMEZONE;

  const [corrections, setCorrections] = useState<CorrectionRequest[]>([]);
  const [recentRecords, setRecentRecords] = useState<AttendanceOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states. Times start empty and are filled from the selected attendance
  // record as soon as the history loads.
  const [selectedRecordId, setSelectedRecordId] = useState(prefillRecordId);
  const [requestedInTime, setRequestedInTime] = useState('');
  const [requestedOutTime, setRequestedOutTime] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [modalError, setModalError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showModal, setShowModal] = useState(() => Boolean(prefillRecordId));

  const effectiveSelectedRecordId = useMemo(() => {
    if (selectedRecordId) return selectedRecordId;

    if (prefillRecordId) return prefillRecordId;

    if (prefillDate && recentRecords.length) {
      const targetKey = dateOnlyKey(prefillDate);
      const sameDateRecord = recentRecords.find(
        (record) => record.date && dateOnlyKey(record.date) === targetKey
      );
      return sameDateRecord?.id ?? '';
    }

    return '';
  }, [prefillDate, prefillRecordId, recentRecords, selectedRecordId]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const [corrRes, histRes] = await Promise.all([
        api.get('/corrections/my-requests').catch(() => ({ data: [] })),
        api.get('/attendance/history').catch(() => ({ data: [] })),
      ]);
      setCorrections(corrRes.data || []);
      setRecentRecords(histRes.data || []);
    } catch (err: unknown) {
      console.error('Failed to load corrections:', err);
      setErrorMsg('Could not load correction records.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  const selectedRecord = recentRecords.find((r) => r.id === effectiveSelectedRecordId);

  /**
   * Default the form to the current day's record (or the latest record when
   * today has none) and copy that record's actual times into the proposed
   * fields. Runs once the history is available or when URL prefill params change.
   */
  useEffect(() => {
    if (selectedRecordId || recentRecords.length === 0) return;

    const todayKey = dateKeyInZone(new Date(), companyTz);
    const preferred =
      recentRecords.find((record) => record.id === prefillRecordId) ??
      (prefillDate
        ? recentRecords.find(
            (record) => record.date && dateOnlyKey(record.date) === dateOnlyKey(prefillDate)
          )
        : undefined) ??
      recentRecords.find(
        (record) => record.date && dateOnlyKey(record.date) === todayKey
      ) ??
      recentRecords[0];

    if (!preferred) return;
    /* eslint-disable react-hooks/set-state-in-effect */
    setSelectedRecordId(preferred.id);
    setRequestedInTime(toTimeInputValue(preferred.checkinTime, companyTz));
    setRequestedOutTime(toTimeInputValue(preferred.checkoutTime, companyTz));
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [companyTz, prefillDate, prefillRecordId, recentRecords, selectedRecordId]);

  const originalInTime = toTimeInputValue(selectedRecord?.checkinTime, companyTz);
  const originalOutTime = toTimeInputValue(selectedRecord?.checkoutTime, companyTz);
  const checkinChanged =
    Boolean(selectedRecord) && requestedInTime !== '' && requestedInTime !== originalInTime;
  const checkoutChanged =
    Boolean(selectedRecord) && requestedOutTime !== '' && requestedOutTime !== originalOutTime;
  const hasChanges = checkinChanged || checkoutChanged;

  const applyRecord = (record?: AttendanceOption) => {
    setSelectedRecordId(record?.id ?? '');
    setRequestedInTime(toTimeInputValue(record?.checkinTime, companyTz));
    setRequestedOutTime(toTimeInputValue(record?.checkoutTime, companyTz));
    setModalError('');
  };

  const closeModal = () => {
    setShowModal(false);
    setModalError('');
  };

  const openModal = () => {
    setErrorMsg('');
    setModalError('');
    setShowModal(true);

    if (recentRecords.length === 0) return;
    const todayKey = dateKeyInZone(new Date(), companyTz);
    const preferred =
      recentRecords.find((record) => record.date && dateOnlyKey(record.date) === todayKey) ??
      recentRecords[0];
    applyRecord(preferred);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');
    setSuccessMsg('');

    if (!effectiveSelectedRecordId) {
      setModalError('Please select an attendance record to correct.');
      return;
    }
    if (!selectedRecord?.date) {
      setModalError('Selected attendance record has no date. Please reselect it.');
      return;
    }
    if (reason.trim().length < 5) {
      setModalError('Reason must be at least 5 characters long.');
      return;
    }

    // Only send the fields the employee actually changed. The approval step
    // keeps the stored value for any field that is omitted.
    const originalIn = toTimeInputValue(selectedRecord.checkinTime, companyTz);
    const originalOut = toTimeInputValue(selectedRecord.checkoutTime, companyTz);
    const correctIn = requestedInTime !== '' && requestedInTime !== originalIn;
    const correctOut = requestedOutTime !== '' && requestedOutTime !== originalOut;

    if (!correctIn && !correctOut) {
      setModalError('Change the check-in time, the check-out time, or both before submitting.');
      return;
    }

    setSubmitting(true);
    try {
      // Calendar date of the attendance record (date-only value stored at 00:00Z).
      const recordDate = dateOnlyKey(selectedRecord.date);

      // Convert the company wall-clock time to an exact UTC instant.
      const checkinIso = correctIn
        ? zonedWallTimeToIso(recordDate, requestedInTime, companyTz)
        : undefined;
      const checkoutIso = correctOut
        ? zonedWallTimeToIso(recordDate, requestedOutTime, companyTz)
        : undefined;

      // Compare the effective pair, including the field that is left unchanged.
      const effectiveCheckin = checkinIso ?? selectedRecord.checkinTime ?? null;
      const effectiveCheckout = checkoutIso ?? selectedRecord.checkoutTime ?? null;
      if (
        effectiveCheckin &&
        effectiveCheckout &&
        new Date(effectiveCheckout) <= new Date(effectiveCheckin)
      ) {
        setModalError('Check-out time must be after check-in time.');
        return;
      }

      await api.post('/corrections/request', {
        recordId: effectiveSelectedRecordId,
        ...(checkinIso ? { requestedCheckin: checkinIso } : {}),
        ...(checkoutIso ? { requestedCheckout: checkoutIso } : {}),
        reason: reason.trim(),
      });

      setSuccessMsg('Correction request submitted successfully!');
      closeModal();
      setReason('');
      await loadData();
    } catch (err: unknown) {
      console.error('Submit correction error:', err);
      setModalError(extractErrorMessage(err, 'Failed to submit correction request.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <FileCheck className="text-blue-600" size={26} />
            <span>Attendance Corrections</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Request rectifications for forgotten check-outs, device glitches, or offsite duty punches.
          </p>
        </div>

        <button
          onClick={openModal}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition shadow-sm shadow-blue-600/20"
        >
          <Plus size={18} />
          <span>New Correction Request</span>
        </button>
      </div>

      {/* Alerts */}
      {errorMsg && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 flex items-center justify-between text-sm text-red-800">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} className="text-red-600 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')} className="text-xs font-bold text-red-600">Dismiss</button>
        </div>
      )}

      {successMsg && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 flex items-center justify-between text-sm text-emerald-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-xs font-bold text-emerald-600">Dismiss</button>
        </div>
      )}

      {/* Corrections List */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            My Submitted Requests ({corrections.length})
          </span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <Loader2 size={32} className="animate-spin mx-auto mb-2 text-blue-600" />
            <p className="text-xs font-semibold">Loading correction requests...</p>
          </div>
        ) : corrections.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <FileCheck size={36} className="mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-bold text-slate-700">No correction requests found</p>
            <p className="text-xs text-slate-400 mt-0.5">Click &ldquo;New Correction Request&rdquo; to submit a missed punch fix.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {corrections.map((item) => {
              const attendanceDate = item.attendanceRecord?.date;
              const dateLabel = attendanceDate
                ? formatDateOnly(attendanceDate)
                : formatInstantDate(item.createdAt);

              // A single-field correction omits the untouched time, so fall back
              // to the original value to show the full effective result.
              const originalIn = item.originalCheckin ?? null;
              const originalOut = item.originalCheckout ?? null;
              const requestedIn = item.requestedCheckin ?? originalIn;
              const requestedOut = item.requestedCheckout ?? originalOut;

              return (
                <div key={item.id} className="p-5 hover:bg-slate-50/80 transition flex flex-col md:flex-row md:items-center justify-between gap-4">

                  {/* Left: Date & Status */}
                  <div className="space-y-1 min-w-[200px]">
                    <div className="font-bold text-slate-900 text-sm">
                      {dateLabel}
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          item.status === 'APPROVED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : item.status === 'REJECTED'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {item.status === 'APPROVED' && <CheckCircle2 size={12} />}
                        {item.status === 'REJECTED' && <XCircle size={12} />}
                        {item.status === 'PENDING' && <Clock size={12} />}
                        <span>{item.status}</span>
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 italic mt-1">
                      &ldquo;{item.reason}&rdquo;
                    </p>
                  </div>

                  {/* Middle: Original vs Requested */}
                  <div className="flex items-center gap-2">
                    <TimeComparison
                      label="Current"
                      checkin={originalIn}
                      checkout={originalOut}
                      timeZone={companyTz}
                      variant="current"
                    />
                    <ArrowRight size={14} className="text-slate-300 flex-shrink-0" />
                    <TimeComparison
                      label="Requested"
                      checkin={requestedIn}
                      checkout={requestedOut}
                      timeZone={companyTz}
                      variant="requested"
                    />
                  </div>

                  {/* Right: Review Notes if any */}
                  {item.reviewNote && (
                    <div className="text-xs text-slate-500 max-w-xs bg-blue-50/50 p-2.5 rounded-xl border border-blue-100">
                      <span className="font-bold text-blue-900 block mb-0.5">Manager Feedback:</span>
                      <span>{item.reviewNote}</span>
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* New Correction Request Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">

            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Request Attendance Correction</h2>
              <button
                onClick={closeModal}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 mt-4">

              {/* Attendance date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Attendance Date
                </label>
                <select
                  required
                  value={effectiveSelectedRecordId}
                  onChange={(e) => {
                    const record = recentRecords.find((r) => r.id === e.target.value);
                    applyRecord(record);
                  }}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                >
                  <option value="">-- Choose an attendance day --</option>
                  {recentRecords.map((r) => (
                    <option key={r.id} value={r.id}>
                      {formatDateOnly(r.date)} (Current In: {formatTime(r.checkinTime, companyTz)} | Out: {formatTime(r.checkoutTime, companyTz)})
                    </option>
                  ))}
                </select>
                {recentRecords.length === 0 && (
                  <p className="mt-1.5 text-[11px] font-medium text-amber-600">
                    No attendance records found. Check in first so there is a record to correct.
                  </p>
                )}
              </div>

              {/* Original times vs the proposed correction */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                      Check-in
                    </label>
                    <span className="text-[10px] font-medium text-slate-400">
                      Original:{' '}
                      <span className="font-bold text-slate-600 tabular-nums">
                        {formatTime(selectedRecord?.checkinTime, companyTz)}
                      </span>
                    </span>
                  </div>
                  <input
                    type="time"
                    step={60}
                    value={requestedInTime}
                    onChange={(e) => {
                      setRequestedInTime(e.target.value);
                      setModalError('');
                    }}
                    aria-label="Proposed check-in time"
                    className="mt-2 w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <p
                    className={`mt-1 text-[10px] font-semibold ${
                      checkinChanged ? 'text-blue-600' : 'text-slate-400'
                    }`}
                  >
                    {checkinChanged
                      ? 'Will be corrected'
                      : originalInTime
                      ? 'Same as original'
                      : 'No check-in recorded'}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                      Check-out
                    </label>
                    <span className="text-[10px] font-medium text-slate-400">
                      Original:{' '}
                      <span className="font-bold text-slate-600 tabular-nums">
                        {formatTime(selectedRecord?.checkoutTime, companyTz)}
                      </span>
                    </span>
                  </div>
                  <input
                    type="time"
                    step={60}
                    value={requestedOutTime}
                    onChange={(e) => {
                      setRequestedOutTime(e.target.value);
                      setModalError('');
                    }}
                    aria-label="Proposed check-out time"
                    className="mt-2 w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <p
                    className={`mt-1 text-[10px] font-semibold ${
                      checkoutChanged ? 'text-blue-600' : 'text-slate-400'
                    }`}
                  >
                    {checkoutChanged
                      ? 'Will be corrected'
                      : originalOutTime
                      ? 'Same as original'
                      : 'No check-out recorded'}
                  </p>
                </div>
              </div>

              {selectedRecord && !hasChanges && (
                <p className="text-[11px] font-medium text-amber-600">
                  Change the check-in or check-out time to submit a correction.
                </p>
              )}

              {/* Reason */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Reason for Correction (min 5 characters)
                </label>
                <textarea
                  rows={3}
                  required
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value);
                    setModalError('');
                  }}
                  placeholder="e.g. Device was out of battery when leaving the office..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {modalError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 flex items-start justify-between gap-3 text-xs text-red-800">
                  <div className="flex items-start gap-2">
                    <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
                    <span>{modalError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setModalError('')}
                    className="text-[11px] font-bold text-red-600"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !selectedRecord || !hasChanges}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition shadow-sm disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  <span>Submit Correction</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default function AttendanceCorrectionsPage() {
  return (
    <Suspense
      fallback={
        <div className="py-16 text-center">
          <Loader2 size={32} className="animate-spin mx-auto text-blue-600" />
        </div>
      }
    >
      <CorrectionsContent />
    </Suspense>
  );
}