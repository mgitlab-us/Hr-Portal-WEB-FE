'use client';

import React, { useEffect, useState } from 'react';
import { Calendar, Plus, X, Loader2, Trash2, Info } from 'lucide-react';
import { api } from '@/lib/api';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Holiday {
  id: string;
  name: string;
  date: string;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function HolidaysPage() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [weekends, setWeekends] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newHoliday, setNewHoliday] = useState({ name: '', date: '' });

  const fetchData = async () => {
    try {
      const [hRes, cRes] = await Promise.all([
        api.get('/holidays'),
        api.get('/attendance/settings/company-profile'), // To get weekends from company
      ]);
      setHolidays(hRes.data);
      // Ensure weekends is an array, fallback to [0] (Sunday)
      setWeekends(cRes.data.weekends || [0]);
    } catch (err) {
      console.error('Failed to fetch holiday data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => { await fetchData(); };
    init();
  }, []);

  const handleToggleWeekend = async (dayIndex: number) => {
    const updated = weekends.includes(dayIndex)
      ? weekends.filter((d) => d !== dayIndex)
      : [...weekends, dayIndex];

    // Optimistic UI
    setWeekends(updated);

    try {
      await api.put('/holidays/weekends', { weekends: updated });
    } catch {
      alert('Failed to update weekends');
      fetchData(); // Rollback
    }
  };

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHoliday.name || !newHoliday.date) return;

    setSubmitting(true);
    try {
      await api.post('/holidays', newHoliday);
      setIsAddModalOpen(false);
      setNewHoliday({ name: '', date: '' });
      fetchData();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      alert(e?.response?.data?.message || 'Failed to add holiday');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteHoliday = async (id: string) => {
    if (!confirm('Are you sure you want to remove this holiday?')) return;
    try {
      await api.delete(`/holidays/${id}`);
      fetchData();
    } catch {
      alert('Failed to delete holiday');
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-8 max-w-5xl mx-auto">

        {/* ── Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">
              Admin · Organisation
            </p>
            <h1 className="text-2xl font-semibold text-slate-800 tracking-tight">Holidays & Weekends</h1>
            <p className="text-sm text-slate-400 mt-0.5">Define non-working days for your team</p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
          >
            <Plus size={14} />
            Add Holiday
          </button>
        </div>

        {/* ── Weekends Section */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Calendar size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-800">Custom Weekends</h2>
              <p className="text-xs text-slate-400">Selected days will be marked as non-working</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {DAYS.map((day, i) => {
              const active = weekends.includes(i);
              return (
                <button
                  key={day}
                  onClick={() => handleToggleWeekend(i)}
                  className={cn(
                    "px-5 py-2.5 rounded-xl text-sm font-medium transition-all border",
                    active
                      ? "bg-slate-800 border-slate-800 text-white shadow-md shadow-slate-200"
                      : "bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50"
                  )}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-3">
            <Info size={14} className="text-slate-400 mt-0.5" />
            <p className="text-xs text-slate-500 leading-relaxed">
              Attendance tracking and &ldquo;Absent&rdquo; marking will be automatically skipped on these days.
              The Absentee Engine uses these settings to calculate daily reports.
            </p>
          </div>
        </div>

        {/* ── Holidays Table */}
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-slate-800 px-1">Upcoming Holidays</h2>

          <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 size={20} className="text-slate-400 animate-spin" />
              </div>
            ) : holidays.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <Calendar size={28} className="mb-3 text-slate-200" />
                <p className="text-sm">No holidays scheduled yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Holiday Name</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {holidays.map((h) => (
                      <tr key={h.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <span className="text-sm font-medium text-slate-700">{h.name}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-500 tabular-nums">
                            {new Date(h.date).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'long',
                              year: 'numeric'
                            })}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleDeleteHoliday(h.id)}
                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Add Holiday Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-800">Add Holiday</h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddHoliday} className="p-6 space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 ml-1 uppercase tracking-wide">Holiday Title</label>
                <input
                  required
                  value={newHoliday.name}
                  onChange={(e) => setNewHoliday(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Eid-ul-Adha"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm text-slate-700 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 outline-none transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 ml-1 uppercase tracking-wide">Holiday Date</label>
                <input
                  required
                  type="date"
                  value={newHoliday.date}
                  onChange={(e) => setNewHoliday(p => ({ ...p, date: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm text-slate-700 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 outline-none transition-all"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 px-4 py-3 text-sm font-semibold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-[1.5] bg-slate-800 text-white px-4 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-slate-200 disabled:opacity-60"
                >
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  Schedule Holiday
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
