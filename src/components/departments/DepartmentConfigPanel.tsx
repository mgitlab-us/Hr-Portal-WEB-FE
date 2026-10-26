'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Briefcase,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Loader2,
  Pencil,
  Plane,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatWeekdayDateDMY } from '@/lib/datetime';
import { useAuthStore } from '@/store/authStore';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Department {
  id: string;
  name: string;
  adminId: string | null;
  admin: { id: string; name: string; email: string } | null;
  _count: { employees: number };
}

interface ShiftProfile {
  id: string;
  name: string;
  isDefault: boolean;
  workMinutesPerDay?: number;
  breakMinutesAllocated?: number;
  gracePeriodMinutes?: number;
  expectedCheckinHour?: number;
  expectedCheckinMinute?: number;
}

interface DepartmentConfig {
  shiftProfileId: string | null;
  shiftProfile?: ShiftProfile | null;
  weekends: number[];
  gracePeriodMinutes: number | null;
}

interface CompanyProfile {
  weekends: number[];
  workMinutesPerDay: number;
  breakMinutesAllocated: number;
  gracePeriodMinutes: number;
  expectedCheckinHour: number;
  expectedCheckinMinute: number;
}

interface DepartmentHoliday {
  id: string;
  name: string;
  date: string;
}

interface DepartmentLeavePolicy {
  sickLeaveDays: number;
  casualLeaveDays: number;
  vacationDays: number;
}

interface Designation {
  id: string;
  name: string;
  departmentId: string;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const formatHolidayDate = (value: string) =>
  formatWeekdayDateDMY(value.slice(0, 10));

const apiMessage = (error: unknown, fallback: string) => {
  const requestError = error as { response?: { data?: { message?: string } } };
  return requestError?.response?.data?.message || fallback;
};

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-slate-50 px-5 py-4">
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
        <Icon size={16} />
      </div>
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
        <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>
      </div>
    </div>
  );
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      {children}
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  suffix = 'days',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  suffix?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </label>
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-500/15">
        <input
          type="number"
          min={0}
          max={365}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full border-0 bg-transparent text-sm font-semibold text-slate-800 outline-none"
        />
        <span className="text-[11px] font-medium text-slate-400">{suffix}</span>
      </div>
    </div>
  );
}

interface DepartmentConfigPanelProps {
  initialDepartmentId?: string;
  embedded?: boolean;
}

type DepartmentSection = 'work' | 'leave' | 'holidays' | 'designations';

const SECTION_TABS: {
  id: DepartmentSection;
  label: string;
  icon: React.ElementType;
}[] = [
  { id: 'work', label: 'Work settings', icon: Clock },
  { id: 'leave', label: 'Leave policy', icon: Plane },
  { id: 'holidays', label: 'Department holidays', icon: Calendar },
  { id: 'designations', label: 'Designations', icon: Briefcase },
];

