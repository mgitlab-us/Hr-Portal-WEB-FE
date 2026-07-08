'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, UserPlus, Search, X, Mail, ShieldAlert, Loader2, CheckCircle2, XCircle, ChevronDown, FileText, MoreVertical, Trash2, Power, DollarSign } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import DashboardLayout from '@/components/layout/DashboardLayout';
import EmployeeDetailsDrawer from '@/components/employees/EmployeeDetailsDrawer';

interface Employee {
  id: string;
  name: string;
  email: string;
  role: 'EMPLOYEE' | 'ADMIN' | 'SUPER_ADMIN';
  isActive: boolean;
  createdAt: string;
  departmentId?: string | null;
  department?: { id: string; name: string } | null;
  profile?: {
    employeeCode: string;
    designation: string;
    department: string;
  };
}

interface Department {
  id: string;
  name: string;
  admin?: { id: string; name: string; email: string } | null;
}

interface ShiftProfile {
  id: string;
  name: string;
}

interface PayrollStatusRecord {
  id: string;
  payment?: { status: 'PAID' | 'PENDING' } | null;
}

const AVATAR_COLORS = [
  { bg: '#ECEFFE', text: '#5B6EF5' },
  { bg: '#E0F7F1', text: '#0D9E7A' },
  { bg: '#FEF6E4', text: '#D97706' },
  { bg: '#F4EFFE', text: '#8B5CF6' },
  { bg: '#FEE9ED', text: '#E8405A' },
  { bg: '#E0F0FF', text: '#2563EB' },
];
function avatarColor(name: string) {
  const i = (name.charCodeAt(0) + (name.charCodeAt(1) || 0)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[i];
}

function DepartmentBadge({ name }: { name?: string | null }) {
  if (!name) {
    return (
      <span className="inline-flex text-[10px] font-medium text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md">
        Unassigned
      </span>
    );
  }
  return (
    <span className="inline-flex text-[10px] font-semibold text-sky-700 bg-sky-50 border border-sky-100 px-2 py-0.5 rounded-md">
      {name}
    </span>
  );
}

function RoleBadge({ role }: { role: Employee['role'] }) {
  if (role === 'SUPER_ADMIN')
    return (
      <span className="inline-flex items-center text-[10px] font-semibold text-violet-600 bg-violet-50 border border-violet-100 px-2 py-0.5 rounded-md uppercase tracking-wide">
        Super Admin
      </span>
    );
  if (role === 'ADMIN')
    return (
      <span className="inline-flex items-center text-[10px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md uppercase tracking-wide">
        Admin
      </span>
    );
  return (
    <span className="inline-flex items-center text-[10px] font-semibold text-slate-500 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md uppercase tracking-wide">
      Employee
    </span>
  );
}

// ── Input
function Field({
  label, ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-slate-600">{label}</label>
      <input
        {...props}
        className="w-full bg-white border border-slate-200 rounded-lg py-2.5 px-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
      />
    </div>
  );
}

export default function EmployeesPage() {
  const { user } = useAuthStore();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [employeeCodeError, setEmployeeCodeError] = useState<string | null>(null);
  const [newEmployee, setNewEmployee] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'EMPLOYEE',
    designation: '',
    department: '',
    departmentId: '',
    employeeCode: '',
    shiftProfileId: '',
  });
  const [shifts, setShifts] = useState<ShiftProfile[]>([]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ type: 'DEACTIVATE' | 'ARCHIVE'; id: string; name: string } | null>(null);
  const [expandedEmployeeId, setExpandedEmployeeId] = useState<string | null>(null);
  const [payrollStatus, setPayrollStatus] = useState<PayrollStatusRecord[]>([]);

  const canManageEmployee = (emp: Employee) => {
    if (user?.role === 'SUPER_ADMIN') return true;
    if (user?.role === 'ADMIN') {
      const myDept = departments.find((d: Department) => d.admin?.id === user?.id);
      return !!myDept && (emp.departmentId === myDept.id || emp.department?.id === myDept.id);
    }
    return false;
  };

  const fetchEmployees = async () => {
    try {
      const res = await api.get('/employees');
      setEmployees(res.data);
    } catch (err) {
      console.error('Failed to fetch employees:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPayrollStatus = async () => {
    try {
      const res = await api.get('/salary/status');
      setPayrollStatus(res.data);
    } catch { }
  };

  useEffect(() => {
    if (user?.mustChangePassword) return;
    const init = async () => {
      await fetchEmployees();
      await fetchPayrollStatus();
      api.get('/shifts').then(res => setShifts(res.data)).catch(() => { });
      api.get('/departments').then(res => {
        setDepartments(res.data);
        if (user?.role === 'ADMIN') {
          const myDept = (res.data as Department[]).find((d) => d.admin?.id === user?.id);
          if (myDept) {
            setDepartmentFilter(myDept.id);
          }
        }
      }).catch(() => { });
    };
    init();
  }, [user]);

  const filteredEmployees = useMemo(() => {
    return employees.filter(
      (emp) => {
        const matchesSearch =
          emp.name.toLowerCase().includes(search.toLowerCase()) ||
          emp.email.toLowerCase().includes(search.toLowerCase()) ||
          emp.profile?.employeeCode?.toLowerCase().includes(search.toLowerCase());
        const matchesDept =
          !departmentFilter ||
          emp.departmentId === departmentFilter ||
          emp.department?.id === departmentFilter;
        return matchesSearch && matchesDept;
      }
    );
  }, [employees, search, departmentFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setEmployeeCodeError(null);
    try {
      await api.post('/employees', newEmployee);
      setIsAddModalOpen(false);
      fetchEmployees();
      setNewEmployee({ name: '', email: '', phone: '', password: '', role: 'EMPLOYEE', designation: '', department: '', departmentId: '', employeeCode: '', shiftProfileId: '' });
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: { message?: string } } };
      const msg = e?.response?.data?.message || '';
      if (e?.response?.status === 409 && msg.toLowerCase().includes('code')) {
        setEmployeeCodeError('This Employee ID is already in use. Please edit the ID field below.');
      } else {
        alert(msg || 'Failed to create employee. Please check if email is unique.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (id: string) => {
    try {
      await api.patch(`/employees/${id}/toggle-status`);
      setConfirmModal(null);
      fetchEmployees();
    } catch {
      alert('Action failed.');
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await api.delete(`/employees/${id}`);
      setConfirmModal(null);
      fetchEmployees();
    } catch {
      alert('Action failed.');
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedEmployeeId((prev) => (prev === id ? null : id));
  };

  const closeExpanded = () => {
    setExpandedEmployeeId(null);
    fetchEmployees();
    fetchPayrollStatus();
  };

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setNewEmployee((p) => ({ ...p, [k]: e.target.value }));

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6">

        {/* ── Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">
              Admin · Directory
            </p>
            <h1 className="text-2xl font-semibold text-slate-800 tracking-tight">
              Staff Directory
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">
              {employees.length} total members
            </p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
          >
            <UserPlus size={14} />
            Add Employee
          </button>
        </div>

        {/* ── Table Card */}
        <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">

          {/* Toolbar */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
            <div className="relative flex-1 max-w-sm">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search name, email or ID…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-8 pr-8 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={12} />
                </button>
              )}
            </div>
            {departments.length > 0 && (
              <div className="relative">
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="appearance-none bg-slate-50 border border-slate-200 rounded-lg py-2 pl-3 pr-8 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                >
                  <option value="">All departments</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            )}
            <div className="ml-auto flex items-center gap-2 text-xs text-slate-400">
              <Users size={12} />
              <span>{filteredEmployees.length} result{filteredEmployees.length !== 1 ? 's' : ''}</span>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={20} className="text-slate-400 animate-spin" />
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Users size={28} className="mb-3 text-slate-300" />
              <p className="text-sm">No employees found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100">
                    <th className="px-5 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                      Employee
                    </th>
                    <th className="px-5 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                      Role
                    </th>
                    <th className="px-5 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-widest hidden md:table-cell">
                      Department
                    </th>
                    <th className="px-5 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-widest text-center">
                      Status
                    </th>
                    <th className="px-5 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-widest hidden lg:table-cell">
                      ID
                    </th>
                    <th className="px-5 py-3 w-12" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredEmployees.map((emp) => {
                    const av = avatarColor(emp.name);
                    const isExpanded = expandedEmployeeId === emp.id;
                    return (
                      <React.Fragment key={emp.id}>
                        <tr
                          onClick={() => toggleExpand(emp.id)}
                          className={`cursor-pointer transition-colors group ${isExpanded ? 'bg-slate-50' : 'hover:bg-slate-50/60'}`}
                        >
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
                                style={{ backgroundColor: av.bg, color: av.text }}
                              >
                                {emp.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-slate-700">
                                  {emp.name}
                                </p>
                                <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                                  <Mail size={10} />
                                  {emp.email}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <RoleBadge role={emp.role} />
                          </td>
                          <td className="px-5 py-3.5 hidden md:table-cell">
                            <p className="text-sm text-slate-600">
                              {emp.profile?.designation || '—'}
                            </p>
                            <div className="mt-1">
                              <DepartmentBadge name={emp.department?.name || emp.profile?.department} />
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            {emp.isActive ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md">
                                <CheckCircle2 size={9} />
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-500 bg-red-50 border border-red-100 px-2 py-0.5 rounded-md">
                                <XCircle size={9} />
                                Inactive
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 hidden lg:table-cell">
                            <div className="flex flex-col gap-1">
                              <span className="text-xs text-slate-400 font-mono">
                                {emp.profile?.employeeCode || '—'}
                              </span>
                              {payrollStatus.find(p => p.id === emp.id)?.payment?.status === 'PAID' ? (
                                 <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-indigo-500 uppercase tracking-tighter">
                                   <DollarSign size={8} /> Paid
                                 </span>
                              ) : (
                                 <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-400 uppercase tracking-tighter">
                                   <DollarSign size={8} /> Pending
                                 </span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-right relative">
                            {emp.role !== 'SUPER_ADMIN' && (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuId(openMenuId === emp.id ? null : emp.id);
                                  }}
                                  className={`p-1.5 rounded-md transition-all ${openMenuId === emp.id ? 'bg-slate-100 text-slate-800' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                                >
                                  <MoreVertical size={14} />
                                </button>

                                {openMenuId === emp.id && (
                                  <>
                                    <div
                                      className="fixed inset-0 z-10"
                                      onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); }}
                                    />
                                    <div
                                      onClick={(e) => e.stopPropagation()}
                                      className="absolute right-12 top-1/2 -translate-y-1/2 z-20 w-48 bg-white border border-slate-100 rounded-xl shadow-xl py-1.5 overflow-hidden animate-in fade-in slide-in-from-right-2 duration-200"
                                    >
                                      <button
                                        onClick={() => {
                                          setOpenMenuId(null);
                                          toggleExpand(emp.id);
                                        }}
                                        className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
                                      >
                                        <FileText size={12} className="text-indigo-500" />
                                        {isExpanded ? 'Collapse Profile' : 'View Full Profile'}
                                      </button>
                                      {canManageEmployee(emp) && (
                                        <>
                                          <hr className="my-1 border-slate-50" />
                                          <button
                                            onClick={() => {
                                              setOpenMenuId(null);
                                              setConfirmModal({ type: 'DEACTIVATE', id: emp.id, name: emp.name });
                                            }}
                                            className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                                          >
                                            <Power size={12} className={emp.isActive ? 'text-amber-500' : 'text-emerald-500'} />
                                            {emp.isActive ? 'Deactivate Account' : 'Activate Account'}
                                          </button>
                                          <button
                                            onClick={() => {
                                              setOpenMenuId(null);
                                              setConfirmModal({ type: 'ARCHIVE', id: emp.id, name: emp.name });
                                            }}
                                            className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-red-500 hover:bg-red-50 transition-colors"
                                          >
                                            <Trash2 size={12} />
                                            Archive Account (Delete)
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </>
                                )}
                              </>
                            )}
                          </td>
                        </tr>

                        <AnimatePresence initial={false}>
                          {isExpanded && (
                            <tr>
                              <td colSpan={6} className="p-0">
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                                  className="overflow-hidden"
                                >
                                  <EmployeeDetailsDrawer
                                    employeeId={emp.id}
                                    canManage={canManageEmployee(emp)}
                                    onClose={closeExpanded}
                                    avatarColor={av}
                                  />
                                </motion.div>
                              </td>
                            </tr>
                          )}
                        </AnimatePresence>
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px] animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 w-full max-w-sm rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${confirmModal.type === 'ARCHIVE' ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-500'}`}>
                {confirmModal.type === 'ARCHIVE' ? <Trash2 size={24} /> : <ShieldAlert size={24} />}
              </div>
              <h3 className="text-lg font-bold text-slate-800">
                {confirmModal.type === 'ARCHIVE' ? 'Archive Employee?' : 'Change Account Status?'}
              </h3>
              <p className="text-sm text-slate-500 mt-2">
                {confirmModal.type === 'ARCHIVE'
                  ? `Are you sure you want to archive ${confirmModal.name}? This will remove them from the active list but keep their historical records.`
                  : `Are you sure you want to change the status for ${confirmModal.name}? Deactivated users cannot access their accounts.`}
              </p>
            </div>
            <div className="flex border-t border-slate-100">
              <button
                onClick={() => setConfirmModal(null)}
                className="flex-1 px-4 py-3 text-sm font-semibold text-slate-500 hover:bg-slate-50 transition-colors border-r border-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={() => confirmModal.type === 'ARCHIVE' ? handleArchive(confirmModal.id) : toggleStatus(confirmModal.id)}
                className={`flex-1 px-4 py-3 text-sm font-bold text-white transition-colors ${confirmModal.type === 'ARCHIVE' ? 'bg-red-500 hover:bg-red-600' : 'bg-slate-800 hover:bg-slate-900'}`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Employee Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 w-full max-w-lg rounded-xl shadow-xl">

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-semibold text-slate-800">Add Employee</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Register a new organisation member
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreate} className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field
                  label="Full name"
                  required
                  value={newEmployee.name}
                  onChange={set('name')}
                  placeholder="Jane Smith"
                />
                <Field
                  label="Email address"
                  required
                  type="email"
                  value={newEmployee.email}
                  onChange={set('email')}
                  placeholder="jane@company.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field
                  label="Mobile number"
                  required
                  type="tel"
                  value={newEmployee.phone}
                  onChange={set('phone')}
                  placeholder="+92 300 1234567"
                />
                <Field
                  label="Initial password"
                  required
                  type="password"
                  value={newEmployee.password}
                  onChange={set('password')}
                  placeholder="Minimum 6 characters"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field
                  label="Designation"
                  value={newEmployee.designation}
                  onChange={set('designation')}
                  placeholder="Software Engineer"
                />
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-600">Department</label>
                  <div className="relative">
                    <select
                      value={newEmployee.departmentId}
                      onChange={set('departmentId')}
                      className="w-full appearance-none bg-white border border-slate-200 rounded-lg py-2.5 px-3 pr-8 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                    >
                      <option value="">Unassigned</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                    <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Employee Code */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-600">Employee ID</label>
                <input
                  value={newEmployee.employeeCode}
                  onChange={(e) => {
                    setEmployeeCodeError(null);
                    set('employeeCode')(e);
                  }}
                  placeholder="Auto-generated if blank (e.g. ASE-SOF-001)"
                  className={`w-full bg-white border rounded-lg py-2.5 px-3 text-sm font-mono text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all ${
                    employeeCodeError
                      ? 'border-red-400 ring-red-100 ring-2'
                      : 'border-slate-200 focus:ring-indigo-500/20 focus:border-indigo-400'
                  }`}
                />
                {employeeCodeError ? (
                  <p className="text-xs text-red-500 font-medium">{employeeCodeError}</p>
                ) : (
                  <p className="text-[10px] text-slate-400 italic">Auto-generated · Format: DES-DEP-001 · You can override this</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Role select */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-600">Role</label>
                  <div className="relative">
                    <select
                      value={newEmployee.role}
                      onChange={set('role')}
                      className="w-full appearance-none bg-white border border-slate-200 rounded-lg py-2.5 px-3 pr-8 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                    >
                      <option value="EMPLOYEE">Employee</option>
                      <option value="ADMIN">Admin (HR Manager)</option>
                    </select>
                    <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* Shift select */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-600">Shift Profile</label>
                  <div className="relative">
                    <select
                      value={newEmployee.shiftProfileId}
                      onChange={set('shiftProfileId')}
                      className="w-full appearance-none bg-white border border-slate-200 rounded-lg py-2.5 px-3 pr-8 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                    >
                      <option value="">Default (Company settings)</option>
                      {shifts.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
                >
                  {submitting && <Loader2 size={13} className="animate-spin" />}
                  Create Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}