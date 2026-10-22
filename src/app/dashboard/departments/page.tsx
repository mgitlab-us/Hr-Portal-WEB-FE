'use client';

import React, { useEffect, useState } from 'react';
import {
  Building2, Plus, X, Loader2, Trash2, Pencil, Users, UserCog, ChevronDown,
  LayoutGrid, TableProperties, Settings2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { DepartmentOrgChart } from '@/components/departments/DepartmentOrgChart';
import { useRouter } from 'next/navigation';

interface Department {
  id: string;
  name: string;
  adminId: string | null;
  admin: { id: string; name: string; email: string } | null;
  _count: { employees: number };
}

interface AdminOption {
  id: string;
  name: string;
  email: string;
}


export default function DepartmentsPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [admins, setAdmins] = useState<AdminOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; dept?: Department } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null);
  const [form, setForm] = useState({ name: '', adminId: '' });
  const [view, setView] = useState<'chart' | 'table'>('chart');

  useEffect(() => {
    if (user && user.role !== 'SUPER_ADMIN') {
      router.replace('/dashboard');
    }
  }, [user, router]);

  const fetchData = async () => {
    try {
      const [deptRes, empRes] = await Promise.all([
        api.get('/departments'),
        api.get('/employees'),
      ]);
      setDepartments(deptRes.data);
      setAdmins(
        (empRes.data as Array<{ id: string; name: string; email: string; role: string }>)
          .filter((e) => e.role === 'ADMIN')
          .map((e) => ({ id: e.id, name: e.name, email: e.email }))
      );
    } catch (err) {
      console.error('Failed to fetch departments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'SUPER_ADMIN' && !user?.mustChangePassword) {
      const init = async () => { await fetchData(); };
      init();
    }
  }, [user]);

  const openCreate = () => {
    setForm({ name: '', adminId: '' });
    setModal({ mode: 'create' });
  };

  const openEdit = (dept: Department) => {
    setForm({ name: dept.name, adminId: dept.adminId || '' });
    setModal({ mode: 'edit', dept });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        adminId: form.adminId || undefined,
      };
      if (modal?.mode === 'create') {
        await api.post('/departments', payload);
      } else if (modal?.dept) {
        await api.patch(`/departments/${modal.dept.id}`, {
          name: payload.name,
          adminId: form.adminId || null,
        });
      }
      setModal(null);
      fetchData();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      alert(e?.response?.data?.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      await api.delete(`/departments/${deleteTarget.id}`);
      setDeleteTarget(null);
      fetchData();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      alert(e?.response?.data?.message || 'Failed to delete department');
    } finally {
      setSubmitting(false);
    }
  };

  if (user?.role !== 'SUPER_ADMIN') {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">
              Super Admin · Organisation
            </p>
            <h1 className="text-2xl font-semibold text-slate-800 tracking-tight">Departments</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              Create departments and assign HR admins to manage them
            </p>
          </div>
          <div className="flex items-center flex-wrap gap-2">
            {/* Chart / table view toggle */}
            <div className="inline-flex items-center p-0.5 bg-slate-100 rounded-lg">
              <button
                onClick={() => setView('chart')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  view === 'chart' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-blue-50 hover:text-blue-700'
                }`}
                aria-pressed={view === 'chart'}
              >
                <LayoutGrid size={13} />
                Chart
              </button>
              <button
                onClick={() => setView('table')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  view === 'table' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-blue-50 hover:text-blue-700'
                }`}
                aria-pressed={view === 'table'}
              >
                <TableProperties size={13} />
                Table
              </button>
            </div>
            <button
              onClick={() => router.push('/dashboard/settings/departments')}
              className="inline-flex items-center gap-2 px-4 py-2.5 btn-secondary text-sm font-medium rounded-lg"
            >
              <Settings2 size={14} />
              Department Setup
            </button>
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 px-4 py-2.5 btn-primary text-sm font-medium rounded-lg"
            >
              <Plus size={14} />
              Add Department
            </button>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={20} className="text-slate-400 animate-spin" />
            </div>
          ) : departments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Building2 size={28} className="mb-3 text-slate-300" />
              <p className="text-sm">No departments yet</p>
              <button onClick={openCreate} className="mt-3 text-xs font-semibold btn-ghost rounded-md">
                Create your first department
              </button>
            </div>
          ) : view === 'chart' ? (
            <DepartmentOrgChart
            companyName={user?.company?.name || 'Organisation'}
              departments={departments}
              onAddDepartment={openCreate}
              onEditDepartment={openEdit}
              onDeleteDepartment={setDeleteTarget}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100">
                    <th className="px-5 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                      Department
                    </th>
                    <th className="px-5 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                      HR Admin
                    </th>
                    <th className="px-5 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-widest text-center">
                      Employees
                    </th>
                    <th className="px-5 py-3 w-24" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {departments.map((dept) => (
                    <tr key={dept.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                            <Building2 size={14} className="text-blue-500" />
                          </div>
                          <p className="text-sm font-medium text-slate-700">{dept.name}</p>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        {dept.admin ? (
                          <div>
                            <p className="text-sm text-slate-700 flex items-center gap-1.5">
                              <UserCog size={12} className="text-slate-400" />
                              {dept.admin.name}
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5">{dept.admin.email}</p>
                          </div>
                        ) : (
                          <span className="text-xs text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-md">
                            No admin assigned
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-md">
                          <Users size={11} />
                          {dept._count.employees}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(dept)}
                            className="p-1.5 btn-ghost rounded-md"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(dept)}
                            className="p-1.5 btn-danger-ghost rounded-md"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-xl shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-800">
                {modal.mode === 'create' ? 'Create Department' : 'Edit Department'}
              </h2>
              <button
                onClick={() => setModal(null)}
                className="p-1.5 btn-ghost rounded-md"
              >
                <X size={15} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-600">Department name</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Engineering"
                  className="w-full bg-white border border-slate-200 rounded-lg py-2.5 px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-600">HR Admin (optional)</label>
                <div className="relative">
                  <select
                    value={form.adminId}
                    onChange={(e) => setForm((p) => ({ ...p, adminId: e.target.value }))}
                    className="w-full appearance-none bg-white border border-slate-200 rounded-lg py-2.5 px-3 pr-8 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                  >
                    <option value="">Unassigned</option>
                    {admins.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.email})
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
                <p className="text-[10px] text-slate-400">
                  This admin will receive attendance notifications and see live pulse for this department only.
                </p>
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModal(null)}
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
                  {modal.mode === 'create' ? 'Create' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px]">
          <div className="bg-white border border-slate-200 w-full max-w-sm rounded-xl shadow-2xl overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4">
                <Trash2 size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Delete Department?</h3>
              <p className="text-sm text-slate-500 mt-2">
                Delete <strong>{deleteTarget.name}</strong>? Employees will be unassigned but not removed.
              </p>
            </div>
            <div className="flex border-t border-slate-100">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 px-4 py-3 text-sm font-semibold btn-ghost border-r border-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={submitting}
                className="flex-1 px-4 py-3 text-sm font-bold btn-danger"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}