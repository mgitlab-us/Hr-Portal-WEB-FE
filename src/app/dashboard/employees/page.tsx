'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Users, UserPlus, Search, X, Mail, ShieldAlert, Loader2, CheckCircle2, XCircle, ChevronDown, FileText, MoreVertical, Trash2, Power, DollarSign } from 'lucide-react';
import { api } from '@/lib/api';
import { todayDateKey } from '@/lib/datetime';
import { useAuthStore } from '@/store/authStore';
import DashboardLayout from '@/components/layout/DashboardLayout';
import EmployeeDetailsDrawer from '@/components/employees/EmployeeDetailsDrawer';
import CredentialsShareModal from '@/components/employees/CredentialsShareModal';
import DesignationSelect from '@/components/employees/DesignationSelect';
import FilterChips from '@/components/filters/FilterChips';
import { useToast } from '@/components/ui/toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Employee {
  id: string;
  name: string;
  email: string;
  role: 'EMPLOYEE' | 'MANAGER' | 'ADMIN' | 'SUPER_ADMIN';
  isActive: boolean;
  createdAt: string;
  departmentId?: string | null;
  department?: {
    id: string;
    name: string;
    managers?: { employee: { id: string; name: string; email: string } }[];
  } | null;
  managerId?: string | null;
  manager?: { id: string; name: string; email: string } | null;
  profile?: {
    employeeCode: string;
    designation: string;
    designationId?: string | null;
    department: string;
  };
}

interface PersonOption {
  id: string;
  name: string;
  email: string;
}

interface Department {
  id: string;
  name: string;
  admin?: PersonOption | null;
  admins?: PersonOption[];
  managers?: PersonOption[];
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
      <span className="inline-flex items-center text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md uppercase tracking-wide">
        HR Admin
      </span>
    );
  if (role === 'MANAGER')
    return (
      <span className="inline-flex items-center text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md uppercase tracking-wide">
        Manager
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
        className="w-full bg-white border border-slate-200 rounded-lg py-2.5 px-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
      />
    </div>
  );
}

