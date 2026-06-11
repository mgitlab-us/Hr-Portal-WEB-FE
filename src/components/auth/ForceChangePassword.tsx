'use client';

import React, { useState } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Loader2, Lock, ShieldCheck, CheckCircle2, XCircle } from 'lucide-react';

export default function ForceChangePassword() {
  const { user, setAuth, accessToken, refreshToken } = useAuthStore();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!user || !user.mustChangePassword) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.post('/auth/change-password', {
        newPassword
      });
      
      setSuccess(true);
      
      // Update local state to remove the overlay
      setTimeout(() => {
        const updatedUser = { ...user, mustChangePassword: false };
        setAuth(updatedUser, accessToken!, refreshToken!);
      }, 1500);
      
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
      <div className="bg-white w-full max-w-[440px] rounded-2xl shadow-2xl overflow-hidden border border-slate-100">
        
        {/* Header */}
        <div className="bg-slate-50 px-8 py-10 text-center border-b border-slate-100">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-indigo-100 shadow-xl">
            <Lock className="text-white" size={24} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Set Secure Password</h2>
          <p className="text-sm text-slate-500 mt-2">
            Your administrator has set a temporary password. <br />
            Please choose a secure one to continue.
          </p>
        </div>

        {/* Content */}
        <div className="px-8 py-8">
          {success ? (
            <div className="flex flex-col items-center justify-center py-4 space-y-4 text-center">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center">
                <CheckCircle2 size={32} />
              </div>
              <div>
                <p className="text-lg font-semibold text-slate-800">Password Updated!</p>
                <p className="text-sm text-slate-500">Redirecting to dashboard...</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs flex items-center gap-2">
                  <XCircle size={14} className="flex-shrink-0" />
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    placeholder="Min. 8 characters"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all font-medium placeholder:text-slate-400"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Repeat new password"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all font-medium placeholder:text-slate-400"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-slate-800 hover:bg-slate-700 disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : "Update & Continue"}
              </button>
              
              <p className="text-[10px] text-center text-slate-400 italic">
                By clicking "Update & Continue", you agree to our security policies.
              </p>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-center gap-2">
          <ShieldCheck size={12} className="text-slate-400" />
          <span className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">End-to-End Encrypted</span>
        </div>
      </div>
    </div>
  );
}
