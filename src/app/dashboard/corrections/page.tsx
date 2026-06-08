'use client';

import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  MessageSquare,
  ChevronRight,
  Loader2,
  Calendar,
  Check,
  X,
  ArrowUpRight,
  Activity,
} from 'lucide-react';
import { api } from '@/lib/api';
import DashboardLayout from '@/components/layout/DashboardLayout';

interface CorrectionRequest {
  id: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  originalCheckin: string | null;
  originalCheckout: string | null;
  requestedCheckin: string | null;
  requestedCheckout: string | null;
  createdAt: string;
  employee: {
    name: string;
    profile?: { designation: string };
  };
  attendanceRecord: { date: string };
}

const formatTo12h = (dateStr: string | null) => {
  if (!dateStr) return '--:--';
  return new Date(dateStr).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

const AVATAR_COLORS = [
  '#6366F1', '#0D9E7A', '#F59E0B', '#E8405A', '#8B5CF6', '#2563EB',
];
function avatarColor(name: string) {
  return AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

export default function CorrectionsPage() {
  const [requests, setRequests] = useState<CorrectionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchRequests = async () => {
    try {
      const res = await api.get('/corrections/pending');
      setRequests(res.data);
    } catch (err) {
      console.error('Failed to fetch corrections:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleReview = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    setProcessingId(id);
    try {
      await api.put(`/corrections/${id}/review`, { status });
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } catch {
      alert('Action failed. Ensure you have Super Admin privileges.');
    } finally {
      setProcessingId(null);
    }
  };

  const pending = requests.filter((r) => r.status === 'PENDING');

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-slate-50 p-6 lg:p-8 space-y-6">

        {/* Header — matches dashboard header pattern exactly */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">
              Admin · Corrections
            </p>
            <h1 className="text-2xl font-semibold text-slate-800 tracking-tight">
              Correction Center
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">
              Review and approve employee-requested attendance modifications
            </p>
          </div>
          {pending.length > 0 && (
            <div className="flex items-center gap-2 bg-white border border-slate-100 rounded-lg px-3 py-2">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                {pending.length} pending
              </span>
            </div>
          )}
        </div>

        {/* Body */}
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
          </div>
        ) : requests.length === 0 ? (
          /* Empty state — matches dashboard empty pulse style */
          <div className="bg-white border border-slate-100 rounded-xl p-16 flex flex-col items-center text-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center mb-1"
              style={{ backgroundColor: '#0D9E7A14' }}
            >
              <CheckCircle2 size={18} style={{ color: '#0D9E7A' }} />
            </div>
            <p className="text-sm font-semibold text-slate-700">Queue is clear</p>
            <p className="text-xs text-slate-400 max-w-xs">
              All correction requests have been processed.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((req) => {
              const color = avatarColor(req.employee.name);
              const isProcessing = processingId === req.id;

              return (
                <div
                  key={req.id}
                  className="group bg-white border border-slate-100 rounded-xl overflow-hidden hover:shadow-md hover:border-slate-200 transition-all duration-200"
                >
                  {/* Card top */}
                  <div className="flex flex-col lg:flex-row lg:items-center gap-6 p-5">

                    {/* Employee */}
                    <div className="flex items-center gap-3 lg:w-52 flex-shrink-0">
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
                        style={{ backgroundColor: color }}
                      >
                        {getInitials(req.employee.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-700 truncate">
                          {req.employee.name}
                        </p>
                        <p className="text-xs text-slate-400 truncate">
                          {req.employee.profile?.designation || 'Staff'}
                        </p>
                      </div>
                    </div>

                    {/* Date */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 lg:w-36 flex-shrink-0">
                      <Calendar size={12} className="text-slate-300 flex-shrink-0" />
                      <span>{formatDate(req.attendanceRecord.date)}</span>
                    </div>

                    {/* Time comparison */}
                    <div className="flex-1 flex items-center gap-3">
                      {/* Original */}
                      <div className="flex-1 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2.5">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">
                          Current log
                        </p>
                        <div className="flex items-center gap-3">
                          <div>
                            <p className="text-[9px] font-semibold text-slate-400 uppercase mb-0.5">In</p>
                            <p className="text-sm font-semibold text-slate-500 tabular-nums">
                              {formatTo12h(req.originalCheckin)}
                            </p>
                          </div>
                          <ChevronRight size={12} className="text-slate-300 flex-shrink-0" />
                          <div>
                            <p className="text-[9px] font-semibold text-slate-400 uppercase mb-0.5">Out</p>
                            <p className="text-sm font-semibold text-slate-500 tabular-nums">
                              {formatTo12h(req.originalCheckout)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <ArrowUpRight size={14} className="text-slate-300 flex-shrink-0" />

                      {/* Requested */}
                      <div className="flex-1 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2.5">
                        <p className="text-[10px] font-semibold text-indigo-400 uppercase tracking-widest mb-2">
                          Requested
                        </p>
                        <div className="flex items-center gap-3">
                          <div>
                            <p className="text-[9px] font-semibold text-indigo-300 uppercase mb-0.5">In</p>
                            <p className="text-sm font-semibold text-indigo-700 tabular-nums">
                              {formatTo12h(req.requestedCheckin)}
                            </p>
                          </div>
                          <ChevronRight size={12} className="text-indigo-200 flex-shrink-0" />
                          <div>
                            <p className="text-[9px] font-semibold text-indigo-300 uppercase mb-0.5">Out</p>
                            <p className="text-sm font-semibold text-indigo-700 tabular-nums">
                              {formatTo12h(req.requestedCheckout)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleReview(req.id, 'REJECTED')}
                        disabled={isProcessing}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-500 bg-white border border-slate-200 rounded-lg hover:border-red-200 hover:text-red-600 hover:bg-red-50 transition-all disabled:opacity-50"
                      >
                        <X size={13} />
                        Reject
                      </button>
                      <button
                        onClick={() => handleReview(req.id, 'APPROVED')}
                        disabled={isProcessing}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-indigo-500 rounded-lg hover:bg-indigo-600 transition-all disabled:opacity-50 shadow-sm"
                      >
                        {isProcessing
                          ? <Loader2 size={13} className="animate-spin" />
                          : <Check size={13} />
                        }
                        Approve
                      </button>
                    </div>
                  </div>

                  {/* Reason footer */}
                  <div className="flex items-start gap-3 px-5 py-3 border-t border-slate-50 bg-slate-50/50">
                    <MessageSquare size={12} className="text-slate-300 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-slate-400">
                      <span className="font-semibold text-slate-500">Reason: </span>
                      {req.reason}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}