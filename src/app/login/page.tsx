'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import {
  ArrowRight,
  BarChart3,
  CalendarCheck,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Play,
  ShieldCheck,
  Users,
} from 'lucide-react';

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

export default function LoginPage() {
  const router = useRouter();

  const setAuth = useAuthStore((state) => state.setAuth);
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore(
    (state) => state.accessToken
  );

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user && accessToken) {
      document.cookie =
        'isAuthenticated=true; path=/; max-age=604800; samesite=lax';

      if (user.role === 'EMPLOYEE') {
        router.replace('/portal');
      } else {
        router.replace('/dashboard');
      }
    }
  }, [user, accessToken, router]);

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setLoading(true);
    setError('');

    try {
      const res = await api.post('/auth/login', {
        email,
        password,
      });

      const {
        employee,
        accessToken,
        refreshToken,
      } = res.data;

      setAuth(employee, accessToken, refreshToken);

      if (employee.role === 'EMPLOYEE') {
        router.push('/portal');
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      console.error('Login error:', err);

      const apiErr = err as {
        response?: {
          data?: {
            message?: string;
          };
        };
      };

      setError(
        apiErr.response?.data?.message ||
        'Authentication failed. Please try again.'
      );

      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-svh w-full overflow-hidden bg-[#f2f6ff] tracking-normal antialiased lg:h-svh lg:min-h-[680px]">

      {/* ===== Brand panel (diagonal right edge) ===== */}
      <aside className="absolute inset-y-0 left-0 z-10 hidden w-[65%] flex-col overflow-hidden bg-[#071b4b] px-12 pt-9 text-white lg:flex xl:px-16">

        {/* Photo */}
        <Image
          src="/images/hero-team.jpg"
          alt=""
          fill
          priority
          sizes="65vw"
          className="object-cover object-[75%_25%]"
        />

        {/* Left-to-right navy wash so the text stays crisp and the photo fades in */}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(6,20,56,0.96)_0%,rgba(8,34,92,0.80)_30%,rgba(10,44,112,0.28)_62%,rgba(10,44,112,0.06)_100%)]" />

        {/* Bottom wash so the photo melts into the waves */}
        <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(7,27,75,0.98)_0%,rgba(7,27,75,0.75)_16%,rgba(7,27,75,0.25)_36%,transparent_52%)]" />

        {/* Brand logo */}
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

        {/* Hero copy */}
        <div className="relative z-10 my-auto max-w-[560px] pb-24 pt-8">

          <p className="mb-5 flex items-center gap-4 text-xs font-medium uppercase tracking-[0.22em] text-blue-100/90">
            Modern HRMS Platform
            <span className="h-px w-24 bg-white/25" />
          </p>

          <h1 className="text-[clamp(2.6rem,4.3vw,4.3rem)] font-bold leading-[1.05] tracking-[-0.025em]">
            Smarter HR.
            <br />
            <span className="bg-gradient-to-r from-[#2f6bf5] to-[#5aa0ff] bg-clip-text text-transparent">
              Stronger
            </span>{' '}
            Teams.
          </h1>

          <p className="mt-6 max-w-[470px] text-base leading-7 text-blue-50/90">
            Manage your workforce with ease — track attendance, handle leaves, and streamline your HR operations all in
            one powerful platform.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/register"
              className="inline-flex h-[52px] items-center gap-2.5 rounded-full bg-[#1760f5] px-7 text-sm font-semibold text-white shadow-lg shadow-blue-950/30 transition hover:bg-[#1255e8]"
            >
              Register Your Organization
              <ArrowRight size={17} strokeWidth={2.2} />
            </Link>
            <Link
              href="/"
              className="inline-flex h-[52px] items-center gap-2.5 rounded-full border border-white/45 px-7 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Learn More
              <Play size={14} />
            </Link>
          </div>
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
            <linearGradient id="lw-back" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#16419f" stopOpacity=".35" />
              <stop offset="1" stopColor="#2a62d8" stopOpacity=".55" />
            </linearGradient>
            <linearGradient id="lw-front" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#0a2670" />
              <stop offset=".6" stopColor="#123f9f" />
              <stop offset="1" stopColor="#1f55c6" />
            </linearGradient>
          </defs>

          <path
            d="M0 120C240 70 480 60 720 100S1180 170 1440 120V240H0Z"
            fill="url(#lw-back)"
          />
          <path
            d="M0 164C260 124 520 154 780 182S1210 206 1440 172V240H0Z"
            fill="url(#lw-front)"
          />
        </svg>

        {/* Footer line */}
        <p className="relative z-10 -mx-1 mb-6 flex items-center gap-3 text-xs text-blue-50/90">
          <span className="h-px w-3 bg-white/60" />
          © {new Date().getFullYear()} iTapIn. All rights reserved.
        </p>
      </aside>

      {/* Diagonal edge: rendered as a vector shape so it stays smooth (clip-path / image edges alias) */}
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

      {/* ===== Soft decoration on the light side ===== */}
      <CornerWaves position="top" />
      <CornerWaves position="bottom" />

      {/* ===== Sign-in panel ===== */}
      <section className="relative z-20 flex min-h-svh items-center justify-center px-6 py-10 sm:px-10 lg:ml-auto lg:h-full lg:min-h-0 lg:w-[38%] lg:px-8">

        <div className="relative w-full max-w-[430px]">

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
          <div className="rounded-3xl border border-[#e2eaf8] bg-white p-7 shadow-[0_24px_60px_-24px_rgba(20,85,206,0.28)] sm:p-9">

            {/* Header */}
            <header className="mb-7">

              <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-600">
                HR Portal
              </p>

              <h2 className="text-[2rem] font-bold leading-tight tracking-[-0.025em] text-[#102653]">
                Sign in
              </h2>

              <p className="mt-1.5 text-sm leading-6 text-slate-500">
                Enter your credentials to access your dashboard.
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

            {/* Login form */}
            <form
              onSubmit={handleSubmit}
              className="space-y-5"
            >

              {/* Email */}
              <div className="space-y-2">

                <label
                  htmlFor="email"
                  className="block text-[13px] font-semibold text-[#172b55]"
                >
                  Work email address
                </label>

                <div className="relative">
                  <Mail
                    size={18}
                    strokeWidth={1.8}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="john@company.com"
                    required
                    className="h-12 w-full rounded-xl border border-[#dce6f7] bg-[#f7f9fd] pl-11 pr-4 text-sm text-[#102653] outline-none transition placeholder:text-slate-400 hover:border-blue-200 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">

                <label
                  htmlFor="password"
                  className="block text-[13px] font-semibold text-[#172b55]"
                >
                  Password
                </label>

                <div className="relative">

                  <Lock
                    size={18}
                    strokeWidth={1.8}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="h-12 w-full rounded-xl border border-[#dce6f7] bg-[#f7f9fd] pl-11 pr-12 text-sm text-[#102653] outline-none transition placeholder:text-slate-400 hover:border-blue-200 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
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
              </div>

              {/* Remember me and forgot password */}
              <div className="flex flex-wrap items-center justify-between gap-3">

                <label className="flex cursor-pointer select-none items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) =>
                      setRememberMe(e.target.checked)
                    }
                    className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-blue-600 focus:ring-2 focus:ring-blue-500/30"
                  />

                  <span className="text-[13px] font-medium text-slate-600">
                    Remember me
                  </span>
                </label>

                <Link
                  href="/forgot-password"
                  className="text-[13px] font-semibold text-blue-600 transition hover:text-blue-800 hover:underline"
                >
                  Forgot password?
                </Link>

              </div>

              {/* Sign in button */}
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
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign in to dashboard</span>

                    <ArrowRight
                      size={18}
                      strokeWidth={2.3}
                      className="transition-transform duration-200 group-hover:translate-x-1"
                    />
                  </>
                )}
              </button>

              {/* Register link */}
              <p className="border-t border-[#eaf0fa] pt-5 text-center text-[13px] text-slate-500">
                Don&apos;t have an account?{' '}

                <Link
                  href="/register"
                  className="font-semibold text-blue-600 transition hover:text-blue-800 hover:underline"
                >
                  Create organisation
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