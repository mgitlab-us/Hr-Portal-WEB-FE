'use client';

import React, { useEffect, useState } from 'react';
import {
  Building2, Plus, X, Loader2, Trash2, Pencil, Users, UserCog,
  LayoutGrid, TableProperties, Settings2, UserPlus,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { DepartmentOrgChart } from '@/components/departments/DepartmentOrgChart';
import DepartmentAssignEmployeesModal from '@/components/departments/DepartmentAssignEmployeesModal';
import { useToast } from '@/components/ui/toast';
import { useRouter } from 'next/navigation';

interface PersonOption {
  id: string;
  name: string;
  email: string;
}

interface Department {
  id: string;
  name: string;
  adminId?: string | null;
  admin?: PersonOption | null;
  admins: PersonOption[];
  managers: PersonOption[];
  canManage?: boolean;
  _count: { employees: number };
}


export default function DepartmentsPage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const router = useRouter();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [admins, setAdmins] = useState<PersonOption[]>([]);
  const [managers, setManagers] = useState<PersonOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; dept?: Department } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null);
  const [assignTarget, setAssignTarget] = useState<Department | null>(null);
  const [form, setForm] = useState<{ name: string; adminIds: string[]; managerIds: string[] }>({
    name: '',
    adminIds: [],
    managerIds: [],
  });
  const [view, setView] = useState<'chart' | 'table'>('chart');
  const canEditDepartments = user?.role === 'SUPER_ADMIN';
  const canOpenPage = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
  const canAssignDepartment = (dept: Department) =>
    user?.role === 'SUPER_ADMIN' ||
    (user?.role === 'ADMIN' && dept.canManage !== false);

  useEffect(() => {
    if (user && !canOpenPage) {
      router.replace('/dashboard');
    }
  }, [user, router, canOpenPage]);

  const fetchData = async () => {
    try {
      const [deptRes, empRes] = await Promise.all([
        api.get('/departments'),
        api.get('/employees'),
      ]);
      setDepartments(deptRes.data);
      const empList: Array<{ id: string; name: string; email: string; role: string }> = Array.isArray(empRes.data)
        ? empRes.data
        : (empRes.data?.data || []);
      setAdmins(
        empList
          .filter((e) => e.role === 'ADMIN')
          .map((e) => ({ id: e.id, name: e.name, email: e.email }))
      );
      setManagers(
        empList
          .filter((e) => e.role === 'MANAGER')
          .map((e) => ({ id: e.id, name: e.name, email: e.email }))
      );
    } catch (err) {
      console.error('Failed to fetch departments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canOpenPage && !user?.mustChangePassword) {
      const init = async () => { await fetchData(); };
      init();
    }
  }, [user, canOpenPage]);

  const openCreate = () => {
    setForm({ name: '', adminIds: [], managerIds: [] });
    setModal({ mode: 'create' });
  };

  const openEdit = (dept: Department) => {
    setForm({
      name: dept.name,
      adminIds: dept.admins?.map((admin) => admin.id) || (dept.adminId ? [dept.adminId] : []),
      managerIds: dept.managers?.map((manager) => manager.id) || [],
    });
    setModal({ mode: 'edit', dept });
  };

  const toggleId = (field: 'adminIds' | 'managerIds', id: string) => {
    setForm((previous) => {
      const values = previous[field];
      return {
        ...previous,
        [field]: values.includes(id)
          ? values.filter((value) => value !== id)
          : [...values, id],
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        adminIds: form.adminIds,
        managerIds: form.managerIds,
      };
      if (modal?.mode === 'create') {
        await api.post('/departments', payload);
      } else if (modal?.dept) {
        await api.patch(`/departments/${modal.dept.id}`, payload);
      }
      setModal(null);
      fetchData();
      toast.success(
        modal?.mode === 'create'
          ? 'Department created.'
          : 'Department updated. A lead’s home department is only adopted when they had none; existing homes stay unchanged.'
      );
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || 'Operation failed');
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
      toast.success('Department deleted.');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || 'Failed to delete department');
    } finally {
      setSubmitting(false);
    }
  };

  if (!canOpenPage) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-800 tracking-tight">Departments</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              {canEditDepartments
                ? 'Create departments, assign HR admins, and assign reporting managers'
                : 'View every department. Rules are editable only for departments you administer.'}
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
            {canEditDepartments && (
              <button
                onClick={openCreate}
                className="inline-flex items-center gap-2 px-4 py-2.5 btn-primary text-sm font-medium rounded-lg"
              >
                <Plus size={14} />
                Add Department
              </button>
            )}
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
              {canEditDepartments && (
                <button onClick={openCreate} className="mt-3 text-xs font-semibold btn-ghost rounded-md">
                  Create your first department
                </button>
              )}
            </div>
          ) : view === 'chart' ? (
            <DepartmentOrgChart
              companyName={user?.company?.name || 'Organisation'}
              departments={departments}
              canEdit={canEditDepartments}
              canAssignDepartment={canAssignDepartment}
              onAddDepartment={openCreate}
              onEditDepartment={openEdit}
              onDeleteDepartment={setDeleteTarget}
              onAssignEmployees={setAssignTarget}
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
                      HR Admins
                    </th>
                    <th className="px-5 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                      Reporting Managers
                    </th>
                    <th className="px-5 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-widest text-center">
                      Team / Leads
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
                        {dept.admins.length > 0 ? (
                          <div className="space-y-1">
                            {dept.admins.map((admin) => (
                              <div key={admin.id}>
                                <p className="text-sm text-slate-700 flex items-center gap-1.5">
                                  <UserCog size={12} className="text-slate-400" />
                                  {admin.name}
                                </p>
                                <p className="text-xs text-slate-400 mt-0.5">{admin.email}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-md">
                            No HR admin assigned
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        {dept.managers.length > 0 ? (
                          <div className="space-y-1">
                            {dept.managers.map((manager) => (
                              <div key={manager.id}>
                                <p className="text-sm text-slate-700">{manager.name}</p>
                                <p className="text-xs text-slate-400 mt-0.5">{manager.email}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md">
                            No reporting manager
                          </span>
                        )}
                        {dept.canManage === false && user?.role === 'ADMIN' && (
                          <p className="mt-1 text-[10px] text-slate-400">Read-only for you</p>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <div className="flex flex-wrap items-center justify-center gap-1">
                          <span className="inline-flex items-center gap-1 rounded-md border border-slate-100 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
                            <Users size={11} />
                            {dept._count.employees} team
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-md border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-600">
                            <UserCog size={11} />
                            {dept.admins.length + dept.managers.length} lead
                            {dept.admins.length + dept.managers.length === 1 ? '' : 's'}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        {(canEditDepartments || canAssignDepartment(dept)) && (
                          <div className="flex items-center justify-end gap-1">
                            {canAssignDepartment(dept) && (
                              <button
                                onClick={() => setAssignTarget(dept)}
                                className="p-1.5 btn-ghost rounded-md"
                                title={`Assign employees to ${dept.name}`}
                                aria-label={`Assign employees to ${dept.name}`}
                              >
                                <UserPlus size={14} />
                              </button>
                            )}
                            {canEditDepartments && (
                              <>
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
                              </>
                            )}
                          </div>
                        )}
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
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-slate-600">HR admins</label>
                  <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50/60 p-2">
                    {admins.length === 0 ? (
                      <p className="px-2 py-1 text-[11px] text-slate-400">
                        No employees with the ADMIN role yet.
                      </p>
                    ) : (
                      admins.map((admin) => (
                        <label
                          key={admin.id}
                          className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-xs text-slate-700 hover:bg-white"
                        >
                          <input
                            type="checkbox"
                            checked={form.adminIds.includes(admin.id)}
                            onChange={() => toggleId('adminIds', admin.id)}
                            className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-blue-600"
                          />
                          <span className="min-w-0">
                            <span className="block truncate font-medium">{admin.name}</span>
                            <span className="block truncate text-[10px] text-slate-400">{admin.email}</span>
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Multiple HR admins can share a department. They can read employees company-wide but edit only their assigned departments.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-medium text-slate-600">Reporting managers</label>
                  <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50/60 p-2">
                    {managers.length === 0 ? (
                      <p className="px-2 py-1 text-[11px] text-slate-400">
                        No employees with the MANAGER role yet.
                      </p>
                    ) : (
                      managers.map((manager) => (
                        <label
                          key={manager.id}
                          className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-xs text-slate-700 hover:bg-white"
                        >
                          <input
                            type="checkbox"
                            checked={form.managerIds.includes(manager.id)}
                            onChange={() => toggleId('managerIds', manager.id)}
                            className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-blue-600"
                          />
                          <span className="min-w-0">
                            <span className="block truncate font-medium">{manager.name}</span>
                            <span className="block truncate text-[10px] text-slate-400">{manager.email}</span>
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Every manager assigned here can give first-stage approval for anyone in this department.
                  </p>
                </div>
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

      {assignTarget && (
        <DepartmentAssignEmployeesModal
          department={assignTarget}
          onClose={() => setAssignTarget(null)}
          onAssigned={() => {
            setAssignTarget(null);
            fetchData();
          }}
        />
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