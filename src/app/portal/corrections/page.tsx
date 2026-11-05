'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import {
  FileCheck,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  Loader2,
  X,
} from 'lucide-react';

interface CorrectionRequest {
  id: string;
  recordId: string;
  requestedCheckin?: string | null;
  requestedCheckout?: string | null;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewNote?: string | null;
  createdAt: string;
  record?: {
    date: string;
    checkinTime?: string | null;
    checkoutTime?: string | null;
  };
}

interface AttendanceOption {
  id: string;
  date: string;
  checkinTime?: string | null;
  checkoutTime?: string | null;
}

function formatTime(isoString?: string | null) {
  if (!isoString) return '--:--';
  const d = new Date(isoString);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return d.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function extractErrorMessage(err: unknown, defaultMsg: string): string {
  const errorObj = err as { response?: { data?: { message?: string } }; message?: string };
  return errorObj?.response?.data?.message || errorObj?.message || defaultMsg;
}

function CorrectionsContent() {
  const searchParams = useSearchParams();
  const prefillRecordId = searchParams.get('recordId') || '';
  const prefillDate = searchParams.get('date') || '';

  const [corrections, setCorrections] = useState<CorrectionRequest[]>([]);
  const [recentRecords, setRecentRecords] = useState<AttendanceOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [selectedRecordId, setSelectedRecordId] = useState(prefillRecordId);
  const [requestedInTime, setRequestedInTime] = useState('09:00');
  const [requestedOutTime, setRequestedOutTime] = useState('18:00');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showModal, setShowModal] = useState(() => Boolean(prefillRecordId));

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

  useEffect(() => {
    if (!recentRecords.length) return;

    if (prefillRecordId) {
      setSelectedRecordId(prefillRecordId);
      return;
    }

    if (prefillDate) {
      const sameDateRecord = recentRecords.find((record) => {
        if (!record.date) return false;
        return new Date(record.date).toISOString().slice(0, 10) === new Date(prefillDate).toISOString().slice(0, 10);
      });
      if (sameDateRecord) setSelectedRecordId(sameDateRecord.id);
    }
  }, [recentRecords, prefillDate, prefillRecordId]);

  const selectedRecord = recentRecords.find((r) => r.id === selectedRecordId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!selectedRecordId) {
      setErrorMsg('Please select an attendance record to correct.');
      return;
    }
    if (reason.trim().length < 5) {
      setErrorMsg('Reason must be at least 5 characters long.');
      return;
    }

    setSubmitting(true);
    try {
      const recordDate = selectedRecord?.date
        ? new Date(selectedRecord.date).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];

      const checkinIso = requestedInTime
        ? new Date(`${recordDate}T${requestedInTime}:00Z`).toISOString()
        : undefined;

      const checkoutIso = requestedOutTime
        ? new Date(`${recordDate}T${requestedOutTime}:00Z`).toISOString()
        : undefined;

      await api.post('/corrections/request', {
        recordId: selectedRecordId,
        requestedCheckin: checkinIso,
        requestedCheckout: checkoutIso,
        reason: reason.trim(),
      });

      setSuccessMsg('Correction request submitted successfully!');
      setShowModal(false);
      setReason('');
      await loadData();
    } catch (err: unknown) {
      console.error('Submit correction error:', err);
      setErrorMsg(extractErrorMessage(err, 'Failed to submit correction request.'));
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
          onClick={() => {
            setErrorMsg('');
            setShowModal(true);
          }}
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
              const reqDate = item.record?.date || item.createdAt;

              return (
                <div key={item.id} className="p-5 hover:bg-slate-50/80 transition flex flex-col md:flex-row md:items-center justify-between gap-4">
                  
                  {/* Left: Date & Status */}
                  <div className="space-y-1 min-w-[200px]">
                    <div className="font-bold text-slate-900 text-sm">
                      {formatDate(reqDate)}
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

                  {/* Middle: Proposed Times */}
                  <div className="flex items-center gap-6 text-xs sm:text-sm bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Proposed In</span>
                      <span className="font-bold text-slate-800">{formatTime(item.requestedCheckin)}</span>
                    </div>

                    <ArrowRight size={16} className="text-slate-300" />

                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Proposed Out</span>
                      <span className="font-bold text-slate-800">{formatTime(item.requestedCheckout)}</span>
                    </div>
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
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              
              {/* Select Attendance Date / Record */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Select Attendance Date
                </label>
                <select
                  required
                  value={selectedRecordId}
                  onChange={(e) => setSelectedRecordId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                >
                  <option value="">-- Choose an attendance day --</option>
                  {recentRecords.map((r) => (
                    <option key={r.id} value={r.id}>
                      {formatDate(r.date)} (Current In: {formatTime(r.checkinTime)} | Out: {formatTime(r.checkoutTime)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Proposed Check-in & Check-out times */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Correct Check-in
                  </label>
                  <input
                    type="time"
                    required
                    value={requestedInTime}
                    onChange={(e) => setRequestedInTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Correct Check-out
                  </label>
                  <input
                    type="time"
                    required
                    value={requestedOutTime}
                    onChange={(e) => setRequestedOutTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Reason for Correction (min 5 characters)
                </label>
                <textarea
                  rows={3}
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Device was out of battery when leaving the office..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
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
