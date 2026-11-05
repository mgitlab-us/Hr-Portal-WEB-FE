'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  Loader2,
  Mail,
  Users,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatLongDateDMY } from '@/lib/datetime';
import { useToast } from '@/components/ui/toast';

interface DirectoryEmployee {
  id: string;
  name: string;
  email: string;
  role: 'EMPLOYEE' | 'MANAGER' | 'ADMIN' | 'SUPER_ADMIN';
  isActive: boolean;
  departmentId?: string | null;
  department?: {
    id: string;
    name: string;
    managers?: { employee: { name: string } }[];
  } | null;
  manager?: { id: string; name: string; email: string } | null;
  homeDepartment?: { id: string; name: string } | null;
  profile?: {
    employeeCode?: string;
    designation?: string;
    joiningDate?: string;
  };
}

interface Props {
  employeeId: string;
  onClose: () => void;
  avatarColor: { bg: string; text: string };
}

const AVATAR_FALLBACK = { bg: '#ECEFFE', text: '#5B6EF5' };

export default function EmployeeDirectoryDrawer({
  employeeId,
  onClose,
  avatarColor,
}: Props) {
  const { toast } = useToast();
  const [employee, setEmployee] = useState<DirectoryEmployee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get(`/employees/${employeeId}?scope=company`);
        if (!cancelled) setEmployee(response.data);
      } catch (err: unknown) {
        if (cancelled) return;
        const message =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Unable to load this directory record.';
        setError(message);
        toast.error(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [employeeId, toast]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const avatar = avatarColor || AVATAR_FALLBACK;
  const managerNames =
    employee?.department?.managers?.map((row) => row.employee.name) ?? [];
  const reportingManager =
    managerNames.length > 0
      ? managerNames.join(', ')
      : employee?.manager?.name || 'Not assigned';

  return (
    <motion.div
      className="fixed inset-0 z-[70] flex justify-end overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
    >
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <motion.aside
        role="dialog"
        aria-modal="true"
        aria-label={employee ? `${employee.name} directory record` : 'Directory record'}
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 34 }}
        className="relative flex h-full w-full max-w-lg flex-col border-l border-slate-200 bg-slate-50 shadow-2xl"
      >
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-6 sm:px-6">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-600">
                Company directory
              </p>
              <h2 className="mt-1 text-lg font-bold text-slate-800">Employee record</h2>
              <p className="mt-0.5 text-xs text-slate-400">
                Read-only employment information across the company.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold btn-ghost"
              aria-label="Close directory record"
            >
              <X size={14} />
              Close
            </button>
          </div>

          {loading ? (
            <div className="flex h-48 flex-col items-center justify-center text-slate-400">
              <Loader2 size={20} className="mb-2 animate-spin" />
              <p className="text-xs font-medium">Loading directory record…</p>
            </div>
          ) : error ? (
            <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed border-rose-200 bg-rose-50/50 px-6 text-center">
              <AlertCircle size={22} className="mb-2 text-rose-400" />
              <p className="text-sm font-semibold text-rose-700">Could not load record</p>
              <p className="mt-1 text-xs text-rose-600/80">{error}</p>
            </div>
          ) : employee ? (
            <div className="space-y-5">
              <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-2xs">
                <div className="flex items-center gap-4">
                  <div
                    className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full text-xl font-bold"
                    style={{ backgroundColor: avatar.bg, color: avatar.text }}
                  >
                    {employee.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <h3 className="truncate text-base font-bold text-slate-800">
                        {employee.name}
                      </h3>
                      <span
                        className={`inline-flex flex-shrink-0 items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold ${
                          employee.isActive
                            ? 'border-emerald-100 bg-emerald-50 text-emerald-600'
                            : 'border-red-100 bg-red-50 text-red-500'
                        }`}
                      >
                        {employee.isActive ? <CheckCircle2 size={9} /> : <AlertCircle size={9} />}
                        {employee.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="mt-0.5 font-mono text-xs text-slate-400">
                      #{employee.profile?.employeeCode || 'EMP-000'}
                    </p>
                    <p className="mt-0.5 truncate text-xs font-medium text-slate-600">
                      {employee.profile?.designation || 'Staff member'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-2xs">
                <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Briefcase size={15} className="text-blue-600" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Employment
                  </h4>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <DirectoryField
                    icon={Mail}
                    label="Work email"
                    value={employee.email}
                  />
                  <DirectoryField
                    icon={Building2}
                    label="Home department"
                    value={
                      employee.homeDepartment?.name ||
                      employee.department?.name ||
                      'Unassigned'
                    }
                  />
                  <DirectoryField
                    icon={Briefcase}
                    label="Designation"
                    value={employee.profile?.designation || '—'}
                  />
                  <DirectoryField
                    icon={Calendar}
                    label="Joined"
                    value={
                      employee.profile?.joiningDate
                        ? formatLongDateDMY(employee.profile.joiningDate)
                        : '—'
                    }
                  />
                  <DirectoryField
                    icon={Users}
                    label="Reporting manager"
                    value={reportingManager}
                  />
                  <DirectoryField
                    icon={CheckCircle2}
                    label="Employment status"
                    value={employee.isActive ? 'Active member' : 'Inactive'}
                  />
                </div>
              </div>

              <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-4">
                <p className="text-xs font-semibold text-blue-900">
                  Limited directory view
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-blue-700/80">
                  Payroll, bank details, documents, and attendance are only available to this
                  employee&apos;s department team.
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </motion.aside>
    </motion.div>
  );
}

function DirectoryField({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
        <Icon size={14} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {label}
        </p>
        <p className="mt-0.5 truncate text-xs font-semibold text-slate-700">{value}</p>
      </div>
    </div>
  );
}
