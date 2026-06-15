'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Eye, EyeOff, Loader2, Mail, Lock, ShieldCheck, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await api.post('/auth/login', { email, password });
      const { employee, accessToken, refreshToken } = res.data;

      if (employee.role === 'EMPLOYEE') {
        setError('Access denied. This portal is for administrative use only.');
        setLoading(false);
        return;
      }

      setAuth(employee, accessToken, refreshToken);
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.response?.data?.message || 'Authentication failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 py-12">
      <div className="max-w-[1200px] w-full grid lg:grid-cols-2 bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 min-h-[700px]">

        {/* Left Side: Brand/Marketing */}
        <div className="hidden lg:flex flex-col justify-between bg-slate-900 p-12 lg:p-16 text-white">
          <div>
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center mb-8 shadow-indigo-500/20 shadow-xl">
              <ShieldCheck size={24} className="text-white" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight mb-4">
              Welcome <br />
              <span className="text-indigo-400">Back</span>
            </h1>
            <p className="text-slate-400 text-lg max-w-sm">
              Sign in to manage your team, track attendance, and keep operations running smoothly.
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center flex-shrink-0 text-indigo-400">
                <ShieldCheck size={20} />
              </div>
              <div>
                <p className="font-semibold">Admin Portal</p>
                <p className="text-sm text-slate-400">Restricted access for organisation admins only.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center flex-shrink-0 text-indigo-400">
                <Lock size={20} />
              </div>
              <div>
                <p className="font-semibold">Secure Sessions</p>
                <p className="text-sm text-slate-400">JWT-based auth with refresh token rotation.</p>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-500 font-medium tracking-widest uppercase mt-8">
            © 2026 TapIn Technologies Inc.
          </p>
        </div>

        {/* Right Side: Form */}
        <div className="p-8 lg:p-16 flex flex-col justify-center">
          <div className="mb-10 lg:hidden flex justify-center">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-indigo-100 shadow-xl">
              <ShieldCheck size={24} className="text-white" />
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-800">Sign In</h2>
            <p className="text-sm text-slate-500 mt-1">Enter your credentials to access the dashboard.</p>
          </div>

          {error && (
            <div className="mb-6 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Work Email Address</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <Mail size={16} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@company.com"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Password</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <Lock size={16} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-12 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <div
                  onClick={() => setRememberMe(!rememberMe)}
                  className={`w-4 h-4 rounded flex items-center justify-center border transition-colors cursor-pointer ${rememberMe ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'
                    }`}
                >
                  {rememberMe && (
                    <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <span className="text-sm text-slate-600">Remember me</span>
              </label>
              <Link
                href="/forgot-password"
                className="text-sm text-indigo-600 hover:text-indigo-700 font-semibold transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            <div className="h-px bg-slate-100 my-2" />
            <div className="h-px bg-slate-100 my-2" />
            <div className="h-px bg-slate-100 my-2" />

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-4 rounded-xl transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 mt-4"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>

            <p className="text-center text-sm text-slate-500 mt-6">
              Don't have an account?{' '}
              <Link href="/register" className="text-indigo-600 font-semibold hover:underline">
                Create Organisation
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}