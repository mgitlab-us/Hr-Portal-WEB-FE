'use client';

import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Calendar,
  MessageSquare,
  Loader2,
  Check,
  X,
  Plane,
  Clock,
  Briefcase,
  AlertCircle
} from 'lucide-react';
import { api } from '@/lib/api';
import DashboardLayout from '@/components/layout/DashboardLayout';

interface LeaveRequest {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  employee: {
    name: string;
    profile?: { 
      employeeCode: string; 
      department: string;
    };
  };
}

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

export default function LeavesPage() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchRequests = async () => {
    try {
      const res = await api.get('/leaves/admin/pending');
      setRequests(res.data);
    } catch (err) {
      console.error('Failed to fetch leaves:', err);
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
      await api.put(`/leaves/${id}/review`, { status });
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } catch {
      alert('Action failed. Ensure you have Admin privileges.');
    } finally {
      setProcessingId(null);
    }
  };

  const pending = requests.filter((r) => r.status === 'PENDING');

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-slate-50 p-6 lg:p-8 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">
              Admin · Leave Requests
            </p>
            <h1 className="text-2xl font-semibold text-slate-800 tracking-tight">
              Leave Management
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">
              Review and manage employee time-off requests
            </p>
          </div>
          {pending.length > 0 && (
            <div className="flex items-center gap-2 bg-white border border-slate-100 rounded-lg px-3 py-2">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
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
          <div className="bg-white border border-slate-100 rounded-xl p-16 flex flex-col items-center text-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center mb-1"
              style={{ backgroundColor: '#0D9E7A14' }}
            >
              <CheckCircle2 size={18} style={{ color: '#0D9E7A' }} />
            </div>
            <p className="text-sm font-semibold text-slate-700">All caught up</p>
            <p className="text-xs text-slate-400 max-w-xs">
              No pending leave requests at the moment.
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
                  <div className="p-5 flex flex-col lg:flex-row lg:items-center gap-6">
                    
                    {/* Employee Info */}
                    <div className="flex items-center gap-3 lg:w-64 flex-shrink-0">
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
                        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mt-0.5">
                          <Briefcase size={10} />
                          {req.employee.profile?.department || 'Staff'} · {req.employee.profile?.employeeCode || '...'}
                        </p>
                      </div>
                    </div>

                    {/* Leave Type & Dates */}
                    <div className="flex-1 flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-8">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center">
                          <Plane size={14} className="text-indigo-500" />
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest leading-none mb-1">
                            Type
                          </p>
                          <p className="text-sm font-semibold text-slate-700">
                            {req.type}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div>
                          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest leading-none mb-1">
                            Start Date
                          </p>
                          <p className="text-sm font-semibold text-slate-600">
                            {formatDate(req.startDate)}
                          </p>
                        </div>
                        <div className="h-4 w-px bg-slate-100" />
                        <div>
                          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest leading-none mb-1">
                            End Date
                          </p>
                          <p className="text-sm font-semibold text-slate-600">
                            {formatDate(req.endDate)}
                          </p>
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
                        className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-500 rounded-lg hover:bg-indigo-600 transition-all disabled:opacity-50 shadow-sm shadow-indigo-100"
                      >
                        {isProcessing
                          ? <Loader2 size={13} className="animate-spin" />
                          : <Check size={13} />
                        }
                        Approve
                      </button>
                    </div>
                  </div>

                  {/* Reason */}
                  <div className="flex items-start gap-3 px-5 py-3 border-t border-slate-50 bg-slate-50/50">
                    <MessageSquare size={12} className="text-slate-300 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-slate-400">
                      <span className="font-semibold text-slate-500 uppercase text-[9px] tracking-wider mr-1.5">Reason:</span>
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
