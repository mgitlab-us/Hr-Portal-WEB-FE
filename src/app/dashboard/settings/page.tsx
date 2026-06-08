'use client';

import React, { useEffect, useState } from 'react';
import {
  Clock, Save, Loader2, ShieldCheck,
  Building2, Timer, ChevronDown, Globe, Lock,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import DashboardLayout from '@/components/layout/DashboardLayout';

const formatMinutes = (totalMinutes: number) => ({
  h: Math.floor(totalMinutes / 60),
  m: totalMinutes % 60,
});

function NumInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1">
      <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value) || 0)}
        className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-sm text-slate-800 text-center font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
      />
    </div>
  );
}

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [settings, setSettings] = useState({
    workMinutesPerDay: 480,
    breakMinutesAllocated: 60,
    gracePeriodMinutes: 15,
    expectedCheckinHour: 9,
    expectedCheckinMinute: 0,
  });
  const [profile, setProfile] = useState({ name: '', timezone: 'Asia/Karachi' });
  const [loading, setLoading] = useState(true);
  const [savingShift, setSavingShift] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [localCheckin, setLocalCheckin] = useState<{ hour: number; minute: number; period: 'AM' | 'PM' }>(
    { hour: 9, minute: 0, period: 'AM' }
  );

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    const fetchData = async () => {
      try {
        const [shiftRes, profileRes] = await Promise.all([
          api.get('/attendance/settings/company-shift'),
          api.get('/attendance/settings/company-profile'),
        ]);
        setSettings(shiftRes.data);
        setProfile(profileRes.data);
        const h24 = shiftRes.data.expectedCheckinHour;
        setLocalCheckin({ hour: h24 % 12 || 12, minute: shiftRes.data.expectedCheckinMinute, period: h24 >= 12 ? 'PM' : 'AM' });
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    if (user?.role === 'SUPER_ADMIN') fetchData();
    else setLoading(false);
  }, [user, mounted]);

  const handleSaveShift = async () => {
    setSavingShift(true);
    let h24 = localCheckin.hour % 12;
    if (localCheckin.period === 'PM') h24 += 12;
    try {
      await api.put('/attendance/settings/company-shift', { ...settings, expectedCheckinHour: h24, expectedCheckinMinute: localCheckin.minute });
      alert('Shift settings updated!');
    } catch { alert('Action failed.'); }
    finally { setSavingShift(false); }
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      await api.put('/attendance/settings/company-profile', profile);
      alert('Profile updated!');
    } catch { alert('Action failed.'); }
    finally { setSavingProfile(false); }
  };

  if (!mounted) return (
    <DashboardLayout>
      <div className="h-[60vh] flex items-center justify-center">
        <Loader2 size={18} className="text-slate-400 animate-spin" />
      </div>
    </DashboardLayout>
  );

  if (user?.role !== 'SUPER_ADMIN') return (
    <DashboardLayout>
      <div className="h-[60vh] flex flex-col items-center justify-center gap-3 text-center">
        <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center">
          <Lock size={15} className="text-red-500" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800">Access Restricted</p>
          <p className="text-xs text-slate-400 mt-1 max-w-xs">Only Super Admins can modify organisation settings.</p>
        </div>
      </div>
    </DashboardLayout>
  );

  const workDur = formatMinutes(settings.workMinutesPerDay);
  const breakDur = formatMinutes(settings.breakMinutesAllocated);

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-slate-50 p-6 lg:p-8 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Admin · Settings</p>
            <h1 className="text-2xl font-semibold text-slate-800 tracking-tight">Organisation Settings</h1>
            <p className="text-sm text-slate-400 mt-0.5">Configure shift rules and company profile</p>
          </div>
          <div className="flex items-center gap-2 bg-white border border-slate-100 rounded-lg px-3 py-2">
            <ShieldCheck size={11} className="text-indigo-500" />
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Super Admin</span>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 size={16} className="text-slate-400 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* ── LEFT COLUMN: Shift Config */}
            <div className="space-y-4">

              {/* Section label */}
              <div className="flex items-center gap-2">
                <Clock size={13} className="text-slate-400" />
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Shift Configuration</p>
              </div>

              {/* Check-in time card */}
              <div className="bg-white border border-slate-100 rounded-xl shadow-sm">
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-50">
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-0.5">Check-in Time</p>
                    <h3 className="text-sm font-semibold text-slate-700">Expected Arrival</h3>
                  </div>
                  <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-lg tabular-nums">
                    {String(localCheckin.hour).padStart(2, '0')}:{String(localCheckin.minute).padStart(2, '0')} {localCheckin.period}
                  </span>
                </div>
                <div className="px-5 py-4 space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    {/* Hour */}
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Hour</label>
                      <div className="relative">
                        <select
                          value={localCheckin.hour}
                          onChange={(e) => setLocalCheckin({ ...localCheckin, hour: parseInt(e.target.value) })}
                          className="w-full appearance-none bg-white border border-slate-200 rounded-lg py-2.5 px-3 pr-7 text-sm text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                        >
                          {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                            <option key={h} value={h}>{String(h).padStart(2, '0')}</option>
                          ))}
                        </select>
                        <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                    {/* Minute */}
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Minute</label>
                      <div className="relative">
                        <select
                          value={localCheckin.minute}
                          onChange={(e) => setLocalCheckin({ ...localCheckin, minute: parseInt(e.target.value) })}
                          className="w-full appearance-none bg-white border border-slate-200 rounded-lg py-2.5 px-3 pr-7 text-sm text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                        >
                          {[0, 15, 30, 45].map((m) => (
                            <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
                          ))}
                        </select>
                        <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                    {/* AM/PM */}
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Period</label>
                      <div className="flex bg-slate-50 border border-slate-200 rounded-lg p-0.5 gap-0.5 h-[38px]">
                        {(['AM', 'PM'] as const).map((p) => (
                          <button
                            key={p}
                            onClick={() => setLocalCheckin({ ...localCheckin, period: p })}
                            className={`flex-1 rounded-md text-[11px] font-semibold transition-all ${localCheckin.period === p
                              ? 'bg-white text-slate-800 shadow-sm border border-slate-200'
                              : 'text-slate-400 hover:text-slate-600'
                              }`}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                    <div className="w-1 h-1 rounded-full bg-amber-400 flex-shrink-0" />
                    <p className="text-[11px] text-amber-700">
                      Arrivals after {localCheckin.hour}:{String(localCheckin.minute).padStart(2, '0')} {localCheckin.period} will be flagged as late
                    </p>
                  </div>
                </div>
              </div>

              {/* Durations card */}
              <div className="bg-white border border-slate-100 rounded-xl shadow-sm">
                <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-slate-50">
                  <Timer size={12} className="text-slate-400" />
                  <h3 className="text-sm font-semibold text-slate-700">Time Allocations</h3>
                </div>
                <div className="px-5 py-4 divide-y divide-slate-50 space-y-0">

                  {/* Work shift */}
                  <div className="pb-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-semibold text-slate-700">Work Shift</p>
                      <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded tabular-nums">
                        {workDur.h}h {workDur.m}m
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <NumInput label="Hours" value={workDur.h} onChange={(v) => setSettings({ ...settings, workMinutesPerDay: v * 60 + workDur.m })} />
                      <NumInput label="Minutes" value={workDur.m} onChange={(v) => setSettings({ ...settings, workMinutesPerDay: workDur.h * 60 + v })} />
                    </div>
                  </div>

                  {/* Break */}
                  <div className="py-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-semibold text-slate-700">Break Time</p>
                      <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded tabular-nums">
                        {breakDur.h}h {breakDur.m}m
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <NumInput label="Hours" value={breakDur.h} onChange={(v) => setSettings({ ...settings, breakMinutesAllocated: v * 60 + breakDur.m })} />
                      <NumInput label="Minutes" value={breakDur.m} onChange={(v) => setSettings({ ...settings, breakMinutesAllocated: breakDur.h * 60 + v })} />
                    </div>
                  </div>

                  {/* Grace */}
                  <div className="pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-semibold text-slate-700">Grace Period</p>
                      <span className="text-[10px] font-semibold text-slate-500 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded tabular-nums">
                        {settings.gracePeriodMinutes}m
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <NumInput label="Minutes" value={settings.gracePeriodMinutes} onChange={(v) => setSettings({ ...settings, gracePeriodMinutes: v })} />
                      <div /> {/* spacer */}
                    </div>
                  </div>

                </div>
              </div>

              {/* Save shift */}
              <button
                onClick={handleSaveShift}
                disabled={savingShift}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
              >
                {savingShift ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                Save Shift Settings
              </button>
            </div>

            {/* ── RIGHT COLUMN: Company Profile */}
            <div className="space-y-4">

              {/* Section label */}
              <div className="flex items-center gap-2">
                <Building2 size={13} className="text-slate-400" />
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Company Profile</p>
              </div>

              <div className="bg-white border border-slate-100 rounded-xl shadow-sm">
                <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-slate-50">
                  <Building2 size={12} className="text-slate-400" />
                  <h3 className="text-sm font-semibold text-slate-700">Organisation Details</h3>
                </div>
                <div className="px-5 py-4 space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-600">Company Name</label>
                    <input
                      type="text"
                      value={profile.name}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      placeholder="e.g. Acme Corp"
                      className="w-full bg-white border border-slate-200 rounded-lg py-2.5 px-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-600">Timezone</label>
                    <div className="relative">
                      <Globe size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <select
                        value={profile.timezone}
                        onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
                        className="w-full appearance-none bg-white border border-slate-200 rounded-lg py-2.5 pl-8 pr-7 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                      >
                        <option value="Asia/Karachi">Asia/Karachi (PKT)</option>
                        <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                        <option value="Europe/London">Europe/London (GMT)</option>
                        <option value="America/New_York">America/New_York (EST)</option>
                        <option value="UTC">UTC</option>
                      </select>
                      <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                    <p className="text-[10px] text-slate-400">Determines check-in date boundary and daily reset.</p>
                  </div>
                </div>
              </div>

              {/* Save profile */}
              <button
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
              >
                {savingProfile ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                Save Company Profile
              </button>
            </div>

          </div>
        )}
      </div>
    </DashboardLayout>
  );
}