'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle2, MessageSquare, Loader2, Check, X, Plane, Briefcase, ShieldCheck } from 'lucide-react';
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

interface LeaveRequest {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  employee: {
    name: string;
    profile?: {
      employeeCode: string;
      department: string;
    };
  };
  balances?: LeaveBalances;
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

type LeaveTypeFilter = 'ALL' | 'SICK' | 'CASUAL' | 'VACATION' | 'OTHER';

function normalizeLeaveType(type: string): Exclude<LeaveTypeFilter, 'ALL'> {
  const value = type.toUpperCase();
  if (value.includes('SICK')) return 'SICK';
  if (value.includes('CASUAL')) return 'CASUAL';
  if (value.includes('VACATION') || value.includes('ANNUAL')) return 'VACATION';
  return 'OTHER';
}

export default function LeavesPage() {
  const { toast } = useToast();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [typeFilter, setTypeFilter] = useState<LeaveTypeFilter>('ALL');
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const leavesRes = await api.get('/leaves/admin/pending').catch(() => ({ data: [] }));
      setRequests(leavesRes.data || []);
    } catch (err) {
      console.error('Failed to fetch leaves:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, []);

  const handleReview = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    setProcessingId(id);
    try {
      await api.put(`/leaves/${id}/review`, { status });
      setRequests((prev) => prev.filter((r) => r.id !== id));
      toast.success(`Leave request ${status === 'APPROVED' ? 'approved' : 'rejected'}.`);
    } catch {
      toast.error('Action failed. Ensure you have Admin privileges.');
    } finally {
      setProcessingId(null);
    }
  };

  const pending = requests.filter((r) => r.status === 'PENDING');

  const typeCounts = requests.reduce(
    (acc, request) => {
      acc[normalizeLeaveType(request.type)] += 1;
      return acc;
    },
    { SICK: 0, CASUAL: 0, VACATION: 0, OTHER: 0 }
  );

  const typeOptions = [
    { label: 'All types', value: 'ALL', count: requests.length },
    { label: 'Sick', value: 'SICK', count: typeCounts.SICK },
    { label: 'Casual', value: 'CASUAL', count: typeCounts.CASUAL },
    { label: 'Vacation', value: 'VACATION', count: typeCounts.VACATION },
    { label: 'Other', value: 'OTHER', count: typeCounts.OTHER },
  ];

  const visibleRequests =
    typeFilter === 'ALL'
      ? requests
      : requests.filter((request) => normalizeLeaveType(request.type) === typeFilter);

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-canvas p-5 lg:p-7 space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-bold text-[#5B6FA8] uppercase tracking-wider mb-1">
              Admin · Leave Requests
            </p>
            <h1 className="text-2xl font-bold text-ink tracking-tight">
              Leave Management
            </h1>
            <p className="text-xs text-ink-soft mt-0.5">
              Review employee time-off requests. Each request shows the applicant&apos;s own balance, not a department total.
            </p>
          </div>
          {pending.length > 0 && (
            <div className="flex items-center gap-2 bg-white border border-line rounded-lg px-3 py-1.5 shadow-2xs">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">
                {pending.length} pending
              </span>
            </div>
          )}
        </div>

        {!loading && requests.length > 0 && (
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
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-white border border-line rounded-xl p-14 flex flex-col items-center text-center gap-3 shadow-2xs">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center mb-1 bg-emerald-50 text-emerald-600 border border-emerald-100"
            >
              <CheckCircle2 size={18} />
            </div>
            <p className="text-sm font-bold text-ink">All caught up</p>
            <p className="text-xs text-ink-soft max-w-xs">
              No pending leave requests awaiting approval at this moment.
            </p>
          </div>
        ) : visibleRequests.length === 0 ? (
          <div className="bg-white border border-slate-100 rounded-xl p-16 flex flex-col items-center text-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center mb-1"
              style={{ backgroundColor: '#EFF6FF' }}
            >
              <Plane size={18} className="text-blue-500" />
            </div>
            <p className="text-sm font-semibold text-slate-700">No matching requests</p>
            <p className="text-xs text-slate-400 max-w-xs">
              There are no pending {typeFilter.toLowerCase()} leave requests right now.
            </p>
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

              return (
                <div
                  key={req.id}
                  className="bg-white border border-line rounded-xl overflow-hidden hover:shadow-xs hover:border-slate-300 transition-all duration-150"
                >
                  <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6">

                    {/* Employee Info */}
                    <div className="flex items-center gap-3 lg:w-64 flex-shrink-0">
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-2xs"
                        style={{ backgroundColor: color }}
                      >
                        {getInitials(req.employee.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-ink truncate">
                          {req.employee.name}
                        </p>
                        <p className="text-[10px] font-medium text-ink-soft uppercase tracking-wider flex items-center gap-1 mt-0.5 font-mono">
                          <Briefcase size={10} />
                          {req.employee.profile?.department || 'Staff'} · #{req.employee.profile?.employeeCode || 'EMP'}
                        </p>
                      </div>
                    </div>

                    {/* Leave Type & Dates */}
                    <div className="flex-1 flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-8">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                          <Plane size={14} />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-ink-soft uppercase tracking-wider leading-none mb-1">
                            Type
                          </p>
                          <p className="text-xs font-bold text-ink">
                            {req.type}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-5">
                        <div>
                          <p className="text-[10px] font-bold text-ink-soft uppercase tracking-wider leading-none mb-1">
                            Start Date
                          </p>
                          <p className="text-xs font-semibold text-slate-700">
                            {formatDate(req.startDate)}
                          </p>
                        </div>
                        <div className="h-4 w-px bg-line" />
                        <div>
                          <p className="text-[10px] font-bold text-ink-soft uppercase tracking-wider leading-none mb-1">
                            End Date
                          </p>
                          <p className="text-xs font-semibold text-slate-700">
                            {formatDate(req.endDate)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleReview(req.id, 'REJECTED')}
                        disabled={isProcessing}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold btn-danger-ghost border border-rose-200 bg-rose-50 rounded-lg"
                      >
                        <X size={13} />
                        Reject
                      </button>
                      <button
                        onClick={() => handleReview(req.id, 'APPROVED')}
                        disabled={isProcessing}
                        className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold btn-primary rounded-lg shadow-2xs"
                      >
                        {isProcessing
                          ? <Loader2 size={13} className="animate-spin" />
                          : <Check size={13} />
                        }
                        Approve
                      </button>
                    </div>
                  </div>

                  {/* Quota balance breakdown for applicant */}
                  {req.balances && (
                    <div className="px-5 py-2 bg-slate-50/60 border-t border-slate-100 flex flex-wrap items-center gap-2.5 text-[11px]">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <ShieldCheck size={12} className="text-blue-500" />
                        Applicant&apos;s personal balance:
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        req.type === 'SICK'
                          ? 'bg-amber-50 text-amber-800 border-amber-300 ring-1 ring-amber-400/20'
                          : 'bg-white text-slate-600 border-slate-200'
                      }`}>
                        Sick: {req.balances.sick.remaining} / {req.balances.sick.total} days
                        {req.balances.sick.carryForward > 0
                          ? ` (+${req.balances.sick.carryForward} carried)`
                          : ''}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        req.type === 'CASUAL'
                          ? 'bg-blue-50 text-blue-800 border-blue-300 ring-1 ring-blue-400/20'
                          : 'bg-white text-slate-600 border-slate-200'
                      }`}>
                        Casual: {req.balances.casual.remaining} / {req.balances.casual.total} days
                        {req.balances.casual.carryForward > 0
                          ? ` (+${req.balances.casual.carryForward} carried)`
                          : ''}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        req.type === 'VACATION'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-1 ring-emerald-400/20'
                          : 'bg-white text-slate-600 border-slate-200'
                      }`}>
                        Annual: {req.balances.vacation.remaining} / {req.balances.vacation.total} days
                        {req.balances.vacation.carryForward > 0
                          ? ` (+${req.balances.vacation.carryForward} carried)`
                          : ''}
                      </span>
                      <span className="ml-auto text-[10px] font-medium text-slate-400">
                        Cycle ends {formatDateOnly(req.balances.cycleEnd)}
                      </span>
                    </div>
                  )}

                  {/* Reason */}
                  <div className="flex items-start gap-3 px-5 py-2.5 border-t border-slate-100 bg-slate-50/30">
                    <MessageSquare size={12} className="text-slate-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-slate-600">
                      <span className="font-bold text-slate-400 uppercase text-[9px] tracking-wider mr-1.5">Reason:</span>
                      {req.reason}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
