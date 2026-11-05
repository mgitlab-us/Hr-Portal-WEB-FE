'use client';

import React, { useEffect, useState } from 'react';
import {
  Clock, Save, Loader2, ShieldCheck, Building2, Timer,
  ChevronDown, Globe,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import { useAuthStore } from '@/store/authStore';

const formatMinutes = (totalMinutes: number) => ({
  h: Math.floor(totalMinutes / 60),
  m: totalMinutes % 60,
});

const MAX_LOGO_SIZE_MB = 1;

function NumInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1">
      <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value) || 0)}
        className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-sm text-slate-800 text-center font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
      />
    </div>
  );
}

export default function GeneralPanel() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [settings, setSettings] = useState({
    workMinutesPerDay: 480,
    breakMinutesAllocated: 60,
    gracePeriodMinutes: 15,
    expectedCheckinHour: 12,
    expectedCheckinMinute: 0,
  });
  const [profile, setProfile] = useState({
    name: '',
    timezone: 'Asia/Karachi',
    officeLat: 24.8607,
    officeLng: 67.0011,
    officeRadius: 70,
    logo: null as string | null,
    sickLeaveDays: 8,
    casualLeaveDays: 10,
    vacationLeaveDays: 14,
  });
  const [logoError, setLogoError] = useState<string | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingShift, setSavingShift] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [localCheckin, setLocalCheckin] = useState<{ hour: number; minute: number; period: 'AM' | 'PM' }>(
    { hour: 12, minute: 0, period: 'PM' }
  );

  useEffect(() => {
    if (user?.role !== 'SUPER_ADMIN') return;

    let active = true;

    const fetchData = async () => {
      try {
        const [shiftRes, profileRes] = await Promise.all([
          api.get('/attendance/settings/company-shift'),
          api.get('/attendance/settings/company-profile'),
        ]);

        if (!active) return;

        const rawStart = shiftRes.data.shiftStart ?? '12:00';
        const [hour, minute] = String(rawStart).split(':').map(Number);
        const startHour = Number.isFinite(hour) ? hour : 12;
        const startMinute = Number.isFinite(minute) ? minute : 0;

        setSettings({
          workMinutesPerDay: shiftRes.data.workMinutesPerDay ?? 480,
          breakMinutesAllocated: shiftRes.data.breakMinutesAllocated ?? 60,
          gracePeriodMinutes: shiftRes.data.gracePeriodMinutes ?? 15,
          expectedCheckinHour: startHour,
          expectedCheckinMinute: startMinute,
        });
        setProfile((prev) => ({ ...prev, ...profileRes.data }));
        setLocalCheckin({
          hour: startHour % 12 || 12,
          minute: startMinute,
          period: startHour >= 12 ? 'PM' : 'AM',
        });
      } catch (err) { console.error(err); }
      finally {
        if (active) setLoading(false);
      }
    };

    void fetchData();

    return () => {
      active = false;
    };
  }, [user]);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) { toast.error('Geolocation is not supported by this browser.'); return; }
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setProfile((prev) => ({ ...prev, officeLat: pos.coords.latitude, officeLng: pos.coords.longitude }));
        setGettingLocation(false);
      },
      (err) => { toast.error('Failed to get location: ' + err.message); setGettingLocation(false); }
    );
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoError(null);
    if (!file.type.startsWith('image/')) { setLogoError('Please upload an image file.'); return; }
    if (file.size > MAX_LOGO_SIZE_MB * 1024 * 1024) { setLogoError(`Logo must be smaller than ${MAX_LOGO_SIZE_MB}MB.`); return; }
    const reader = new FileReader();
    reader.onload = () => setProfile((prev) => ({ ...prev, logo: reader.result as string }));
    reader.onerror = () => setLogoError('Could not read that file, please try again.');
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSaveShift = async () => {
    setSavingShift(true);

    try {
      let h24 = localCheckin.hour % 12;
      if (localCheckin.period === 'PM') h24 += 12;

      const startTotal = h24 * 60 + localCheckin.minute;
      const endTotal = startTotal + settings.workMinutesPerDay + settings.breakMinutesAllocated;
      const endHour = Math.floor((endTotal % (24 * 60)) / 60);
      const endMinute = endTotal % 60;

      const shiftStart = `${String(h24).padStart(2, '0')}:${String(localCheckin.minute).padStart(2, '0')}`;
      const shiftEnd = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;

      await api.put('/attendance/settings/company-shift', {
        shiftStart,
        shiftEnd,
        breakMinutesAllocated: settings.breakMinutesAllocated,
        gracePeriodMinutes: settings.gracePeriodMinutes,
      });

      setSettings((prev) => ({
        ...prev,
        expectedCheckinHour: h24,
        expectedCheckinMinute: localCheckin.minute,
      }));

      toast.success('Shift settings updated.');
    } catch {
      toast.error('Failed to update the shift settings.');
    } finally {
      setSavingShift(false);
    }
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      await api.put('/attendance/settings/company-profile', profile);
      toast.success('Company profile updated.');
    } catch { toast.error('Failed to update the company profile.'); }
    finally { setSavingProfile(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={16} className="text-slate-400 animate-spin" />
      </div>
    );
  }

  const workDur = formatMinutes(settings.workMinutesPerDay);
  const breakDur = formatMinutes(settings.breakMinutesAllocated);

  return (
    <div className="max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

      {/* ── Company Profile */}
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
                className="w-full bg-white border border-slate-200 rounded-lg py-2.5 px-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-600">Company Logo</label>
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {profile.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={profile.logo} alt="Company logo" className="w-full h-full object-contain" />
                  ) : (
                    <Building2 size={18} className="text-slate-300" />
                  )}
                </div>
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <label className="inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors">
                      Upload Logo
                      <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                    </label>
                    {profile.logo && (
                      <button type="button" onClick={() => setProfile((p) => ({ ...p, logo: null }))} className="text-[11px] font-bold btn-danger-ghost px-2 py-1.5 rounded-lg">
                        Remove
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400">PNG recommended, max {MAX_LOGO_SIZE_MB}MB.</p>
                  {logoError && <p className="text-[10px] text-red-500 font-medium">{logoError}</p>}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-600">Timezone</label>
              <div className="relative">
                <Globe size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <select
                  value={profile.timezone}
                  onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
                  className="w-full appearance-none bg-white border border-slate-200 rounded-lg py-2.5 pl-8 pr-7 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
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

            <div className="pt-4 border-t border-slate-50 space-y-4">
              <div className="flex items-center gap-2">
                <Timer size={12} className="text-blue-500" />
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-tight">Leave Entitlements</h4>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Sick</label>
                  <input
                    type="number"
                    min={0}
                    value={profile.sickLeaveDays}
                    onChange={(e) => setProfile({ ...profile, sickLeaveDays: Number(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Casual</label>
                  <input
                    type="number"
                    min={0}
                    value={profile.casualLeaveDays}
                    onChange={(e) => setProfile({ ...profile, casualLeaveDays: Number(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Vacation</label>
                  <input
                    type="number"
                    min={0}
                    value={profile.vacationLeaveDays}
                    onChange={(e) => setProfile({ ...profile, vacationLeaveDays: Number(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>
              <p className="text-[10px] text-slate-400">These defaults are used when an employee&apos;s leave cycle starts on their joining anniversary.</p>
            </div>

            <div className="pt-4 border-t border-slate-50 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={12} className="text-blue-500" />
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-tight">Geofence (Office Perimeter)</h4>
                </div>
                <button
                  onClick={getCurrentLocation}
                  disabled={gettingLocation}
                  className="text-[10px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded transition-colors"
                >
                  {gettingLocation ? 'Locating...' : 'Pin My Location'}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Latitude</label>
                  <input
                    type="number" step="0.0001" value={profile.officeLat}
                    onChange={(e) => setProfile({ ...profile, officeLat: parseFloat(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Longitude</label>
                  <input
                    type="number" step="0.0001" value={profile.officeLng}
                    onChange={(e) => setProfile({ ...profile, officeLng: parseFloat(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Alert Radius (Meters)</label>
                <div className="flex items-center gap-4">
                  <input
                    type="range" min="10" max="500" step="10" value={profile.officeRadius}
                    onChange={(e) => setProfile({ ...profile, officeRadius: parseInt(e.target.value) })}
                    className="flex-1 accent-blue-600 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="w-16 shrink-0 bg-white border border-slate-200 rounded px-2 py-1 text-center">
                    <span className="text-xs font-bold text-slate-700">{profile.officeRadius}m</span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400">HR Admins will be notified if a check-in occurs outside this radius.</p>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={handleSaveProfile}
          disabled={savingProfile}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 btn-primary text-sm font-medium rounded-lg"
        >
          {savingProfile ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
          Save Company Profile
        </button>
      </div>

      {/* ── Shift & Attendance Rules */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Timer size={13} className="text-slate-400" />
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Default Shift & Attendance</p>
        </div>

        <div className="bg-white border border-slate-100 rounded-xl shadow-sm">
          <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-slate-50">
            <Clock size={12} className="text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-700">Company-wide Shift Rules</h3>
          </div>
          <div className="px-5 py-4 space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-600">Expected Check-in Time</label>
              <div className="flex items-center gap-2">
                <select
                  value={localCheckin.hour}
                  onChange={(e) => setLocalCheckin({ ...localCheckin, hour: parseInt(e.target.value) })}
                  className="flex-1 bg-white border border-slate-200 rounded-lg py-2.5 px-2 text-sm text-slate-800 text-center focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
                <span className="text-slate-400 font-medium">:</span>
                <select
                  value={localCheckin.minute}
                  onChange={(e) => setLocalCheckin({ ...localCheckin, minute: parseInt(e.target.value) })}
                  className="flex-1 bg-white border border-slate-200 rounded-lg py-2.5 px-2 text-sm text-slate-800 text-center focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                >
                  {[0, 15, 30, 45].map((m) => (
                    <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
                  ))}
                </select>
                <select
                  value={localCheckin.period}
                  onChange={(e) => setLocalCheckin({ ...localCheckin, period: e.target.value as 'AM' | 'PM' })}
                  className="flex-1 bg-white border border-slate-200 rounded-lg py-2.5 px-2 text-sm text-slate-800 text-center focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                >
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <NumInput label="Grace (min)" value={settings.gracePeriodMinutes} onChange={(v) => setSettings({ ...settings, gracePeriodMinutes: v })} />
              <NumInput label="Work (min)" value={settings.workMinutesPerDay} onChange={(v) => setSettings({ ...settings, workMinutesPerDay: v })} />
              <NumInput label="Break (min)" value={settings.breakMinutesAllocated} onChange={(v) => setSettings({ ...settings, breakMinutesAllocated: v })} />
            </div>

            <div className="pt-3 border-t border-slate-50 grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Work Day</p>
                <p className="text-sm font-semibold text-slate-700 mt-0.5">{workDur.h}h {workDur.m}m</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Break Time</p>
                <p className="text-sm font-semibold text-slate-700 mt-0.5">{breakDur.h}h {breakDur.m}m</p>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={handleSaveShift}
          disabled={savingShift}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 btn-primary text-sm font-medium rounded-lg"
        >
          {savingShift ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
          Save Shift Rules
        </button>
      </div>

    </div>
  );
}
