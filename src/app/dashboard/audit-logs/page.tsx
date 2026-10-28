'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  ScrollText,
  Search,
  RefreshCw,
  Eye,
  Shield,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Filter,
  Layers,
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

export interface AuditLog {
  id: string;
  companyId: string;
  actorId: string;
  actorName: string;
  actorEmail: string;
  actorRole: string;
  action: string;
  targetType: string;
  targetId: string | null;
  details: string | null;
  diff: {
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
    [key: string]: unknown;
  } | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

const ACTION_FILTERS = [
  { label: 'All Actions', value: '' },
  { label: 'Employee', value: 'EMPLOYEE' },
  { label: 'Documents', value: 'DOCUMENT' },
  { label: 'Leaves', value: 'LEAVE' },
  { label: 'Shifts & Config', value: 'SHIFT' },
];

export default function AuditLogsPage() {
  const { toast } = useToast();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [actionCategory, setActionCategory] = useState('');
  const [targetType, setTargetType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const fetchLogs = useCallback(
    async (targetPage: number) => {
      try {
        const params: Record<string, unknown> = {
          page: targetPage,
          limit,
        };
        if (search.trim()) params.search = search.trim();
        if (actionCategory) params.action = actionCategory;
        if (targetType) params.targetType = targetType;
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;

        const res = await api.get('/audit-logs', { params });
        const data = res.data;

        if (data && data.data && data.meta) {
          setLogs(data.data);
          setTotalPages(data.meta.totalPages || 1);
          setTotalCount(data.meta.total || 0);
          setPage(data.meta.page || targetPage);
        } else if (Array.isArray(data)) {
          setLogs(data);
          setTotalCount(data.length);
          setTotalPages(1);
        }
      } catch (err: unknown) {
        console.error('Failed to load audit logs:', err);
        toast.error('Failed to load audit logs. Please try again.', 'Error');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [limit, search, actionCategory, targetType, startDate, endDate, toast]
  );

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const params: Record<string, unknown> = {
          page: 1,
          limit,
        };
        if (search.trim()) params.search = search.trim();
        if (actionCategory) params.action = actionCategory;
        if (targetType) params.targetType = targetType;
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;

        const res = await api.get('/audit-logs', { params });
        if (!active) return;
        const data = res.data;

        if (data && data.data && data.meta) {
          setLogs(data.data);
          setTotalPages(data.meta.totalPages || 1);
          setTotalCount(data.meta.total || 0);
          setPage(data.meta.page || 1);
        } else if (Array.isArray(data)) {
          setLogs(data);
          setTotalCount(data.length);
          setTotalPages(1);
        }
      } catch (err: unknown) {
        if (!active) return;
        console.error('Failed to load audit logs:', err);
        toast.error('Failed to load audit logs. Please try again.', 'Error');
      } finally {
        if (active) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [actionCategory, targetType, startDate, endDate, limit, search, toast]);

  const handleManualRefresh = () => {
    setRefreshing(true);
    fetchLogs(page);
  };

  const handlePageChange = (newPage: number) => {
    setLoading(true);
    fetchLogs(newPage);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    fetchLogs(1);
  };

  const getActionBadgeClass = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes('CREATE') || act.includes('UPLOAD')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (act.includes('DELETE') || act.includes('ARCHIVE') || act.includes('DEACTIVATE')) {
      return 'bg-rose-50 text-rose-700 border-rose-200';
    }
    if (act.includes('UPDATE') || act.includes('TOGGLE') || act.includes('RESET')) {
      return 'bg-amber-50 text-amber-700 border-amber-200';
    }
    return 'bg-blue-50 text-blue-700 border-blue-200';
  };

  const getRoleBadgeClass = (role: string) => {
    if (role === 'SUPER_ADMIN') {
      return 'bg-purple-50 text-purple-700 border-purple-200';
    }
    return 'bg-blue-50 text-blue-700 border-blue-200';
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-12">
        {/* Header banner */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                <ScrollText className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Audit Trail</h1>
                <p className="text-sm text-slate-500">
                  Immutable administrative record of organizational actions, changes, and access
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualRefresh}
              disabled={refreshing || loading}
              className="gap-2 h-9 border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Filter controls */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
            {/* Search bar */}
            <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search actor, action, target, or details..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
              />
            </form>

            {/* Target type filter dropdown & Date range */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <select
                  value={targetType}
                  onChange={(e) => setTargetType(e.target.value)}
                  className="text-sm bg-slate-50/50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="">All Targets</option>
                  <option value="EMPLOYEE">Employees</option>
                  <option value="DOCUMENT">Documents</option>
                  <option value="LEAVE">Leaves</option>
                  <option value="SHIFT">Shifts</option>
                  <option value="DEPARTMENT">Departments</option>
                </select>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="text-xs bg-slate-50/50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <span>to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="text-xs bg-slate-50/50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {(search || actionCategory || targetType || startDate || endDate) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearch('');
                    setActionCategory('');
                    setTargetType('');
                    setStartDate('');
                    setEndDate('');
                  }}
                  className="text-xs text-slate-500 hover:text-slate-800 h-8 px-2"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>

          {/* Action category pills */}
          <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100">
            {ACTION_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setActionCategory(f.value)}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
                  actionCategory === f.value
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-16 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
              <p className="text-sm font-medium text-slate-600">Loading audit records...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
                <ScrollText className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-800">No audit logs found</h3>
              <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1">
                There are no administrative audit events matching your selected criteria.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Timestamp</th>
                    <th className="py-3.5 px-4">Actor</th>
                    <th className="py-3.5 px-4">Action</th>
                    <th className="py-3.5 px-4">Target</th>
                    <th className="py-3.5 px-4">Summary</th>
                    <th className="py-3.5 px-4">IP Address</th>
                    <th className="py-3.5 px-4 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {logs.map((log) => {
                    const formattedDate = new Date(log.createdAt).toLocaleString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    });

                    return (
                      <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 text-xs font-mono text-slate-500 whitespace-nowrap">
                          {formattedDate}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col">
                            <span className="font-medium text-slate-900">{log.actorName}</span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span
                                className={cn(
                                  'text-[10px] font-semibold px-1.5 py-0.5 rounded border',
                                  getRoleBadgeClass(log.actorRole)
                                )}
                              >
                                {log.actorRole}
                              </span>
                              <span className="text-xs text-slate-400 truncate max-w-[140px]">
                                {log.actorEmail}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={cn(
                              'inline-block px-2.5 py-1 rounded-md text-xs font-semibold border',
                              getActionBadgeClass(log.action)
                            )}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                              {log.targetType}
                            </span>
                            {log.targetId && (
                              <span className="text-[11px] font-mono text-slate-400">
                                #{log.targetId.slice(-6)}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 max-w-md">
                          <p className="text-xs text-slate-600 truncate" title={log.details || ''}>
                            {log.details || '—'}
                          </p>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap text-xs font-mono text-slate-400">
                          {log.ipAddress || '—'}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedLog(log)}
                            className="h-8 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 gap-1 text-xs"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Inspect
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination bar */}
          {!loading && logs.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
              <p className="text-xs text-slate-500">
                Showing{' '}
                <span className="font-semibold text-slate-700">
                  {Math.min((page - 1) * limit + 1, totalCount)}
                </span>{' '}
                to{' '}
                <span className="font-semibold text-slate-700">
                  {Math.min(page * limit, totalCount)}
                </span>{' '}
                of <span className="font-semibold text-slate-700">{totalCount}</span> events
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page <= 1 || loading}
                  className="h-8 px-2.5 text-xs border-slate-200"
                >
                  <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                  Previous
                </Button>
                <span className="text-xs font-medium text-slate-600 px-2">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= totalPages || loading}
                  className="h-8 px-2.5 text-xs border-slate-200"
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Inspect Diff / Log Details Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Shield className="w-5 h-5 text-blue-600" />
              Audit Event Details
            </DialogTitle>
            <DialogDescription>
              Recorded on{' '}
              {selectedLog &&
                new Date(selectedLog.createdAt).toLocaleString(undefined, {
                  dateStyle: 'full',
                  timeStyle: 'medium',
                })}
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-5 text-sm">
              {/* Event Metadata Cards */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-xs text-slate-400 block">Actor</span>
                  <span className="font-medium text-slate-800">{selectedLog.actorName}</span>
                  <span className="text-xs text-slate-500 block">
                    {selectedLog.actorEmail} ({selectedLog.actorRole})
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block">Action</span>
                  <span
                    className={cn(
                      'inline-block px-2 py-0.5 rounded text-xs font-semibold border mt-0.5',
                      getActionBadgeClass(selectedLog.action)
                    )}
                  >
                    {selectedLog.action}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block">Target</span>
                  <span className="font-medium text-slate-800">
                    {selectedLog.targetType} {selectedLog.targetId ? `(${selectedLog.targetId})` : ''}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block">Client Origin</span>
                  <span className="font-mono text-xs text-slate-600 block">
                    IP: {selectedLog.ipAddress || 'Internal/Server'}
                  </span>
                </div>
              </div>

              {/* Description / Summary */}
              {selectedLog.details && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Action Summary
                  </h4>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 text-xs">
                    {selectedLog.details}
                  </div>
                </div>
              )}

              {/* Before/After Diff or Raw Payload */}
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  Mutation Diff & State Changes
                </h4>
                {selectedLog.diff ? (
                  selectedLog.diff.before || selectedLog.diff.after ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="p-3 bg-rose-50/50 rounded-xl border border-rose-200">
                        <span className="text-xs font-bold text-rose-700 block mb-1">
                          Previous State (Before)
                        </span>
                        <pre className="text-[11px] font-mono text-slate-700 overflow-x-auto whitespace-pre-wrap">
                          {JSON.stringify(selectedLog.diff.before, null, 2)}
                        </pre>
                      </div>
                      <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-200">
                        <span className="text-xs font-bold text-emerald-700 block mb-1">
                          New State (After)
                        </span>
                        <pre className="text-[11px] font-mono text-slate-700 overflow-x-auto whitespace-pre-wrap">
                          {JSON.stringify(selectedLog.diff.after, null, 2)}
                        </pre>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-900 text-slate-100 rounded-xl overflow-x-auto">
                      <pre className="text-xs font-mono">
                        {JSON.stringify(selectedLog.diff, null, 2)}
                      </pre>
                    </div>
                  )
                ) : (
                  <p className="text-xs text-slate-400 italic">
                    No field diff was recorded for this event.
                  </p>
                )}
              </div>

              {selectedLog.userAgent && (
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-[11px] text-slate-400 block truncate" title={selectedLog.userAgent}>
                    User Agent: {selectedLog.userAgent}
                  </span>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
