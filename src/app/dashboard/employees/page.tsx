'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Search,
  X,
  Mail,
  ShieldAlert,
  Loader2,
  CheckCircle2,
  XCircle,
  ChevronDown,
  FileText,
  UserX,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import DashboardLayout from '@/components/layout/DashboardLayout';

interface Employee {
  id: string;
  name: string;
  email: string;
  role: 'EMPLOYEE' | 'ADMIN' | 'SUPER_ADMIN';
  isActive: boolean;
  createdAt: string;
  profile?: {
    employeeCode: string;
    designation: string;
    department: string;
  };
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
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    name: '',
    email: '',
    password: '',
    role: 'EMPLOYEE',
    designation: '',
    department: '',
    shiftProfileId: '',
  });
  const [shifts, setShifts] = useState<any[]>([]);

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

  useEffect(() => {
    if (user?.mustChangePassword) return;
    fetchEmployees();
    api.get('/shifts').then(res => setShifts(res.data)).catch(() => {});
  }, [user]);

  const filteredEmployees = useMemo(() => {
    return employees.filter(
      (emp) =>
        emp.name.toLowerCase().includes(search.toLowerCase()) ||
        emp.email.toLowerCase().includes(search.toLowerCase()) ||
        emp.profile?.employeeCode?.toLowerCase().includes(search.toLowerCase())
    );
  }, [employees, search]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/employees', newEmployee);
      setIsAddModalOpen(false);
      fetchEmployees();
      setNewEmployee({ name: '', email: '', password: '', role: 'EMPLOYEE', designation: '', department: '', shiftProfileId: '' });
    } catch {
      alert('Failed to create employee. Please check if email is unique.');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (id: string) => {
    if (!confirm('Are you sure you want to change this employee status?')) return;
    try {
      await api.delete(`/employees/${id}`);
      fetchEmployees();
    } catch {
      alert('Action failed.');
    }
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
                    return (
                      <tr key={emp.id} className="hover:bg-slate-50/60 transition-colors group">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold flex-shrink-0"
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
                          <p className="text-xs text-slate-400 mt-0.5">
                            {emp.profile?.department || 'Unassigned'}
                          </p>
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
                          <span className="text-xs text-slate-400 font-mono">
                            {emp.profile?.employeeCode || '—'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 flex items-center justify-end gap-2 text-right">
                          {emp.role !== 'SUPER_ADMIN' && (
                            <button
                              onClick={() => toggleStatus(emp.id)}
                              className={`p-1.5 rounded-md transition-all ${
                                emp.isActive 
                                  ? 'text-slate-400 hover:text-red-500 hover:bg-red-50' 
                                  : 'text-emerald-400 hover:text-emerald-600 hover:bg-emerald-50'
                              }`}
                              title={emp.isActive ? "Deactivate User" : "Activate User"}
                            >
                              <UserX size={14} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

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

              <Field
                label="Initial password"
                required
                type="password"
                value={newEmployee.password}
                onChange={set('password')}
                placeholder="Minimum 6 characters"
              />

              <div className="grid grid-cols-2 gap-4">
                <Field
                  label="Designation"
                  value={newEmployee.designation}
                  onChange={set('designation')}
                  placeholder="Software Engineer"
                />
                <Field
                  label="Department"
                  value={newEmployee.department}
                  onChange={set('department')}
                  placeholder="Engineering"
                />
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