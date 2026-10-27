'use client';

import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Save,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import HeaderActions, { type NotificationItem } from '@/components/layout/HeaderActions';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

const NOTIFICATIONS_KEY = 'tapin_notifications';

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [profileForm, setProfileForm] = useState({ name: user?.name || '', phone: '' });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    const saved = localStorage.getItem(NOTIFICATIONS_KEY);
    if (!saved) return;
    try {
      // Hydrate client-only preferences after mount to avoid an SSR mismatch.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNotifications(JSON.parse(saved));
    } catch (error) {
      console.error('Failed to read notifications:', error);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    // Keep the form in sync when the persisted auth user hydrates or changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProfileForm((prev) => ({ ...prev, name: user.name || prev.name }));
  }, [user]);

  const saveNotifications = (next: NotificationItem[]) => {
    setNotifications(next);
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(next));
  };

  const handleProfileSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!profileForm.name.trim()) {
      setProfileMessage({ ok: false, text: 'Full name is required.' });
      return;
    }

    setProfileSaving(true);
    setProfileMessage(null);

    try {
      const response = await api.patch('/employees/me/profile', {
        name: profileForm.name,
        phone: profileForm.phone,
      });

      const nextName = response.data?.name ?? profileForm.name;
      setUser({ ...user!, name: nextName });
      setProfileMessage({ ok: true, text: 'Profile updated successfully.' });
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      setProfileMessage({
        ok: false,
        text: err?.response?.data?.message || 'Failed to update profile.',
      });
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordSave = async (event: React.FormEvent) => {
    event.preventDefault();

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage({ ok: false, text: 'New passwords do not match.' });
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordMessage({ ok: false, text: 'Password must be at least 6 characters long.' });
      return;
    }

    setPasswordSaving(true);
    setPasswordMessage(null);

    try {
      await api.post('/auth/change-password', {
        oldPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordMessage({ ok: true, text: 'Password changed successfully.' });
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      setPasswordMessage({
        ok: false,
        text: err?.response?.data?.message || 'Failed to change password.',
      });
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <DashboardLayout
      headerActions={
        <HeaderActions
          notifications={notifications}
          onNotificationsChange={saveNotifications}
          showProfile={false}
        />
      }
    >
      <div className="min-h-screen bg-canvas px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
        <div className="mx-auto max-w-5xl space-y-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-blue-600">Account</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">My Profile</h1>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
              <ShieldCheck size={14} />
              Secure account
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
            <aside className="rounded-3xl border border-line bg-white p-5 shadow-sm">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#2563EB] text-2xl font-bold text-white shadow-lg shadow-blue-200">
                  {user?.name ? user.name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase() : 'A'}
                </div>
                <h2 className="mt-4 text-lg font-bold text-ink">{user?.name || 'Administrator'}</h2>
                <p className="mt-1 text-sm text-ink-soft">{user?.role?.replace(/_/g, ' ') || 'Admin'}</p>
              </div>

              <div className="mt-6 space-y-3 text-sm">
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <Mail size={16} className="text-ink-soft" />
                  <span className="min-w-0 truncate text-ink-soft">{user?.email || 'No email available'}</span>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <UserRound size={16} className="text-ink-soft" />
                  <span className="text-ink-soft">{user?.company?.name || 'Company profile'}</span>
                </div>
              </div>
            </aside>

            <div className="space-y-5">
              <section className="rounded-3xl border border-line bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <UserRound size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-ink">Profile details</h3>
                    <p className="text-xs text-ink-soft">Update your public details and contact number.</p>
                  </div>
                </div>

                <form onSubmit={handleProfileSave} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="space-y-2 text-sm font-medium text-ink">
                      <span>Full name</span>
                      <input
                        value={profileForm.name}
                        onChange={(event) => setProfileForm((current) => ({ ...current, name: event.target.value }))}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                        placeholder="Jane Smith"
                      />
                    </label>

                    <label className="space-y-2 text-sm font-medium text-ink">
                      <span>Phone number</span>
                      <input
                        value={profileForm.phone}
                        onChange={(event) => setProfileForm((current) => ({ ...current, phone: event.target.value }))}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                        placeholder="+92 300 1234567"
                      />
                    </label>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="space-y-2 text-sm font-medium text-ink">
                      <span>Email</span>
                      <input
                        value={user?.email || ''}
                        disabled
                        className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500"
                      />
                    </label>

                    <label className="space-y-2 text-sm font-medium text-ink">
                      <span>Role</span>
                      <input
                        value={user?.role ? user.role.replace(/_/g, ' ') : ''}
                        disabled
                        className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500"
                      />
                    </label>
                  </div>

                  {profileMessage && (
                    <div
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm ${
                        profileMessage.ok
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'border-red-200 bg-red-50 text-red-700'
                      }`}
                    >
                      {profileMessage.ok ? <CheckCircle2 size={16} /> : <Lock size={16} />}
                      {profileMessage.text}
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={profileSaving}
                      className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {profileSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                      {profileSaving ? 'Saving...' : 'Save changes'}
                    </button>
                  </div>
                </form>
              </section>

              <section className="rounded-3xl border border-line bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                    <Lock size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-ink">Change password</h3>
                    <p className="text-xs text-ink-soft">Use your current password to set a new one.</p>
                  </div>
                </div>

                <form onSubmit={handlePasswordSave} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="space-y-2 text-sm font-medium text-ink">
                      <span>Current password</span>
                      <div className="relative">
                        <input
                          type={showCurrentPassword ? 'text' : 'password'}
                          value={passwordForm.currentPassword}
                          onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))}
                          placeholder="Enter current password"
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 pr-10 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword((current) => !current)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
                          aria-label="Toggle current password visibility"
                        >
                          {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </label>

                    <label className="space-y-2 text-sm font-medium text-ink">
                      <span>New password</span>
                      <div className="relative">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          value={passwordForm.newPassword}
                          onChange={(event) => setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))}
                          placeholder="Minimum 6 characters"
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 pr-10 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword((current) => !current)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
                          aria-label="Toggle new password visibility"
                        >
                          {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </label>
                  </div>

                  <label className="block space-y-2 text-sm font-medium text-ink">
                    <span>Confirm new password</span>
                    <input
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(event) => setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                      placeholder="Re-enter your new password"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                  </label>

                  {passwordMessage && (
                    <div
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm ${
                        passwordMessage.ok
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'border-red-200 bg-red-50 text-red-700'
                      }`}
                    >
                      {passwordMessage.ok ? <CheckCircle2 size={16} /> : <Lock size={16} />}
                      {passwordMessage.text}
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={passwordSaving}
                      className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {passwordSaving ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
                      {passwordSaving ? 'Updating...' : 'Update password'}
                    </button>
                  </div>
                </form>
              </section>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
