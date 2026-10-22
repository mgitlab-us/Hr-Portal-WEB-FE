'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Megaphone, Plus, RefreshCw } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import FilterChips from '@/components/filters/FilterChips';
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
  const canManage = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  const [notices, setNotices] = useState<Notice[]>([]);
  const [departments, setDepartments] = useState<NoticeDepartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [typeFilter, setTypeFilter] = useState('ALL');
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
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [typeFilter]
  );

  const loadDepartments = useCallback(async () => {
    if (!canManage) return;

    try {
      const response = await api.get('/departments');
      setDepartments(response.data);
    } catch (error) {
      console.error('[NoticeBoard] Failed to load departments:', error);
    }
  }, [canManage]);

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

  const handleDelete = async (notice: Notice) => {
    if (!window.confirm(`Delete “${notice.title}”? This cannot be undone.`)) return;

    try {
      await api.delete(`/notices/${notice.id}`);
      setNotices((current) => current.filter((item) => item.id !== notice.id));
    } catch (error) {
      const requestError = error as { response?: { data?: { message?: string } } };
      window.alert(requestError?.response?.data?.message || 'Unable to delete the notice.');
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
            {canManage && (
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
            {canManage && typeFilter === 'ALL' && (
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
                  canManage
                    ? () => setFormState({ open: true, notice })
                    : undefined
                }
                onDelete={canManage ? () => handleDelete(notice) : undefined}
              />
            ))}
          </div>
        )}
      </div>

      <NoticeForm
        key={`${formState.open ? 'open' : 'closed'}-${formState.notice?.id ?? 'new'}`}
        open={formState.open}
        notice={formState.notice}
        departments={departments}
        onClose={() => setFormState({ open: false, notice: null })}
        onSuccess={() => loadNotices(false)}
      />
    </DashboardLayout>
  );
}
