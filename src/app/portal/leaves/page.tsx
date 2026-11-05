'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  CalendarDays,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  Paperclip,
  Upload,
  Calendar,
  AlertCircle,
  Loader2,
  X,
  Users,
} from 'lucide-react';

export type LeaveType = 'CASUAL' | 'SICK' | 'VACATION' | 'OTHER';
export type LeaveDuration = 'FULL_DAY' | 'FIRST_HALF' | 'SECOND_HALF';

interface LeaveRequestItem {
  id: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  duration: LeaveDuration;
  daysCount?: number;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewNote?: string | null;
  hasAttachment?: boolean;
  createdAt: string;
}

interface LeaveBalanceCategory {
  total: number;
  used: number;
  remaining: number;
}

interface LeaveBalancesResponse {
  sick?: LeaveBalanceCategory;
  casual?: LeaveBalanceCategory;
  vacation?: LeaveBalanceCategory;
  otherUsed?: number;
}

interface CalendarLeaveItem {
  employeeName?: string;
  type?: string;
  duration?: string;
  date?: string;
}

function toDateKey(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function monthBounds(cursor: Date) {
  const year = cursor.getUTCFullYear();
  const month = cursor.getUTCMonth();
  return {
    from: new Date(Date.UTC(year, month, 1)),
    to: new Date(Date.UTC(year, month + 1, 0)),
  };
}

function extractErrorMessage(err: unknown, defaultMsg: string): string {
  const errorObj = err as { response?: { data?: { message?: string } }; message?: string };
  return errorObj?.response?.data?.message || errorObj?.message || defaultMsg;
}

export default function MyLeavesPage() {
  const [activeTab, setActiveTab] = useState<'MY_LEAVES' | 'TEAM_CALENDAR'>('MY_LEAVES');
  const [balances, setBalances] = useState<LeaveBalancesResponse | null>(null);
  const [leaves, setLeaves] = useState<LeaveRequestItem[]>([]);
  const [calendarLeaves, setCalendarLeaves] = useState<CalendarLeaveItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showApplyModal, setShowApplyModal] = useState(false);

  // Form states
  const [formType, setFormType] = useState<LeaveType>('CASUAL');
  const [formDuration, setFormDuration] = useState<LeaveDuration>('FULL_DAY');
  const [formStartDate, setFormStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formEndDate, setFormEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formReason, setFormReason] = useState('');
  const [attachment, setAttachment] = useState<{
    fileName: string;
    mimeType: string;
    data: string;
  } | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const [balRes, leavesRes] = await Promise.all([
        api.get('/leaves/balances').catch(() => ({ data: null })),
        api.get('/leaves/me').catch(() => ({ data: [] })),
      ]);
      setBalances(balRes.data);
      setLeaves(leavesRes.data || []);
    } catch (err: unknown) {
      console.error('Failed to load leaves:', err);
      setErrorMsg('Could not load leave records.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCalendar = useCallback(async () => {
    try {
      const now = new Date();
      const { from, to } = monthBounds(now);
      const res = await api.get('/leaves/calendar', {
        params: { from: toDateKey(from), to: toDateKey(to) },
      });
      setCalendarLeaves(res.data?.leaves || []);
    } catch (err: unknown) {
      console.error('Failed to load calendar:', err);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
    loadCalendar();
  }, [loadData, loadCalendar]);

  // Handle file picker
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Attachment must be under 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64Data = result.split(',')[1];
      setAttachment({
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        data: base64Data,
      });
    };
    reader.readAsDataURL(file);
  };

  // Submit leave request
  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (formReason.trim().length < 5) {
      setErrorMsg('Please provide a reason with at least 5 characters.');
      return;
    }

    setSubmitting(true);
    try {
      const startIso = new Date(`${formStartDate}T00:00:00Z`).toISOString();
      const endIso =
        formDuration !== 'FULL_DAY'
          ? startIso
          : new Date(`${formEndDate}T23:59:59Z`).toISOString();

      await api.post('/leaves', {
        type: formType,
        duration: formDuration,
        startDate: startIso,
        endDate: endIso,
        reason: formReason.trim(),
        attachment: attachment || undefined,
      });

      setSuccessMsg('Leave request submitted successfully for approval!');
      setShowApplyModal(false);
      setFormReason('');
      setAttachment(null);
      await loadData();
    } catch (err: unknown) {
      console.error('Submit leave error:', err);
      setErrorMsg(extractErrorMessage(err, 'Failed to submit leave request.'));
    } finally {
      setSubmitting(false);
    }
  };

  // Download attachment helper
  const handleDownloadAttachment = async (leaveId: string) => {
    try {
      const res = await api.get(`/leaves/${leaveId}/attachment`);
      const { fileName, mimeType, data } = res.data;
      const byteCharacters = atob(data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: unknown) {
      console.error(err);
      alert('Could not download attachment.');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* Header & Apply Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <CalendarDays className="text-blue-600" size={26} />
            <span>Leaves &amp; Time Off</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Track annual, sick, and casual allowances, submit requests, and check team schedule.
          </p>
        </div>

        <button
          onClick={() => {
            setErrorMsg('');
            setShowApplyModal(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition shadow-sm shadow-blue-600/20"
        >
          <Plus size={18} />
          <span>Apply for Leave</span>
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

      {/* Leave Balances Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Casual Leave</span>
            <span className="p-1.5 rounded-xl bg-blue-50 text-blue-600 text-xs font-bold">Annual</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{balances?.casual?.remaining ?? '--'}</span>
            <span className="text-xs text-slate-400 font-medium">/ {balances?.casual?.total ?? '--'} days left</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            {balances?.casual?.used ?? 0} days used this cycle
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Sick Leave</span>
            <span className="p-1.5 rounded-xl bg-amber-50 text-amber-600 text-xs font-bold">Medical</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{balances?.sick?.remaining ?? '--'}</span>
            <span className="text-xs text-slate-400 font-medium">/ {balances?.sick?.total ?? '--'} days left</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            {balances?.sick?.used ?? 0} days used this cycle
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Vacation Leave</span>
            <span className="p-1.5 rounded-xl bg-emerald-50 text-emerald-600 text-xs font-bold">Holiday</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{balances?.vacation?.remaining ?? '--'}</span>
            <span className="text-xs text-slate-400 font-medium">/ {balances?.vacation?.total ?? '--'} days left</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            {balances?.vacation?.used ?? 0} days used this cycle
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Other / Unpaid</span>
            <span className="p-1.5 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold">Special</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{balances?.otherUsed ?? 0}</span>
            <span className="text-xs text-slate-400 font-medium">days taken</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Subject to HR policy
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab('MY_LEAVES')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition ${
            activeTab === 'MY_LEAVES'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <CalendarDays size={16} />
          <span>My Leave Requests ({leaves.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('TEAM_CALENDAR')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition ${
            activeTab === 'TEAM_CALENDAR'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users size={16} />
          <span>Department Calendar</span>
        </button>
      </div>

      {/* Tab 1: My Leave Requests Table */}
      {activeTab === 'MY_LEAVES' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-slate-400">
              <Loader2 size={32} className="animate-spin mx-auto mb-2 text-blue-600" />
              <p className="text-xs font-semibold">Loading leave requests...</p>
            </div>
          ) : leaves.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <CalendarDays size={36} className="mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-bold text-slate-700">No leave requests found</p>
              <p className="text-xs text-slate-400 mt-0.5">Click &ldquo;Apply for Leave&rdquo; above to request time off.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {leaves.map((leave) => {
                const startDateStr = new Date(leave.startDate).toLocaleDateString([], {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                });
                const endDateStr = new Date(leave.endDate).toLocaleDateString([], {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                });

                return (
                  <div key={leave.id} className="p-5 hover:bg-slate-50/80 transition flex flex-col md:flex-row md:items-center justify-between gap-4">
                    
                    {/* Left: Type, Duration, Dates */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">
                          {leave.type} LEAVE
                        </span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                          {leave.duration.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-2">
                        <Calendar size={13} className="text-slate-400" />
                        <span>{startDateStr === endDateStr ? startDateStr : `${startDateStr} – ${endDateStr}`}</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 max-w-md italic">
                        &ldquo;{leave.reason}&rdquo;
                      </p>
                    </div>

                    {/* Right: Status badge & Attachment */}
                    <div className="flex items-center gap-3 justify-end flex-shrink-0">
                      {leave.hasAttachment && (
                        <button
                          onClick={() => handleDownloadAttachment(leave.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                          title="Download medical note or attachment"
                        >
                          <Paperclip size={13} />
                          <span>Attachment</span>
                        </button>
                      )}

                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                          leave.status === 'APPROVED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : leave.status === 'REJECTED'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {leave.status === 'APPROVED' && <CheckCircle2 size={13} />}
                        {leave.status === 'REJECTED' && <XCircle size={13} />}
                        {leave.status === 'PENDING' && <Clock size={13} />}
                        <span>{leave.status}</span>
                      </span>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Team Calendar */}
      {activeTab === 'TEAM_CALENDAR' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6">
          <h3 className="font-bold text-slate-900 text-base mb-2">Team Leave Schedule</h3>
          <p className="text-xs text-slate-500 mb-6">
            View scheduled leaves across your team to plan ahead.
          </p>

          {calendarLeaves.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Users size={32} className="mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-semibold">No team leaves scheduled this month</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {calendarLeaves.map((item, idx) => (
                <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                  <div className="font-bold text-slate-900">{item.employeeName || 'Team Member'}</div>
                  <div className="text-slate-500">{item.type} Leave · {item.duration}</div>
                  <div className="text-blue-600 font-semibold">{item.date}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Apply for Leave Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Apply for Leave</h2>
              <button
                onClick={() => setShowApplyModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleApply} className="space-y-4 mt-4">
              
              {/* Type Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Leave Type
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['CASUAL', 'SICK', 'VACATION', 'OTHER'] as LeaveType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setFormType(t)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                        formType === t
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Duration
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: 'FULL_DAY', label: 'Full Day' },
                    { key: 'FIRST_HALF', label: 'First Half' },
                    { key: 'SECOND_HALF', label: 'Second Half' },
                  ].map((d) => (
                    <button
                      key={d.key}
                      type="button"
                      onClick={() => setFormDuration(d.key as LeaveDuration)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                        formDuration === d.key
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date pickers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formStartDate}
                    onChange={(e) => {
                      setFormStartDate(e.target.value);
                      if (formDuration !== 'FULL_DAY' || formEndDate < e.target.value) {
                        setFormEndDate(e.target.value);
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                {formDuration === 'FULL_DAY' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      required
                      min={formStartDate}
                      value={formEndDate}
                      onChange={(e) => setFormEndDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Reason for leave (min 5 characters)
                </label>
                <textarea
                  rows={3}
                  required
                  value={formReason}
                  onChange={(e) => setFormReason(e.target.value)}
                  placeholder="Provide context or details for management..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Supporting Document / Medical Note */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Attachment (Optional, e.g. medical note, PDF / Image, max 5MB)
                </label>
                <label className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition">
                  <Upload size={16} className="text-slate-400" />
                  <span className="text-xs font-semibold text-slate-600">
                    {attachment ? attachment.fileName : 'Choose file to attach'}
                  </span>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
                {attachment && (
                  <button
                    type="button"
                    onClick={() => setAttachment(null)}
                    className="text-[11px] text-red-600 font-semibold mt-1 hover:underline"
                  >
                    Remove attachment
                  </button>
                )}
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
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
                  <span>Submit Request</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
