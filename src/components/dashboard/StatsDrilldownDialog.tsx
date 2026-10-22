'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  CalendarCheck,
  Clock,
  Plane,
  RefreshCw,
  Users,
  UserX,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export type DrilldownMetric = 'total' | 'present' | 'late' | 'absent' | 'on-leave';

type DrilldownStatus = 'PRESENT' | 'LATE' | 'ABSENT' | 'ON_LEAVE';

interface DrilldownEmployee {
  id: string;
  name: string;
  email: string;
  employeeCode: string | null;
  designation: string | null;
  department: { id: string; name: string } | null;
  status: DrilldownStatus;
  checkinTime: string | null;
  checkoutTime: string | null;
  checkinLabel: string | null;
  checkoutLabel: string | null;
  lateMinutes: number;
  leaveType: string | null;
  leaveStartDate: string | null;
  leaveEndDate: string | null;
}

interface DrilldownResponse {
  metric: DrilldownMetric;
  date: string;
  count: number;
  employees: DrilldownEmployee[];
}

interface StatsDrilldownDialogProps {
  metric: DrilldownMetric | null;
  onClose: () => void;
}

const METRICS = {
  total: {
    title: 'Total staff',
    description: 'Active personnel in your scope.',
    icon: Users,
    iconClass: 'bg-blue-50 text-blue-600',
    linkLabel: 'Open staff directory',
    href: '/dashboard/employees',
  },
  present: {
    title: 'Present today',
    description: 'Everyone who has checked in today, including late arrivals.',
    icon: CalendarCheck,
    iconClass: 'bg-emerald-50 text-emerald-600',
    linkLabel: 'Open attendance logs',
    href: '/dashboard/attendance',
  },
  late: {
    title: 'Late arrivals',
    description: 'Staff who checked in after their grace period today.',
    icon: Clock,
    iconClass: 'bg-amber-50 text-amber-600',
    linkLabel: 'Open attendance logs',
    href: '/dashboard/attendance',
  },
  absent: {
    title: 'Absent today',
    description: 'Active staff with no check-in and no approved leave.',
    icon: UserX,
    iconClass: 'bg-rose-50 text-rose-600',
    linkLabel: 'Open attendance logs',
    href: '/dashboard/attendance',
  },
  'on-leave': {
    title: 'On leave',
    description: 'Approved leave covering today.',
    icon: Plane,
    iconClass: 'bg-violet-50 text-violet-600',
    linkLabel: 'Open leave requests',
    href: '/dashboard/leaves',
  },
} as const;

const STATUS_STYLES: Record<DrilldownStatus, string> = {
  PRESENT: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  LATE: 'border-amber-200 bg-amber-50 text-amber-700',
  ABSENT: 'border-rose-200 bg-rose-50 text-rose-700',
  ON_LEAVE: 'border-violet-200 bg-violet-50 text-violet-700',
};

const STATUS_LABELS: Record<DrilldownStatus, string> = {
  PRESENT: 'Present',
  LATE: 'Late',
  ABSENT: 'Absent',
  ON_LEAVE: 'On leave',
};

const LEAVE_LABELS: Record<string, string> = {
  CASUAL: 'Casual leave',
  SICK: 'Sick leave',
  VACATION: 'Vacation',
  OTHER: 'Other leave',
};

const formatCalendarDate = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

const formatLeaveRange = (start: string | null, end: string | null) => {
  if (!start && !end) return 'Approved';
  if (start && (!end || start === end)) return formatCalendarDate(start);
  if (!start && end) return formatCalendarDate(end);
  return `${formatCalendarDate(start as string)} – ${formatCalendarDate(end as string)}`;
};

