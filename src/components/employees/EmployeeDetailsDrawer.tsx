'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail, Phone, Calendar, Building2, Briefcase, Clock3,
  CreditCard, History, CheckCircle2, AlertCircle, Loader2,
  DollarSign, Landmark, Save, ChevronUp
} from 'lucide-react';
import { api } from '@/lib/api';
import { format } from 'date-fns';

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
    department: string;
    phone?: string;
    baseSalary?: string;
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
  const [activeTab, setActiveTab] = useState<'details' | 'salary' | 'attendance'>('details');
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
    departmentId: '',
    shiftProfileId: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [empRes, salaryRes, deptsRes, shiftsRes] = await Promise.all([
        api.get(`/employees/${employeeId}`),
        api.get(`/salary/${employeeId}/history`).catch(() => ({ data: [] })),
        api.get('/departments').catch(() => ({ data: [] })),
        api.get('/shifts').catch(() => ({ data: [] }))
      ]);
      setEmployee(empRes.data);
      setPayments(salaryRes.data);
      setDepartments(deptsRes.data || []);
      setShifts(shiftsRes.data || []);

      const p = empRes.data.profile;
      setEditInfo({
        baseSalary: p?.baseSalary || '',
        bankName: p?.bankName || '',
        accountNumber: p?.accountNumber || '',
        designation: p?.designation || '',
        departmentId: empRes.data.departmentId || '',
        shiftProfileId: empRes.data.shiftProfileId || ''
      });
    } catch {
      console.error('Failed to load employee details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  const handleUpdateProfile = async () => {
    setSaving(true);
    try {
      await api.patch(`/employees/${employeeId}`, {
        designation: editInfo.designation,
        departmentId: editInfo.departmentId || null,
        shiftProfileId: editInfo.shiftProfileId || null,
        baseSalary: parseFloat(editInfo.baseSalary) || 0,
        bankName: editInfo.bankName,
        accountNumber: editInfo.accountNumber
      });
      fetchData();
    } catch {
      alert('Failed to update employee information');
    } finally {
      setSaving(false);
    }
  };

  const handleMarkPaid = async () => {
    if (!editInfo.baseSalary) {
      alert('Please set a base salary before recording payment.');
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
    } catch {
      alert('Failed to record payment');
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
    <div className="bg-slate-50/60 border-t border-slate-100 px-6 py-6">
      {loading ? (
        <div className="flex flex-col items-center justify-center h-40 text-slate-400">
          <Loader2 size={20} className="animate-spin mb-2" />
          <p className="text-xs font-medium">Loading employee record…</p>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-4">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-xl flex-shrink-0"
                style={{ backgroundColor: av.bg, color: av.text }}
              >
                {employee?.name.charAt(0).toUpperCase() || '?'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-800">{employee?.name}</h3>
                  <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                    employee?.isActive ? 'text-emerald-600 bg-emerald-50 border border-emerald-100' : 'text-red-500 bg-red-50 border border-red-100'
                  }`}>
                    {employee?.isActive ? <CheckCircle2 size={9} /> : <AlertCircle size={9} />}
                    {employee?.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-mono mt-0.5">#{employee?.profile?.employeeCode || 'EMP-000'}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ChevronUp size={13} />
              Collapse
            </button>
          </div>

          {/* Basic HR info grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white border border-slate-100 rounded-xl p-4 mb-5">
            <InfoField icon={Mail} label="Email" value={employee?.email || '—'} />
            <InfoField icon={Phone} label="Phone" value={employee?.profile?.phone || '—'} />
            <InfoField icon={Building2} label="Department" value={departmentName || '—'} />
            <InfoField icon={Briefcase} label="Designation" value={editInfo.designation || '—'} />
            <InfoField icon={Clock3} label="Shift Profile" value={shiftName || 'Default'} />
            <InfoField
              icon={Calendar}
              label="Joined"
              value={employee?.createdAt ? format(new Date(employee.createdAt), 'MMM d, yyyy') : '—'}
            />
            <InfoField icon={CheckCircle2} label="Role" value={employee?.role.replace('_', ' ') || '—'} />
            {!currentMonthPaid && employee?.isActive && (
              <div className="flex items-center gap-1.5 self-center">
                <AlertCircle size={11} className="text-amber-500" />
                <span className="text-[10px] font-bold text-amber-600 uppercase">Salary Pending</span>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="border-b border-slate-200 mb-5">
            <div className="flex gap-6">
              {(
                [
                  ...(canManage ? [{ id: 'details' as const, icon: Briefcase, label: 'Edit Details' }] : []),
                  ...(canManage ? [{ id: 'salary' as const, icon: DollarSign, label: 'Payroll' }] : []),
                  { id: 'attendance' as const, icon: History, label: 'Logs' }
                ] as Array<{ id: 'details' | 'salary' | 'attendance'; icon: React.ElementType; label: string }>
              ).map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-2.5 text-xs font-bold transition-all relative ${
                    activeTab === tab.id ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <tab.icon size={13} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
                  {tab.label}
                  {activeTab === tab.id && (
                    <motion.div layoutId="panelTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'details' && canManage && (
              <motion.div
                key="details"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Designation</label>
                    <input
                      value={editInfo.designation}
                      onChange={e => setEditInfo(p => ({ ...p, designation: e.target.value }))}
                      className="w-full text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Department</label>
                    <select
                      value={editInfo.departmentId}
                      onChange={e => setEditInfo(p => ({ ...p, departmentId: e.target.value }))}
                      className="w-full text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all outline-none"
                    >
                      <option value="">Unassigned</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Shift Profile</label>
                    <select
                      value={editInfo.shiftProfileId}
                      onChange={e => setEditInfo(p => ({ ...p, shiftProfileId: e.target.value }))}
                      className="w-full text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all outline-none"
                    >
                      <option value="">Default (Company settings)</option>
                      {shifts.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <CreditCard size={13} className="text-indigo-500" />
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-tight">Bank & Payroll</h4>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Base Salary (PKR)</label>
                    <div className="relative">
                      <DollarSign size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="number"
                        value={editInfo.baseSalary}
                        onChange={e => setEditInfo(p => ({ ...p, baseSalary: e.target.value }))}
                        className="w-full text-sm font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-2 outline-none"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Bank Name</label>
                    <div className="relative">
                      <Building2 size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        value={editInfo.bankName}
                        onChange={e => setEditInfo(p => ({ ...p, bankName: e.target.value }))}
                        className="w-full text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-2 outline-none focus:border-indigo-400 transition-all"
                        placeholder="e.g. HBL, Alfalah…"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Account Number (IBAN)</label>
                    <div className="relative">
                      <Landmark size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        value={editInfo.accountNumber}
                        onChange={e => setEditInfo(p => ({ ...p, accountNumber: e.target.value }))}
                        className="w-full text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-2 outline-none focus:border-indigo-400 transition-all"
                        placeholder="Bank account or IBAN"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleUpdateProfile}
                    disabled={saving}
                    className="w-full inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold py-2.5 rounded-lg transition-all disabled:opacity-50"
                  >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    Update Record
                  </button>
                </div>
              </motion.div>
            )}

            {activeTab === 'salary' && canManage && (
              <motion.div
                key="salary"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
                className="space-y-5"
              >
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">
                      {format(new Date(), 'MMMM yyyy')} Ledger
                    </p>
                    <p className="text-lg font-black text-indigo-900">
                      Rs. {Number(editInfo.baseSalary).toLocaleString() || '0'}
                    </p>
                  </div>
                  {currentMonthPaid ? (
                    <div className="px-3 py-1 bg-indigo-200 text-indigo-800 rounded-full text-[10px] font-black uppercase tracking-wider">
                      Paid
                    </div>
                  ) : (
                    <button
                      onClick={handleMarkPaid}
                      disabled={paying}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl transition-all disabled:opacity-50"
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
  );
}

function InfoField({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon size={13} className="text-slate-400 mt-0.5 flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="text-xs font-semibold text-slate-700 truncate">{value}</p>
      </div>
    </div>
  );
}