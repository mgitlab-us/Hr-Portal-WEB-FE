'use client';
import React, { useEffect, useState } from 'react';
import {
  CheckCircle2, MessageSquare, ChevronRight, Loader2, Calendar, Check, X, ArrowRight, Search, Building2, RotateCcw,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatDayMonth, formatTime12h, formatWeekdayDateDMY } from '@/lib/datetime';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useToast } from '@/components/ui/toast';
import { useAuthStore } from '@/store/authStore';

interface CorrectionRequest {
  id: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvalStage?: 'MANAGER' | 'HR' | 'COMPLETE';
  originalCheckin: string | null;
  originalCheckout: string | null;
  requestedCheckin: string | null;
  requestedCheckout: string | null;
  createdAt: string;
  employee: {
    name: string;
    role?: string;
    profile?: { designation: string; department?: string };
    department?: { name: string };
  };
  attendanceRecord: { date: string };
}

const formatTo12h = (dateStr: string | null) => {
  if (!dateStr) return '--:--';
  return formatTime12h(dateStr);
};

const formatDate = (dateStr: string, short = false) =>
  short ? formatDayMonth(dateStr) : formatWeekdayDateDMY(dateStr);

const AVATAR_COLORS = [
  '#6366F1', '#0D9E7A', '#F59E0B', '#E8405A', '#8B5CF6', '#2563EB',
];
function avatarColor(name: string) {
  return AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];
}
function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function TimeBlock({
  label,
  checkin,
  checkout,
  variant,
}: {
  label: string;
  checkin: string | null;
  checkout: string | null;
  variant: 'default' | 'requested';
}) {
  const isRequested = variant === 'requested';
  return (
    <div
      className={`flex-1 rounded-lg px-3 py-2.5 ${isRequested
        ? 'bg-blue-50 border border-blue-100'
        : 'bg-slate-50 border border-slate-100'
        }`}
    >
      <p className={`text-[9px] font-bold uppercase tracking-widest mb-2 ${isRequested ? 'text-blue-400' : 'text-slate-400'}`}>
        {label}
      </p>
      <div className="flex items-center gap-2">
        <div>
          <p className={`text-[8px] font-semibold uppercase mb-0.5 ${isRequested ? 'text-blue-300' : 'text-slate-400'}`}>In</p>
          <p className={`text-xs font-semibold tabular-nums whitespace-nowrap ${isRequested ? 'text-blue-700' : 'text-slate-500'}`}>
            {formatTo12h(checkin)}
          </p>
        </div>
        <ChevronRight size={10} className={isRequested ? 'text-blue-200' : 'text-slate-300'} />
        <div>
          <p className={`text-[8px] font-semibold uppercase mb-0.5 ${isRequested ? 'text-blue-300' : 'text-slate-400'}`}>Out</p>
          <p className={`text-xs font-semibold tabular-nums whitespace-nowrap ${isRequested ? 'text-blue-700' : 'text-slate-500'}`}>
            {formatTo12h(checkout)}
          </p>
        </div>
      </div>
    </div>
  );
}