export default function EmployeesPage() {
  const { toast } = useToast();
  const { user } = useAuthStore();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'EMPLOYEE' | 'MANAGER' | 'ADMIN'>('ALL');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [employeeCodeError, setEmployeeCodeError] = useState<string | null>(null);
  const [newEmployee, setNewEmployee] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'EMPLOYEE',
    designationId: '',
    department: '',
    departmentId: '',
    employeeCode: '',
    shiftProfileId: '',
    joiningDate: todayDateKey(),
  });
  const [createdCredentials, setCreatedCredentials] = useState<{
    name: string;
    email: string;
    password: string;
    employeeCode: string;
  } | null>(null);
  const [shifts, setShifts] = useState<ShiftProfile[]>([]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ type: 'DEACTIVATE' | 'ARCHIVE'; id: string; name: string } | null>(null);
  const [expandedEmployeeId, setExpandedEmployeeId] = useState<string | null>(null);
  const [payrollStatus, setPayrollStatus] = useState<PayrollStatusRecord[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const canManageEmployee = (emp: Employee) => {
    if (user?.role === 'SUPER_ADMIN') return true;
    if (user?.role === 'ADMIN') {
      const managedDepartmentIds = departments
        .filter((d: Department) =>
          (d.admins?.some((admin) => admin.id === user?.id) ?? false) ||
          d.admin?.id === user?.id
        )
        .map((d) => d.id);
      const employeeDepartmentId = emp.departmentId || emp.department?.id;
      return !!employeeDepartmentId && managedDepartmentIds.includes(employeeDepartmentId);
    }
    // Reporting managers have read-only access to their team directory.
    return false;
  };

  const fetchEmployees = async () => {
    try {
      const res = await api.get('/employees');
      setEmployees(Array.isArray(res.data) ? res.data : (res.data?.data || []));
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
      }).catch(() => { });
    };
    init();
  }, [user]);

  const scopedEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const matchesSearch =
        emp.name.toLowerCase().includes(search.toLowerCase()) ||
        emp.email.toLowerCase().includes(search.toLowerCase()) ||
        emp.profile?.employeeCode?.toLowerCase().includes(search.toLowerCase());
      const matchesDept =
        !departmentFilter ||
        emp.departmentId === departmentFilter ||
        emp.department?.id === departmentFilter;
      return matchesSearch && matchesDept;
    });
  }, [employees, search, departmentFilter]);

  const statusOptions = useMemo(() => {
    const active = scopedEmployees.filter((emp) => emp.isActive).length;
    return [
      { label: 'All statuses', value: 'ALL', count: scopedEmployees.length },
      { label: 'Active', value: 'ACTIVE', count: active },
      { label: 'Inactive', value: 'INACTIVE', count: scopedEmployees.length - active },
    ];
  }, [scopedEmployees]);

  const roleOptions = useMemo(() => {
    const staff = scopedEmployees.filter((emp) => emp.role === 'EMPLOYEE').length;
    const managers = scopedEmployees.filter((emp) => emp.role === 'MANAGER').length;
    const admins = scopedEmployees.filter((emp) => emp.role === 'ADMIN').length;
    return [
      { label: 'All roles', value: 'ALL', count: scopedEmployees.length },
      { label: 'Employees', value: 'EMPLOYEE', count: staff },
      { label: 'Managers', value: 'MANAGER', count: managers },
      { label: 'HR Admins', value: 'ADMIN', count: admins },
    ];
  }, [scopedEmployees]);

  const filteredEmployees = useMemo(() => {
    return scopedEmployees.filter((emp) => {
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' ? emp.isActive : !emp.isActive);
      const matchesRole = roleFilter === 'ALL' || emp.role === roleFilter;
      return matchesStatus && matchesRole;
    });
  }, [scopedEmployees, statusFilter, roleFilter]);

  const totalPages = Math.ceil(filteredEmployees.length / pageSize) || 1;
  const paginatedEmployees = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredEmployees.slice(start, start + pageSize);
  }, [filteredEmployees, currentPage, pageSize]);

  const hasActiveFilters =
    !!search || !!departmentFilter || statusFilter !== 'ALL' || roleFilter !== 'ALL';

  const expandedEmployee =
    employees.find((emp) => emp.id === expandedEmployeeId) ?? null;

  /** Generate a secure random temporary password */
  const generateTempPassword = () => {
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghjkmnpqrstuvwxyz';
    const digits = '23456789';
    const special = '@#!$';
    const all = upper + lower + digits + special;
    const rand = (s: string) => s[Math.floor(Math.random() * s.length)];
    const base = rand(upper) + rand(lower) + rand(digits) + rand(special);
    const rest = Array.from({ length: 6 }, () => rand(all)).join('');
    return (base + rest).split('').sort(() => Math.random() - 0.5).join('');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setEmployeeCodeError(null);
    const tempPassword = generateTempPassword();
    try {
      const res = await api.post('/employees', {
        ...newEmployee,
        joiningDate: newEmployee.joiningDate
          ? new Date(`${newEmployee.joiningDate}T00:00:00.000Z`).toISOString()
          : undefined,
        password: tempPassword,
        mustChangePassword: true,
      });
      const createdEmp = res.data as { name?: string; email?: string; profile?: { employeeCode?: string } };
      setIsAddModalOpen(false);
      fetchEmployees();
      setNewEmployee({
        name: '',
        email: '',
        phone: '',
        role: 'EMPLOYEE',
        designationId: '',
        department: '',
        departmentId: '',
        employeeCode: '',
        shiftProfileId: '',
        joiningDate: todayDateKey(),
      });
      // Show credential card
      setCreatedCredentials({
        name: createdEmp?.name || newEmployee.name,
        email: createdEmp?.email || newEmployee.email,
        password: tempPassword,
        employeeCode: createdEmp?.profile?.employeeCode || newEmployee.employeeCode || '—',
      });
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: { message?: string } } };
      const msg = e?.response?.data?.message || '';
      if (e?.response?.status === 409 && msg.toLowerCase().includes('code')) {
        setEmployeeCodeError('This Employee ID is already in use. Please edit the ID field below.');
      } else {
        toast.error(msg || 'Failed to create employee. Please check if the email is unique.');
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
      toast.error('Action failed.');
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await api.delete(`/employees/${id}`);
      setConfirmModal(null);
      fetchEmployees();
    } catch {
      toast.error('Action failed.');
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

  const setDepartment = (e: React.ChangeEvent<HTMLSelectElement>) =>
    setNewEmployee((p) => ({
      ...p,
      departmentId: e.target.value,
      designationId: '',
    }));

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6">

        {/* ── Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-800 tracking-tight">
              Staff Directory
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">
              {employees.length} total members
            </p>
          </div>
          {(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 btn-primary text-sm font-medium rounded-lg"
            >
              <UserPlus size={14} />
              Add Employee
            </button>
          )}
        </div>

        {/* ── Table Card */}
        <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">

          {/* Toolbar */}
          <div className="border-b border-slate-100">
            <div className="flex items-center gap-3 px-5 py-4">
              <div className="relative flex-1 max-w-sm">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search name, email or ID…"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-8 pr-8 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                />
                {search && (
                  <button
                    onClick={() => {
                      setSearch('');
                      setCurrentPage(1);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 btn-ghost rounded-md"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
              {departments.length > 0 && (
                <Select
                  value={departmentFilter || 'ALL'}
                  onValueChange={(value) => {
                    setDepartmentFilter(value === 'ALL' ? '' : value);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 w-[180px] rounded-lg border-slate-200 bg-slate-50 text-sm text-slate-700">
                    <SelectValue placeholder="All departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All departments</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <div className="ml-auto flex items-center gap-2 text-xs text-slate-400">
                <Users size={12} />
                <span>{filteredEmployees.length} result{filteredEmployees.length !== 1 ? 's' : ''}</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 border-t border-slate-50 bg-slate-50/40 px-5 py-3">
              <FilterChips
                options={statusOptions}
                value={statusFilter}
                onChange={(value) => {
                  setStatusFilter(value as typeof statusFilter);
                  setCurrentPage(1);
                }}
              />
              <div className="hidden h-4 w-px bg-slate-200 sm:block" />
              <FilterChips
                options={roleOptions}
                value={roleFilter}
                onChange={(value) => {
                  setRoleFilter(value as typeof roleFilter);
                  setCurrentPage(1);
                }}
              />
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setDepartmentFilter('');
                    setStatusFilter('ALL');
                    setRoleFilter('ALL');
                    setCurrentPage(1);
                  }}
                  className="ml-auto text-xs font-semibold text-slate-400 transition-colors hover:text-blue-600"
                >
                  Clear filters
                </button>
              )}
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
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setDepartmentFilter('');
                    setStatusFilter('ALL');
                    setRoleFilter('ALL');
                    setCurrentPage(1);
                  }}
                  className="mt-2 text-xs font-semibold text-blue-600 transition-colors hover:text-blue-700"
                >
                  Clear filters
                </button>
              )}
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
                  {paginatedEmployees.map((emp) => {
                    const av = avatarColor(emp.name);
                    const isExpanded = expandedEmployeeId === emp.id;
                    return (
                      <tr
                        key={emp.id}
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
                            {(() => {
                              const managers =
                                emp.department?.managers?.map((row) => row.employee.name) ?? [];
                              if (managers.length === 0) return null;
                              return (
                                <p className="mt-1 text-[10px] text-slate-400">
                                  Reporting manager{managers.length > 1 ? 's' : ''}:{' '}
                                  {managers.join(', ')}
                                </p>
                              );
                            })()}
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
                              <span className="text-xs text-slate-400 tabular-nums">
                                {emp.profile?.employeeCode || '—'}
                              </span>
                              {payrollStatus.find(p => p.id === emp.id)?.payment?.status === 'PAID' ? (
                                 <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-blue-500 uppercase tracking-tighter">
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
                                  className={`p-1.5 rounded-md btn-ghost ${openMenuId === emp.id ? 'bg-blue-50 text-blue-700' : ''}`}
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
                                        className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 transition-colors"
                                      >
                                        <FileText size={12} className="text-blue-500" />
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
                                            className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-blue-700 hover:bg-blue-50 transition-colors"
                                          >
                                            <Power size={12} className={emp.isActive ? 'text-amber-500' : 'text-emerald-500'} />
                                            {emp.isActive ? 'Deactivate Account' : 'Activate Account'}
                                          </button>
                                          <button
                                            onClick={() => {
                                              setOpenMenuId(null);
                                              setConfirmModal({ type: 'ARCHIVE', id: emp.id, name: emp.name });
                                            }}
                                            className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {filteredEmployees.length > pageSize && (
            <div className="flex flex-wrap items-center justify-between border-t border-slate-100 px-5 py-3.5 bg-slate-50/50 text-xs">
              <span className="text-slate-500">
                Showing {(currentPage - 1) * pageSize + 1} to{' '}
                {Math.min(currentPage * pageSize, filteredEmployees.length)} of{' '}
                {filteredEmployees.length} employees
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium"
                >
                  Previous
                </button>
                <span className="px-2 text-slate-500 font-semibold">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium"
                >
                  Next
                </button>
              </div>
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
                className="flex-1 px-4 py-3 text-sm font-semibold btn-ghost border-r border-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={() => confirmModal.type === 'ARCHIVE' ? handleArchive(confirmModal.id) : toggleStatus(confirmModal.id)}
                className={`flex-1 px-4 py-3 text-sm font-bold ${confirmModal.type === 'ARCHIVE' ? 'btn-danger' : 'btn-primary'}`}
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
                className="p-1.5 btn-ghost rounded-md"
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

              <Field
                label="Mobile number"
                required
                type="tel"
                value={newEmployee.phone}
                onChange={set('phone')}
                placeholder="+92 300 1234567"
              />

              <Field
                label="Joining date"
                required
                type="date"
                value={newEmployee.joiningDate}
                onChange={set('joiningDate')}
              />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-600">Department</label>
                  {departments.length === 0 ? (
                    <div className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 px-3 text-sm text-slate-500">
                      Unassigned
                    </div>
                  ) : (
                    <div className="relative">
                      <select
                        value={newEmployee.departmentId}
                        onChange={setDepartment}
                        className="w-full appearance-none bg-white border border-slate-200 rounded-lg py-2.5 px-3 pr-8 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                      >
                        <option value="">Unassigned</option>
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                      <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-600">Designation</label>
                  <DesignationSelect
                    departmentId={newEmployee.departmentId}
                    value={newEmployee.designationId}
                    onChange={(designationId) =>
                      setNewEmployee((p) => ({ ...p, designationId }))
                    }
                  />
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
                  className={`w-full bg-white border rounded-lg py-2.5 px-3 text-sm tabular-nums text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all ${
                    employeeCodeError
                      ? 'border-red-400 ring-red-100 ring-2'
                      : 'border-slate-200 focus:ring-blue-500/20 focus:border-blue-400'
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
                      className="w-full appearance-none bg-white border border-slate-200 rounded-lg py-2.5 px-3 pr-8 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                    >
                      <option value="EMPLOYEE">Employee</option>
                      {user?.role === 'SUPER_ADMIN' && (
                        <>
                          <option value="MANAGER">Reporting Manager</option>
                          <option value="ADMIN">HR Admin</option>
                        </>
                      )}
                    </select>
                    <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* Shift select — company templates are super-admin only */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-600">Shift Profile</label>
                  {user?.role !== 'SUPER_ADMIN' ? (
                    <div className="w-full rounded-lg border border-blue-100 bg-blue-50/60 py-2.5 px-3 text-sm text-blue-700">
                      Inherits the selected department&apos;s shift automatically
                    </div>
                  ) : shifts.length === 0 ? (
                    <div className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 px-3 text-sm text-slate-500">
                      Default (Company settings)
                    </div>
                  ) : (
                    <div className="relative">
                      <select
                        value={newEmployee.shiftProfileId}
                        onChange={set('shiftProfileId')}
                        className="w-full appearance-none bg-white border border-slate-200 rounded-lg py-2.5 px-3 pr-8 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                      >
                        <option value="">Default (Company settings)</option>
                        {shifts.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                      <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  )}
                </div>
              </div>

              {/* Reporting managers are assigned at the department level. */}
              <div className="rounded-lg border border-blue-100 bg-blue-50/60 px-3 py-2.5">
                <p className="text-xs font-medium text-blue-800">Reporting manager</p>
                <p className="mt-0.5 text-[11px] text-blue-700/80">
                  Managers are assigned to the department from the Departments page. Every manager
                  assigned there can give first-stage leave and correction approval.
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium btn-ghost rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-5 py-2 btn-primary text-sm font-medium rounded-lg"
                >
                  {submitting && <Loader2 size={13} className="animate-spin" />}
                  Create Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Credentials Share Modal */}
      <CredentialsShareModal
        isOpen={!!createdCredentials}
        credentials={createdCredentials}
        onClose={() => setCreatedCredentials(null)}
        onAddAnother={() => {
          setCreatedCredentials(null);
          setIsAddModalOpen(true);
        }}
      />

      <AnimatePresence>
        {expandedEmployee && (
          <EmployeeDetailsDrawer
            key={expandedEmployee.id}
            employeeId={expandedEmployee.id}
            canManage={canManageEmployee(expandedEmployee)}
            onClose={closeExpanded}
            avatarColor={avatarColor(expandedEmployee.name)}
          />
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
