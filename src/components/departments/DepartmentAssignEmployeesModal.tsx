'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Search,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/toast';

interface Candidate {
  id: string;
  name: string;
  email: string;
  role: 'EMPLOYEE' | 'MANAGER' | 'ADMIN' | 'SUPER_ADMIN';
  isActive: boolean;
  departmentId?: string | null;
  homeDepartment?: { id: string; name: string } | null;
  managedDepartments?: { id: string; name: string }[];
  isCurrentMember: boolean;
  profile?: {
    employeeCode?: string;
    designation?: string;
  };
}

interface Props {
  department: { id: string; name: string };
  onClose: () => void;
  onAssigned: () => void;
}

export default function DepartmentAssignEmployeesModal({
  department,
  onClose,
  onAssigned,
}: Props) {
  const { toast } = useToast();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get(
          `/departments/${department.id}/assignment-candidates`
        );
        if (!cancelled) setCandidates(response.data || []);
      } catch (err: unknown) {
        if (cancelled) return;
        const message =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Unable to load employees for this department.';
        setError(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [department.id]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !submitting) onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, submitting]);

  const filteredCandidates = useMemo(() => {
    const term = search.trim().toLowerCase();
    return candidates.filter((candidate) => {
      if (!term) return true;
      return [
        candidate.name,
        candidate.email,
        candidate.profile?.employeeCode,
        candidate.profile?.designation,
        candidate.homeDepartment?.name,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [candidates, search]);

  const selectable = filteredCandidates.filter((candidate) => !candidate.isCurrentMember);
  const allVisibleSelected =
    selectable.length > 0 && selectable.every((candidate) => selectedIds.has(candidate.id));
  const currentMemberCount = candidates.filter((candidate) => candidate.isCurrentMember).length;

  const toggleCandidate = (id: string) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllVisible = () => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (allVisibleSelected) {
        selectable.forEach((candidate) => next.delete(candidate.id));
      } else {
        selectable.forEach((candidate) => next.add(candidate.id));
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    if (selectedIds.size === 0 || submitting) return;
    setSubmitting(true);
    try {
      const response = await api.post(`/departments/${department.id}/assign-employees`, {
        employeeIds: [...selectedIds],
      });
      const result = response.data as {
        assigned?: number;
        skipped?: number;
        total?: number;
      };
      const assigned = result?.assigned ?? selectedIds.size;
      const skipped = result?.skipped ?? 0;

      if (assigned === 0) {
        toast.info(
          skipped > 0
            ? `No new assignments. ${skipped} selected employee(s) are already in ${department.name}.`
            : `No employees were assigned to ${department.name}.`
        );
      } else {
        toast.success(
          `Assigned ${assigned} employee${assigned === 1 ? '' : 's'} to ${department.name}.` +
            (skipped > 0 ? ` ${skipped} already in the department.` : '')
        );
      }
      onAssigned();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to assign employees.';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label={`Assign employees to ${department.name}`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) onClose();
      }}
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <UserPlus size={15} />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold text-slate-800">
                  Assign employees
                </h2>
                <p className="text-xs text-slate-400">
                  Add people to <span className="font-medium text-slate-600">{department.name}</span>
                </p>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-md p-1.5 btn-ghost disabled:opacity-50"
            aria-label="Close assign employees dialog"
          >
            <X size={15} />
          </button>
        </div>

        <div className="space-y-3 border-b border-slate-100 px-6 py-4">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, email, employee ID, or designation"
              className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] text-slate-500">
              {loading
                ? 'Loading employees…'
                : `${selectable.length} available · ${currentMemberCount} current member${
                    currentMemberCount === 1 ? '' : 's'
                  }`}
            </p>
            {selectable.length > 0 && (
              <button
                type="button"
                onClick={toggleAllVisible}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-700"
              >
                {allVisibleSelected ? 'Clear visible' : 'Select all visible'}
              </button>
            )}
          </div>
        </div>

        <div className="min-h-[220px] flex-1 overflow-y-auto px-3 py-3">
          {loading ? (
            <div className="flex h-48 flex-col items-center justify-center text-slate-400">
              <Loader2 size={20} className="mb-2 animate-spin" />
              <p className="text-xs font-medium">Loading employees…</p>
            </div>
          ) : error ? (
            <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed border-rose-200 bg-rose-50/50 px-6 text-center">
              <AlertCircle size={22} className="mb-2 text-rose-400" />
              <p className="text-sm font-semibold text-rose-700">Could not load employees</p>
              <p className="mt-1 text-xs text-rose-600/80">{error}</p>
            </div>
          ) : filteredCandidates.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center text-slate-400">
              <Users size={24} className="mb-2 text-slate-300" />
              <p className="text-sm font-semibold text-slate-500">No matching employees</p>
              <p className="mt-1 text-xs text-slate-400">
                Try a different search, or add employees from the People page.
              </p>
            </div>
          ) : (
            <ul className="space-y-1">
              {filteredCandidates.map((candidate) => {
                const selected = candidate.isCurrentMember || selectedIds.has(candidate.id);
                return (
                  <li key={candidate.id}>
                    <label
                      className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
                        candidate.isCurrentMember
                          ? 'cursor-default border-slate-100 bg-slate-50/70'
                          : selected
                            ? 'border-blue-200 bg-blue-50/50'
                            : 'border-transparent hover:border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        disabled={candidate.isCurrentMember || submitting}
                        onChange={() => toggleCandidate(candidate.id)}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 disabled:cursor-not-allowed"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-1.5">
                          <span className="truncate text-sm font-semibold text-slate-700">
                            {candidate.name}
                          </span>
                          {candidate.isCurrentMember && (
                            <span className="inline-flex items-center gap-1 rounded border border-emerald-100 bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-600">
                              <CheckCircle2 size={9} />
                              Current
                            </span>
                          )}
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                            {candidate.role.replace('_', ' ')}
                          </span>
                        </span>
                        <span className="mt-0.5 block truncate text-[11px] text-slate-400">
                          {candidate.profile?.employeeCode || 'No employee ID'}
                          {candidate.profile?.designation
                            ? ` · ${candidate.profile.designation}`
                            : ''}
                          {candidate.email ? ` · ${candidate.email}` : ''}
                        </span>
                        <span className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-slate-400">
                          <span>
                            Home:{' '}
                            <span className="font-medium text-slate-500">
                              {candidate.homeDepartment?.name || 'Unassigned'}
                            </span>
                          </span>
                          {(candidate.managedDepartments?.length ?? 0) > 0 && (
                            <span>
                              Manages:{' '}
                              <span className="font-medium text-slate-500">
                                {candidate.managedDepartments!.map((dept) => dept.name).join(', ')}
                              </span>
                            </span>
                          )}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/60 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] text-slate-500">
            Current members stay assigned. Unchecking does not remove anyone.
          </p>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg px-4 py-2 text-sm font-medium btn-ghost disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={selectedIds.size === 0 || submitting || loading || !!error}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold btn-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? <Loader2 size={13} className="animate-spin" /> : <UserPlus size={13} />}
              {selectedIds.size > 0
                ? `Assign ${selectedIds.size} employee${selectedIds.size === 1 ? '' : 's'}`
                : 'Assign employees'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