export default function StatsDrilldownDialog({
  metric,
  onClose,
}: StatsDrilldownDialogProps) {
  const [data, setData] = useState<DrilldownResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!metric) return;

    let discarded = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      setData(null);

      try {
        const response = await api.get('/attendance/stats/company/drilldown', {
          params: { metric },
        });
        if (!discarded) setData(response.data);
      } catch (err: unknown) {
        if (!discarded) {
          const requestError = err as { response?: { data?: { message?: string } } };
          setError(requestError?.response?.data?.message || 'Unable to load this list.');
        }
      } finally {
        if (!discarded) setLoading(false);
      }
    };

    load();

    return () => {
      discarded = true;
    };
  }, [metric, reloadToken]);

  const config = metric ? METRICS[metric] : null;
  const Icon = config?.icon;
  const employees = data?.employees ?? [];

  return (
    <Dialog
      open={!!metric}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <DialogContent className="max-w-3xl gap-0 overflow-hidden p-0">
        {config && Icon ? (
          <>
            <div className="border-b border-slate-100 px-5 py-4 pr-12">
              <DialogHeader>
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${config.iconClass}`}
                  >
                    <Icon size={18} />
                  </div>
                  <div className="min-w-0">
                    <DialogTitle className="text-base">{config.title}</DialogTitle>
                    <DialogDescription className="mt-0.5">
                      {config.description}
                    </DialogDescription>
                  </div>
                  <Badge
                    variant="outline"
                    className="ml-auto mt-0.5 border-slate-200 bg-slate-50 text-slate-600"
                  >
                    {data ? data.count : '—'}
                  </Badge>
                </div>
              </DialogHeader>
            </div>

            <div className="max-h-[60vh] overflow-y-auto px-5 py-2">
              {loading ? (
                <div className="space-y-3 py-4">
                  {[0, 1, 2, 3].map((index) => (
                    <div key={index} className="flex animate-pulse items-center gap-3 py-2">
                      <div className="h-9 w-9 rounded-full bg-slate-100" />
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="h-3 w-1/3 rounded bg-slate-100" />
                        <div className="h-2.5 w-1/2 rounded bg-slate-100" />
                      </div>
                      <div className="h-3 w-16 rounded bg-slate-100" />
                    </div>
                  ))}
                </div>
              ) : error ? (
                <div className="flex flex-col items-center gap-3 py-12 text-center">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-rose-50 text-rose-500">
                    <AlertCircle size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Could not load this list</p>
                    <p className="mt-1 text-xs text-slate-500">{error}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setReloadToken((current) => current + 1)}
                  >
                    <RefreshCw size={13} />
                    Retry
                  </Button>
                </div>
              ) : employees.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-12 text-center">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-full ${config.iconClass}`}
                  >
                    <Icon size={22} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">No one here right now</p>
                    <p className="mt-1 text-xs text-slate-500">
                      This list updates automatically as attendance changes.
                    </p>
                  </div>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {employees.map((employee) => (
                    <li key={employee.id} className="flex items-start gap-3 py-3">
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-600">
                        {employee.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold text-slate-800">
                            {employee.name}
                          </p>
                          <Badge
                            variant="outline"
                            className={STATUS_STYLES[employee.status]}
                          >
                            {STATUS_LABELS[employee.status]}
                          </Badge>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          {[employee.designation, employee.department?.name]
                            .filter(Boolean)
                            .join(' · ') || 'No designation'}
                        </p>
                        <p className="mt-0.5 truncate text-[11px] text-slate-400">
                          {employee.email}
                        </p>
                      </div>
                      <div className="flex-shrink-0 text-right text-xs text-slate-500">
                        {employee.status === 'ON_LEAVE' && employee.leaveType ? (
                          <>
                            <p className="font-semibold text-slate-700">
                              {LEAVE_LABELS[employee.leaveType] || employee.leaveType}
                            </p>
                            <p className="mt-0.5 text-[11px] text-slate-400">
                              {formatLeaveRange(
                                employee.leaveStartDate,
                                employee.leaveEndDate
                              )}
                            </p>
                          </>
                        ) : employee.checkinLabel ? (
                          <>
                            <p className="font-semibold text-slate-700">
                              {employee.checkinLabel}
                            </p>
                            <p className="mt-0.5 text-[11px] text-slate-400">
                              {employee.lateMinutes > 0
                                ? `${employee.lateMinutes}m late`
                                : 'On time'}
                            </p>
                          </>
                        ) : (
                          <p className="text-[11px] text-slate-400">No check-in</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <Link
                href={config.href}
                className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 transition-colors hover:text-blue-700"
              >
                {config.linkLabel}
                <span aria-hidden="true">→</span>
              </Link>
              <Button variant="secondary" onClick={onClose}>
                Close
              </Button>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
