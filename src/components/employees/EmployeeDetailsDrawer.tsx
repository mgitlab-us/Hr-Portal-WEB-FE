'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail, Phone, Calendar, Building2, Briefcase, Clock3,
  CreditCard, History, CheckCircle2, AlertCircle, Loader2,
  DollarSign, Landmark, Save, X, Pencil, ShieldCheck
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatLongDateDMY, formatMonthYear } from '@/lib/datetime';
import DesignationSelect from '@/components/employees/DesignationSelect';
import { useToast } from '@/components/ui/toast';
import { useAuthStore } from '@/store/authStore';

interface Employee {
  id: string;
  name: string;
  email: string;
  role: 'EMPLOYEE' | 'ADMIN' | 'SUPER_ADMIN';
  isActive: boolean;
  createdAt: string;
  departmentId?: string | null;
  shiftProfileId?: string | null;
  profile?: {
    employeeCode: string;
    designation: string;
    designationId?: string | null;
    department: string;
    phone?: string;
    joiningDate?: string;
    baseSalary?: string | number;
    bankName?: string;
    accountNumber?: string;
  };
}

interface PaymentRecord {
  id: string;
  month: number;
  year: number;
  amount: string;
  status: 'PAID' | 'PENDING';
  paymentDate: string | null;
  referenceId: string | null;
}

interface DepartmentOption {
  id: string;
  name: string;
}

interface ShiftOption {
  id: string;
  name: string;
}

interface Props {
  employeeId: string;
  canManage: boolean;
  onClose: () => void;
  avatarColor: { bg: string; text: string };
}

const AVATAR_FALLBACK = { bg: '#ECEFFE', text: '#5B6EF5' };