export default function DepartmentConfigPanel({
  initialDepartmentId,
  embedded = false,
}: DepartmentConfigPanelProps) {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [shifts, setShifts] = useState<ShiftProfile[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState(initialDepartmentId ?? '');
  const [activeSection, setActiveSection] = useState<DepartmentSection>('work');
  const [referenceLoading, setReferenceLoading] = useState(true);
  const [referenceError, setReferenceError] = useState<string | null>(null);
  const [referenceReload, setReferenceReload] = useState(0);

  const [holidays, setHolidays] = useState<DepartmentHoliday[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<{
    title: string;
    description: string;
    confirmLabel?: string;
    action: () => Promise<void>;
  } | null>(null);
  const [confirming, setConfirming] = useState(false);

  const [configForm, setConfigForm] = useState({
    shiftProfileId: '',
    weekends: [0] as number[],
    gracePeriodMinutes: '',
  });
  const [shiftForm, setShiftForm] = useState({
    name: '',
    checkinHour: '9',
    checkinMinute: '00',
    period: 'AM' as 'AM' | 'PM',
    workMinutes: '480',
    breakMinutes: '60',
    graceMinutes: '10',
  });
  const [policyForm, setPolicyForm] = useState({
    sickLeaveDays: '8',
    casualLeaveDays: '10',
    vacationDays: '14',
  });
  const [newHoliday, setNewHoliday] = useState({ name: '', date: '' });
  const [newDesignationName, setNewDesignationName] = useState('');
  const [editingDesignationId, setEditingDesignationId] = useState<string | null>(null);
  const [editingDesignationName, setEditingDesignationName] = useState('');

  const [savingConfig, setSavingConfig] = useState(false);
  const [savingShift, setSavingShift] = useState(false);
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [addingHoliday, setAddingHoliday] = useState(false);
  const [deletingHolidayId, setDeletingHolidayId] = useState<string | null>(null);
  const [addingDesignation, setAddingDesignation] = useState(false);
  const [updatingDesignationId, setUpdatingDesignationId] = useState<string | null>(null);
  const [deletingDesignationId, setDeletingDesignationId] = useState<string | null>(null);

  const manageableDepartments = useMemo(() => {
    if (user?.role === 'SUPER_ADMIN') return departments;
    return departments.filter((department) => department.admin?.id === user?.id);
  }, [departments, user?.id, user?.role]);

  const activeDepartment = useMemo(() => {
    return (
      manageableDepartments.find((department) => department.id === selectedDeptId) ??
      manageableDepartments[0] ??
      null
    );
  }, [manageableDepartments, selectedDeptId]);

  const activeDeptId = activeDepartment?.id ?? '';

  useEffect(() => {
    if (!user) return;

    let active = true;

    const loadReference = async () => {
      setReferenceLoading(true);
      setReferenceError(null);
      try {
        const [departmentResponse, shiftResponse] = await Promise.all([
          api.get('/departments'),
          api.get('/shifts').catch(() => ({ data: [] as ShiftProfile[] })),
        ]);
        if (!active) return;
        setDepartments(departmentResponse.data ?? []);
        setShifts(shiftResponse.data ?? []);
      } catch (error) {
        if (!active) return;
        setReferenceError(apiMessage(error, 'Failed to load departments.'));
      } finally {
        if (active) setReferenceLoading(false);
      }
    };

    void loadReference();

    return () => {
      active = false;
    };
  }, [user, referenceReload]);

  useEffect(() => {
    if (!activeDeptId) return;

    let active = true;

    const loadDepartment = async () => {
      setLoading(true);
      setLoadError(null);
      setSavedMessage(null);
      try {
        const [
          configResponse,
          holidayResponse,
          policyResponse,
          designationResponse,
          companyResponse,
        ] = await Promise.all([
          api.get(`/departments/${activeDeptId}/config`),
          api.get(`/departments/${activeDeptId}/holidays`),
          api.get(`/departments/${activeDeptId}/leave-policy`),
          api.get('/designations', { params: { departmentId: activeDeptId } }),
          api
            .get('/attendance/settings/company-profile')
            .catch(() => ({ data: null as CompanyProfile | null })),
        ]);

        if (!active) return;

        const nextConfig = (configResponse.data ?? null) as DepartmentConfig | null;
        const nextPolicy = (policyResponse.data ?? null) as DepartmentLeavePolicy | null;
        const company = (companyResponse.data ?? null) as CompanyProfile | null;
        const effectiveShift = nextConfig?.shiftProfile ?? null;
        const checkinHour = effectiveShift?.expectedCheckinHour ?? company?.expectedCheckinHour ?? 9;
        const checkinPeriod: 'AM' | 'PM' = checkinHour >= 12 ? 'PM' : 'AM';

        setHolidays(holidayResponse.data ?? []);
        setDesignations(designationResponse.data ?? []);
        setConfigForm({
          shiftProfileId: nextConfig?.shiftProfileId ?? '',
          weekends: nextConfig?.weekends ?? company?.weekends ?? [0],
          gracePeriodMinutes:
            nextConfig?.gracePeriodMinutes !== null &&
            nextConfig?.gracePeriodMinutes !== undefined
              ? String(nextConfig.gracePeriodMinutes)
              : '',
        });
        setShiftForm({
          name: effectiveShift?.name ?? `${activeDepartment?.name ?? 'Department'} shift`,
          checkinHour: String(checkinHour % 12 || 12),
          checkinMinute: String(
            effectiveShift?.expectedCheckinMinute ?? company?.expectedCheckinMinute ?? 0
          ).padStart(2, '0'),
          period: checkinPeriod,
          workMinutes: String(
            effectiveShift?.workMinutesPerDay ?? company?.workMinutesPerDay ?? 480
          ),
          breakMinutes: String(
            effectiveShift?.breakMinutesAllocated ?? company?.breakMinutesAllocated ?? 60
          ),
          graceMinutes: String(
            effectiveShift?.gracePeriodMinutes ?? company?.gracePeriodMinutes ?? 10
          ),
        });
        setPolicyForm({
          sickLeaveDays: String(nextPolicy?.sickLeaveDays ?? 8),
          casualLeaveDays: String(nextPolicy?.casualLeaveDays ?? 10),
          vacationDays: String(nextPolicy?.vacationDays ?? 14),
        });
        setNewHoliday({ name: '', date: '' });
        setNewDesignationName('');
        setEditingDesignationId(null);
        setEditingDesignationName('');
      } catch (error) {
        if (!active) return;
        setLoadError(apiMessage(error, 'Failed to load department configuration.'));
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadDepartment();

    return () => {
      active = false;
    };
  }, [activeDeptId, activeDepartment?.name, reload]);

  const toggleWeekend = (day: number) => {
    setConfigForm((current) => {
      const weekends = current.weekends.includes(day)
        ? current.weekends.filter((item) => item !== day)
        : [...current.weekends, day].sort((a, b) => a - b);
      return { ...current, weekends };
    });
  };

  const saveConfig = async () => {
    if (!activeDeptId) return;
    setSavingConfig(true);
    setSavedMessage(null);
    try {
      const gracePeriodMinutes =
        configForm.gracePeriodMinutes.trim() === ''
          ? null
          : Math.max(0, Number.parseInt(configForm.gracePeriodMinutes, 10) || 0);
      await api.put(`/departments/${activeDeptId}/config`, {
        shiftProfileId: configForm.shiftProfileId || null,
        weekends: configForm.weekends,
        gracePeriodMinutes,
      });
      setSavedMessage('Department work settings saved.');
    } catch (error) {
      toast.error(apiMessage(error, 'Failed to save department work settings.'));
    } finally {
      setSavingConfig(false);
    }
  };

  const saveDepartmentShift = async () => {
    if (!activeDeptId) return;
    if (!shiftForm.name.trim()) {
      toast.error('Give the department shift a name.');
      return;
    }
    setSavingShift(true);
    setSavedMessage(null);
    try {
      const hour12 = Math.min(12, Math.max(1, Number.parseInt(shiftForm.checkinHour, 10) || 9));
      const minute = Math.min(59, Math.max(0, Number.parseInt(shiftForm.checkinMinute, 10) || 0));
      const expectedCheckinHour =
        shiftForm.period === 'PM'
          ? (hour12 % 12) + 12
          : hour12 % 12;

      await api.put(`/departments/${activeDeptId}/shift`, {
        name: shiftForm.name.trim(),
        expectedCheckinHour,
        expectedCheckinMinute: minute,
        workMinutesPerDay: Math.max(60, Number.parseInt(shiftForm.workMinutes, 10) || 480),
        breakMinutesAllocated: Math.max(
          0,
          Number.parseInt(shiftForm.breakMinutes, 10) || 0
        ),
        gracePeriodMinutes: Math.max(0, Number.parseInt(shiftForm.graceMinutes, 10) || 0),
      });
      setSavedMessage('Department shift saved and applied to its employees.');
      setReload((value) => value + 1);
      setReferenceReload((value) => value + 1);
    } catch (error) {
      toast.error(apiMessage(error, 'Failed to save the department shift.'));
    } finally {
      setSavingShift(false);
    }
  };

  const savePolicy = async () => {
    if (!activeDeptId) return;
    setSavingPolicy(true);
    setSavedMessage(null);
    try {
      await api.put(`/departments/${activeDeptId}/leave-policy`, {
        sickLeaveDays: Math.max(0, Number.parseInt(policyForm.sickLeaveDays, 10) || 0),
        casualLeaveDays: Math.max(0, Number.parseInt(policyForm.casualLeaveDays, 10) || 0),
        vacationDays: Math.max(0, Number.parseInt(policyForm.vacationDays, 10) || 0),
      });
      setSavedMessage('Department leave policy saved.');
    } catch (error) {
      toast.error(apiMessage(error, 'Failed to save the department leave policy.'));
    } finally {
      setSavingPolicy(false);
    }
  };

  const addHoliday = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!activeDeptId || !newHoliday.name.trim() || !newHoliday.date) return;
    setAddingHoliday(true);
    setSavedMessage(null);
    try {
      const response = await api.post(`/departments/${activeDeptId}/holidays`, {
        name: newHoliday.name.trim(),
        date: newHoliday.date,
      });
      setHolidays((current) =>
        [...current, response.data].sort((a, b) => a.date.localeCompare(b.date))
      );
      setNewHoliday({ name: '', date: '' });
      setSavedMessage('Department holiday added.');
    } catch (error) {
      toast.error(apiMessage(error, 'Failed to add the department holiday.'));
    } finally {
      setAddingHoliday(false);
    }
  };

  const removeHoliday = (holiday: DepartmentHoliday) => {
    if (!activeDeptId) return;
    setPendingConfirm({
      title: 'Remove department holiday?',
      description: `“${holiday.name}” will no longer be a non-working day for this department.`,
      confirmLabel: 'Remove holiday',
      action: async () => {
        setDeletingHolidayId(holiday.id);
        setSavedMessage(null);
        try {
          await api.delete(`/departments/${activeDeptId}/holidays/${holiday.id}`);
          setHolidays((current) => current.filter((item) => item.id !== holiday.id));
          setSavedMessage('Department holiday removed.');
        } catch (error) {
          toast.error(apiMessage(error, 'Failed to remove the department holiday.'));
        } finally {
          setDeletingHolidayId(null);
        }
      },
    });
  };

  const addDesignation = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!activeDeptId || !newDesignationName.trim()) return;
    setAddingDesignation(true);
    setSavedMessage(null);
    try {
      const response = await api.post('/designations', {
        name: newDesignationName.trim(),
        departmentId: activeDeptId,
      });
      setDesignations((current) =>
        [...current, response.data].sort((a, b) => a.name.localeCompare(b.name))
      );
      setNewDesignationName('');
      setSavedMessage('Designation added.');
    } catch (error) {
      toast.error(apiMessage(error, 'Failed to add the designation.'));
    } finally {
      setAddingDesignation(false);
    }
  };

  const startEditingDesignation = (designation: Designation) => {
    setEditingDesignationId(designation.id);
    setEditingDesignationName(designation.name);
  };

  const cancelEditingDesignation = () => {
    setEditingDesignationId(null);
    setEditingDesignationName('');
  };

  const saveDesignation = async (designation: Designation) => {
    if (!editingDesignationName.trim()) return;
    setUpdatingDesignationId(designation.id);
    setSavedMessage(null);
    try {
      const response = await api.put(`/designations/${designation.id}`, {
        name: editingDesignationName.trim(),
      });
      setDesignations((current) =>
        current
          .map((item) => (item.id === designation.id ? response.data : item))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
      cancelEditingDesignation();
      setSavedMessage('Designation updated.');
    } catch (error) {
      toast.error(apiMessage(error, 'Failed to update the designation.'));
    } finally {
      setUpdatingDesignationId(null);
    }
  };

  const removeDesignation = (designation: Designation) => {
    setPendingConfirm({
      title: 'Delete designation?',
      description: `“${designation.name}” will be removed from this department. This cannot be undone.`,
      confirmLabel: 'Delete designation',
      action: async () => {
        setDeletingDesignationId(designation.id);
        setSavedMessage(null);
        try {
          await api.delete(`/designations/${designation.id}`);
          setDesignations((current) => current.filter((item) => item.id !== designation.id));
          setSavedMessage('Designation deleted.');
        } catch (error) {
          toast.error(
            apiMessage(
              error,
              'This designation cannot be deleted while employees are assigned to it.'
            )
          );
        } finally {
          setDeletingDesignationId(null);
        }
      },
    });
  };

  const runConfirmedAction = async () => {
    if (!pendingConfirm) return;
    setConfirming(true);
    try {
      await pendingConfirm.action();
    } finally {
      setConfirming(false);
      setPendingConfirm(null);
    }
  };

  if (referenceLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={18} className="animate-spin text-slate-400" />
      </div>
    );
  }

  if (referenceError) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-3 rounded-2xl border border-rose-100 bg-rose-50/60 px-6 py-12 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-rose-100 text-rose-600">
          <AlertCircle size={20} />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800">Could not load departments</p>
          <p className="mt-1 text-xs text-slate-500">{referenceError}</p>
        </div>
        <button
          type="button"
          onClick={() => setReferenceReload((current) => current + 1)}
          className="btn-secondary inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold"
        >
          <RefreshCw size={13} />
          Retry
        </button>
      </div>
    );
  }

  if (manageableDepartments.length === 0) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-3 rounded-2xl border border-slate-100 bg-white px-6 py-14 text-center shadow-sm">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 text-blue-600">
          <Building2 size={20} />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800">No departments to configure</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            {user?.role === 'SUPER_ADMIN'
              ? 'Create a department first, then return here to configure its work settings, holidays, and leave policy.'
              : 'You are not assigned as the head of any department yet. Ask a Super Admin to assign you to a department.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={embedded ? 'space-y-5' : 'mx-auto max-w-5xl space-y-6'}>
      {!embedded && (
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Building2 size={13} className="text-slate-400" />
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              Company Setup · Departments
            </p>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-800">
            Department configuration
          </h1>
          <p className="mt-0.5 text-sm text-slate-400">
            Manage work rules, leave policy, holidays, and designations for one department at a time.
          </p>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Building2 size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                Department scope
              </p>
              <p className="truncate text-sm font-semibold text-slate-800">
                {activeDepartment?.name ?? 'Select a department'}
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
                {activeDepartment
                  ? `${activeDepartment._count.employees} ${
                      activeDepartment._count.employees === 1 ? 'employee' : 'employees'
                    } · overrides apply only to this team`
                  : 'Choose a department to configure'}
              </p>
            </div>
          </div>

          {manageableDepartments.length > 1 ? (
            <div className="w-full sm:w-64">
              <Select value={activeDeptId} onValueChange={setSelectedDeptId}>
                <SelectTrigger className="h-10 w-full rounded-xl border-slate-200 bg-white text-sm text-slate-700">
                  <SelectValue placeholder="Choose department" />
                </SelectTrigger>
                <SelectContent>
                  {manageableDepartments.map((department) => (
                    <SelectItem key={department.id} value={department.id}>
                      {department.name} ({department._count.employees})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <span className="inline-flex items-center gap-1.5 self-start rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-medium text-slate-500 sm:self-auto">
              <Users size={12} />
              Only department you manage
            </span>
          )}
        </div>
      </div>

      {savedMessage && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <span className="flex items-center gap-2">
            <CheckCircle2 size={15} className="flex-shrink-0" />
            {savedMessage}
          </span>
          <button
            type="button"
            onClick={() => setSavedMessage(null)}
            className="rounded-md p-0.5 text-emerald-500 transition-colors hover:text-emerald-700"
            aria-label="Dismiss message"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={18} className="animate-spin text-slate-400" />
        </div>
      ) : loadError ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-rose-100 bg-rose-50/60 px-6 py-12 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-rose-100 text-rose-600">
            <AlertCircle size={20} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">
              Could not load this department
            </p>
            <p className="mt-1 text-xs text-slate-500">{loadError}</p>
          </div>
          <button
            type="button"
            onClick={() => setReload((current) => current + 1)}
            className="btn-secondary inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold"
          >
            <RefreshCw size={13} />
            Retry
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
            <div className="flex min-w-max gap-1">
              {SECTION_TABS.map((section) => {
                const Icon = section.icon;
                const active = activeSection === section.id;
                const count =
                  section.id === 'holidays'
                    ? holidays.length
                    : section.id === 'designations'
                      ? designations.length
                      : null;

                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => setActiveSection(section.id)}
                    className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                      active
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                    }`}
                  >
                    <Icon size={14} />
                    {section.label}
                    {count !== null ? (
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                          active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {count}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-6">
            {activeSection === 'work' && (
            <SectionCard>
              <SectionHeader
                icon={Clock}
                title="Work settings"
                subtitle="Department overrides. Unset values inherit the company defaults."
              />
              <div className="space-y-5 p-5">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Shift profile
                  </label>
                  {shifts.length === 0 ? (
                    <div className="flex h-10 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500">
                      Use company default
                    </div>
                  ) : (
                    <Select
                      value={configForm.shiftProfileId || 'DEFAULT'}
                      onValueChange={(value) =>
                        setConfigForm((current) => ({
                          ...current,
                          shiftProfileId: value === 'DEFAULT' ? '' : value,
                        }))
                      }
                    >
                      <SelectTrigger className="h-10 w-full rounded-xl border-slate-200 bg-slate-50 text-sm text-slate-700">
                        <SelectValue placeholder="Use company default" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DEFAULT">Use company default</SelectItem>
                        {shifts.map((shift) => (
                          <SelectItem key={shift.id} value={shift.id}>
                            {shift.name}
                            {shift.isDefault ? ' · default' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-slate-800">Department shift rule</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      Create or update a shift for this department only. Saving applies it to
                      employees who inherit the department schedule, without editing them one by one.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Shift name
                      </label>
                      <input
                        value={shiftForm.name}
                        onChange={(event) =>
                          setShiftForm((current) => ({ ...current, name: event.target.value }))
                        }
                        placeholder="e.g. Engineering day shift"
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
                      />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          Start time
                        </label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min={1}
                            max={12}
                            value={shiftForm.checkinHour}
                            onChange={(event) =>
                              setShiftForm((current) => ({
                                ...current,
                                checkinHour: event.target.value,
                              }))
                            }
                            className="h-10 w-14 rounded-xl border border-slate-200 bg-white px-2 text-center text-sm font-semibold text-slate-800 outline-none focus:border-blue-400"
                          />
                          <span className="text-sm font-bold text-slate-400">:</span>
                          <input
                            type="number"
                            min={0}
                            max={59}
                            value={shiftForm.checkinMinute}
                            onChange={(event) =>
                              setShiftForm((current) => ({
                                ...current,
                                checkinMinute: event.target.value.padStart(2, '0').slice(0, 2),
                              }))
                            }
                            className="h-10 w-14 rounded-xl border border-slate-200 bg-white px-2 text-center text-sm font-semibold text-slate-800 outline-none focus:border-blue-400"
                          />
                          <select
                            value={shiftForm.period}
                            onChange={(event) =>
                              setShiftForm((current) => ({
                                ...current,
                                period: event.target.value as 'AM' | 'PM',
                              }))
                            }
                            className="h-10 rounded-xl border border-slate-200 bg-white px-2 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400"
                          >
                            <option value="AM">AM</option>
                            <option value="PM">PM</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          Work / break / grace
                        </label>
                        <div className="grid grid-cols-3 gap-1.5">
                          {[
                            ['workMinutes', 'Work'],
                            ['breakMinutes', 'Break'],
                            ['graceMinutes', 'Grace'],
                          ].map(([key, label]) => (
                            <div key={key} className="relative">
                              <input
                                type="number"
                                min={key === 'workMinutes' ? 60 : 0}
                                value={shiftForm[key as 'workMinutes' | 'breakMinutes' | 'graceMinutes']}
                                onChange={(event) =>
                                  setShiftForm((current) => ({
                                    ...current,
                                    [key]: event.target.value,
                                  }))
                                }
                                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-2 pr-7 text-center text-sm font-semibold text-slate-800 outline-none focus:border-blue-400"
                              />
                              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-semibold uppercase text-slate-400">
                                min
                              </span>
                              <p className="mt-1 text-center text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                                {label}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={saveDepartmentShift}
                        disabled={savingShift}
                        className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-3.5 py-2 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {savingShift ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <Save size={13} />
                        )}
                        Save department shift
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Weekend days
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {WEEKDAYS.map((day, index) => {
                      const active = configForm.weekends.includes(index);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleWeekend(index)}
                          aria-pressed={active}
                          className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                            active
                              ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-700'
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Absence checks and attendance reminders skip these days for this department.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Grace period
                  </label>
                  <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-500/15">
                    <input
                      type="number"
                      min={0}
                      max={1440}
                      value={configForm.gracePeriodMinutes}
                      onChange={(event) =>
                        setConfigForm((current) => ({
                          ...current,
                          gracePeriodMinutes: event.target.value,
                        }))
                      }
                      placeholder="Company default"
                      className="w-full border-0 bg-transparent text-sm font-semibold text-slate-800 outline-none"
                    />
                    <span className="text-[11px] font-medium text-slate-400">minutes</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Leave blank to inherit the company-wide grace period.
                  </p>
                </div>

                <div className="flex justify-end border-t border-slate-50 pt-4">
                  <button
                    type="button"
                    onClick={saveConfig}
                    disabled={savingConfig}
                    className="btn-primary inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingConfig ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Save size={14} />
                    )}
                    Save work settings
                  </button>
                </div>
              </div>
            </SectionCard>
            )}

            {activeSection === 'leave' && (
            <SectionCard>
              <SectionHeader
                icon={Plane}
                title="Leave policy"
                subtitle="Annual allowances applied to employees in this department."
              />
              <div className="space-y-5 p-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <NumberField
                    label="Sick leave"
                    value={policyForm.sickLeaveDays}
                    onChange={(value) =>
                      setPolicyForm((current) => ({ ...current, sickLeaveDays: value }))
                    }
                  />
                  <NumberField
                    label="Casual leave"
                    value={policyForm.casualLeaveDays}
                    onChange={(value) =>
                      setPolicyForm((current) => ({ ...current, casualLeaveDays: value }))
                    }
                  />
                  <NumberField
                    label="Vacation"
                    value={policyForm.vacationDays}
                    onChange={(value) =>
                      setPolicyForm((current) => ({ ...current, vacationDays: value }))
                    }
                  />
                </div>
                <p className="text-[11px] leading-relaxed text-slate-400">
                  Each employee gets these days individually — this is not a shared department
                  pool. Their leave cycle runs from their joining anniversary, unused days carry
                  forward, and the current cycle follows the latest policy. Completed cycles stay
                  frozen.
                </p>
                <div className="flex justify-end border-t border-slate-50 pt-4">
                  <button
                    type="button"
                    onClick={savePolicy}
                    disabled={savingPolicy}
                    className="btn-primary inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingPolicy ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Save size={14} />
                    )}
                    Save leave policy
                  </button>
                </div>
              </div>
            </SectionCard>
            )}

            {activeSection === 'holidays' && (
            <SectionCard>
              <SectionHeader
                icon={Calendar}
                title="Department holidays"
                subtitle="Additional non-working days that apply only to this department."
              />
              <div className="space-y-4 p-5">
                <form onSubmit={addHoliday} className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto]">
                  <input
                    value={newHoliday.name}
                    onChange={(event) =>
                      setNewHoliday((current) => ({ ...current, name: event.target.value }))
                    }
                    placeholder="Holiday name"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
                  />
                  <input
                    type="date"
                    value={newHoliday.date}
                    onChange={(event) =>
                      setNewHoliday((current) => ({ ...current, date: event.target.value }))
                    }
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
                  />
                  <button
                    type="submit"
                    disabled={addingHoliday || !newHoliday.name.trim() || !newHoliday.date}
                    className="btn-primary inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {addingHoliday ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                    Add
                  </button>
                </form>

                {holidays.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center">
                    <Calendar size={22} className="mx-auto mb-2 text-slate-200" />
                    <p className="text-xs font-medium text-slate-400">
                      No department-specific holidays yet.
                    </p>
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-50">
                    {holidays.map((holiday) => (
                      <li key={holiday.id} className="flex items-center gap-3 py-3">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                          <Calendar size={14} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-700">
                            {holiday.name}
                          </p>
                          <p className="mt-0.5 text-[11px] text-slate-400">
                            {formatHolidayDate(holiday.date)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeHoliday(holiday)}
                          disabled={deletingHolidayId === holiday.id}
                          className="btn-danger-ghost rounded-lg p-2 disabled:opacity-50"
                          aria-label={`Remove ${holiday.name}`}
                        >
                          {deletingHolidayId === holiday.id ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Trash2 size={13} />
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </SectionCard>
            )}

            {activeSection === 'designations' && (
            <SectionCard>
              <SectionHeader
                icon={Briefcase}
                title="Designations"
                subtitle="Job titles available to employees in this department."
              />
              <div className="space-y-4 p-5">
                <form onSubmit={addDesignation} className="flex flex-col gap-2 sm:flex-row">
                  <input
                    value={newDesignationName}
                    onChange={(event) => setNewDesignationName(event.target.value)}
                    placeholder="e.g. Senior Engineer"
                    className="w-full flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
                  />
                  <button
                    type="submit"
                    disabled={addingDesignation || !newDesignationName.trim()}
                    className="btn-primary inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {addingDesignation ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Plus size={14} />
                    )}
                    Add
                  </button>
                </form>

                {designations.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center">
                    <Users size={22} className="mx-auto mb-2 text-slate-200" />
                    <p className="text-xs font-medium text-slate-400">
                      No designations yet for this department.
                    </p>
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-50">
                    {designations.map((designation) => (
                      <li key={designation.id} className="flex items-center gap-2 py-2.5">
                        {editingDesignationId === designation.id ? (
                          <>
                            <input
                              value={editingDesignationName}
                              onChange={(event) => setEditingDesignationName(event.target.value)}
                              autoFocus
                              className="min-w-0 flex-1 rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
                            />
                            <button
                              type="button"
                              onClick={() => saveDesignation(designation)}
                              disabled={
                                updatingDesignationId === designation.id ||
                                !editingDesignationName.trim()
                              }
                              className="btn-primary rounded-lg p-2 disabled:opacity-50"
                              aria-label="Save designation"
                            >
                              {updatingDesignationId === designation.id ? (
                                <Loader2 size={13} className="animate-spin" />
                              ) : (
                                <Check size={13} />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={cancelEditingDesignation}
                              className="btn-ghost rounded-lg p-2"
                              aria-label="Cancel editing"
                            >
                              <X size={13} />
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700">
                              {designation.name}
                            </span>
                            <button
                              type="button"
                              onClick={() => startEditingDesignation(designation)}
                              className="btn-ghost rounded-lg p-2"
                              aria-label={`Edit ${designation.name}`}
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeDesignation(designation)}
                              disabled={deletingDesignationId === designation.id}
                              className="btn-danger-ghost rounded-lg p-2 disabled:opacity-50"
                              aria-label={`Delete ${designation.name}`}
                            >
                              {deletingDesignationId === designation.id ? (
                                <Loader2 size={13} className="animate-spin" />
                              ) : (
                                <Trash2 size={13} />
                              )}
                            </button>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                <p className="text-[11px] leading-relaxed text-slate-400">
                  Designations with assigned employees cannot be deleted. Rename them instead.
                </p>
              </div>
            </SectionCard>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pendingConfirm)}
        onOpenChange={(open) => {
          if (!open && !confirming) setPendingConfirm(null);
        }}
        title={pendingConfirm?.title ?? ''}
        description={pendingConfirm?.description ?? ''}
        confirmLabel={pendingConfirm?.confirmLabel}
        loading={confirming}
        onConfirm={runConfirmedAction}
      />
    </div>
  );
}
