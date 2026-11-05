'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import {
  Eye,
  EyeOff,
  Loader2,
  Building2,
  User,
  Mail,
  Globe,
  ShieldCheck,
  ArrowRight,
  CalendarCheck,
  Users,
  BarChart3,
} from 'lucide-react';
import Link from 'next/link';

const HIGHLIGHTS = [
  { icon: Users, label: 'Employee Management' },
  { icon: CalendarCheck, label: 'Attendance Tracking' },
  { icon: BarChart3, label: 'Powerful Analytics' },
  { icon: ShieldCheck, label: 'Secure & Reliable' },
];

/* Soft, low-contrast sweeps on the light side (top-right swell, bottom-right ripples) */
function CornerWaves({
  position = 'top',
}: {
  position?: 'top' | 'bottom';
}) {
  const isTop = position === 'top';
  const id = `soft-${position}`;

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 460 260"
      preserveAspectRatio={isTop ? 'xMaxYMin meet' : 'xMaxYMax meet'}
      className={`pointer-events-none absolute right-0 z-0 w-[210px] sm:w-[280px] lg:w-[400px] ${
        isTop ? 'top-0' : 'bottom-0'
      }`}
      fill="none"
    >
      <defs>
        <linearGradient id={`${id}-1`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#d6e4ff" />
          <stop offset="1" stopColor="#a8c4fb" />
        </linearGradient>
        <linearGradient id={`${id}-2`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8db3fa" />
          <stop offset="1" stopColor="#4f80ea" />
        </linearGradient>
      </defs>

      {isTop ? (
        <>
          <path
            d="M120 0C180 96 320 150 460 118V0H120Z"
            fill={`url(#${id}-1)`}
            opacity=".55"
          />
          <path
            d="M250 0C300 66 370 98 460 90V0H250Z"
            fill={`url(#${id}-2)`}
            opacity=".7"
          />
        </>
      ) : (
        <>
          <path
            d="M40 260C140 160 300 112 460 134V260H40Z"
            fill="#dde8ff"
            opacity=".6"
          />
          <path
            d="M190 260C280 200 370 166 460 170V260H190Z"
            fill="#c6d9ff"
            opacity=".65"
          />
          <path
            d="M330 260C384 232 424 220 460 220V260H330Z"
            fill="#adc7fb"
            opacity=".6"
          />
        </>
      )}
    </svg>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  const detectedTimezone =
    Intl.DateTimeFormat().resolvedOptions().timeZone;

  const [formData, setFormData] = useState({
    companyName: '',
    timezone: detectedTimezone,
    adminName: '',
    adminEmail: '',
    adminPassword: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setError('');

    // Email validation
    if (
      !formData.adminEmail.includes('@') ||
      !formData.adminEmail.toLowerCase().endsWith('.com')
    ) {
      setError('Email must be a valid .com address');
      setLoading(false);
      return;
    }

    // Password length validation
    if (formData.adminPassword.length < 8) {
      setError('Password must be at least 8 characters');
      setLoading(false);
      return;
    }

    // Password complexity validation
    if (
      !/[A-Z]/.test(formData.adminPassword) ||
      !/[0-9]/.test(formData.adminPassword)
    ) {
      setError(
        'Password must contain at least one uppercase letter and one number'
      );
      setLoading(false);
      return;
    }

    try {
      const res = await api.post(
        '/auth/register-company',
        formData
      );

      const {
        employee,
        accessToken,
        refreshToken,
      } = res.data;

      setAuth(employee, accessToken, refreshToken);

      router.push('/dashboard');
    } catch (err) {
      console.error('Registration error:', err);

      const apiErr = err as {
        response?: {
          data?: {
            message?: string;
          };
        };
      };

      setError(
        apiErr.response?.data?.message ||
          'Registration failed. Please check your details.'
      );

      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-svh w-full overflow-hidden bg-[#f2f6ff] tracking-normal antialiased">

      {/* =================================
          BRAND PANEL
      ================================= */}

      <aside className="absolute inset-y-0 left-0 z-10 hidden w-[65%] flex-col overflow-hidden bg-[#071b4b] px-12 pt-9 text-white lg:flex xl:px-16">

        {/* Photo */}
        <Image
          src="/images/register-team.jpg"
          alt=""
          fill
          priority
          sizes="65vw"
          className="object-cover object-[75%_25%]"
        />

        {/* Left-to-right navy wash: keeps text crisp, lets the photo fade in */}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(6,20,56,0.96)_0%,rgba(8,34,92,0.80)_30%,rgba(10,44,112,0.28)_62%,rgba(10,44,112,0.06)_100%)]" />

        {/* Bottom wash so the photo melts into the waves */}
        <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(7,27,75,0.98)_0%,rgba(7,27,75,0.75)_16%,rgba(7,27,75,0.25)_36%,transparent_52%)]" />

        {/* Logo */}
        <div className="relative z-10 flex items-center justify-start">
          <Image
            src="/images/logo.png"
            alt="iTapIn"
            width={110}
            height={110}
            className="shrink-0 object-contain"
            priority
            style={{ width: 100, height: 100 }}
          />
        </div>

        {/* Brand content */}
        <div className="relative z-10 my-auto max-w-[560px] pb-24 pt-8">

          <p className="mb-5 flex items-center gap-4 text-xs font-medium uppercase tracking-[0.22em] text-blue-100/90">
            Your workplace, connected
            <span className="h-px w-24 bg-white/25" />
          </p>

          <h1 className="text-[clamp(2.6rem,4.3vw,4.3rem)] font-bold leading-[1.05] tracking-[-0.025em]">
            Build a{' '}
            <span className="bg-gradient-to-r from-[#2f6bf5] to-[#5aa0ff] bg-clip-text text-transparent">
              Better
            </span>
            <br />
            Workplace.
          </h1>

          <p className="mt-6 max-w-[470px] text-base leading-7 text-blue-50/90">
            Bring your people, attendance, and HR operations together with one powerful platform.
          </p>
        </div>

        {/* Highlights row */}
        <ul className="relative z-10 mb-24 grid max-w-[640px] grid-cols-4 xl:mb-28">
          {HIGHLIGHTS.map(({ icon: Icon, label }) => (
            <li
              key={label}
              className="border-l border-white/15 py-1 pl-5 pr-3"
            >
              <Icon className="h-7 w-7 text-blue-400" strokeWidth={1.7} />
              <span className="mt-3 block max-w-[7rem] text-[13px] leading-tight text-blue-50/90">
                {label}
              </span>
            </li>
          ))}
        </ul>

        {/* Waves: gentle, undistorted swells (height follows width, so curves never stretch) */}
        <svg
          aria-hidden="true"
          viewBox="0 0 1440 240"
          className="pointer-events-none absolute bottom-0 left-0 z-[5] h-auto w-full"
          fill="none"
        >
          <defs>
            <linearGradient id="rw-back" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#16419f" stopOpacity=".35" />
              <stop offset="1" stopColor="#2a62d8" stopOpacity=".55" />
            </linearGradient>
            <linearGradient id="rw-front" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#0a2670" />
              <stop offset=".6" stopColor="#123f9f" />
              <stop offset="1" stopColor="#1f55c6" />
            </linearGradient>
          </defs>

          <path
            d="M0 120C240 70 480 60 720 100S1180 170 1440 120V240H0Z"
            fill="url(#rw-back)"
          />
          <path
            d="M0 164C260 124 520 154 780 182S1210 206 1440 172V240H0Z"
            fill="url(#rw-front)"
          />
        </svg>

        {/* Footer line */}
        <p className="relative z-10 -mx-1 mb-6 flex items-center gap-3 text-xs text-blue-50/90">
          <span className="h-px w-3 bg-white/60" />
          © {new Date().getFullYear()} iTapIn. All rights reserved.
        </p>
      </aside>

      {/* Diagonal edge: rendered as a vector shape so it stays smooth */}
      <svg
        aria-hidden="true"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-y-0 left-0 z-[11] hidden w-[65%] lg:block"
      >
        <path d="M100 0L91 100H100Z" fill="#f2f6ff" />
        <path
          d="M100 0L91 100"
          stroke="#ffffff"
          strokeOpacity=".35"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {/* Soft decoration on the light side */}
      <CornerWaves position="top" />
      <CornerWaves position="bottom" />

      {/* =================================
          REGISTRATION PANEL
      ================================= */}

      <section className="relative z-20 flex min-h-svh items-center justify-center px-6 py-10 sm:px-10 lg:ml-auto lg:w-[38%] lg:px-8">

        <div className="relative w-full max-w-[460px]">

          {/* Mobile logo */}
          <div className="mb-7 flex items-center justify-center lg:hidden">
            <Image
              src="/images/logo.png"
              alt="iTapIn"
              width={84}
              height={84}
              className="shrink-0 object-contain"
              style={{ width: 84, height: 84 }}
            />
          </div>

          {/* Form card */}
          <div className="rounded-3xl border border-[#e2eaf8] bg-white p-7 shadow-[0_24px_60px_-24px_rgba(20,85,206,0.28)] sm:p-8">

            {/* Header */}
            <header className="mb-6">

              <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-600">
                Get started with iTapIn
              </p>

              <h2 className="text-[2rem] font-bold leading-tight tracking-[-0.025em] text-[#102653]">
                Create account
              </h2>

              <p className="mt-1.5 text-sm leading-6 text-slate-500">
                Set up your organisation and start managing your workforce.
              </p>

              <span className="mt-4 block h-[3px] w-12 rounded-full bg-blue-600" />
            </header>

            {/* Error message */}
            {error && (
              <div
                role="alert"
                className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            {/* Registration form */}
            <form
              onSubmit={handleSubmit}
              className="space-y-4"
            >

              {/* Company and timezone */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                {/* Company name */}
                <div className="space-y-2">
                  <label
                    htmlFor="companyName"
                    className="block text-[13px] font-semibold text-[#172b55]"
                  >
                    Company name
                  </label>

                  <div className="relative">
                    <Building2
                      size={18}
                      strokeWidth={1.8}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      id="companyName"
                      name="companyName"
                      required
                      value={formData.companyName}
                      onChange={handleChange}
                      placeholder="Acme Corp"
                      className="h-11 w-full rounded-xl border border-[#dce6f7] bg-[#f7f9fd] pl-11 pr-3 text-sm text-[#102653] outline-none transition placeholder:text-slate-400 hover:border-blue-200 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                    />
                  </div>
                </div>

                {/* Timezone */}
                <div className="space-y-2">
                  <label
                    htmlFor="timezone"
                    className="block text-[13px] font-semibold text-[#172b55]"
                  >
                    Local timezone
                  </label>

                  <div className="relative">
                    <Globe
                      size={18}
                      strokeWidth={1.8}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <select
                      id="timezone"
                      name="timezone"
                      required
                      value={formData.timezone}
                      onChange={handleChange}
                      className="h-11 w-full appearance-none rounded-xl border border-[#dce6f7] bg-[#f7f9fd] pl-11 pr-3 text-sm text-[#102653] outline-none transition hover:border-blue-200 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                    >
                      <option value="UTC">UTC (Default)</option>
                      <option value="America/New_York">
                        New York (EST/EDT)
                      </option>
                      <option value="Europe/London">
                        London (GMT/BST)
                      </option>
                      <option value="Asia/Dubai">
                        Dubai (GST)
                      </option>
                      <option value="Asia/Karachi">
                        Karachi (PKT)
                      </option>
                      <option value="Asia/Singapore">
                        Singapore (SGT)
                      </option>
                      <option value={detectedTimezone}>
                        Detect: {detectedTimezone}
                      </option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Admin details separator */}
              <div className="flex items-center gap-3 py-0.5">
                <div className="h-px flex-1 bg-slate-100" />
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  Administrator details
                </span>
                <div className="h-px flex-1 bg-slate-100" />
              </div>

              {/* Admin name */}
              <div className="space-y-2">
                <label
                  htmlFor="adminName"
                  className="block text-[13px] font-semibold text-[#172b55]"
                >
                  Admin full name
                </label>

                <div className="relative">
                  <User
                    size={18}
                    strokeWidth={1.8}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    id="adminName"
                    name="adminName"
                    required
                    value={formData.adminName}
                    onChange={handleChange}
                    placeholder="John Doe"
                    className="h-11 w-full rounded-xl border border-[#dce6f7] bg-[#f7f9fd] pl-11 pr-4 text-sm text-[#102653] outline-none transition placeholder:text-slate-400 hover:border-blue-200 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label
                  htmlFor="adminEmail"
                  className="block text-[13px] font-semibold text-[#172b55]"
                >
                  Work email address
                </label>

                <div className="relative">
                  <Mail
                    size={18}
                    strokeWidth={1.8}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    id="adminEmail"
                    name="adminEmail"
                    type="email"
                    autoComplete="email"
                    required
                    value={formData.adminEmail}
                    onChange={handleChange}
                    placeholder="john@company.com"
                    className="h-11 w-full rounded-xl border border-[#dce6f7] bg-[#f7f9fd] pl-11 pr-4 text-sm text-[#102653] outline-none transition placeholder:text-slate-400 hover:border-blue-200 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label
                  htmlFor="adminPassword"
                  className="block text-[13px] font-semibold text-[#172b55]"
                >
                  Password
                </label>

                <div className="relative">
                  <ShieldCheck
                    size={18}
                    strokeWidth={1.8}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    id="adminPassword"
                    name="adminPassword"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={formData.adminPassword}
                    onChange={handleChange}
                    placeholder="Minimum 8 characters"
                    className="h-11 w-full rounded-xl border border-[#dce6f7] bg-[#f7f9fd] pl-11 pr-12 text-sm text-[#102653] outline-none transition placeholder:text-slate-400 hover:border-blue-200 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword((value) => !value)
                    }
                    aria-label={
                      showPassword
                        ? 'Hide password'
                        : 'Show password'
                    }
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 transition hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                  >
                    {showPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>

                <p className="text-xs leading-5 text-slate-400">
                  Use at least 8 characters, including one uppercase
                  letter and one number.
                </p>
              </div>

              {/* Create account button */}
              <button
                type="submit"
                disabled={loading}
                className="group flex h-12 w-full items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-[#1760f5] to-[#124de0] text-[15px] font-semibold text-white shadow-lg shadow-blue-600/25 transition duration-200 hover:-translate-y-0.5 hover:from-[#1255e8] hover:to-[#0e43cb] hover:shadow-xl hover:shadow-blue-600/30 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/25 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? (
                  <>
                    <Loader2
                      size={18}
                      className="animate-spin"
                    />
                    <span>Creating account...</span>
                  </>
                ) : (
                  <>
                    <span>Create organisation</span>

                    <ArrowRight
                      size={18}
                      strokeWidth={2.3}
                      className="transition-transform duration-200 group-hover:translate-x-1"
                    />
                  </>
                )}
              </button>

              {/* Login link */}
              <p className="border-t border-[#eaf0fa] pt-4 text-center text-[13px] text-slate-500">
                Already have an account?{' '}

                <Link
                  href="/login"
                  className="font-semibold text-blue-600 transition hover:text-blue-800 hover:underline"
                >
                  Sign in
                </Link>
              </p>

            </form>
          </div>

          {/* Copyright (mobile only; desktop shows it in the brand panel) */}
          <p className="mt-6 text-center text-xs text-slate-400 lg:hidden">
            © {new Date().getFullYear()} iTapIn. All rights reserved.
          </p>
        </div>
      </section>

      {/* Legal links, bottom right */}
      <div className="absolute bottom-6 right-10 z-20 hidden items-center gap-3 text-xs text-slate-500 lg:flex">
        <Link href="/privacy" className="transition hover:text-blue-700">
          Privacy Policy
        </Link>
        <span className="h-3 w-px bg-slate-300" />
        <Link href="/terms" className="transition hover:text-blue-700">
          Terms of Service
        </Link>
      </div>
    </main>
  );
}