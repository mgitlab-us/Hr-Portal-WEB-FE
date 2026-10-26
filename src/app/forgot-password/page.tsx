'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { ShieldCheck, Mail, Lock, KeyRound, ArrowLeft, ArrowRight, CheckCircle2, Loader2, Eye, EyeOff, RotateCcw } from 'lucide-react';
import Link from 'next/link';

type Step = 'EMAIL' | 'OTP' | 'NEW_PASSWORD' | 'SUCCESS';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('EMAIL');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Countdown timer for resend OTP
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.post('/auth/forgot-password', { email });
      setStep('OTP');
      setResendCooldown(60);
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } } };
      setError(apiErr.response?.data?.message || 'Failed to send verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.trim().length !== 6) {
      setError('Please enter a 6-digit verification code.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      await api.post('/auth/verify-reset-otp', { email, otp });
      setStep('NEW_PASSWORD');
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } } };
      setError(apiErr.response?.data?.message || 'Invalid or expired verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setError('Password must contain uppercase, lowercase, and a number.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await api.post('/auth/reset-password', { email, otp, newPassword });
      setStep('SUCCESS');
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } } };
      setError(apiErr.response?.data?.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || loading) return;
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setResendCooldown(60);
    } catch {
      setError('Failed to resend code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 py-12">
      <div className="max-w-[1000px] w-full grid lg:grid-cols-2 bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 min-h-[600px]">
        
        {/* Left Side: Brand Panel */}
        <div className="hidden lg:flex flex-col justify-between bg-slate-900 p-12 lg:p-16 text-white">
          <div>
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center mb-8 shadow-blue-500/20 shadow-xl">
              <ShieldCheck size={24} className="text-white" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight mb-4">
              Password <br />
              <span className="text-blue-400">Recovery</span>
            </h1>
            <p className="text-slate-400 text-lg max-w-sm">
              Securely restore access to your TapIn HRMS administrative console.
            </p>
          </div>

          <div className="space-y-4 text-sm text-slate-400">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-blue-400 font-semibold">1</div>
              <span>Enter verified email address</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-blue-400 font-semibold">2</div>
              <span>Enter 6-digit verification code</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-blue-400 font-semibold">3</div>
              <span>Set strong new password</span>
            </div>
          </div>

          <p className="text-xs text-slate-500 font-medium tracking-widest uppercase">
            TapIn Portal &bull; Enterprise HRMS
          </p>
        </div>

        {/* Right Side: Step Forms */}
        <div className="p-8 lg:p-14 flex flex-col justify-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 font-medium mb-6 transition-colors w-fit"
          >
            <ArrowLeft size={16} /> Back to Login
          </Link>

          {error && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl flex items-start gap-3">
              <span className="text-rose-500 font-bold">!</span>
              <span>{error}</span>
            </div>
          )}

          {step === 'EMAIL' && (
            <div>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-slate-900">Forgot Password</h2>
                <p className="text-slate-500 text-sm mt-1">
                  Enter your email address to receive a 6-digit verification code.
                </p>
              </div>

              <form onSubmit={handleSendOtp} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Work Email
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                      <Mail size={16} />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@company.com"
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-primary py-3 rounded-xl flex items-center justify-center gap-2 font-semibold shadow-lg shadow-blue-500/10"
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <>Send Verification Code <ArrowRight size={18} /></>}
                </button>
              </form>
            </div>
          )}

          {step === 'OTP' && (
            <div>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-slate-900">Enter Verification Code</h2>
                <p className="text-slate-500 text-sm mt-1">
                  We sent a 6-digit code to <strong className="text-slate-800">{email}</strong>.
                </p>
              </div>

              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    6-Digit Code
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                      <KeyRound size={16} />
                    </div>
                    <input
                      type="text"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      required
                      autoFocus
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-lg font-mono tracking-widest text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all text-center"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <button
                    type="button"
                    onClick={() => setStep('EMAIL')}
                    className="text-slate-500 hover:text-slate-700"
                  >
                    Change Email
                  </button>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendCooldown > 0 || loading}
                    className="text-blue-600 hover:text-blue-700 font-semibold disabled:text-slate-400 inline-flex items-center gap-1.5"
                  >
                    <RotateCcw size={14} />
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="w-full btn-primary py-3 rounded-xl flex items-center justify-center gap-2 font-semibold shadow-lg shadow-blue-500/10"
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <>Verify Code <ArrowRight size={18} /></>}
                </button>
              </form>
            </div>
          )}

          {step === 'NEW_PASSWORD' && (
            <div>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-slate-900">Set New Password</h2>
                <p className="text-slate-500 text-sm mt-1">
                  Choose a strong password containing at least 8 characters, an uppercase letter, lowercase letter, and a number.
                </p>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    New Password
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                      <Lock size={16} />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-12 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 btn-ghost rounded-md"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                      <Lock size={16} />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-primary py-3 rounded-xl flex items-center justify-center gap-2 font-semibold shadow-lg shadow-blue-500/10 mt-6"
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <>Reset Password <ArrowRight size={18} /></>}
                </button>
              </form>
            </div>
          )}

          {step === 'SUCCESS' && (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 size={36} />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Password Reset Successful!</h2>
              <p className="text-slate-500 text-sm max-w-sm mx-auto mb-8">
                Your password has been securely updated. All active sessions have been terminated. You can now log in with your new password.
              </p>
              <button
                onClick={() => router.push('/login')}
                className="w-full btn-primary py-3 rounded-xl font-semibold"
              >
                Proceed to Login
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
