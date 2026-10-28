'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  MessageSquare,
  Loader2,
  Check,
  X,
  Plane,
  Briefcase,
  ShieldCheck,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Paperclip,
  Download,
  ListChecks,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatDateDMY, formatWeekdayDateDMY } from '@/lib/datetime';
import DashboardLayout from '@/components/layout/DashboardLayout';
import FilterChips from '@/components/filters/FilterChips';
import { useToast } from '@/components/ui/toast';

interface LeaveBalanceCategory {
  allowance: number;
  carryForward: number;
  total: number;
  used: number;
  remaining: number;
}

const formatDateOnly = (value?: string) => {
  if (!value) return '';
  return formatDateDMY(value);
};

interface LeaveBalances {
  year: number;
  cycleStart: string;
  cycleEnd: string;
  source?: 'DEPARTMENT' | 'COMPANY';
  departmentName?: string | null;
  sick: LeaveBalanceCategory;
  casual: LeaveBalanceCategory;
  vacation: LeaveBalanceCategory;
  other: { used: number };
}

interface LeaveAttachment {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
}

type LeaveDuration = 'FULL_DAY' | 'FIRST_HALF' | 'SECOND_HALF';

interface LeaveRequest {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  duration?: LeaveDuration;
  approvalStage?: 'MANAGER' | 'HR' | 'COMPLETE';
  createdAt: string;
  attachment?: LeaveAttachment | null;
  employee: {
    name: string;
    profile?: {
      employeeCode: string;
      department: string;
    };
  };
  balances?: LeaveBalances;
}

interface CalendarLeave {
  id: string;
  type: string;
  duration: LeaveDuration;
  startDate: string;
  endDate: string;
  employee: {
    id: string;
    name: string;
    profile?: { employeeCode: string; designation: string | null } | null;
    department?: { name: string } | null;
  };
}

type LeaveTypeFilter = 'ALL' | 'SICK' | 'CASUAL' | 'VACATION' | 'OTHER';
type PageTab = 'approvals' | 'calendar';
type ApprovalQueue = 'MANAGER' | 'HR';

const formatDate = (dateStr: string) => formatWeekdayDateDMY(dateStr);

