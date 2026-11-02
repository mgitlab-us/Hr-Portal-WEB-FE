'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Megaphone, Plus, RefreshCw } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import FilterChips from '@/components/filters/FilterChips';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';
import NoticeCard from './components/NoticeCard';
import NoticeForm from './components/NoticeForm';
import type { Notice, NoticeDepartment } from './types';

const TYPE_FILTERS = [
  { label: 'All', value: 'ALL' },
  { label: 'Announcements', value: 'ANNOUNCEMENT' },
  { label: 'Holidays', value: 'HOLIDAY' },
  { label: 'Events', value: 'EVENT' },
  { label: 'Urgent', value: 'URGENT' },
];

export default function NoticeBoardPage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const canManage = user?.role === 'ADMIN' || isSuperAdmin;

  const [notices, setNotices] = useState<Notice[]>([]);
  const [departments, setDepartments] = useState<NoticeDepartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [deleteTarget, setDeleteTarget] = useState<Notice | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [formState, setFormState] = useState<{ open: boolean; notice: Notice | null }>({
    open: false,
    notice: null,
  });

  const loadNotices = useCallback(
    async (initial = false) => {
      if (initial) setLoading(true);
      else setRefreshing(true);

      try {
        const response = await api.get('/notices', {
          params: {
            page: 1,
            limit: 100,
            ...(typeFilter === 'ALL' ? {} : { type: typeFilter }),
          },
        });
        const payload = response.data;
        setNotices(Array.isArray(payload) ? payload : payload.data ?? []);
      } catch (error) {
        console.error('[NoticeBoard] Failed to load notices:', error);
        toast.error('Unable to load the notice board. Please try again.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [toast, typeFilter]
  );

  const loadDepartments = useCallback(async () => {
    if (!user?.role || user.role === 'EMPLOYEE') return;

    try {
      const response = await api.get('/departments');
      setDepartments(response.data);
    } catch (error) {
      console.error('[NoticeBoard] Failed to load departments:', error);
      toast.error('Unable to load departments for notice targeting.');
    }
  }, [toast, user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadNotices(true);
  }, [loadNotices]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDepartments();
  }, [loadDepartments]);

  const departmentNameById = useMemo(
    () => new Map(departments.map((department) => [department.id, department.name])),
    [departments]
  );

  const manageableDepartments = useMemo(() => {
    if (isSuperAdmin) return departments;
    if (user?.role !== 'ADMIN') return [];
    return departments.filter(
      (department) =>
        department.canManage ||
        department.admins?.some((admin) => admin.id === user.id) ||
        department.admin?.id === user.id
    );
  }, [departments, isSuperAdmin, user]);

  const manageableDepartmentIds = useMemo(
    () => new Set(manageableDepartments.map((department) => department.id)),
    [manageableDepartments]
  );

  const canManageNotice = (notice: Notice) => {
    if (isSuperAdmin) return true;
    if (user?.role !== 'ADMIN' || !notice.departmentId) return false;
    return manageableDepartmentIds.has(notice.departmentId);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      await api.delete(`/notices/${deleteTarget.id}`);
      setNotices((current) => current.filter((item) => item.id !== deleteTarget.id));
      toast.success(`“${deleteTarget.title}” was deleted.`, 'Notice removed');
      setDeleteTarget(null);
    } catch (error) {
      const requestError = error as { response?: { data?: { message?: string } } };
      toast.error(
        requestError?.response?.data?.message || 'Unable to delete the notice.'
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6 lg:p-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              Organisation
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-800">
              Notice Board
            </h1>
            <p className="mt-0.5 text-sm text-slate-400">
              Company announcements, holidays, events, and urgent updates
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => loadNotices(false)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:border-blue-300 hover:text-blue-700 disabled:opacity-60"
            >
              <RefreshCw size={14} className={cn(refreshing && 'animate-spin')} />
              Refresh
            </button>
            {canManage && (isSuperAdmin || manageableDepartments.length > 0) && (
              <button
                type="button"
                onClick={() => setFormState({ open: true, notice: null })}
                className="btn-primary inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium"
              >
                <Plus size={14} />
                New Notice
              </button>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
            <FilterChips
              options={TYPE_FILTERS}
              value={typeFilter}
              onChange={setTypeFilter}
            />
            <p className="text-xs font-medium text-slate-400">
              Showing {notices.length} {notices.length === 1 ? 'notice' : 'notices'}
              {typeFilter !== 'ALL' ? ` in ${TYPE_FILTERS.find((item) => item.value === typeFilter)?.label.toLowerCase()}` : ''}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-64 animate-pulse rounded-2xl border border-slate-200 border-l-4 border-l-slate-200 bg-white p-5"
              >
                <div className="mb-5 h-5 w-24 rounded-full bg-slate-100" />
                <div className="mb-3 h-5 w-3/4 rounded bg-slate-100" />
                <div className="mb-2 h-3 w-full rounded bg-slate-100" />
                <div className="mb-2 h-3 w-5/6 rounded bg-slate-100" />
                <div className="h-3 w-2/3 rounded bg-slate-100" />
              </div>
            ))}
          </div>
        ) : notices.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-20 text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <Megaphone size={28} />
            </div>
            <h2 className="text-lg font-semibold text-slate-800">No notices yet</h2>
            <p className="mt-1 max-w-sm text-sm leading-6 text-slate-400">
              {typeFilter === 'ALL'
                ? 'Post the first announcement so everyone stays in the loop.'
                : 'There are no notices in this category yet.'}
            </p>
            {canManage && (isSuperAdmin || manageableDepartments.length > 0) && typeFilter === 'ALL' && (
              <button
                type="button"
                onClick={() => setFormState({ open: true, notice: null })}
                className="btn-primary mt-5 inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium"
              >
                <Plus size={14} />
                Create the first notice
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {notices.map((notice) => (
              <NoticeCard
                key={notice.id}
                notice={notice}
                departmentName={
                  notice.departmentId
                    ? departmentNameById.get(notice.departmentId)
                    : null
                }
                onEdit={
                  canManageNotice(notice)
                    ? () => setFormState({ open: true, notice })
                    : undefined
                }
                onDelete={
                  canManageNotice(notice) ? () => setDeleteTarget(notice) : undefined
                }
              />
            ))}
          </div>
        )}
      </div>

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteTarget(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete this notice?</DialogTitle>
            <DialogDescription>
              {deleteTarget
                ? `“${deleteTarget.title}” will be removed from the notice board. This cannot be undone.`
                : 'This notice will be removed from the notice board.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="bg-rose-500 text-white hover:bg-rose-600"
            >
              {deleting ? 'Deleting…' : 'Delete notice'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <NoticeForm
        key={`${formState.open ? 'open' : 'closed'}-${formState.notice?.id ?? 'new'}`}
        open={formState.open}
        notice={formState.notice}
        departments={manageableDepartments}
        allowCompanyWide={isSuperAdmin}
        onClose={() => setFormState({ open: false, notice: null })}
        onSuccess={() => loadNotices(false)}
      />
    </DashboardLayout>
  );
}
