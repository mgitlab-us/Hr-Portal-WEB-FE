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
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="space-y-4">
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