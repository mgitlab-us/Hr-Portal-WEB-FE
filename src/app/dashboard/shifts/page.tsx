'use client';

import React, { useEffect, useState } from 'react';
import {
  History,
  Plus,
  X,
  Clock,
  Loader2,
  Trash2,
  Check,
  ChevronDown,
} from 'lucide-react';
import { api } from '@/lib/api';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ShiftProfile {
  id: string;
  name: string;
  workMinutesPerDay: number;
  breakMinutesAllocated: number;
  gracePeriodMinutes: number;
  expectedCheckinHour: number;
  expectedCheckinMinute: number;
  isDefault: boolean;
}

export default function ShiftsPage() {
  const [shifts, setShifts] = useState<ShiftProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newShift, setNewShift] = useState({
    name: '',
    workHours: 8,
    workMinutes: 0,
    breakHours: 1,
    breakMinutes: 0,
    gracePeriodMinutes: 10,
    expectedCheckinHour: 9,
    expectedCheckinMinute: 0,
    isDefault: false,
  });

  const fetchShifts = async () => {
    try {
      const res = await api.get('/shifts');
      setShifts(res.data);
    } catch (err) {
      console.error('Failed to fetch shifts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShifts();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/shifts', {
        ...newShift,
        workMinutesPerDay: newShift.workHours * 60 + newShift.workMinutes,
        breakMinutesAllocated: newShift.breakHours * 60 + newShift.breakMinutes,
      });
      setIsAddModalOpen(false);
      fetchShifts();
      setNewShift({
        name: '',
        workHours: 8,
        workMinutes: 0,
        breakHours: 1,
        breakMinutes: 0,
        gracePeriodMinutes: 10,
        expectedCheckinHour: 9,
        expectedCheckinMinute: 0,
        isDefault: false,
      });
    } catch {
      alert('Failed to create shift.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure? Shifts assigned to employees cannot be deleted.')) return;
    try {
      await api.delete(`/shifts/${id}`);
      fetchShifts();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete shift.');
    }
  };

  const setShift = (k: string, v: any) => setNewShift(p => ({ ...p, [k]: v }));

  const format12h = (h: number, m: number) => {
    const period = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${m.toString().padStart(2, '0')} ${period}`;
  };

  const period = newShift.expectedCheckinHour >= 12 ? 'PM' : 'AM';

  // Calculate estimated end time
  const getEndTime = () => {
    let h = newShift.expectedCheckinHour;
    let m = newShift.expectedCheckinMinute;
    const totalMins = (newShift.workHours * 60 + newShift.workMinutes) + (newShift.breakHours * 60 + newShift.breakMinutes);
    
    m += totalMins;
    h += Math.floor(m / 60);
    m %= 60;
    h %= 24;

    return format12h(h, m);
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">
              Admin · Settings
            </p>
            <h1 className="text-2xl font-semibold text-slate-800 tracking-tight">Shift Management</h1>
            <p className="text-sm text-slate-400 mt-0.5">Configure work hours and grace periods</p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
          >
            <Plus size={14} />
            Create Shift
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full flex items-center justify-center py-20">
              <Loader2 size={20} className="text-slate-400 animate-spin" />
            </div>
          ) : shifts.length === 0 ? (
            <div className="col-span-full bg-white border border-dashed border-slate-200 rounded-xl py-20 flex flex-col items-center justify-center text-slate-400">
              <History size={28} className="mb-3 text-slate-300" />
              <p className="text-sm">No shift profiles created yet</p>
            </div>
          ) : (
            shifts.map((shift) => (
              <div key={shift.id} className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm hover:shadow-md transition-all group">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                      <Clock size={16} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-800">{shift.name}</h3>
                      {shift.isDefault && (
                        <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider">Default Shift</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(shift.id)}
                    className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Check-in Time</span>
                    <span className="font-medium text-slate-700">
                      {format12h(shift.expectedCheckinHour, shift.expectedCheckinMinute)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Work Duration</span>
                    <span className="font-medium text-slate-700">{Math.floor(shift.workMinutesPerDay / 60)}h {shift.workMinutesPerDay % 60}m</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Grace Period</span>
                    <span className="font-medium text-emerald-600">{shift.gracePeriodMinutes} mins</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-xl shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-800">New Shift Profile</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Shift Name</label>
                <input
                  required
                  value={newShift.name}
                  onChange={(e) => setShift('name', e.target.value)}
                  placeholder="e.g. Regular Morning"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Shift Starts At</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <select
                      value={newShift.expectedCheckinHour % 12 || 12}
                      onChange={(e) => {
                        const h = Number(e.target.value);
                        const isPm = newShift.expectedCheckinHour >= 12;
                        const finalH = isPm ? (h === 12 ? 12 : h + 12) : (h === 12 ? 0 : h);
                        setShift('expectedCheckinHour', finalH);
                      }}
                      className="w-full appearance-none bg-white border border-slate-300 rounded-lg py-2.5 px-3 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none"
                    >
                      {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                    <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                  <span className="text-slate-300 font-bold">:</span>
                  <div className="flex-1 relative">
                    <select
                      value={newShift.expectedCheckinMinute}
                      onChange={(e) => setShift('expectedCheckinMinute', Number(e.target.value))}
                      className="w-full appearance-none bg-white border border-slate-300 rounded-lg py-2.5 px-3 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none"
                    >
                      {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map(m => (
                        <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>
                      ))}
                    </select>
                    <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                  <div className="flex gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
                    {['AM', 'PM'].map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => {
                          const isPm = p === 'PM';
                          const h = newShift.expectedCheckinHour % 12;
                          const finalH = isPm ? (h === 0 ? 12 : h + 12) : (h === 12 ? 0 : h);
                          setShift('expectedCheckinHour', finalH);
                        }}
                        className={cn(
                          "px-3 py-1 rounded text-[10px] font-bold transition-all",
                          period === p ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                        )}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-600">Work Duration</label>
                  <div className="flex items-center gap-1.5">
                    <div className="flex-1 relative">
                      <select
                        value={newShift.workHours}
                        onChange={(e) => setShift('workHours', Number(e.target.value))}
                        className="w-full appearance-none bg-white border border-slate-300 rounded-lg py-2 px-2 text-sm font-medium pr-6"
                      >
                        {Array.from({ length: 24 }).map((_, i) => (
                          <option key={i} value={i}>{i}h</option>
                        ))}
                      </select>
                      <ChevronDown size={11} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                    <div className="flex-1 relative">
                      <select
                        value={newShift.workMinutes}
                        onChange={(e) => setShift('workMinutes', Number(e.target.value))}
                        className="w-full appearance-none bg-white border border-slate-300 rounded-lg py-2 px-2 text-sm font-medium pr-6"
                      >
                        {[0, 15, 30, 45].map(m => (
                          <option key={m} value={m}>{m}m</option>
                        ))}
                      </select>
                      <ChevronDown size={11} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-600">Break Time</label>
                  <div className="flex items-center gap-1.5">
                    <div className="flex-1 relative">
                      <select
                        value={newShift.breakHours}
                        onChange={(e) => setShift('breakHours', Number(e.target.value))}
                        className="w-full appearance-none bg-white border border-slate-300 rounded-lg py-2 px-2 text-sm font-medium pr-6"
                      >
                        {Array.from({ length: 5 }).map((_, i) => (
                          <option key={i} value={i}>{i}h</option>
                        ))}
                      </select>
                      <ChevronDown size={11} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                    <div className="flex-1 relative">
                      <select
                        value={newShift.breakMinutes}
                        onChange={(e) => setShift('breakMinutes', Number(e.target.value))}
                        className="w-full appearance-none bg-white border border-slate-300 rounded-lg py-2 px-2 text-sm font-medium pr-6"
                      >
                        {[0, 15, 30, 45].map(m => (
                          <option key={m} value={m}>{m}m</option>
                        ))}
                      </select>
                      <ChevronDown size={11} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estimated End Time</p>
                  <p className="text-sm font-bold text-indigo-600 tabular-nums">{getEndTime()}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Grace Period</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <input
                      type="number"
                      value={newShift.gracePeriodMinutes}
                      onChange={(e) => setShift('gracePeriodMinutes', Number(e.target.value))}
                      className="w-12 bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs text-center font-bold text-slate-700"
                    />
                    <span className="text-[10px] text-slate-400 font-medium">mins</span>
                  </div>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-2">
                <input
                  type="checkbox"
                  checked={newShift.isDefault}
                  onChange={(e) => setNewShift(p => ({ ...p, isDefault: e.target.checked }))}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs text-slate-600 font-medium">Set as default shift for new employees</span>
              </label>

              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-sm text-slate-600">Cancel</button>
                <button disabled={submitting} className="bg-slate-800 text-white px-5 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm">
                  {submitting && <Loader2 size={13} className="animate-spin" />}
                  Create Shift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
