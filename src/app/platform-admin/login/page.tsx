'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { ShieldCheck, Mail, KeyRound, ArrowRight, Loader2, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function PlatformAdminLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<'EMAIL' | 'OTP'>('EMAIL');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await api.post('/platform-admin/request-otp', { email: email.trim().toLowerCase() });
      setSuccessMsg(res.data?.message || 'Verification code sent to your email.');
      setStep('OTP');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      setErrorMsg(error.response?.data?.message || error.message || 'Failed to send verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) return;

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await api.post('/platform-admin/verify-otp', {
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
      });

      if (res.data?.accessToken) {
        localStorage.setItem('accessToken', res.data.accessToken);
        localStorage.setItem('platformAdminUser', JSON.stringify(res.data.platformAdmin));
        // Redirect to platform admin dashboard
        router.push('/platform-admin');
      } else {
        throw new Error('No access token received.');
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      setErrorMsg(error.response?.data?.message || error.message || 'Invalid or expired verification code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#070d24] via-[#0c1840] to-[#122668] text-white flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden font-sans">
      {/* Decorative ambient background glows */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-xl shadow-blue-500/25 mb-4 border border-white/20">
            <ShieldCheck size={34} className="text-white" />
          </div>
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-white">TapIn Platform</h1>
            <span className="text-[11px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2 py-0.5 rounded-full">
              Root Console
            </span>
          </div>
          <p className="text-xs text-blue-200/70 mt-1.5 font-medium">
            Authorized Platform Administrators Only
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl relative">
          {errorMsg && (
            <div className="mb-5 rounded-2xl border border-red-400/30 bg-red-500/15 p-3.5 flex items-start gap-2.5 text-xs text-red-200">
              <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMsg}</div>
            </div>
          )}

          {successMsg && (
            <div className="mb-5 rounded-2xl border border-emerald-400/30 bg-emerald-500/15 p-3.5 flex items-start gap-2.5 text-xs text-emerald-200">
              <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{successMsg}</div>
            </div>
          )}

          {step === 'EMAIL' ? (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-blue-200/80 mb-1.5">
                  Platform Admin Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-blue-300/60">
                    <Mail size={18} />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@itapin.com"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/15 text-white placeholder-blue-200/40 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>
                <p className="text-[11px] text-blue-200/60 mt-1.5 leading-relaxed">
                  A one-time secure verification code will be dispatched to your registered address.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full mt-2 py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Sending Code...</span>
                  </>
                ) : (
                  <>
                    <span>Send Verification Code</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="text-center pb-2">
                <span className="text-xs text-blue-200/70">Code sent to:</span>
                <p className="text-sm font-bold text-white tracking-wide mt-0.5">{email}</p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-blue-200/80 mb-1.5 text-center">
                  6-Digit Verification Code
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-blue-300/60">
                    <KeyRound size={18} />
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    autoFocus
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full pl-10 pr-4 py-3 text-center tracking-[0.3em] font-mono text-xl rounded-xl bg-white/5 border border-white/15 text-white placeholder-blue-200/30 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>
                <p className="text-[11px] text-blue-200/60 mt-1.5 text-center">
                  Valid for 10 minutes.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full mt-2 py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    <span>Verify &amp; Enter Console</span>
                  </>
                )}
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setStep('EMAIL');
                    setOtp('');
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  className="text-xs text-blue-300 hover:text-white underline underline-offset-4 cursor-pointer"
                >
                  Use a different email address
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Security badge footer */}
        <div className="mt-8 text-center text-xs text-blue-200/40">
          <p>&copy; {new Date().getFullYear()} TapIn HRMS Platform Engine &bull; Strictly Confidential</p>
        </div>
      </div>
    </div>
  );
}

