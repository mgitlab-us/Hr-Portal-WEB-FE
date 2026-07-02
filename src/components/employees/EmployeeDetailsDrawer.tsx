'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, CreditCard, History, CheckCircle2, AlertCircle, Loader2, DollarSign, Building2, Landmark, Save } from 'lucide-react';
import { api } from '@/lib/api';
import { format } from 'date-fns';

interface Employee {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  departmentId?: string | null;
  shiftProfileId?: string | null;
  profile?: {
    employeeCode: string;
    designation: string;
    department: string;
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

interface Props {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string | null;
  canManage: boolean;
}

interface DepartmentOption {
  id: string;
  name: string;
}

interface ShiftOption {
  id: string;
  name: string;
}

export default function EmployeeDetailsDrawer({ isOpen, onClose, employeeId, canManage }: Props) {
  const [activeTab, setActiveTab] = useState<'overview' | 'salary' | 'attendance'>('overview');
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [shifts, setShifts] = useState<ShiftOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [paying, setPaying] = useState(false);
  
  // Local state for editing profile info
  const [editInfo, setEditInfo] = useState({
    baseSalary: '',
    bankName: '',
    accountNumber: '',
    designation: '',
    departmentId: '',
    shiftProfileId: ''
  });

  const fetchData = async () => {
    if (!employeeId) return;
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
    if (isOpen && employeeId) {
      const init = async () => { await fetchData(); };
      init();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, employeeId]);

  const handleUpdateProfile = async () => {
    if (!employeeId) return;
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
    if (!employeeId || !editInfo.baseSalary) {
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

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-[100]"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-xl bg-white shadow-2xl z-[101] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-100">
                  {employee?.name.charAt(0).toUpperCase() || '...'}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800 leading-tight">{employee?.name || 'Loading...'}</h2>
                  <p className="text-xs text-slate-400 font-medium">#{employee?.profile?.employeeCode || 'EMP-000'}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-200/50 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto bg-white">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                  <Loader2 size={24} className="animate-spin mb-2" />
                  <p className="text-xs font-medium">Synchronising records...</p>
                </div>
              ) : (
                <>
                  {/* Tabs */}
                  <div className="px-6 border-b border-slate-100 bg-slate-50/20">
                    <div className="flex gap-8">
                      {(
                        [
                          { id: 'overview' as const, icon: User, label: 'Overview' },
                          ...(canManage ? [{ id: 'salary' as const, icon: DollarSign, label: 'Payroll' }] : []),
                          { id: 'attendance' as const, icon: History, label: 'Logs' }
                        ] as Array<{ id: 'overview' | 'salary' | 'attendance'; icon: React.ElementType; label: string }>
                      ).map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className={`flex items-center gap-2 py-4 text-xs font-bold transition-all relative ${
                            activeTab === tab.id ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
                          }`}
                        >
                          <tab.icon size={13} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
                          {tab.label}
                          {activeTab === tab.id && (
                            <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-6 space-y-8">
                    {/* OVERVIEW TAB */}
                    {activeTab === 'overview' && (
                      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {/* Status Card */}
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${employee?.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                            <span className="text-xs font-bold text-slate-700">{employee?.isActive ? 'ACTIVE ACCOUNT' : 'INACTIVE'}</span>
                            <span className="text-xs text-slate-400 font-medium">· Joined {employee?.createdAt ? format(new Date(employee.createdAt), 'MMM yyyy') : '—'}</span>
                          </div>
                          {!currentMonthPaid && employee?.isActive && (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-600 rounded-lg border border-amber-100 border-dashed">
                              <AlertCircle size={10} />
                              <span className="text-[10px] font-bold">SALARY PENDING</span>
                            </div>
                          )}
                        </div>

                        {/* Professional Info */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Designation</label>
                            <input 
                              value={editInfo.designation} 
                              onChange={e => setEditInfo(p => ({ ...p, designation: e.target.value }))}
                              disabled={!canManage}
                              className="w-full text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all outline-none disabled:bg-slate-50 disabled:text-slate-400" 
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Department</label>
                            {canManage ? (
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
                            ) : (
                              <input 
                                value={departments.find(d => d.id === editInfo.departmentId)?.name || 'Unassigned'} 
                                disabled
                                className="w-full text-sm font-medium text-slate-400 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none" 
                              />
                            )}
                          </div>
                        </div>

                        {/* Shift Profile (Requirement 1) */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Shift Profile</label>
                            {canManage ? (
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
                            ) : (
                              <input 
                                value={shifts.find(s => s.id === editInfo.shiftProfileId)?.name || 'Default (Company settings)'} 
                                disabled
                                className="w-full text-sm font-medium text-slate-400 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none" 
                              />
                            )}
                          </div>
                        </div>

                        {canManage && (
                          <>
                            <hr className="border-slate-100" />

                            {/* Payroll Settings */}
                            <div className="space-y-4">
                              <div className="flex items-center gap-2 mb-1">
                                <CreditCard size={14} className="text-indigo-500" />
                                <h3 className="text-sm font-bold text-slate-800">Bank & Payroll Details</h3>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4">
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
                                      placeholder="e.g. HBL, Alfalah..."
                                    />
                                  </div>
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
                            </div>

                            {/* Save Action */}
                            <div className="pt-2">
                              <button
                                onClick={handleUpdateProfile}
                                disabled={saving}
                                className="w-full inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold py-2.5 rounded-lg transition-all shadow-lg shadow-slate-100 disabled:opacity-50"
                              >
                                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                Update Record
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* SALARY TAB */}
                    {activeTab === 'salary' && (
                      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {/* Current Status Area */}
                        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 relative overflow-hidden">
                          <div className="absolute -right-4 -bottom-4 opacity-10">
                            <DollarSign size={80} className="text-indigo-900" />
                          </div>
                          <div className="relative z-10">
                            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Current Ledger Status</p>
                            <h4 className="text-xl font-bold text-indigo-900">{format(new Date(), 'MMMM yyyy')}</h4>
                            
                            <div className="mt-4 flex items-center justify-between">
                              <div>
                                <p className="text-xs text-indigo-600/70 font-medium tracking-tight">Expected Salary</p>
                                <p className="text-lg font-black text-indigo-900">Rs. {Number(editInfo.baseSalary).toLocaleString() || '0'}</p>
                              </div>
                              {currentMonthPaid ? (
                                <div className="flex flex-col items-end">
                                  <div className="px-3 py-1 bg-indigo-200 text-indigo-800 rounded-full text-[10px] font-black uppercase tracking-wider mb-1">
                                    PAID
                                  </div>
                                  <p className="text-[10px] text-indigo-600/60 font-medium italic">Confirmed on web</p>
                                </div>
                              ) : (
                                <button
                                  onClick={handleMarkPaid}
                                  disabled={paying}
                                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl shadow-lg shadow-indigo-200 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                                >
                                  {paying ? <Loader2 size={12} className="animate-spin" /> : 'MARK AS PAID'}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Payment History */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <History size={14} className="text-slate-400" />
                              <h3 className="text-sm font-bold text-slate-800">Historical Ledger</h3>
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">{payments.length} Records</span>
                          </div>

                          <div className="space-y-2.5">
                            {payments.length === 0 ? (
                              <div className="py-12 flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-50 rounded-2xl">
                                <History size={24} className="mb-2" />
                                <p className="text-xs font-bold">No payment history yet</p>
                              </div>
                            ) : (
                              payments.map(pay => (
                                <div key={pay.id} className="group flex items-center justify-between p-3.5 bg-white border border-slate-100 rounded-xl hover:border-slate-200 hover:shadow-sm transition-all">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-slate-50 rounded-lg flex flex-col items-center justify-center text-[10px] font-black text-slate-400">
                                      <span className="uppercase">{new Date(pay.year, pay.month - 1).toLocaleString('default', { month: 'short' })}</span>
                                      <span className="text-slate-300">{pay.year}</span>
                                    </div>
                                    <div>
                                      <p className="text-sm font-bold text-slate-700">Rs. {Number(pay.amount).toLocaleString()}</p>
                                      <p className="text-[10px] text-slate-400 font-medium">Ref: {pay.referenceId?.slice(0,8) || 'AUTO-SYSTEM'}</p>
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
                        </div>
                      </div>
                    )}

                    {/* ATTENDANCE TAB */}
                    {activeTab === 'attendance' && (
                      <div className="flex flex-col items-center justify-center py-20 animate-in fade-in zoom-in-95 duration-300">
                         <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4">
                            <History size={32} />
                         </div>
                         <h4 className="text-sm font-bold text-slate-800">Attendance Logs</h4>
                         <p className="text-xs text-slate-400 mt-1 max-w-[200px] text-center leading-relaxed">Recent activity logs and check-in history dashboard coming soon in the next update.</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center flex-1">
                ENTERPRISE RECORD SYSTEM · SECURE LEDGER v1.0
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
