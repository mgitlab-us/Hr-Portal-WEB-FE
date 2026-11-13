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
  Search,
  Building2,
  RotateCcw,
  UserPlus,
  Info,
  AlertTriangle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatDateDMY, formatDateRangeDMY, formatWeekdayDateDMY } from '@/lib/datetime';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuthStore } from '@/store/authStore';
import FilterChips from '@/components/filters/FilterChips';
import { useToast } from '@/components/ui/toast';

interface LeaveBalanceCategory {
  allowance: number;
  carryForward: number;
  total: number;
  used: number;
  unpaid?: number;
  remaining: number;
}

const formatDateOnly = (value?: string) => {
  if (!value) return '';
  return formatDateDMY(value);
};

function leaveRequestDayCount(req: LeaveRequest) {
  if (req.duration && req.duration !== 'FULL_DAY') return 0.5;
  const start = new Date(req.startDate).getTime();
  const end = new Date(req.endDate).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 0;
  return Math.floor((end - start) / 86_400_000) + 1;
}

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
    role?: string;
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
type PageTab = 'approvals' | 'calendar' | 'record';
type ApprovalQueue = 'MANAGER' | 'HR';
type OnBehalfKind = 'SICK' | 'CASUAL' | 'VACATION' | 'UNPAID' | 'ABSENT';

interface OnBehalfEmployee {
  id: string;
  name: string;
  role: string;
  departmentId?: string | null;
  department?: { id: string; name: string } | null;
  profile?: { employeeCode?: string | null; designation?: string | null } | null;
}

const ON_BEHALF_KINDS: Array<{
  value: OnBehalfKind;
  label: string;
  hint: string;
}> = [
  { value: 'SICK', label: 'Sick leave', hint: 'Uses the employee’s sick allowance.' },
  { value: 'CASUAL', label: 'Casual leave', hint: 'Uses the employee’s casual allowance.' },
  { value: 'VACATION', label: 'Annual / vacation', hint: 'Uses the employee’s annual allowance.' },
  {
    value: 'UNPAID',
    label: 'Unpaid leave',
    hint: 'Recorded as unpaid. It never consumes a paid allowance.',
  },
  {
    value: 'ABSENT',
    label: 'Absent',
    hint: 'Marks attendance ABSENT for past working days. No leave balance is used.',
  },
];

