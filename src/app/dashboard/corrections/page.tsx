'use client';
import React, { useEffect, useState } from 'react';
import {
  CheckCircle2, MessageSquare, ChevronRight, Loader2, Calendar, Check, X, ArrowRight,
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

const formatDate = (dateStr: string, short = false) =>
  new Date(dateStr).toLocaleDateString('en-US',
    short
      ? { month: 'short', day: 'numeric' }
      : { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }
  );

const AVATAR_COLORS = [
  '#6366F1', '#0D9E7A', '#F59E0B', '#E8405A', '#8B5CF6', '#2563EB',
];
function avatarColor(name: string) {
  return AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];
}
function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function TimeBlock({
  label,
  checkin,
  checkout,
  variant,
}: {
  label: string;
  checkin: string | null;
  checkout: string | null;
  variant: 'default' | 'requested';
}) {
  const isRequested = variant === 'requested';
  return (
    <div
      className={`flex-1 rounded-lg px-3 py-2.5 ${isRequested
        ? 'bg-indigo-50 border border-indigo-100'
        : 'bg-slate-50 border border-slate-100'
        }`}
    >
      <p className={`text-[9px] font-bold uppercase tracking-widest mb-2 ${isRequested ? 'text-indigo-400' : 'text-slate-400'}`}>
        {label}
      </p>
      <div className="flex items-center gap-2">
        <div>
          <p className={`text-[8px] font-semibold uppercase mb-0.5 ${isRequested ? 'text-indigo-300' : 'text-slate-400'}`}>In</p>
          <p className={`text-xs font-semibold tabular-nums whitespace-nowrap ${isRequested ? 'text-indigo-700' : 'text-slate-500'}`}>
            {formatTo12h(checkin)}
          </p>
        </div>
        <ChevronRight size={10} className={isRequested ? 'text-indigo-200' : 'text-slate-300'} />
        <div>
          <p className={`text-[8px] font-semibold uppercase mb-0.5 ${isRequested ? 'text-indigo-300' : 'text-slate-400'}`}>Out</p>
          <p className={`text-xs font-semibold tabular-nums whitespace-nowrap ${isRequested ? 'text-indigo-700' : 'text-slate-500'}`}>
            {formatTo12h(checkout)}
          </p>
        </div>
      </div>
    </div>
  );
}

function CorrectionCard({
  req,
  isProcessing,
  onReview,
}: {
  req: CorrectionRequest;
  isProcessing: boolean;
  onReview: (id: string, status: 'APPROVED' | 'REJECTED') => void;
}) {
  const color = avatarColor(req.employee.name);

  return (
    <div className="bg-white border border-slate-100 rounded-xl overflow-hidden hover:shadow-md hover:border-slate-200 transition-all duration-200">
      <div className="p-4 sm:p-5 flex flex-col gap-4">

        {/* Row 1: Avatar + name + date */}
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
            style={{ backgroundColor: color }}
          >
            {getInitials(req.employee.name)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-700 truncate leading-tight">
              {req.employee.name}
            </p>
            <p className="text-xs text-slate-400 truncate">
              {req.employee.profile?.designation || 'Staff'}
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 flex-shrink-0">
            <Calendar size={11} className="text-slate-300" />
            <span className="hidden sm:inline">{formatDate(req.attendanceRecord.date)}</span>
            <span className="sm:hidden">{formatDate(req.attendanceRecord.date, true)}</span>
          </div>
        </div>

        {/* Row 2: Time boxes + arrow + action buttons — all in one line */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <TimeBlock
            label="Current"
            checkin={req.originalCheckin}
            checkout={req.originalCheckout}
            variant="default"
          />

          <ArrowRight size={13} className="text-slate-300 flex-shrink-0" />

          <TimeBlock
            label="Requested"
            checkin={req.requestedCheckin}
            checkout={req.requestedCheckout}
            variant="requested"
          />

          {/* Divider */}
          <div className="hidden sm:block w-px h-10 bg-slate-100 flex-shrink-0" />

          {/* Action buttons — same line as time boxes */}
          <div className="flex items-center gap-1.5 flex-shrink-0 ml-auto sm:ml-0">
            <button
              onClick={() => onReview(req.id, 'REJECTED')}
              disabled={isProcessing}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-500 bg-white border border-slate-200 rounded-lg hover:border-red-200 hover:text-red-600 hover:bg-red-50 transition-all disabled:opacity-50 whitespace-nowrap"
            >
              <X size={12} />
              <span className="hidden sm:inline">Reject</span>
            </button>
            <button
              onClick={() => onReview(req.id, 'APPROVED')}
              disabled={isProcessing}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-indigo-500 rounded-lg hover:bg-indigo-600 transition-all disabled:opacity-50 shadow-sm whitespace-nowrap"
            >
              {isProcessing
                ? <Loader2 size={12} className="animate-spin" />
                : <Check size={12} />
              }
              <span className="hidden sm:inline">Approve</span>
            </button>
          </div>
        </div>
      </div>

      {/* Reason footer */}
      <div className="flex items-start gap-2.5 px-4 sm:px-5 py-3 border-t border-slate-100 bg-slate-50/60">
        <MessageSquare size={11} className="text-slate-300 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-slate-400 leading-relaxed line-clamp-2 sm:line-clamp-none">
          <span className="font-semibold text-slate-500">Reason: </span>
          {req.reason}
        </p>
      </div>
    </div>
  );
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

  useEffect(() => { fetchRequests(); }, []);

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
      <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8 space-y-5 sm:space-y-6">

        {/* Header */}
        <div className="flex flex-col xs:flex-row xs:items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">
              Admin · Corrections
            </p>
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-800 tracking-tight leading-tight">
              Correction Center
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Review and approve attendance modification requests
            </p>
          </div>
          {pending.length > 0 && (
            <div className="flex items-center gap-2 bg-white border border-slate-100 rounded-lg px-3 py-2 self-start flex-shrink-0">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                {pending.length} pending
              </span>
            </div>
          )}
        </div>

        {/* Body */}
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-white border border-slate-100 rounded-xl p-12 sm:p-16 flex flex-col items-center text-center gap-3">
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
          <div className="flex flex-col gap-3">
            {requests.map((req) => (
              <CorrectionCard
                key={req.id}
                req={req}
                isProcessing={processingId === req.id}
                onReview={handleReview}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}