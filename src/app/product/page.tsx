import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  BarChart3,
  Building2,
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  LayoutDashboard,
  Mail,
  Play,
  Plane,
  Rocket,
  Settings,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react';

/* ---------- Static content ---------- */

const navItems = ['Product', 'Features', 'Solutions', 'About'];

const features = [
  {
    icon: CalendarCheck,
    title: 'Attendance & Time Tracking',
    text: 'Track check-ins, breaks and working hours with ease.',
  },
  {
    icon: Users,
    title: 'Employee Management',
    text: 'Manage employee records, departments and teams.',
  },
  {
    icon: Plane,
    title: 'Leave Management',
    text: 'Handle leave requests and approvals seamlessly.',
  },
  {
    icon: Clock,
    title: 'Shift & Schedule Management',
    text: 'Configure shifts, set holidays and manage work schedules.',
  },
  {
    icon: Wallet,
    title: 'Payroll & Salary Records',
    text: 'Keep payroll records and provide payslip access.',
  },
  {
    icon: BarChart3,
    title: 'Reports & Analytics',
    text: 'Get valuable insights into your workforce.',
  },
];

const steps = [
  {
    icon: Building2,
    title: 'Register Your Organization',
    text: 'Create your organization in just a few clicks.',
  },
  {
    icon: Users,
    title: 'Onboard Your Team',
    text: 'Add employees and set up your workspace.',
  },
  {
    icon: Rocket,
    title: 'Start Managing',
    text: 'Track attendance, approve leaves and more.',
  },
];

const sidebarItems = [
  { icon: LayoutDashboard, label: 'Dashboard', active: true },
  { icon: Users, label: 'Employees' },
  { icon: CalendarCheck, label: 'Attendance' },
  { icon: Plane, label: 'Leaves' },
  { icon: Wallet, label: 'Payroll' },
  { icon: FileText, label: 'Reports' },
  { icon: Settings, label: 'Settings' },
];

const chartBars = [34, 62, 40, 70, 38, 64, 46, 78, 44, 72, 52, 84, 48, 74, 90];

const quickActions = [
  { icon: UserPlus, label: 'Add Employee' },
  { icon: CalendarClock, label: 'Mark Attendance' },
  { icon: FileText, label: 'Generate Report' },
];

const footerColumns = [
  { title: 'Product', links: ['Features', 'Pricing', 'Integrations'] },
  { title: 'Company', links: ['About Us', 'Careers', 'Contact'] },
  { title: 'Resources', links: ['Help Center', 'Blog', 'Documentation'] },
];

/* ---------- Small helpers ---------- */

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
      {children}
    </span>
  );
}

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
      <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9.75h4v11H3v-11Zm6.5 0h3.8v1.5h.05c.53-1 1.82-1.85 3.75-1.85 4 0 4.75 2.6 4.75 6v5.35h-4v-4.75c0-1.15-.02-2.6-1.6-2.6-1.6 0-1.85 1.25-1.85 2.55v4.8h-4v-11Z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
      <path d="M18.9 2H22l-7.2 8.2L23.3 22h-6.6l-5.2-6.8L5.6 22H2.5l7.7-8.8L1.9 2h6.8l4.7 6.2L18.9 2Zm-1.2 18h1.8L7.4 3.9H5.5L17.7 20Z" />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
      <path d="M21.6 7.2a2.5 2.5 0 0 0-1.76-1.77C18.3 5 12 5 12 5s-6.3 0-7.84.43A2.5 2.5 0 0 0 2.4 7.2C2 8.76 2 12 2 12s0 3.24.4 4.8a2.5 2.5 0 0 0 1.76 1.77C5.7 19 12 19 12 19s6.3 0 7.84-.43a2.5 2.5 0 0 0 1.76-1.77C22 15.24 22 12 22 12s0-3.24-.4-4.8ZM10 15V9l5.2 3L10 15Z" />
    </svg>
  );
}

function Logo({ dark = false, large = false, compact = false }: { dark?: boolean; large?: boolean; compact?: boolean }) {
  const size = compact ? 86 : large ? 180 : 84;

  return (
    <div className="flex items-center justify-center">
      <Image
        src="/images/logo.png"
        alt="iTapIn"
        width={size}
        height={size}
        className="shrink-0 object-contain"
        style={{ width: size, height: size }}
      />
    </div>
  );
}

/* ---------- Page ---------- */