function CorrectionCard({
  req,
  isProcessing,
  onReview,
}: {
  req: CorrectionRequest;
  isProcessing: boolean;
  onReview: (id: string, status: 'APPROVED' | 'REJECTED') => void;
}) {
  const color = avatarColor(req.employee.name);
  const isOwnerApproval =
    req.approvalStage === 'HR' &&
    (req.employee.role === 'ADMIN' || req.employee.role === 'MANAGER');

  // Single-field corrections omit the untouched time; show the stored value
  // that will remain in place so approvers see the full effective result.
  const requestedCheckin = req.requestedCheckin ?? req.originalCheckin;
  const requestedCheckout = req.requestedCheckout ?? req.originalCheckout;

  return (
    <div className="bg-white border border-slate-100 rounded-xl overflow-hidden hover:shadow-md hover:border-slate-200 transition-all duration-200">
      <div className="p-4 sm:p-5 flex flex-col gap-4">

        {/* Row 1: Avatar + name + date */}
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
            style={{ backgroundColor: color }}
          >
            {getInitials(req.employee.name)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-700 truncate leading-tight">
              {req.employee.name}
            </p>
            <p className="text-xs text-slate-400 truncate">
              {req.employee.profile?.designation || 'Staff'}
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 flex-shrink-0">
            {req.approvalStage === 'MANAGER' && (
              <span className="hidden rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-700 sm:inline">
                Stage 1 · Manager
              </span>
            )}
            {isOwnerApproval && (
              <span className="hidden rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-blue-700 sm:inline">
                Owner approval
              </span>
            )}
            <Calendar size={11} className="text-slate-300" />
            <span className="hidden sm:inline">{formatDate(req.attendanceRecord.date)}</span>
            <span className="sm:hidden">{formatDate(req.attendanceRecord.date, true)}</span>
          </div>
        </div>

        {/* Row 2: Time boxes + arrow + action buttons — all in one line */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <TimeBlock
            label="Current"
            checkin={req.originalCheckin}
            checkout={req.originalCheckout}
            variant="default"
          />

          <ArrowRight size={13} className="text-slate-300 flex-shrink-0" />

          <TimeBlock
            label="Requested"
            checkin={requestedCheckin}
            checkout={requestedCheckout}
            variant="requested"
          />

          {/* Divider */}
          <div className="hidden sm:block w-px h-10 bg-slate-100 flex-shrink-0" />

          {/* Action buttons — same line as time boxes */}
          <div className="flex items-center gap-1.5 flex-shrink-0 ml-auto sm:ml-0">
            <button
              onClick={() => onReview(req.id, 'REJECTED')}
              disabled={isProcessing}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold btn-danger-ghost border border-rose-200 bg-rose-50 rounded-lg whitespace-nowrap"
            >
              <X size={12} />
              <span className="hidden sm:inline">Reject</span>
            </button>
            <button
              onClick={() => onReview(req.id, 'APPROVED')}
              disabled={isProcessing}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold btn-primary rounded-lg whitespace-nowrap"
            >
              {isProcessing
                ? <Loader2 size={12} className="animate-spin" />
                : <Check size={12} />
              }
              <span className="hidden sm:inline">
                {isOwnerApproval ? 'Approve as Owner' : 'Approve'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Reason footer */}
      <div className="flex items-start gap-2.5 px-4 sm:px-5 py-3 border-t border-slate-100 bg-slate-50/60">
        <MessageSquare size={11} className="text-slate-300 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-slate-400 leading-relaxed line-clamp-2 sm:line-clamp-none">
          <span className="font-semibold text-slate-500">Reason: </span>
          {req.reason}
        </p>
      </div>
    </div>
  );
}

export default function CorrectionsPage() {
  const { toast } = useToast();
  const { user } = useAuthStore();
  const isManager = user?.role === 'MANAGER';
  const canUseHrQueue = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  const [managerRequests, setManagerRequests] = useState<CorrectionRequest[]>([]);
  const [hrRequests, setHrRequests] = useState<CorrectionRequest[]>([]);
  const [queue, setQueue] = useState<'MANAGER' | 'HR'>('MANAGER');
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);

  const fetchRequests = async () => {
    try {
      const [managerRes, hrRes] = await Promise.all([
        api.get('/corrections/manager/pending').catch(() => ({ data: [] })),
        api.get('/corrections/pending').catch(() => ({ data: [] })),
      ]);
      setManagerRequests(managerRes.data || []);
      setHrRequests(hrRes.data || []);
    } catch (err) {
      console.error('Failed to fetch corrections:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchRequests();
    api.get('/departments').then((res) => setDepartments(Array.isArray(res.data) ? res.data : [])).catch(() => {});
  }, []);

  const handleReview = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    setProcessingId(id);
    try {
      await api.patch(`/corrections/${id}/review`, { status });
      await fetchRequests();
      toast.success(
        status === 'APPROVED' && queue === 'MANAGER'
          ? 'Correction approved and sent to HR for final approval.'
          : `Correction request ${status === 'APPROVED' ? 'approved' : 'rejected'}.`
      );
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || 'Action failed. Check your approval permissions.');
    } finally {
      setProcessingId(null);
    }
  };

  const rawRequests = queue === 'MANAGER' ? managerRequests : hrRequests;
  const hasActiveFilters = !!search || departmentFilter !== 'ALL';
  const resetFilters = () => {
    setSearch('');
    setDepartmentFilter('ALL');
  };

  const requests = rawRequests.filter((req) => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      req.employee.name.toLowerCase().includes(q) ||
      (req.employee.profile?.designation &&
        req.employee.profile.designation.toLowerCase().includes(q)) ||
      req.reason.toLowerCase().includes(q);
    const matchesDept =
      departmentFilter === 'ALL' ||
      req.employee.department?.name === departmentFilter ||
      req.employee.profile?.department === departmentFilter;
    return matchesSearch && matchesDept;
  });
  const totalPending = managerRequests.length + hrRequests.length;

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8 space-y-5 sm:space-y-6">

        {/* Header */}
        <div className="flex flex-col xs:flex-row xs:items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">
              {isManager ? 'Manager' : 'Admin'} · Corrections
            </p>
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-800 tracking-tight leading-tight">
              Correction Center
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Review and approve attendance modification requests
            </p>
          </div>
          {totalPending > 0 && (
            <div className="flex items-center gap-2 bg-white border border-slate-100 rounded-lg px-3 py-2 self-start flex-shrink-0">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                {totalPending} pending
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setQueue('MANAGER')}
            className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
              queue === 'MANAGER'
                ? 'border-blue-200 bg-blue-50 text-blue-700'
                : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
            }`}
          >
            My team · {managerRequests.length}
          </button>
          {canUseHrQueue && (
            <button
              type="button"
              onClick={() => setQueue('HR')}
              className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                queue === 'HR'
                  ? 'border-blue-200 bg-blue-50 text-blue-700'
                  : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
              }`}
            >
              HR final approval · {hrRequests.length}
            </button>
          )}
          <span className="ml-auto text-[11px] text-slate-400">
            {queue === 'MANAGER'
              ? 'Manager approval moves the correction to HR.'
              : 'HR approval is final and updates attendance.'}
          </span>
        </div>

        {!loading && rawRequests.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[220px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search staff name, designation or reason…"
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
              <span className="ml-auto text-xs text-slate-400">
                Showing <span className="font-semibold text-slate-700">{requests.length}</span> request{requests.length === 1 ? '' : 's'}
              </span>
            </div>
          </div>
        )}

        {/* Body */}
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-white border border-slate-100 rounded-xl p-12 sm:p-16 flex flex-col items-center text-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center mb-1"
              style={{ backgroundColor: '#0D9E7A14' }}
            >
              <CheckCircle2 size={18} style={{ color: '#0D9E7A' }} />
            </div>
            <p className="text-sm font-semibold text-slate-700">Queue is clear</p>
            <p className="text-xs text-slate-400 max-w-xs">
              All correction requests have been processed.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {requests.map((req) => (
              <CorrectionCard
                key={req.id}
                req={req}
                isProcessing={processingId === req.id}
                onReview={handleReview}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}