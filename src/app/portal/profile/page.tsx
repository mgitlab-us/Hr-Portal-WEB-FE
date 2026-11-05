'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import {
  User,
  Lock,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface PersonalStats {
  onTimeRate?: number;
  leavesTaken?: number;
  avgWorkHours?: number;
}

function extractErrorMessage(err: unknown, defaultMsg: string): string {
  const errorObj = err as { response?: { data?: { message?: string } }; message?: string };
  return errorObj?.response?.data?.message || errorObj?.message || defaultMsg;
}

export default function EmployeeProfilePage() {
  const router = useRouter();
  const { user, logout, setAuth, accessToken, refreshToken } = useAuthStore();
  const [stats, setStats] = useState<PersonalStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Change password states
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState('');

  useEffect(() => {
    let active = true;
    const fetchStats = async () => {
      try {
        const res = await api.get('/attendance/stats/personal');
        if (active) setStats(res.data);
      } catch (err: unknown) {
        console.error('Failed to load personal stats:', err);
      } finally {
        if (active) setLoadingStats(false);
      }
    };
    fetchStats();
    return () => {
      active = false;
    };
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError('');
    setPwdSuccess('');

    if (newPassword.length < 8) {
      setPwdError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdError('New passwords do not match.');
      return;
    }

    setChangingPassword(true);
    try {
      await api.post('/auth/change-password', {
        newPassword,
      });

      setPwdSuccess('Your password has been updated successfully!');
      setNewPassword('');
      setConfirmPassword('');

      if (user && user.mustChangePassword) {
        const updated = { ...user, mustChangePassword: false };
        setAuth(updated, accessToken!, refreshToken!);
      }
    } catch (err: unknown) {
      console.error('Change password error:', err);
      setPwdError(extractErrorMessage(err, 'Failed to update password.'));
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSignOut = () => {
    logout();
    router.replace('/login');
  };

  const initials = (user?.name || 'User')
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      
      {/* Profile Hero Card */}
      <div className="rounded-3xl bg-gradient-to-r from-[#0a1845] via-[#102a70] to-[#1742a8] p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-2xl font-black text-white shadow-lg border-2 border-white/20">
              {initials}
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">{user?.name}</h1>
              <p className="text-xs text-blue-200 font-medium mt-0.5">
                {user?.designation || 'Staff Member'} · {user?.department || 'Operations'}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-white border border-white/10">
                  {user?.role}
                </span>
                <span className="text-[11px] text-blue-300">
                  ID: {user?.employeeCode || 'EMP'}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/20 transition self-start sm:self-center"
          >
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Stats Summary Strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs text-center">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">On-Time Rate</span>
          <span className="text-2xl font-black text-blue-600 mt-1 block">
            {loadingStats ? '--' : `${stats?.onTimeRate ?? 100}%`}
          </span>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs text-center">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Leaves Taken</span>
          <span className="text-2xl font-black text-slate-900 mt-1 block">
            {loadingStats ? '--' : (stats?.leavesTaken ?? 0)}
          </span>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs text-center">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Avg Work Time</span>
          <span className="text-2xl font-black text-slate-900 mt-1 block">
            {loadingStats ? '--' : `${stats?.avgWorkHours ?? 8}h`}
          </span>
        </div>
      </div>

      {/* Two-Column Layout: Details + Password Change */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Account Details Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <User size={18} className="text-blue-600" />
            <span>Employee Information</span>
          </h2>

          <div className="divide-y divide-slate-100 text-xs sm:text-sm">
            <div className="py-2.5 flex justify-between">
              <span className="text-slate-400 font-medium">Full Name</span>
              <span className="font-bold text-slate-800">{user?.name}</span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-slate-400 font-medium">Work Email</span>
              <span className="font-bold text-slate-800">{user?.email}</span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-slate-400 font-medium">Employee Code</span>
              <span className="font-bold text-slate-800">{user?.employeeCode || '--'}</span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-slate-400 font-medium">Role</span>
              <span className="font-bold text-slate-800">{user?.role}</span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-slate-400 font-medium">Department</span>
              <span className="font-bold text-slate-800">{user?.department || 'Operations'}</span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-slate-400 font-medium">Designation</span>
              <span className="font-bold text-slate-800">{user?.designation || 'Staff'}</span>
            </div>
          </div>
        </div>

        {/* Change Password Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-4">
            <Lock size={18} className="text-blue-600" />
            <span>Security &amp; Password</span>
          </h2>

          {pwdError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 mb-3 flex items-center gap-2">
              <AlertCircle size={14} className="flex-shrink-0" />
              <span>{pwdError}</span>
            </div>
          )}

          {pwdSuccess && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700 mb-3 flex items-center gap-2">
              <CheckCircle2 size={14} className="flex-shrink-0" />
              <span>{pwdSuccess}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                New Password
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-type new password"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={changingPassword}
              className="w-full mt-2 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              {changingPassword && <Loader2 size={14} className="animate-spin" />}
              <span>Update Password</span>
            </button>
          </form>
        </div>

      </div>

    </div>
  );
}
