'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, User, Lock, Save, Loader2, Eye, EyeOff, CheckCircle2,
  AlertCircle, ShieldCheck, Mail, Phone,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

type Tab = 'profile' | 'security';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

function Field({
  label, ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
        {label}
      </label>
      <input
        {...props}
        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
      />
    </div>
  );
}

export default function ProfileSecurityModal({ isOpen, onClose }: Props) {
  const { user, setUser } = useAuthStore();

  // Profile state
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Password state
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [tab, setTab] = useState<Tab>('profile');
  const [profileForm, setProfileForm] = useState(() => (
    user ? { name: user.name || '', phone: (user as { phone?: string }).phone || '' } : { name: '', phone: '' }
  ));
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileForm.name.trim()) return;
    setProfileSaving(true);
    setProfileMsg(null);
    try {
      const res = await api.patch('/employees/me/profile', profileForm);
      setUser({ ...user!, name: res.data?.name ?? profileForm.name });
      setProfileMsg({ ok: true, text: 'Profile updated successfully.' });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setProfileMsg({ ok: false, text: e?.response?.data?.message || 'Failed to update profile.' });
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwMsg({ ok: false, text: 'New passwords do not match.' });
      return;
    }
    if (pwForm.newPassword.length < 6) {
      setPwMsg({ ok: false, text: 'Password must be at least 6 characters.' });
      return;
    }
    setPwSaving(true);
    setPwMsg(null);
    try {
      await api.patch('/employees/me/password', {
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      });
      setPwMsg({ ok: true, text: 'Password changed successfully.' });
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setPwMsg({ ok: false, text: e?.response?.data?.message || 'Failed to change password.' });
    } finally {
      setPwSaving(false);
    }
  };

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'profile', label: 'Profile', icon: <User size={14} /> },
    { id: 'security', label: 'Security', icon: <Lock size={14} /> },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                  <ShieldCheck size={20} className="text-blue-600" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-800">My Account</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Manage your profile &amp; credentials</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Tab Bar */}
            <div className="flex gap-1 px-6 pb-4">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                    tab === t.id
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </div>

            <div className="px-6 pb-6">
              {/* User info strip */}
              <div className="flex items-center gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-100 mb-5">
                <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {(user?.name || 'A').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{user?.name || '—'}</p>
                  <p className="text-xs text-slate-400 flex items-center gap-1 truncate">
                    <Mail size={10} /> {user?.email || '—'}
                  </p>
                </div>
              </div>

              {/* Profile Tab */}
              {tab === 'profile' && (
                <form onSubmit={handleProfileSave} className="space-y-4">
                  <Field
                    label="Full Name"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Jane Smith"
                    required
                  />
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Phone
                    </label>
                    <div className="relative">
                      <Phone size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="tel"
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))}
                        placeholder="+92 300 1234567"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-9 pr-3.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      />
                    </div>
                  </div>

                  {profileMsg && (
                    <div className={`flex items-center gap-2 p-3 rounded-xl text-xs font-medium ${profileMsg.ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                      {profileMsg.ok ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                      {profileMsg.text}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={profileSaving}
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 btn-primary rounded-xl text-sm font-semibold"
                  >
                    {profileSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    Save Profile
                  </button>
                </form>
              )}

              {/* Security Tab */}
              {tab === 'security' && (
                <form onSubmit={handlePasswordSave} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Current Password</label>
                    <div className="relative">
                      <input
                        type={showCurrent ? 'text' : 'password'}
                        value={pwForm.currentPassword}
                        onChange={(e) => setPwForm((p) => ({ ...p, currentPassword: e.target.value }))}
                        placeholder="Enter your current password"
                        required
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 pr-10 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      />
                      <button type="button" onClick={() => setShowCurrent((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showCurrent ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">New Password</label>
                    <div className="relative">
                      <input
                        type={showNew ? 'text' : 'password'}
                        value={pwForm.newPassword}
                        onChange={(e) => setPwForm((p) => ({ ...p, newPassword: e.target.value }))}
                        placeholder="Minimum 6 characters"
                        required
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 pr-10 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      />
                      <button type="button" onClick={() => setShowNew((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>

                  <Field
                    label="Confirm New Password"
                    type="password"
                    value={pwForm.confirmPassword}
                    onChange={(e) => setPwForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                    placeholder="Re-enter new password"
                    required
                  />

                  {pwMsg && (
                    <div className={`flex items-center gap-2 p-3 rounded-xl text-xs font-medium ${pwMsg.ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                      {pwMsg.ok ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                      {pwMsg.text}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={pwSaving}
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 btn-primary rounded-xl text-sm font-semibold"
                  >
                    {pwSaving ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
                    Change Password
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
