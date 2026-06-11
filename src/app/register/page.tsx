'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Eye, EyeOff, Loader2, Building2, User, Mail, Globe, ShieldCheck, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [formData, setFormData] = useState({
    companyName: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    adminName: '',
    adminEmail: '',
    adminPassword: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await api.post('/auth/register', formData);
      const { employee, accessToken, refreshToken } = res.data;
      
      setAuth(employee, accessToken, refreshToken);
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.response?.data?.message || 'Registration failed. Please check your details.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 py-12">
      <div className="max-w-[1000px] w-full grid lg:grid-cols-2 bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
        
        {/* Left Side: Brand/Marketing */}
        <div className="hidden lg:flex flex-col justify-between bg-slate-900 p-12 text-white">
          <div>
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center mb-8 shadow-indigo-500/20 shadow-xl">
              <ShieldCheck size={24} className="text-white" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight mb-4">
              Building a <br />
              <span className="text-indigo-400">Better Workplace</span>
            </h1>
            <p className="text-slate-400 text-lg max-w-sm">
              Empower your team with professional attendance tracking and HR management.
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center flex-shrink-0 text-indigo-400">
                <Globe size={20} />
              </div>
              <div>
                <p className="font-semibold">Global Support</p>
                <p className="text-sm text-slate-400">Automated timezone tracking for remote teams.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center flex-shrink-0 text-indigo-400">
                <ShieldCheck size={20} />
              </div>
              <div>
                <p className="font-semibold">Enterprise Security</p>
                <p className="text-sm text-slate-400">Role-based access and secure audit logs.</p>
              </div>
            </div>
          </div>
          
          <p className="text-xs text-slate-500 font-medium tracking-widest uppercase mt-8">
            © 2026 TapIn Technologies Inc.
          </p>
        </div>

        {/* Right Side: Form */}
        <div className="p-8 lg:p-12">
          <div className="mb-10 lg:hidden flex justify-center">
             <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-indigo-100 shadow-xl">
               <ShieldCheck size={24} className="text-white" />
             </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-800">Create Organisation</h2>
            <p className="text-sm text-slate-500 mt-1">Get started with your company profile today.</p>
          </div>

          {error && (
            <div className="mb-6 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Company Name</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <Building2 size={16} />
                  </div>
                  <input
                    name="companyName"
                    required
                    value={formData.companyName}
                    onChange={handleChange}
                    placeholder="Acme Corp"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Local Timezone</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <Globe size={16} />
                  </div>
                  <select
                    name="timezone"
                    required
                    value={formData.timezone}
                    onChange={handleChange as any}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all appearance-none"
                  >
                    <option value="UTC">UTC (Default)</option>
                    <option value="America/New_York">New York (EST/EDT)</option>
                    <option value="Europe/London">London (GMT/BST)</option>
                    <option value="Asia/Dubai">Dubai (GST)</option>
                    <option value="Asia/Karachi">Karachi (PKT)</option>
                    <option value="Asia/Singapore">Singapore (SGT)</option>
                    {/* Add more common ones or use a library, but sticking to basics for now */}
                    <option value={Intl.DateTimeFormat().resolvedOptions().timeZone}>Detect: {Intl.DateTimeFormat().resolvedOptions().timeZone}</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="h-px bg-slate-100 my-2" />

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Admin Full Name</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <User size={16} />
                </div>
                <input
                  name="adminName"
                  required
                  value={formData.adminName}
                  onChange={handleChange}
                  placeholder="John Doe"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Work Email Address</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <Mail size={16} />
                </div>
                <input
                  name="adminEmail"
                  type="email"
                  required
                  value={formData.adminEmail}
                  onChange={handleChange}
                  placeholder="john@company.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Password</label>
              <div className="relative">
                <input
                  name="adminPassword"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.adminPassword}
                  onChange={handleChange}
                  placeholder="Min. 8 characters"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
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

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-4 rounded-xl transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 mt-4"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : (
                <>
                  <span>Create Account</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>

            <p className="text-center text-sm text-slate-500 mt-6">
              Already have an account?{' '}
              <Link href="/login" className="text-indigo-600 font-semibold hover:underline">
                Sign In
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