export default function EmployeeDetailsDrawer({ employeeId, canManage, onClose, avatarColor }: Props) {
  const { toast } = useToast();
  const isSuperAdmin = useAuthStore((state) => state.user?.role === 'SUPER_ADMIN');
  const [activeTab, setActiveTab] = useState<'details' | 'salary' | 'attendance'>('details');
  const [isEditing, setIsEditing] = useState(false);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [shifts, setShifts] = useState<ShiftOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [paying, setPaying] = useState(false);

  const [editInfo, setEditInfo] = useState({
    baseSalary: '',
    bankName: '',
    accountNumber: '',
    designation: '',
    designationId: '',
    phone: '',
    joiningDate: '',
    departmentId: '',
    shiftProfileId: ''
  });

  const fetchData = async () => {
    setLoading(true);
    setIsEditing(false);
    try {
      const [empRes, salaryRes, deptsRes, shiftsRes] = await Promise.all([
        api.get(`/employees/${employeeId}`),
        api.get(`/salary/${employeeId}/history`).catch(() => ({ data: [] })),
        api.get('/departments').catch(() => ({ data: [] })),
        api.get('/shifts').catch(() => ({ data: [] }))
      ]);
      setEmployee(empRes.data);
      setPayments(salaryRes.data || []);
      setDepartments(deptsRes.data || []);
      setShifts(shiftsRes.data || []);

      const p = empRes.data.profile;
      setEditInfo({
        baseSalary: p?.baseSalary !== undefined && p?.baseSalary !== null ? String(p.baseSalary) : '',
        bankName: p?.bankName || '',
        accountNumber: p?.accountNumber || '',
        designation: p?.designation || '',
        designationId: p?.designationId || (p?.designation ? '__legacy__' : ''),
        phone: p?.phone || '',
        joiningDate: p?.joiningDate ? String(p.joiningDate).slice(0, 10) : '',
        departmentId: empRes.data.departmentId || '',
        shiftProfileId: empRes.data.shiftProfileId || ''
      });
    } catch {
      console.error('Failed to load employee details');
      toast.error('Unable to load the employee details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

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

  const handleCancelEdit = () => {
    if (employee) {
      const p = employee.profile;
      setEditInfo({
        baseSalary: p?.baseSalary !== undefined && p?.baseSalary !== null ? String(p.baseSalary) : '',
        bankName: p?.bankName || '',
        accountNumber: p?.accountNumber || '',
        designation: p?.designation || '',
        designationId: p?.designationId || (p?.designation ? '__legacy__' : ''),
        phone: p?.phone || '',
        joiningDate: p?.joiningDate ? String(p.joiningDate).slice(0, 10) : '',
        departmentId: employee.departmentId || '',
        shiftProfileId: employee.shiftProfileId || ''
      });
    }
    setIsEditing(false);
  };

  const handleUpdateProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        departmentId: editInfo.departmentId || null,
        bankName: editInfo.bankName.trim() || undefined,
        accountNumber: editInfo.accountNumber.trim() || undefined
      };

      if (isSuperAdmin) {
        payload.shiftProfileId = editInfo.shiftProfileId || null;
      }

      if (editInfo.designationId === '__legacy__') {
        if (editInfo.designation.trim()) {
          payload.designation = editInfo.designation.trim();
        }
      } else {
        payload.designationId = editInfo.designationId || null;
      }

      if (editInfo.phone.trim()) {
        payload.phone = editInfo.phone.trim();
      }

      if (editInfo.joiningDate) {
        payload.joiningDate = new Date(`${editInfo.joiningDate}T00:00:00.000Z`).toISOString();
      }

      if (editInfo.baseSalary.trim() !== '') {
        const salaryNum = parseFloat(editInfo.baseSalary);
        if (!isNaN(salaryNum)) {
          payload.baseSalary = salaryNum;
        }
      }

      await api.patch(`/employees/${employeeId}`, payload);
      await fetchData();
      setIsEditing(false);
      toast.success('Employee information updated.');
    } catch {
      toast.error('Failed to update employee information.');
    } finally {
      setSaving(false);
    }
  };

  const handleMarkPaid = async () => {
    if (!editInfo.baseSalary) {
      toast.error('Please set a base salary before recording a payment.');
      return;
    }
    setPaying(true);
    const now = new Date();
    try {
      await api.post(`/salary/${employeeId}/mark-paid`, {
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        amount: parseFloat(editInfo.baseSalary)
      });
      fetchData();
      toast.success('Salary payment recorded.');
    } catch {
      toast.error('Failed to record the salary payment.');
    } finally {
      setPaying(false);
    }
  };

  const currentMonthPaid = payments.some(p =>
    p.month === new Date().getMonth() + 1 &&
    p.year === new Date().getFullYear() &&
    p.status === 'PAID'
  );

  const av = avatarColor || AVATAR_FALLBACK;
  const departmentName = departments.find(d => d.id === editInfo.departmentId)?.name;
  const shiftName = shifts.find(s => s.id === editInfo.shiftProfileId)?.name;

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
        aria-label={employee ? `${employee.name} details` : 'Employee details'}
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 34 }}
        className="relative flex h-full w-full max-w-2xl flex-col border-l border-slate-200 bg-slate-50 shadow-2xl"
      >
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6 sm:py-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-40 text-slate-400">
              <Loader2 size={20} className="animate-spin mb-2" />
              <p className="text-xs font-medium">Loading employee record…</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-5">
                <div className="flex min-w-0 items-center gap-4">
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-xl flex-shrink-0 shadow-xs"
                    style={{ backgroundColor: av.bg, color: av.text }}
                  >
                    {employee?.name.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      <h3 className="truncate text-base font-bold text-slate-800">{employee?.name}</h3>
                      <span className={`inline-flex flex-shrink-0 items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                        employee?.isActive ? 'text-emerald-600 bg-emerald-50 border border-emerald-100' : 'text-red-500 bg-red-50 border border-red-100'
                      }`}>
                        {employee?.isActive ? <CheckCircle2 size={9} /> : <AlertCircle size={9} />}
                        {employee?.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-slate-400 font-mono">#{employee?.profile?.employeeCode || 'EMP-000'}</p>
                      <span className="text-slate-300">•</span>
                      <p className="text-xs font-medium text-slate-600 truncate">{editInfo.designation || employee?.profile?.designation || 'Staff Member'}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {canManage && (
                    !isEditing ? (
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditing(true);
                          setActiveTab('details');
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold btn-primary rounded-lg"
                        aria-label="Edit employee"
                      >
                        <Pencil size={13} />
                        Edit
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold btn-secondary rounded-lg"
                        aria-label="Cancel editing"
                      >
                        <X size={13} />
                        Cancel
                      </button>
                    )
                  )}
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold btn-ghost rounded-lg"
                    aria-label="Close employee details"
                  >
                    <X size={14} />
                    Close
                  </button>
                </div>
              </div>

              {/* Quick summary ribbon */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white border border-slate-200/80 rounded-xl p-3.5 mb-5 shadow-2xs">
                <InfoField icon={Mail} label="Email" value={employee?.email || '—'} />
                <InfoField icon={Building2} label="Department" value={departmentName || employee?.profile?.department || 'Unassigned'} />
                <InfoField icon={Clock3} label="Shift" value={shiftName || 'Company Default'} />
                <InfoField
                  icon={DollarSign}
                  label="Salary Status"
                  value={currentMonthPaid ? 'Paid' : 'Pending'}
                  badge={
                    employee?.isActive && !currentMonthPaid
                      ? 'text-amber-700 bg-amber-50 border border-amber-200'
                      : 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                  }
                />
              </div>

              {/* Tabs */}
              <div className="border-b border-slate-200 mb-5">
                <div className="flex gap-6">
                  {(
                    [
                      { id: 'details' as const, icon: Briefcase, label: isEditing ? 'Edit Details' : 'Details' },
                      ...(canManage ? [{ id: 'salary' as const, icon: DollarSign, label: 'Payroll' }] : []),
                      { id: 'attendance' as const, icon: History, label: 'Logs' }
                    ] as Array<{ id: 'details' | 'salary' | 'attendance'; icon: React.ElementType; label: string }>
                  ).map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 py-2.5 text-xs font-bold transition-all relative ${
                        activeTab === tab.id ? 'text-blue-700' : 'text-slate-400 hover:text-blue-700'
                      }`}
                    >
                      <tab.icon size={13} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
                      {tab.label}
                      {activeTab === tab.id && (
                        <motion.div layoutId="panelTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <AnimatePresence mode="wait">
                {/* Details Tab — View Mode */}
                {activeTab === 'details' && !isEditing && (
                  <motion.div
                    key="details-view"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-5"
                  >
                    {/* Organization & Role */}
                    <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-2xs">
                      <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <Briefcase size={15} className="text-blue-600" />
                          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Employment & Role</h4>
                        </div>
                        <span className="text-[11px] font-semibold text-slate-400 font-mono">
                          ID: #{employee?.profile?.employeeCode || 'EMP-000'}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <DetailItem icon={Building2} label="Department" value={departmentName || employee?.profile?.department || 'Unassigned'} />
                        <DetailItem icon={Briefcase} label="Designation" value={editInfo.designation || employee?.profile?.designation || '—'} />
                        <DetailItem icon={Clock3} label="Shift Profile" value={shiftName || 'Company Default'} />
                        <DetailItem icon={ShieldCheck} label="System Role" value={employee?.role ? employee.role.replace('_', ' ') : '—'} />
                      </div>
                    </div>

                    {/* Contact & Personal */}
                    <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-2xs">
                      <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100">
                        <Mail size={15} className="text-blue-600" />
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Contact & Timeline</h4>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <DetailItem icon={Mail} label="Email Address" value={employee?.email || '—'} />
                        <DetailItem icon={Phone} label="Mobile Phone" value={editInfo.phone || 'Not provided'} />
                        <DetailItem
                          icon={Calendar}
                          label="Date Joined"
                          value={
                            employee?.profile?.joiningDate
                              ? formatLongDateDMY(employee.profile.joiningDate)
                              : employee?.createdAt
                                ? formatLongDateDMY(employee.createdAt)
                                : '—'
                          }
                        />
                        <DetailItem
                          icon={CheckCircle2}
                          label="Employment Status"
                          value={employee?.isActive ? 'Active Member' : 'Inactive'}
                          badgeColor={employee?.isActive ? 'text-emerald-700 bg-emerald-50 border border-emerald-200' : 'text-rose-700 bg-rose-50 border border-rose-200'}
                        />
                      </div>
                    </div>

                    {/* Compensation & Banking (Representing all fields!) */}
                    <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-2xs">
                      <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <Landmark size={15} className="text-blue-600" />
                          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Payroll & Bank Details</h4>
                        </div>
                        {canManage && (
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            currentMonthPaid ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {currentMonthPaid ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />}
                            {currentMonthPaid ? 'Paid this month' : 'Salary Pending'}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <DetailItem
                          icon={DollarSign}
                          label="Base Salary"
                          value={editInfo.baseSalary && Number(editInfo.baseSalary) > 0 ? `Rs. ${Number(editInfo.baseSalary).toLocaleString()}` : 'Not set'}
                          highlight
                        />
                        <DetailItem
                          icon={Building2}
                          label="Bank Name"
                          value={editInfo.bankName || 'Not provided'}
                        />
                        <DetailItem
                          icon={CreditCard}
                          label="Account / IBAN"
                          value={editInfo.accountNumber || 'Not provided'}
                        />
                      </div>
                    </div>

                    {/* Edit action CTA */}
                    {canManage && (
                      <div className="flex items-center justify-between p-4 bg-blue-50/70 border border-blue-100 rounded-xl">
                        <div className="min-w-0 pr-3">
                          <p className="text-xs font-bold text-blue-900">Need to update this employee?</p>
                          <p className="text-[11px] text-blue-700/80 mt-0.5">Modify designation, department, shift, salary, or banking records.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsEditing(true)}
                          className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold btn-primary rounded-lg shadow-xs"
                        >
                          <Pencil size={13} />
                          Edit Details
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Details Tab — Edit Mode */}
                {activeTab === 'details' && isEditing && canManage && (
                  <motion.div
                    key="details-edit"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-6"
                  >
                    <div className="flex items-center justify-between p-3.5 bg-blue-50 border border-blue-100 rounded-xl">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0">
                          <Pencil size={14} />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-blue-900">Editing Employee Details</h4>
                          <p className="text-[10px] text-blue-600">Update job assignment, contact info, and banking records.</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-2 py-1 rounded"
                      >
                        Cancel
                      </button>
                    </div>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleUpdateProfile();
                      }}
                      className="space-y-6"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Left column: Organization & Contact */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 pb-1 border-b border-slate-200">
                            <Briefcase size={13} className="text-blue-600" />
                            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-tight">Job & Organization</h4>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Designation</label>
                            <DesignationSelect
                              departmentId={editInfo.departmentId}
                              value={editInfo.designationId}
                              onChange={(designationId) =>
                                setEditInfo(p => ({ ...p, designationId }))
                              }
                              legacyLabel={
                                !employee?.profile?.designationId &&
                                editInfo.departmentId === (employee?.departmentId || '') &&
                                employee?.profile?.designation
                                  ? employee.profile.designation
                                  : null
                              }
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Mobile Number</label>
                            <input
                              type="tel"
                              value={editInfo.phone}
                              onChange={e => setEditInfo(p => ({ ...p, phone: e.target.value }))}
                              placeholder="+92 300 1234567"
                              className="w-full text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-400 transition-all outline-none"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Joining Date</label>
                            <input
                              type="date"
                              value={editInfo.joiningDate}
                              onChange={e => setEditInfo(p => ({ ...p, joiningDate: e.target.value }))}
                              className="w-full text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-400 transition-all outline-none"
                            />
                            <p className="text-[10px] text-slate-400">Leave cycles reset on this date each year.</p>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Department</label>
                            {departments.length === 0 ? (
                              <div className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                                Unassigned
                              </div>
                            ) : (
                              <select
                                value={editInfo.departmentId}
                                onChange={e =>
                                  setEditInfo(p => ({
                                    ...p,
                                    departmentId: e.target.value,
                                    designationId: '',
                                    designation: '',
                                  }))
                                }
                                className="w-full text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-400 transition-all outline-none"
                              >
                                {isSuperAdmin && <option value="">Unassigned</option>}
                                {departments.map((d) => (
                                  <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                              </select>
                            )}
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Shift Profile</label>
                            {!isSuperAdmin ? (
                              <div className="w-full rounded-lg border border-blue-100 bg-blue-50/60 px-3 py-2 text-sm text-blue-700">
                                Inherited from the employee&apos;s department
                              </div>
                            ) : shifts.length === 0 ? (
                              <div className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                                Default (Company settings)
                              </div>
                            ) : (
                              <select
                                value={editInfo.shiftProfileId}
                                onChange={e => setEditInfo(p => ({ ...p, shiftProfileId: e.target.value }))}
                                className="w-full text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-400 transition-all outline-none"
                              >
                                <option value="">Default (Company settings)</option>
                                {shifts.map((s) => (
                                  <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                              </select>
                            )}
                          </div>
                        </div>

                        {/* Right column: Bank & Payroll */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 pb-1 border-b border-slate-200">
                            <CreditCard size={13} className="text-blue-600" />
                            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-tight">Bank & Payroll</h4>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Base Salary (PKR)</label>
                            <div className="relative">
                              <DollarSign size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                              <input
                                type="number"
                                value={editInfo.baseSalary}
                                onChange={e => setEditInfo(p => ({ ...p, baseSalary: e.target.value }))}
                                className="w-full text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-2 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 transition-all"
                                placeholder="0.00"
                              />
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Bank Name</label>
                            <div className="relative">
                              <Building2 size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                              <input
                                type="text"
                                value={editInfo.bankName}
                                onChange={e => setEditInfo(p => ({ ...p, bankName: e.target.value }))}
                                className="w-full text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-2 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 transition-all"
                                placeholder="e.g. HBL, Meezan Bank, Alfalah"
                              />
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Account Number / IBAN</label>
                            <div className="relative">
                              <Landmark size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                              <input
                                type="text"
                                value={editInfo.accountNumber}
                                onChange={e => setEditInfo(p => ({ ...p, accountNumber: e.target.value }))}
                                className="w-full text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-2 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 transition-all"
                                placeholder="Bank account or IBAN"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          disabled={saving}
                          className="px-4 py-2 text-xs font-bold btn-secondary rounded-lg"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={saving}
                          className="inline-flex items-center justify-center gap-2 px-5 py-2 btn-primary text-xs font-bold rounded-lg shadow-xs"
                        >
                          {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                          Save Changes
                        </button>
                      </div>
                    </form>
                  </motion.div>
                )}

                {/* Salary Tab */}
                {activeTab === 'salary' && canManage && (
                  <motion.div
                    key="salary"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-5"
                  >
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">
                          {formatMonthYear(new Date())} Ledger
                        </p>
                        <p className="text-lg font-black text-blue-900">
                          Rs. {Number(editInfo.baseSalary).toLocaleString() || '0'}
                        </p>
                      </div>
                      {currentMonthPaid ? (
                        <div className="px-3 py-1 bg-blue-200 text-blue-800 rounded-full text-[10px] font-black uppercase tracking-wider">
                          Paid
                        </div>
                      ) : (
                        <button
                          onClick={handleMarkPaid}
                          disabled={paying}
                          className="px-5 py-2.5 btn-primary text-xs font-black rounded-xl"
                        >
                          {paying ? <Loader2 size={12} className="animate-spin" /> : 'MARK AS PAID'}
                        </button>
                      )}
                    </div>

                    <div className="space-y-2.5">
                      {payments.length === 0 ? (
                        <div className="py-10 flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-100 rounded-xl">
                          <History size={22} className="mb-2" />
                          <p className="text-xs font-bold">No payment history yet</p>
                        </div>
                      ) : (
                        payments.map(pay => (
                          <div key={pay.id} className="flex items-center justify-between p-3.5 bg-white border border-slate-100 rounded-xl">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-slate-50 rounded-lg flex flex-col items-center justify-center text-[10px] font-black text-slate-400">
                                <span className="uppercase">{new Date(pay.year, pay.month - 1).toLocaleString('default', { month: 'short' })}</span>
                                <span className="text-slate-300">{pay.year}</span>
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-700">Rs. {Number(pay.amount).toLocaleString()}</p>
                                <p className="text-[10px] text-slate-400 font-medium">Ref: {pay.referenceId?.slice(0, 8) || 'AUTO-SYSTEM'}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-lg">
                              <CheckCircle2 size={10} />
                              <span className="text-[10px] font-bold">PAID</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Attendance Tab */}
                {activeTab === 'attendance' && (
                  <motion.div
                    key="attendance"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15 }}
                    className="flex flex-col items-center justify-center py-14"
                  >
                    <div className="w-14 h-14 bg-white border border-slate-100 rounded-full flex items-center justify-center text-slate-300 mb-3">
                      <History size={26} />
                    </div>
                    <h4 className="text-sm font-bold text-slate-800">Attendance Logs</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-[240px] text-center leading-relaxed">
                      Recent check-in history and daily logs dashboard coming soon.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>
      </motion.aside>
    </motion.div>
  );
}

function InfoField({
  icon: Icon,
  label,
  value,
  badge
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  badge?: string;
}) {
  return (
    <div className="flex items-start gap-2 min-w-0">
      <Icon size={13} className="text-slate-400 mt-0.5 flex-shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
        {badge ? (
          <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded mt-0.5 ${badge}`}>
            {value}
          </span>
        ) : (
          <p className="text-xs font-semibold text-slate-700 truncate mt-0.5">{value}</p>
        )}
      </div>
    </div>
  );
}

function DetailItem({
  icon: Icon,
  label,
  value,
  highlight = false,
  badgeColor
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  highlight?: boolean;
  badgeColor?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 mt-0.5 flex-shrink-0">
        <Icon size={14} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
        {badgeColor ? (
          <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-md mt-0.5 ${badgeColor}`}>
            {value}
          </span>
        ) : (
          <p className={`text-xs font-semibold truncate mt-0.5 ${highlight ? 'text-blue-700 font-bold' : 'text-slate-700'}`}>
            {value}
          </p>
        )}
      </div>
    </div>
  );
}