const AVATAR_COLORS = [
  '#6366F1', '#0D9E7A', '#F59E0B', '#E8405A', '#8B5CF6', '#2563EB',
];
function avatarColor(name: string) {
  return AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function normalizeLeaveType(type: string): Exclude<LeaveTypeFilter, 'ALL'> {
  const value = type.toUpperCase();
  if (value.includes('SICK')) return 'SICK';
  if (value.includes('CASUAL')) return 'CASUAL';
  if (value.includes('VACATION') || value.includes('ANNUAL')) return 'VACATION';
  return 'OTHER';
}

function durationLabel(duration?: LeaveDuration) {
  if (duration === 'FIRST_HALF') return 'First half · AM';
  if (duration === 'SECOND_HALF') return 'Second half · PM';
  return 'Full day';
}

function calendarChipLabel(duration?: LeaveDuration) {
  if (duration === 'FIRST_HALF') return 'AM';
  if (duration === 'SECOND_HALF') return 'PM';
  return '';
}

const TYPE_STYLES: Record<string, { chip: string; dot: string }> = {
  SICK: { chip: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-400' },
  CASUAL: { chip: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-400' },
  VACATION: { chip: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-400' },
  OTHER: { chip: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400' },
};

function typeStyle(type: string) {
  return TYPE_STYLES[normalizeLeaveType(type)] ?? TYPE_STYLES.OTHER;
}

function toDateKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

function monthBounds(cursor: Date) {
  const year = cursor.getUTCFullYear();
  const month = cursor.getUTCMonth();
  return {
    from: new Date(Date.UTC(year, month, 1)),
    to: new Date(Date.UTC(year, month + 1, 0)),
  };
}

export default function LeavesPage() {
  const { toast } = useToast();
  const [tab, setTab] = useState<PageTab>('approvals');
  const [queue, setQueue] = useState<ApprovalQueue>('MANAGER');
  const [managerRequests, setManagerRequests] = useState<LeaveRequest[]>([]);
  const [hrRequests, setHrRequests] = useState<LeaveRequest[]>([]);
  const [calendarLeaves, setCalendarLeaves] = useState<CalendarLeave[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [monthCursor, setMonthCursor] = useState(() => {
    const now = new Date();
    return new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
  });
  const [typeFilter, setTypeFilter] = useState<LeaveTypeFilter>('ALL');
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchQueues = async () => {
    try {
      const [managerRes, hrRes] = await Promise.all([
        api.get('/leaves/manager/pending').catch(() => ({ data: [] })),
        api.get('/leaves/admin/pending').catch(() => ({ data: [] })),
      ]);
      setManagerRequests(managerRes.data || []);
      setHrRequests(hrRes.data || []);
    } catch (err) {
      console.error('Failed to fetch leaves:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCalendar = async (cursor = monthCursor) => {
    setCalendarLoading(true);
    try {
      const { from, to } = monthBounds(cursor);
      const res = await api.get('/leaves/calendar', {
        params: { from: toDateKey(from), to: toDateKey(to) },
      });
      setCalendarLeaves(res.data?.leaves || []);
    } catch (err) {
      console.error('Failed to fetch team calendar:', err);
      toast.error('Unable to load the team leave calendar.');
    } finally {
      setCalendarLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchQueues();
  }, []);

  useEffect(() => {
    if (tab !== 'calendar') return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCalendar(monthCursor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, monthCursor]);

  const handleReview = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    setProcessingId(id);
    try {
      await api.put(`/leaves/${id}/review`, { status });
      toast.success(
        status === 'APPROVED'
          ? queue === 'MANAGER'
            ? 'Leave approved and sent to HR for final approval.'
            : 'Leave request approved.'
          : 'Leave request rejected.'
      );
      await fetchQueues();
      if (tab === 'calendar') await fetchCalendar();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || 'Action failed. Check your approval permissions.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDownloadAttachment = async (request: LeaveRequest) => {
    if (!request.attachment) return;
    try {
      const res = await api.get(`/leaves/${request.id}/attachment`);
      const binary = atob(res.data.data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
      const url = URL.createObjectURL(
        new Blob([bytes], { type: res.data.mimeType || request.attachment.mimeType })
      );
      const link = document.createElement('a');
      link.href = url;
      link.download = res.data.fileName || request.attachment.fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Unable to download the medical note.');
    }
  };

  const activeRequests = queue === 'MANAGER' ? managerRequests : hrRequests;
  const pendingCount = managerRequests.length + hrRequests.length;

  const typeCounts = activeRequests.reduce(
    (acc, request) => {
      acc[normalizeLeaveType(request.type)] += 1;
      return acc;
    },
    { SICK: 0, CASUAL: 0, VACATION: 0, OTHER: 0 }
  );

  const typeOptions = [
    { label: 'All types', value: 'ALL', count: activeRequests.length },
    { label: 'Sick', value: 'SICK', count: typeCounts.SICK },
    { label: 'Casual', value: 'CASUAL', count: typeCounts.CASUAL },
    { label: 'Vacation', value: 'VACATION', count: typeCounts.VACATION },
    { label: 'Other', value: 'OTHER', count: typeCounts.OTHER },
  ];

  const visibleRequests =
    typeFilter === 'ALL'
      ? activeRequests
      : activeRequests.filter((request) => normalizeLeaveType(request.type) === typeFilter);

  const calendarCells = useMemo(() => {
    const year = monthCursor.getUTCFullYear();
    const month = monthCursor.getUTCMonth();
    const firstDay = new Date(Date.UTC(year, month, 1)).getUTCDay();
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const cells: Array<{ date: Date; inMonth: boolean }> = [];

    for (let i = 0; i < firstDay; i += 1) {
      cells.push({
        date: new Date(Date.UTC(year, month, i - firstDay + 1)),
        inMonth: false,
      });
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push({ date: new Date(Date.UTC(year, month, day)), inMonth: true });
    }
    while (cells.length % 7 !== 0) {
      const last = cells[cells.length - 1].date;
      cells.push({
        date: new Date(last.getTime() + 24 * 60 * 60 * 1000),
        inMonth: false,
      });
    }
    return cells;
  }, [monthCursor]);

  const leavesForDay = (date: Date) => {
    const key = toDateKey(date);
    return calendarLeaves.filter((leave) => {
      const start = leave.startDate.slice(0, 10);
      const end = leave.endDate.slice(0, 10);
      return start <= key && end >= key;
    });
  };

  const monthLabel = monthCursor.toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-canvas p-5 lg:p-7 space-y-5">

        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-bold text-[#5B6FA8] uppercase tracking-wider mb-1">
              Admin · Leave Requests
            </p>
            <h1 className="text-2xl font-bold text-ink tracking-tight">
              Leave Management
            </h1>
            <p className="text-xs text-ink-soft mt-0.5">
              Review time-off requests and see who is away across the team.
            </p>
          </div>
          {pendingCount > 0 && (
            <div className="flex items-center gap-2 self-start rounded-lg border border-line bg-white px-3 py-1.5 shadow-2xs">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
                {pendingCount} awaiting approval
              </span>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-white p-2 shadow-2xs">
          <button
            type="button"
            onClick={() => setTab('approvals')}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition-colors ${
              tab === 'approvals'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <ListChecks size={14} />
            Approvals
          </button>
          <button
            type="button"
            onClick={() => setTab('calendar')}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition-colors ${
              tab === 'calendar'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <CalendarDays size={14} />
            Team calendar
          </button>
        </div>

        {tab === 'approvals' ? (
          <>
            {/* Approval queue switch */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setQueue('MANAGER');
                  setTypeFilter('ALL');
                }}
                className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                  queue === 'MANAGER'
                    ? 'border-blue-200 bg-blue-50 text-blue-700'
                    : 'border-line bg-white text-slate-500 hover:border-slate-300'
                }`}
              >
                My team · {managerRequests.length}
              </button>
              <button
                type="button"
                onClick={() => {
                  setQueue('HR');
                  setTypeFilter('ALL');
                }}
                className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                  queue === 'HR'
                    ? 'border-blue-200 bg-blue-50 text-blue-700'
                    : 'border-line bg-white text-slate-500 hover:border-slate-300'
                }`}
              >
                HR final approval · {hrRequests.length}
              </button>
              <span className="ml-auto text-[11px] font-medium text-slate-400">
                {queue === 'MANAGER'
                  ? 'Manager approval moves the request to HR.'
                  : 'HR approval is final and deducts the leave balance.'}
              </span>
            </div>

            {!loading && activeRequests.length > 0 && (
              <div className="rounded-xl border border-line bg-white px-4 py-3 shadow-2xs">
                <FilterChips
                  options={typeOptions}
                  value={typeFilter}
                  onChange={(value) => setTypeFilter(value as LeaveTypeFilter)}
                />
              </div>
            )}

            {/* Body */}
            {loading ? (
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
              </div>
            ) : activeRequests.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-xl border border-line bg-white p-14 text-center shadow-2xs">
                <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-lg border border-emerald-100 bg-emerald-50 text-emerald-600">
                  <CheckCircle2 size={18} />
                </div>
                <p className="text-sm font-bold text-ink">All caught up</p>
                <p className="max-w-xs text-xs text-ink-soft">
                  {queue === 'MANAGER'
                    ? 'No leave requests are waiting for your manager approval.'
                    : 'No leave requests are waiting for HR final approval.'}
                </p>
              </div>
            ) : visibleRequests.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-100 bg-white p-16 text-center">
                <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                  <Plane size={18} className="text-blue-500" />
                </div>
                <p className="text-sm font-semibold text-slate-700">No matching requests</p>
                <button
                  type="button"
                  onClick={() => setTypeFilter('ALL')}
                  className="text-xs font-semibold text-blue-600 transition-colors hover:text-blue-700"
                >
                  Show all leave types
                </button>
              </div>
            ) : (
              <div className="space-y-3.5">
                {visibleRequests.map((req) => {
                  const color = avatarColor(req.employee.name);
                  const isProcessing = processingId === req.id;
                  const isManagerStage = req.approvalStage === 'MANAGER';

                  return (
                    <div
                      key={req.id}
                      className="overflow-hidden rounded-xl border border-line bg-white transition-all duration-150 hover:border-slate-300 hover:shadow-xs"
                    >
                      <div className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:gap-6">
                        <div className="flex flex-shrink-0 items-center gap-3 lg:w-64">
                          <div
                            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white shadow-2xs"
                            style={{ backgroundColor: color }}
                          >
                            {getInitials(req.employee.name)}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-ink">
                              {req.employee.name}
                            </p>
                            <p className="mt-0.5 flex items-center gap-1 font-mono text-[10px] font-medium uppercase tracking-wider text-ink-soft">
                              <Briefcase size={10} />
                              {req.employee.profile?.department || 'Staff'} · #
                              {req.employee.profile?.employeeCode || 'EMP'}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-1 flex-col gap-4 lg:flex-row lg:items-center lg:gap-8">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                              <Plane size={14} />
                            </div>
                            <div>
                              <p className="mb-1 text-[10px] font-bold uppercase leading-none tracking-wider text-ink-soft">
                                Type
                              </p>
                              <p className="text-xs font-bold text-ink">{req.type}</p>
                              <p className="mt-0.5 text-[10px] font-medium text-slate-400">
                                {durationLabel(req.duration)}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-5">
                            <div>
                              <p className="mb-1 text-[10px] font-bold uppercase leading-none tracking-wider text-ink-soft">
                                Start Date
                              </p>
                              <p className="text-xs font-semibold text-slate-700">
                                {formatDate(req.startDate)}
                              </p>
                            </div>
                            <div className="h-4 w-px bg-line" />
                            <div>
                              <p className="mb-1 text-[10px] font-bold uppercase leading-none tracking-wider text-ink-soft">
                                End Date
                              </p>
                              <p className="text-xs font-semibold text-slate-700">
                                {formatDate(req.endDate)}
                              </p>
                            </div>
                          </div>

                          {req.attachment && (
                            <button
                              type="button"
                              onClick={() => handleDownloadAttachment(req)}
                              className="inline-flex items-center gap-1.5 self-start rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[10px] font-semibold text-slate-600 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                            >
                              <Paperclip size={11} />
                              Medical note
                              <Download size={10} />
                            </button>
                          )}
                        </div>

                        <div className="flex flex-shrink-0 items-center gap-2">
                          {isManagerStage && (
                            <span className="hidden rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-amber-700 sm:inline">
                              Stage 1 · Manager
                            </span>
                          )}
                          <button
                            onClick={() => handleReview(req.id, 'REJECTED')}
                            disabled={isProcessing}
                            className="btn-danger-ghost flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold"
                          >
                            <X size={13} />
                            Reject
                          </button>
                          <button
                            onClick={() => handleReview(req.id, 'APPROVED')}
                            disabled={isProcessing}
                            className="btn-primary flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-semibold shadow-2xs"
                          >
                            {isProcessing ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <Check size={13} />
                            )}
                            {isManagerStage ? 'Approve & send to HR' : 'Approve'}
                          </button>
                        </div>
                      </div>

                      {req.balances && (
                        <div className="flex flex-wrap items-center gap-2.5 border-t border-slate-100 bg-slate-50/60 px-5 py-2 text-[11px]">
                          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            <ShieldCheck size={12} className="text-blue-500" />
                            Applicant&apos;s balance:
                          </span>
                          <span className={`rounded border px-2 py-0.5 text-[10px] font-bold ${
                            req.type === 'SICK'
                              ? 'border-amber-300 bg-amber-50 text-amber-800 ring-1 ring-amber-400/20'
                              : 'border-slate-200 bg-white text-slate-600'
                          }`}>
                            Sick: {req.balances.sick.remaining} / {req.balances.sick.total} days
                          </span>
                          <span className={`rounded border px-2 py-0.5 text-[10px] font-bold ${
                            req.type === 'CASUAL'
                              ? 'border-blue-300 bg-blue-50 text-blue-800 ring-1 ring-blue-400/20'
                              : 'border-slate-200 bg-white text-slate-600'
                          }`}>
                            Casual: {req.balances.casual.remaining} / {req.balances.casual.total} days
                          </span>
                          <span className={`rounded border px-2 py-0.5 text-[10px] font-bold ${
                            req.type === 'VACATION'
                              ? 'border-emerald-300 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-400/20'
                              : 'border-slate-200 bg-white text-slate-600'
                          }`}>
                            Annual: {req.balances.vacation.remaining} / {req.balances.vacation.total} days
                          </span>
                          <span className="ml-auto text-[10px] font-medium text-slate-400">
                            Cycle ends {formatDateOnly(req.balances.cycleEnd)}
                          </span>
                        </div>
                      )}

                      <div className="flex items-start gap-3 border-t border-slate-100 bg-slate-50/30 px-5 py-2.5">
                        <MessageSquare size={12} className="mt-0.5 flex-shrink-0 text-slate-400" />
                        <p className="text-xs text-slate-600">
                          <span className="mr-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                            Reason:
                          </span>
                          {req.reason}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <div className="overflow-hidden rounded-xl border border-line bg-white shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setMonthCursor(
                      new Date(
                        Date.UTC(
                          monthCursor.getUTCFullYear(),
                          monthCursor.getUTCMonth() - 1,
                          1
                        )
                      )
                    )
                  }
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50"
                >
                  <ChevronLeft size={15} />
                </button>
                <p className="min-w-[150px] text-center text-sm font-bold text-ink">
                  {monthLabel}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    setMonthCursor(
                      new Date(
                        Date.UTC(
                          monthCursor.getUTCFullYear(),
                          monthCursor.getUTCMonth() + 1,
                          1
                        )
                      )
                    )
                  }
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-[10px] font-semibold text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-400" /> Sick
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-blue-400" /> Casual
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" /> Vacation
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-slate-400" /> Other
                </span>
              </div>
            </div>

            {calendarLoading ? (
              <div className="flex h-80 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/70">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <div
                      key={day}
                      className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400"
                    >
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7">
                  {calendarCells.map((cell, index) => {
                    const dayLeaves = cell.inMonth ? leavesForDay(cell.date) : [];
                    return (
                      <div
                        key={`${toDateKey(cell.date)}-${index}`}
                        className={`min-h-[104px] border-b border-r border-slate-100 p-1.5 ${
                          cell.inMonth ? 'bg-white' : 'bg-slate-50/40'
                        }`}
                      >
                        <div className="mb-1 flex items-center justify-between px-0.5">
                          <span
                            className={`text-[11px] font-bold ${
                              cell.inMonth ? 'text-slate-500' : 'text-slate-300'
                            }`}
                          >
                            {cell.date.getUTCDate()}
                          </span>
                          {dayLeaves.length > 0 && (
                            <span className="text-[9px] font-semibold text-slate-400">
                              {dayLeaves.length}
                            </span>
                          )}
                        </div>
                        <div className="space-y-0.5">
                          {dayLeaves.slice(0, 2).map((leave) => {
                            const style = typeStyle(leave.type);
                            const half = calendarChipLabel(leave.duration);
                            return (
                              <div
                                key={`${leave.id}-${toDateKey(cell.date)}`}
                                className={`truncate rounded border px-1 py-0.5 text-[9px] font-semibold ${style.chip}`}
                                title={`${leave.employee.name} · ${leave.type}${half ? ` (${half})` : ''}`}
                              >
                                {leave.employee.name.split(' ')[0]}
                                {half ? ` · ${half}` : ''}
                              </div>
                            );
                          })}
                          {dayLeaves.length > 2 && (
                            <p className="px-1 text-[9px] font-semibold text-slate-400">
                              +{dayLeaves.length - 2} more
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {!calendarLoading && calendarLeaves.length === 0 && (
              <div className="border-t border-slate-100 px-4 py-4 text-center text-xs text-slate-400">
                No approved team leave in {monthLabel}.
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