/** Company-timezone calendar key (YYYY-MM-DD) for date inputs and limits. */
function companyDateKey(date: Date, timeZone?: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timeZone || 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

function shiftDateKey(key: string, days: number): string {
  const date = new Date(`${key}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

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
  const { user } = useAuthStore();
  const isManager = user?.role === 'MANAGER';
  const canUseHrQueue = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  // Only staff with approval authority may record entries for someone else.
  const canRecordOnBehalf = isManager || canUseHrQueue;
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
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // "Record on behalf" form. Managers and HR admins use this when an employee
  // cannot file a request themselves (emergencies, technical issues, non-tech
  // staff). Entries are approved immediately.
  const companyTimeZone = user?.company?.timezone;
  const todayKey = companyDateKey(new Date(), companyTimeZone);
  const yesterdayKey = shiftDateKey(todayKey, -1);
  const [onBehalfEmployees, setOnBehalfEmployees] = useState<OnBehalfEmployee[]>([]);
  const [onBehalfEmployeesLoaded, setOnBehalfEmployeesLoaded] = useState(false);
  const [onBehalfEmployeeId, setOnBehalfEmployeeId] = useState('');
  const [onBehalfEmployeeSearch, setOnBehalfEmployeeSearch] = useState('');
  const [onBehalfKind, setOnBehalfKind] = useState<OnBehalfKind>('SICK');
  const [onBehalfStart, setOnBehalfStart] = useState(todayKey);
  const [onBehalfEnd, setOnBehalfEnd] = useState(todayKey);
  const [onBehalfDuration, setOnBehalfDuration] = useState<LeaveDuration>('FULL_DAY');
  const [onBehalfReason, setOnBehalfReason] = useState('');
  const [onBehalfSubmitting, setOnBehalfSubmitting] = useState(false);
  const [onBehalfError, setOnBehalfError] = useState('');

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
    api.get('/departments').then((res) => setDepartments(Array.isArray(res.data) ? res.data : [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (tab !== 'calendar') return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCalendar(monthCursor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, monthCursor]);

  useEffect(() => {
    if (tab !== 'record' || !canRecordOnBehalf || onBehalfEmployeesLoaded) return;
    let cancelled = false;
    api
      .get('/employees?scope=team')
      .then((res) => {
        if (cancelled) return;
        const list: OnBehalfEmployee[] = Array.isArray(res.data)
          ? res.data
          : res.data?.data || [];
        // The owner account never checks in, and nobody records their own leave
        // on their own behalf.
        setOnBehalfEmployees(
          list.filter((employee) => employee.role !== 'SUPER_ADMIN' && employee.id !== user?.id)
        );
        setOnBehalfEmployeesLoaded(true);
      })
      .catch((err) => {
        if (!cancelled) console.error('Failed to load employees for on-behalf entry:', err);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, canRecordOnBehalf, onBehalfEmployeesLoaded, user?.id]);

  const onBehalfIsAbsent = onBehalfKind === 'ABSENT';
  const onBehalfSingleDay = !onBehalfStart || !onBehalfEnd || onBehalfStart === onBehalfEnd;
  const onBehalfSelectedEmployee =
    onBehalfEmployees.find((employee) => employee.id === onBehalfEmployeeId) ?? null;

  const onBehalfFilteredEmployees = useMemo(() => {
    const query = onBehalfEmployeeSearch.trim().toLowerCase();
    if (!query) return onBehalfEmployees;
    return onBehalfEmployees.filter((employee) => {
      const code = employee.profile?.employeeCode || '';
      const department = employee.department?.name || '';
      return (
        employee.name.toLowerCase().includes(query) ||
        code.toLowerCase().includes(query) ||
        department.toLowerCase().includes(query)
      );
    });
  }, [onBehalfEmployees, onBehalfEmployeeSearch]);

  const onBehalfDayCount = useMemo(() => {
    if (!onBehalfStart || !onBehalfEnd || onBehalfEnd < onBehalfStart) return 0;
    const days =
      Math.floor(
        (Date.parse(`${onBehalfEnd}T00:00:00.000Z`) -
          Date.parse(`${onBehalfStart}T00:00:00.000Z`)) /
          86_400_000
      ) + 1;
    if (onBehalfIsAbsent) return days;
    return onBehalfSingleDay && onBehalfDuration !== 'FULL_DAY' ? 0.5 : days;
  }, [onBehalfStart, onBehalfEnd, onBehalfIsAbsent, onBehalfSingleDay, onBehalfDuration]);

  const handleOnBehalfKindChange = (kind: OnBehalfKind) => {
    setOnBehalfKind(kind);
    setOnBehalfError('');
    if (kind === 'ABSENT') {
      setOnBehalfDuration('FULL_DAY');
      if (!onBehalfStart || onBehalfStart >= todayKey) setOnBehalfStart(yesterdayKey);
      if (!onBehalfEnd || onBehalfEnd >= todayKey) setOnBehalfEnd(yesterdayKey);
    }
  };

  const resetOnBehalfForm = (kind: OnBehalfKind = onBehalfKind) => {
    const defaultDate = kind === 'ABSENT' ? yesterdayKey : todayKey;
    setOnBehalfReason('');
    setOnBehalfStart(defaultDate);
    setOnBehalfEnd(defaultDate);
    setOnBehalfDuration('FULL_DAY');
    setOnBehalfError('');
  };

  const handleCreateOnBehalf = async (event: React.FormEvent) => {
    event.preventDefault();
    setOnBehalfError('');

    if (!onBehalfEmployeeId) {
      setOnBehalfError('Select the employee this entry is for.');
      return;
    }
    if (!onBehalfStart || !onBehalfEnd) {
      setOnBehalfError('Choose a start and end date.');
      return;
    }
    if (onBehalfEnd < onBehalfStart) {
      setOnBehalfError('The end date cannot be before the start date.');
      return;
    }
    if (onBehalfIsAbsent && onBehalfStart >= todayKey) {
      setOnBehalfError('Absence can only be recorded for past dates.');
      return;
    }
    if (!onBehalfIsAbsent && onBehalfDuration !== 'FULL_DAY' && !onBehalfSingleDay) {
      setOnBehalfError('A half-day leave must start and end on the same date.');
      return;
    }
    if (onBehalfReason.trim().length < 5) {
      setOnBehalfError('Add a reason of at least 5 characters.');
      return;
    }

    setOnBehalfSubmitting(true);
    try {
      const { data } = await api.post('/leaves/on-behalf', {
        employeeId: onBehalfEmployeeId,
        kind: onBehalfKind,
        startDate: `${onBehalfStart}T00:00:00.000Z`,
        endDate: `${onBehalfEnd}T00:00:00.000Z`,
        reason: onBehalfReason.trim(),
        ...(onBehalfIsAbsent
          ? {}
          : { duration: onBehalfSingleDay ? onBehalfDuration : 'FULL_DAY' }),
      });

      if (onBehalfIsAbsent) {
        const dates: string[] = Array.isArray(data?.dates) ? data.dates : [];
        toast.success(
          dates.length > 0
            ? `Marked absent on ${dates.length} day${dates.length === 1 ? '' : 's'}.`
            : 'Absence recorded.'
        );
      } else {
        toast.success('Leave recorded and approved on the employee’s behalf.');
      }

      resetOnBehalfForm();
      await fetchQueues();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setOnBehalfError(e?.response?.data?.message || 'Unable to record this entry.');
    } finally {
      setOnBehalfSubmitting(false);
    }
  };

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

  const hasActiveFilters = !!search || departmentFilter !== 'ALL' || typeFilter !== 'ALL';
  const resetFilters = () => {
    setSearch('');
    setDepartmentFilter('ALL');
    setTypeFilter('ALL');
  };

  const filteredVisibleRequests = visibleRequests.filter((request) => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      request.employee.name.toLowerCase().includes(q) ||
      (request.employee.profile?.employeeCode &&
        request.employee.profile.employeeCode.toLowerCase().includes(q)) ||
      request.reason.toLowerCase().includes(q);
    const matchesDept =
      departmentFilter === 'ALL' ||
      request.employee.profile?.department === departmentFilter ||
      departments.find((d) => d.id === departmentFilter)?.name ===
        request.employee.profile?.department;
    return matchesSearch && matchesDept;
  });

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
              {isManager ? 'Manager' : 'Admin'} · Leave Requests
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
          {canRecordOnBehalf && (
            <button
              type="button"
              onClick={() => setTab('record')}
              className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition-colors ${
                tab === 'record'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <UserPlus size={14} />
              Record on behalf
            </button>
          )}
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
              {canUseHrQueue && (
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
              )}
              <span className="ml-auto text-[11px] font-medium text-slate-400">
                {queue === 'MANAGER'
                  ? 'Manager approval moves the request to HR.'
                  : 'HR approval is final and deducts the leave balance.'}
              </span>
            </div>

            {!loading && activeRequests.length > 0 && (
              <div className="rounded-xl border border-line bg-white px-4 py-3 shadow-2xs space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative flex-1 min-w-[220px]">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search employee name, code, reason…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 pl-9 pr-3 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-400"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 min-w-[170px]">
                    <Building2 size={14} className="text-slate-400 flex-shrink-0" />
                    <select
                      value={departmentFilter}
                      onChange={(e) => setDepartmentFilter(e.target.value)}
                      className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-medium text-slate-700 outline-none focus:border-blue-400"
                    >
                      <option value="ALL">All Departments</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.name}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                      <RotateCcw size={12} />
                      Reset
                    </button>
                  )}
                </div>
                <div className="pt-2 border-t border-slate-50 flex items-center justify-between flex-wrap gap-2">
                  <FilterChips
                    options={typeOptions}
                    value={typeFilter}
                    onChange={(value) => setTypeFilter(value as LeaveTypeFilter)}
                  />
                  <span className="text-xs text-slate-400">
                    Showing <span className="font-semibold text-slate-700">{filteredVisibleRequests.length}</span> request{filteredVisibleRequests.length === 1 ? '' : 's'}
                  </span>
                </div>
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
            ) : filteredVisibleRequests.length === 0 ? (
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
                {filteredVisibleRequests.map((req) => {
                  const color = avatarColor(req.employee.name);
                  const isProcessing = processingId === req.id;
                  const isManagerStage = req.approvalStage === 'MANAGER';
                  const isOwnerApproval =
                    req.approvalStage === 'HR' &&
                    (req.employee.role === 'ADMIN' || req.employee.role === 'MANAGER');
                  const requestDays = leaveRequestDayCount(req);
                  const typeBalance =
                    req.type === 'SICK'
                      ? req.balances?.sick
                      : req.type === 'CASUAL'
                      ? req.balances?.casual
                      : req.type === 'VACATION'
                      ? req.balances?.vacation
                      : undefined;
                  const overQuotaDays =
                    req.type === 'OTHER' || !req.balances
                      ? 0
                      : Math.max(0, requestDays - (typeBalance?.remaining ?? 0));

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
                          {isOwnerApproval && (
                            <span className="hidden rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-blue-700 sm:inline">
                              Owner approval
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
                            {isManagerStage
                              ? 'Approve & send to HR'
                              : isOwnerApproval
                                ? 'Approve as Owner'
                                : 'Approve'}
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
                            {req.balances.sick.unpaid ? (
                              <span className="text-rose-600"> · {req.balances.sick.unpaid} unpaid</span>
                            ) : null}
                          </span>
                          <span className={`rounded border px-2 py-0.5 text-[10px] font-bold ${
                            req.type === 'CASUAL'
                              ? 'border-blue-300 bg-blue-50 text-blue-800 ring-1 ring-blue-400/20'
                              : 'border-slate-200 bg-white text-slate-600'
                          }`}>
                            Casual: {req.balances.casual.remaining} / {req.balances.casual.total} days
                            {req.balances.casual.unpaid ? (
                              <span className="text-rose-600"> · {req.balances.casual.unpaid} unpaid</span>
                            ) : null}
                          </span>
                          <span className={`rounded border px-2 py-0.5 text-[10px] font-bold ${
                            req.type === 'VACATION'
                              ? 'border-emerald-300 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-400/20'
                              : 'border-slate-200 bg-white text-slate-600'
                          }`}>
                            Annual: {req.balances.vacation.remaining} / {req.balances.vacation.total} days
                            {req.balances.vacation.unpaid ? (
                              <span className="text-rose-600"> · {req.balances.vacation.unpaid} unpaid</span>
                            ) : null}
                          </span>
                          {(req.type === 'OTHER' || overQuotaDays > 0) && (
                            <span className="rounded border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                              {req.type === 'OTHER'
                                ? 'Other leave is unpaid'
                                : `${overQuotaDays} day${overQuotaDays === 1 ? '' : 's'} of this request will be unpaid`}
                            </span>
                          )}
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
        ) : tab === 'calendar' ? (
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
        ) : tab === 'record' && canRecordOnBehalf ? (
          <form
            onSubmit={handleCreateOnBehalf}
            className="space-y-4 rounded-xl border border-line bg-white p-4 shadow-2xs sm:p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-start gap-2.5">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <UserPlus size={15} />
                </div>
                <div>
                  <p className="text-sm font-bold text-ink">Record leave on behalf of an employee</p>
                  <p className="text-xs text-ink-soft">
                    Use this when staff cannot submit a request themselves. Additions are
                    approved immediately and written to the audit trail.
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-amber-700">
                <ShieldCheck size={11} />
                Audit logged
              </span>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-1.5">
                <label
                  htmlFor="onBehalfEmployeeSearch"
                  className="text-[10px] font-bold uppercase tracking-wider text-ink-soft"
                >
                  Employee
                </label>
                <div className="relative">
                  <Search
                    size={13}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    id="onBehalfEmployeeSearch"
                    type="text"
                    placeholder="Search name, code, department…"
                    value={onBehalfEmployeeSearch}
                    onChange={(e) => setOnBehalfEmployeeSearch(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs text-slate-700 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
                  />
                </div>
                <select
                  required
                  value={onBehalfEmployeeId}
                  onChange={(e) => setOnBehalfEmployeeId(e.target.value)}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 outline-none focus:border-blue-400"
                >
                  <option value="">Select an employee…</option>
                  {onBehalfFilteredEmployees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name}
                      {employee.profile?.employeeCode
                        ? ` · ${employee.profile.employeeCode}`
                        : ''}
                      {employee.department?.name ? ` · ${employee.department.name}` : ''}
                    </option>
                  ))}
                </select>
                {onBehalfEmployeesLoaded && onBehalfFilteredEmployees.length === 0 && (
                  <p className="text-[11px] text-slate-400">
                    {onBehalfEmployees.length === 0
                      ? 'No employees are in your department scope.'
                      : 'No employees match this search.'}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="onBehalfKind"
                  className="text-[10px] font-bold uppercase tracking-wider text-ink-soft"
                >
                  Type
                </label>
                <select
                  id="onBehalfKind"
                  value={onBehalfKind}
                  onChange={(e) => handleOnBehalfKindChange(e.target.value as OnBehalfKind)}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 outline-none focus:border-blue-400"
                >
                  {ON_BEHALF_KINDS.map((kind) => (
                    <option key={kind.value} value={kind.value}>
                      {kind.label}
                    </option>
                  ))}
                </select>
                <p className="flex items-start gap-1 text-[11px] text-slate-400">
                  <Info size={11} className="mt-0.5 flex-shrink-0" />
                  {ON_BEHALF_KINDS.find((kind) => kind.value === onBehalfKind)?.hint}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label
                    htmlFor="onBehalfStart"
                    className="text-[10px] font-bold uppercase tracking-wider text-ink-soft"
                  >
                    From
                  </label>
                  <input
                    id="onBehalfStart"
                    type="date"
                    required
                    value={onBehalfStart}
                    max={onBehalfIsAbsent ? yesterdayKey : undefined}
                    onChange={(e) => {
                      const value = e.target.value;
                      setOnBehalfStart(value);
                      if (!onBehalfEnd || onBehalfEnd < value) setOnBehalfEnd(value);
                    }}
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 outline-none focus:border-blue-400"
                  />
                </div>
                <div className="space-y-1.5">
                  <label
                    htmlFor="onBehalfEnd"
                    className="text-[10px] font-bold uppercase tracking-wider text-ink-soft"
                  >
                    To
                  </label>
                  <input
                    id="onBehalfEnd"
                    type="date"
                    required
                    value={onBehalfEnd}
                    min={onBehalfStart || undefined}
                    max={onBehalfIsAbsent ? yesterdayKey : undefined}
                    onChange={(e) => setOnBehalfEnd(e.target.value)}
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 outline-none focus:border-blue-400"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="onBehalfDuration"
                  className="text-[10px] font-bold uppercase tracking-wider text-ink-soft"
                >
                  Duration
                </label>
                <select
                  id="onBehalfDuration"
                  value={onBehalfIsAbsent ? 'FULL_DAY' : onBehalfDuration}
                  disabled={onBehalfIsAbsent || !onBehalfSingleDay}
                  onChange={(e) => setOnBehalfDuration(e.target.value as LeaveDuration)}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 outline-none focus:border-blue-400 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                >
                  <option value="FULL_DAY">Full day</option>
                  <option value="FIRST_HALF">First half · AM</option>
                  <option value="SECOND_HALF">Second half · PM</option>
                </select>
                <p className="text-[11px] text-slate-400">
                  {onBehalfIsAbsent
                    ? 'Absence always covers the full day.'
                    : !onBehalfSingleDay
                      ? 'Half days are only available for a single date.'
                      : `${onBehalfDayCount} day${onBehalfDayCount === 1 ? '' : 's'} will be recorded.`}
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="onBehalfReason"
                className="text-[10px] font-bold uppercase tracking-wider text-ink-soft"
              >
                Reason
              </label>
              <textarea
                id="onBehalfReason"
                required
                rows={3}
                value={onBehalfReason}
                onChange={(e) => setOnBehalfReason(e.target.value)}
                placeholder={
                  onBehalfIsAbsent
                    ? 'Why is this absence being recorded? e.g. No show, unapproved leave'
                    : 'Why is this leave being recorded on their behalf?'
                }
                className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
              />
            </div>

            {onBehalfError && (
              <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" />
                <span>{onBehalfError}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
              <div className="max-w-md space-y-0.5">
                {onBehalfSelectedEmployee && (
                  <p className="text-[11px] font-semibold text-slate-500">
                    {ON_BEHALF_KINDS.find((kind) => kind.value === onBehalfKind)?.label} ·{' '}
                    {onBehalfSelectedEmployee.name} ·{' '}
                    {formatDateRangeDMY(onBehalfStart, onBehalfEnd)}
                  </p>
                )}
                <p className="text-[11px] text-slate-400">
                  {onBehalfIsAbsent
                    ? 'Writes ABSENT to attendance for past working days. Weekends and holidays are skipped, and days that already have attendance or approved leave are rejected.'
                    : 'The request is created already approved, the balance is deducted, and attendance is updated for full days.'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setOnBehalfEmployeeId('');
                    setOnBehalfEmployeeSearch('');
                    resetOnBehalfForm();
                  }}
                  className="btn-ghost rounded-lg px-3 py-1.5 text-xs font-semibold"
                >
                  Clear
                </button>
                <button
                  type="submit"
                  disabled={onBehalfSubmitting}
                  className="btn-primary flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-semibold shadow-2xs disabled:opacity-70"
                >
                  {onBehalfSubmitting ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Check size={13} />
                  )}
                  {onBehalfIsAbsent ? 'Record absence' : 'Record leave'}
                </button>
              </div>
            </div>
          </form>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