export default function ProductLandingPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-white text-slate-900">
      {/* ===== Hero ===== */}
      <section className="relative bg-gradient-to-br from-blue-50 via-white to-blue-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <header className="relative z-20 flex items-center justify-between py-5">
            <Link href="/" aria-label="iTapIn home">
              <Logo />
            </Link>

            <nav className="hidden items-center gap-8 text-sm font-medium text-slate-700 lg:flex">
              {navItems.map((item) => (
                <button key={item} type="button" className="flex items-center gap-1 transition hover:text-blue-600">
                  {item}
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              ))}
              <Link href="#contact" className="transition hover:text-blue-600">
                Contact
              </Link>
            </nav>

            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="rounded-full border border-blue-600 bg-white px-5 py-2 text-sm font-semibold text-blue-600 transition hover:bg-blue-50"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="hidden rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-blue-600/30 transition hover:bg-blue-700 sm:inline-block"
              >
                Register Organization
              </Link>
            </div>
          </header>

          <div className="relative grid items-center gap-8 pb-16 pt-6 lg:min-h-[520px] lg:grid-cols-2 lg:pb-20">
            {/* Copy */}
            <div className="relative z-10">
              <Pill>Modern HRMS Platform</Pill>

              <h1 className="mt-5 text-4xl font-bold leading-[1.1] tracking-tight text-slate-950 sm:text-5xl xl:text-6xl">
                One Platform.
                <br />
                A <span className="text-blue-600">Stronger</span> Workforce.
              </h1>

              <p className="mt-6 max-w-md text-base leading-7 text-slate-700">
                iTapIn is a complete HR and workforce management solution to help you track attendance, manage
                employees, handle leaves and payroll, and more — all in one place.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-700"
                >
                  Register Organization
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="#features"
                  className="inline-flex items-center gap-3 rounded-full border border-blue-300 bg-white/70 py-1.5 pl-1.5 pr-6 text-sm font-semibold text-blue-700 transition hover:bg-white"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border border-blue-500 text-blue-600">
                    <Play className="h-3.5 w-3.5 fill-current" />
                  </span>
                  Learn More
                </Link>
              </div>
            </div>

            {/* Photo + floating badges */}
            <div className="relative h-[340px] sm:h-[420px] lg:absolute lg:inset-y-0 lg:-right-8 lg:left-[48%] lg:h-auto">
              <div className="relative h-full w-full overflow-hidden rounded-3xl bg-gradient-to-br from-blue-100 to-blue-200 lg:rounded-none lg:rounded-bl-[48px]">
                {/* Put your team photo at /public/images/hero-team.jpg */}
                <Image
                  src="/images/hero-team.jpg"
                  alt="HR team collaborating around a laptop"
                  fill
                  priority
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  className="object-cover object-top"
                />
              </div>

              <div className="absolute left-4 top-6 flex items-center gap-2 rounded-xl bg-white px-4 py-3 shadow-xl shadow-blue-900/10 lg:-left-2 lg:top-2">
                <CheckCircle2 className="h-7 w-7 text-emerald-500" />
                <p className="text-xs font-semibold leading-tight text-slate-800">
                  Attendance
                  <br />
                  On Track
                </p>
              </div>

              <div className="absolute bottom-10 left-4 flex flex-col items-center gap-1 rounded-xl bg-white px-4 py-3 shadow-xl shadow-blue-900/10 lg:-left-6 lg:bottom-14">
                <BarChart3 className="h-9 w-9 text-blue-600" />
                <p className="text-xs font-semibold text-slate-800">HR Insights</p>
              </div>

              <div className="absolute right-4 top-6 flex items-center gap-2 rounded-xl bg-white px-4 py-3 shadow-xl shadow-blue-900/10 lg:right-10 lg:top-12">
                <Users className="h-6 w-6 text-blue-600" />
                <div className="leading-tight">
                  <p className="text-base font-bold text-slate-900">125+</p>
                  <p className="text-[10px] text-slate-500">Employees</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Trusted by ===== */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="-mt-1 flex flex-col items-center gap-6 rounded-2xl bg-blue-50/80 px-6 py-5 md:flex-row md:gap-8">
          <p className="max-w-[10rem] shrink-0 border-slate-300 text-sm font-medium leading-snug text-slate-700 md:border-r md:pr-8">
            Trusted by forward-thinking organizations
          </p>
          <div className="flex flex-1 flex-wrap items-center justify-around gap-x-8 gap-y-4 text-slate-600">
            <span className="flex items-center gap-1.5 text-xl font-semibold tracking-tight">
              <span className="grid h-5 w-5 grid-cols-2 gap-px">
                <i className="bg-slate-600" />
                <i className="bg-slate-600" />
                <i className="bg-slate-600" />
                <i className="bg-slate-600" />
              </span>
              Microsoft
            </span>
            <span className="text-2xl font-medium tracking-tight">Google</span>
            <span className="text-xl font-bold tracking-[0.12em]">ORACLE</span>
            <span className="text-2xl font-black italic">SAP</span>
            <span className="text-2xl font-bold tracking-tight">amazon</span>
          </div>
        </div>
      </section>

      {/* ===== Features ===== */}
      <section id="features" className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="text-center">
          <Pill>Powerful Features</Pill>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
            Everything You Need in <span className="text-blue-600">One Place</span>
          </h2>
          <p className="mt-2 text-sm text-slate-700">
            From attendance to payroll, iTapIn simplifies HR for your organization.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex items-center gap-4 rounded-2xl bg-blue-50/70 p-5">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white text-blue-600 shadow-sm">
                <Icon className="h-7 w-7" strokeWidth={1.75} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">{title}</h3>
                <p className="mt-1 text-sm leading-5 text-slate-600">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== Dashboard preview ===== */}
      <section className="relative overflow-hidden bg-gradient-to-r from-blue-50 via-white to-blue-100/70">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:px-8">
          {/* Mock dashboard */}
          <div className="relative mx-auto w-full max-w-xl [perspective:1400px]">
            <div className="flex overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-blue-900/15 lg:[transform:rotateY(8deg)_rotateX(2deg)]">
              {/* Sidebar */}
              <aside className="hidden w-28 shrink-0 bg-slate-900 p-3 text-slate-300 sm:block">
                <div className="mb-4 flex items-center gap-1.5 text-white">
                  <Image
                    src="/images/logo.png"
                    alt="iTapIn"
                    width={6}
                    height={6}
                    className="object-contain"
                    style={{ width: 6, height: 6 }}
                  />
                  <span className="text-xs font-semibold">iTapIn</span>
                </div>
                <ul className="space-y-1">
                  {sidebarItems.map(({ icon: Icon, label, active }) => (
                    <li
                      key={label}
                      className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-[10px] ${
                        active ? 'bg-blue-600 text-white' : ''
                      }`}
                    >
                      <Icon className="h-3 w-3" />
                      {label}
                    </li>
                  ))}
                </ul>
              </aside>

              {/* Content */}
              <div className="flex-1 bg-slate-50 p-4">
                <p className="text-xs font-semibold text-slate-900">Dashboard</p>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  {[
                    { label: 'Total Employees', value: '248', tint: 'bg-blue-100 text-blue-600' },
                    { label: 'Present Today', value: '226', tint: 'bg-emerald-100 text-emerald-600' },
                    { label: 'On Leave', value: '22', tint: 'bg-rose-100 text-rose-500' },
                  ].map((stat) => (
                    <div key={stat.label} className="rounded-lg border border-slate-100 bg-white p-2.5">
                      <p className="text-[9px] text-slate-500">{stat.label}</p>
                      <div className="mt-1 flex items-center justify-between">
                        <p className="text-lg font-bold text-slate-900">{stat.value}</p>
                        <span className={`flex h-6 w-6 items-center justify-center rounded-full ${stat.tint}`}>
                          <Users className="h-3 w-3" />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-3 grid grid-cols-[1.6fr_1fr] gap-2">
                  <div className="rounded-lg border border-slate-100 bg-white p-3">
                    <div className="flex items-center justify-between text-[9px]">
                      <span className="font-semibold text-slate-800">Attendance Overview</span>
                      <span className="rounded border border-slate-200 px-1.5 py-0.5 text-slate-500">This Month</span>
                    </div>
                    <div className="mt-3 flex h-24 items-end gap-1.5">
                      {chartBars.map((h, i) => (
                        <div
                          key={i}
                          className={`flex-1 rounded-t-sm ${i % 2 === 0 ? 'bg-blue-500' : 'bg-blue-300'}`}
                          style={{ height: `${h}%` }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-100 bg-white p-3">
                    <p className="text-[9px] font-semibold text-slate-800">Quick Actions</p>
                    <ul className="mt-2 space-y-1.5">
                      {quickActions.map(({ icon: Icon, label }) => (
                        <li
                          key={label}
                          className="flex items-center gap-1.5 rounded-md border border-slate-100 px-1.5 py-1.5 text-[9px] text-slate-700"
                        >
                          <Icon className="h-3 w-3 text-blue-600" />
                          {label}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Copy */}
          <div className="lg:pl-8">
            <Pill>Smart Dashboard</Pill>
            <h2 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-slate-950 sm:text-4xl">
              Get Complete <span className="text-blue-600">Visibility</span>
              <br />
              at a Glance
            </h2>
            <p className="mt-4 max-w-md text-base leading-7 text-slate-700">
              Track attendance, monitor team performance, and manage HR operations with an intuitive dashboard
              designed for productivity.
            </p>
            <Link
              href="/login"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-700"
            >
              Explore Dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ===== How it works ===== */}
      <section className="relative overflow-hidden bg-white">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.4fr_0.6fr] lg:px-8">
          <div>
            <div className="text-center">
              <Pill>How It Works</Pill>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
                Get Started in Three Simple Steps
              </h2>
            </div>

            <ol className="mt-10 grid gap-8 md:grid-cols-3">
              {steps.map(({ icon: Icon, title, text }, index) => (
                <li key={title} className="relative">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                      {index + 1}
                    </span>
                    <Icon className="h-6 w-6 text-blue-500" strokeWidth={1.75} />
                    {index < steps.length - 1 && (
                      <span className="ml-2 hidden h-px flex-1 bg-gradient-to-r from-blue-300 to-transparent md:block" />
                    )}
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-slate-900">{title}</h3>
                  <p className="mt-1 max-w-[12rem] text-sm leading-5 text-slate-600">{text}</p>
                </li>
              ))}
            </ol>
          </div>

          {/* Building image — put it at /public/images/city.jpg */}
          <div className="relative h-56 overflow-hidden rounded-3xl bg-gradient-to-br from-blue-100 to-blue-200 lg:h-64 lg:rounded-tl-[80px] lg:rounded-br-none">
            <Image
              src="/images/city.jpg"
              alt="Modern office buildings"
              fill
              sizes="(min-width: 1024px) 30vw, 100vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      {/* ===== Testimonial ===== */}
      <section className="mx-auto max-w-[96rem] px-3 sm:px-4">
        <div className="grid items-center gap-6 rounded-2xl bg-slate-900 px-6 py-8 text-white md:grid-cols-[0.8fr_1.4fr] md:px-10">
          <div className="md:border-r md:border-white/20 md:pr-8">
            <h2 className="text-2xl font-bold">What Our Clients Say</h2>
            <p className="mt-3 max-w-xs text-sm leading-5 text-slate-200">
              Trusted by organizations of all sizes to simplify their HR processes.
            </p>
          </div>

          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-3">
              <span aria-hidden="true" className="-mt-2 text-6xl font-serif leading-none text-blue-500">
                “
              </span>
              <div>
                <p className="text-sm leading-6 text-slate-100">
                  iTapIn has completely transformed the way we manage our team. It&rsquo;s intuitive, reliable, and
                  incredibly easy to use.
                </p>
                <div className="mt-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500 text-sm font-semibold">
                    SM
                  </div>
                  <div className="leading-tight">
                    <p className="text-sm font-semibold">Sarah Mitchell</p>
                    <p className="text-xs text-slate-400">HR Manager, Acme Corp</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                aria-label="Previous testimonial"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/40 transition hover:bg-white/10"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Next testimonial"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/40 transition hover:bg-white/10"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ===== CTA band ===== */}
      <section className="mt-6 bg-gradient-to-r from-blue-700 via-blue-600 to-blue-700">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-4 py-8 sm:px-6 md:flex-row md:items-center lg:px-8">
          <div>
            <h2 className="text-2xl font-bold text-white">Ready to Build a Better Workplace?</h2>
            <p className="mt-1 text-sm text-blue-100">
              Join hundreds of organizations already using iTapIn to manage their HR processes.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-blue-700 shadow-md transition hover:bg-blue-50"
            >
              Register Organization
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center rounded-full border border-white/70 px-8 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* ===== Footer ===== */}
      <footer id="contact" className="bg-slate-900 text-slate-300">
        <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
          <div className="grid gap-10 md:grid-cols-[1.3fr_1fr_1fr_1fr_1fr]">
            <div>
              <Logo dark compact />
            </div>

            {footerColumns.map((col) => (
              <div key={col.title}>
                <h3 className="text-sm font-semibold text-white">{col.title}</h3>
                <ul className="mt-3 space-y-2 text-xs">
                  {col.links.map((label) => (
                    <li key={label}>
                      <Link href="#" className="transition hover:text-white">
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            <div className="flex items-start gap-5 md:justify-end md:pt-2">
              <a href="#" aria-label="LinkedIn" className="text-white transition hover:text-blue-300">
                <LinkedInIcon />
              </a>
              <a href="#" aria-label="X (Twitter)" className="text-white transition hover:text-blue-300">
                <XIcon />
              </a>
              <a href="#" aria-label="YouTube" className="text-white transition hover:text-blue-300">
                <YouTubeIcon />
              </a>
              <a href="#" aria-label="Email" className="text-white transition hover:text-blue-300">
                <Mail className="h-5 w-5" />
              </a>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-white/10 py-5 text-xs text-slate-300 sm:flex-row sm:items-center">
            <p>© 2026 iTapIn. All rights reserved.</p>
            <div className="flex items-center gap-3">
              <Link href="/privacy" className="transition hover:text-white">
                Privacy Policy
              </Link>
              <span className="h-3 w-px bg-white/30" />
              <Link href="/terms" className="transition hover:text-white">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}