'use client';
import React, { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Clock,
  FileCheck,
  Plane,
  Menu,
  X,
  Building2,
  ChevronsLeft,
  ChevronsRight,
  BarChart3,
  Wrench,
  Megaphone,
  Wallet,
  ScrollText,
  ShieldAlert,
  ArrowRight,
  UserRound,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import ForceChangePassword from '@/components/auth/ForceChangePassword';
import ClientOnly from '@/components/shared/ClientOnly';
import UserMenu from '@/components/layout/UserMenu';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── Sidebar theme
const SIDEBAR_GRADIENT = 'linear-gradient(180deg, #0A1642 0%, #10246B 55%, #172F80 100%)';
const ACTIVE_BG = '#2563EB';

// ── Navigation config
export interface NavEntry {
  href: string;
  icon: React.ElementType;
  label: string;
}

const baseNavItems: NavEntry[] = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Overview' },
  { href: '/dashboard/employees', icon: Users, label: 'Employees' },
  { href: '/dashboard/groups', icon: Users, label: 'Groups' },
  { href: '/dashboard/attendance', icon: Clock, label: 'Attendance' },
  { href: '/dashboard/payroll', icon: Wallet, label: 'Payroll' },
  { href: '/dashboard/analytics', icon: BarChart3, label: 'Analytics' },
  { href: '/dashboard/notice-board', icon: Megaphone, label: 'Notice Board' },
  { href: '/dashboard/corrections', icon: FileCheck, label: 'Corrections' },
  { href: '/dashboard/leaves', icon: Plane, label: 'Leaves' },
  { href: '/dashboard/audit-logs', icon: ScrollText, label: 'Audit Logs' },
  { href: '/dashboard/settings', icon: Wrench, label: 'Company Setup' },
];

const superAdminNavItems: NavEntry[] = [
  { href: '/dashboard/departments', icon: Building2, label: 'Departments' },
];

const adminDepartmentSetupNavItem: NavEntry = {
  href: '/dashboard/settings/departments',
  icon: Building2,
  label: 'Department Setup',
};

const LABEL_TO_FEATURE_KEY: Record<string, string> = {
  Payroll: 'payroll',
  Corrections: 'corrections',
  Leaves: 'leaves',
  'Notice Board': 'noticeBoard',
  Groups: 'groups',
  'Audit Logs': 'auditLogs',
  Analytics: 'analytics',
};

const PATH_TO_FEATURE_KEY: Record<string, string> = {
  '/dashboard/payroll': 'payroll',
  '/dashboard/corrections': 'corrections',
  '/dashboard/leaves': 'leaves',
  '/dashboard/notice-board': 'noticeBoard',
  '/dashboard/groups': 'groups',
  '/dashboard/audit-logs': 'auditLogs',
  '/dashboard/analytics': 'analytics',
  '/dashboard/shifts': 'shifts',
};

/**
 * Role-aware nav list, shared by the sidebar and the header quick-search.
 *
 * - SUPER_ADMIN: company-wide control, including company setup and audit logs.
 * - ADMIN (HR): cross-department employee reads, but payroll/rules/employee
 *   writes are limited to assigned departments. Company setup stays hidden.
 * - MANAGER: team reads plus leave/correction approvals. No payroll, rules,
 *   audit logs, or company setup.
 */
export function getNavItems(
  role?: string | null,
  features?: Record<string, boolean> | null
): NavEntry[] {
  let items: NavEntry[] = [];
  if (role === 'SUPER_ADMIN') {
    items = [
      ...baseNavItems.filter((item) => item.label === 'Overview'),
      ...superAdminNavItems,
      ...baseNavItems.filter((item) =>
        [
          'Attendance',
          'Employees',
          'Groups',
          'Payroll',
          'Analytics',
          'Notice Board',
          'Corrections',
          'Leaves',
          'Audit Logs',
          'Company Setup',
        ].includes(item.label)
      ).sort((a, b) => {
        const order = [
          'Attendance',
          'Employees',
          'Groups',
          'Payroll',
          'Analytics',
          'Notice Board',
          'Corrections',
          'Leaves',
          'Audit Logs',
          'Company Setup',
        ];
        return order.indexOf(a.label) - order.indexOf(b.label);
      }),
    ];
  } else if (role === 'ADMIN') {
    items = [
      ...baseNavItems
        .filter((item) =>
          ['Overview', 'Attendance', 'Employees', 'Groups', 'Analytics', 'Notice Board', 'Corrections', 'Leaves'].includes(
            item.label
          )
        )
        .sort((a, b) => {
          const order = ['Overview', 'Attendance', 'Employees', 'Groups', 'Analytics', 'Notice Board', 'Corrections', 'Leaves'];
          return order.indexOf(a.label) - order.indexOf(b.label);
        }),
      adminDepartmentSetupNavItem,
    ];
  } else if (role === 'MANAGER') {
    items = baseNavItems.filter((item) =>
      ['Overview', 'Employees', 'Attendance', 'Analytics', 'Notice Board', 'Corrections', 'Leaves'].includes(
        item.label
      )
    );
  } else {
    items = baseNavItems.filter((item) => item.label === 'Overview');
  }

  // Filter out any feature disabled for this organization
  if (features) {
    return items.filter((item) => {
      const featKey = LABEL_TO_FEATURE_KEY[item.label];
      if (featKey && features[featKey] === false) {
        return false;
      }
      return true;
    });
  }

  return items;
}

function isActivePath(pathname: string, href: string) {
  if (href === '/dashboard') return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * HR admins and reporting managers also have their own attendance, leave, and
 * correction records. They can switch to the employee portal without logging
 * out; super admins do not participate in attendance and do not need it.
 */
function canUseEmployeePortal(role?: string | null) {
  return role === 'ADMIN' || role === 'MANAGER';
}

/**
 * Strict RBAC route guard for web console dashboard.
 * Prevents unauthorized roles (e.g. MANAGER or ADMIN) from accessing restricted
 * pages (such as /dashboard/payroll, /dashboard/audit-logs, /dashboard/settings)
 * simply by typing the URL.
 */
export function isRouteAllowedForRole(
  pathname: string,
  role?: string | null,
  features?: Record<string, boolean> | null
): boolean {
  if (!role) return false;

  const cleanPath = pathname.split('?')[0].replace(/\/+$/, '') || '/dashboard';

  // Check company module restrictions first (applies to ALL roles in company including SUPER_ADMIN)
  if (features) {
    for (const [routePrefix, featKey] of Object.entries(PATH_TO_FEATURE_KEY)) {
      if (
        (cleanPath === routePrefix || cleanPath.startsWith(`${routePrefix}/`)) &&
        features[featKey] === false
      ) {
        return false;
      }
    }
  }

  if (role === 'SUPER_ADMIN') return true;
  if (role === 'EMPLOYEE') return false;

  // Routes strictly restricted to SUPER_ADMIN only
  const superAdminOnlyRoutes = [
    '/dashboard/payroll',
    '/dashboard/audit-logs',
    '/dashboard/settings',
    '/dashboard/departments',
  ];

  if (
    superAdminOnlyRoutes.some(
      (route) =>
        cleanPath === route ||
        (cleanPath.startsWith(route) && cleanPath !== '/dashboard/settings/departments')
    )
  ) {
    return false;
  }

  // Routes forbidden for MANAGER
  if (role === 'MANAGER') {
    const managerForbiddenRoutes = [
      '/dashboard/settings/departments',
      '/dashboard/groups',
      '/dashboard/shifts',
      '/dashboard/holidays',
    ];
    if (managerForbiddenRoutes.some((route) => cleanPath === route || cleanPath.startsWith(`${route}/`))) {
      return false;
    }
  }

  // Allowed baseline for authenticated dashboard users
  const baseAllowedPrefixes = [
    '/dashboard',
    '/dashboard/attendance',
    '/dashboard/employees',
    '/dashboard/analytics',
    '/dashboard/notice-board',
    '/dashboard/corrections',
    '/dashboard/leaves',
    '/dashboard/profile',
  ];

  if (role === 'ADMIN') {
    baseAllowedPrefixes.push(
      '/dashboard/settings/departments',
      '/dashboard/groups',
      '/dashboard/shifts',
      '/dashboard/holidays'
    );
  }

  return baseAllowedPrefixes.some((prefix) => cleanPath === prefix || cleanPath.startsWith(`${prefix}/`));
}

// ── Tooltip shown when the rail is collapsed to icons
const RailTooltip = ({ label }: { label: string }) => (
  <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg bg-[#0A1642] px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg ring-1 ring-white/10 transition-opacity duration-150 group-hover:opacity-100">
    {label}
  </span>
);

interface NavItemProps extends NavEntry {
  active: boolean;
  collapsed?: boolean;
  onClick?: () => void;
}

const NavItem = ({ href, icon: Icon, label, active, collapsed, onClick }: NavItemProps) => (
  <div className="group relative">
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex items-center rounded-xl text-base transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60',
        collapsed ? 'justify-center py-3' : 'gap-3.5 px-4 py-3',
        active
          ? 'font-semibold text-white shadow-lg shadow-blue-950/40'
          : 'font-medium text-[#D6E0FF] hover:bg-white/10 hover:text-white'
      )}
      style={active ? { backgroundColor: ACTIVE_BG } : undefined}
    >
      <Icon size={20} className="flex-shrink-0" />
      {!collapsed && <span className="tracking-tight">{label}</span>}
    </Link>
    {collapsed && <RailTooltip label={label} />}
  </div>
);

// ── Decorative waves anchored to the bottom of the sidebar
const SidebarWaves = () => (
  <svg
    aria-hidden="true"
    className="pointer-events-none absolute bottom-0 left-0 h-[46%] w-full"
    viewBox="0 0 288 400"
    preserveAspectRatio="none"
  >
    <path
      d="M0 170 C 70 160, 150 70, 288 0 L288 400 L0 400 Z"
      fill="rgba(59, 110, 230, 0.16)"
    />
    <path
      d="M0 290 C 90 240, 190 200, 288 110 L288 400 L0 400 Z"
      fill="rgba(37, 99, 235, 0.14)"
    />
  </svg>
);

interface SidebarUser {
  name?: string | null;
  role?: string | null;
  company?: {
    features?: Record<string, boolean>;
  } | null;
}

interface SidebarProps {
  pathname: string;
  user: SidebarUser | null;
  onNavClick?: () => void;
  onClose?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  logoUrl?: string | null;
  orgName?: string;
}

const Sidebar = ({
  pathname,
  user,
  onNavClick,
  onClose,
  collapsed,
  onToggleCollapse,
  logoUrl,
  orgName,
}: SidebarProps) => (
  <div className="relative flex h-full flex-col overflow-hidden text-white">
    <SidebarWaves />

    <div className="relative z-10 flex h-full flex-col">
      {/* Brand */}
      <div
        className={cn(
          'flex items-center pb-2 pt-6',
          collapsed ? 'justify-center px-2' : 'justify-between px-6'
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#2563EB] shadow-lg shadow-blue-950/40">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={orgName || 'Company logo'} className="h-full w-full object-cover" />
            ) : (
              <Building2 size={20} className="text-white" />
            )}
          </div>
          {!collapsed && (
            <span className="truncate text-[17px] font-semibold tracking-tight">Admin Panel</span>
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#AFC0F0] transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className={cn('sidebar-scroll flex-1 space-y-1 overflow-y-auto pb-4', collapsed ? 'px-3' : 'px-4')}>
        {collapsed ? (
          <div className="h-6" />
        ) : (
          <p className="mb-3 mt-6 px-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#8FA3D9]">
            Menu
          </p>
        )}
        {getNavItems(user?.role, user?.company?.features).map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            active={isActivePath(pathname, item.href)}
            onClick={onNavClick}
            collapsed={collapsed}
          />
        ))}
      </nav>

      {/* Employee self-service switch for dual-role staff */}
      {canUseEmployeePortal(user?.role) && !collapsed && (
        <div className="px-4 pb-2">
          <Link
            href="/portal"
            onClick={onNavClick}
            className="flex items-center justify-between rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-[#D6E0FF] transition hover:bg-white/15 hover:text-white"
          >
            <span className="flex items-center gap-2">
              <UserRound size={16} />
              Employee Portal
            </span>
            <ArrowRight size={15} />
          </Link>
        </div>
      )}
      {canUseEmployeePortal(user?.role) && collapsed && (
        <div className="group relative flex justify-center px-3 pb-2">
          <Link
            href="/portal"
            onClick={onNavClick}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-[#D6E0FF] transition hover:bg-white/15 hover:text-white"
            aria-label="Switch to Employee Portal"
          >
            <UserRound size={18} />
          </Link>
          <RailTooltip label="Employee Portal" />
        </div>
      )}

      {/* Footer */}
      {onToggleCollapse && (
        <div className={cn('space-y-3 pb-6 pt-3', collapsed ? 'px-3' : 'px-6')}>
          {collapsed ? (
            <div className="group relative flex justify-center">
              <button
                onClick={onToggleCollapse}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                aria-label="Expand sidebar"
              >
                <ChevronsRight size={18} />
              </button>
              <RailTooltip label="Expand sidebar" />
            </div>
          ) : (
            <button
              onClick={onToggleCollapse}
              className="group flex w-full items-center gap-3 rounded-xl text-sm text-[#AFC0F0] transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              aria-label="Collapse sidebar"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 transition-colors group-hover:bg-white/15">
                <ChevronsLeft size={18} className="text-white" />
              </span>
              Collapse sidebar
            </button>
          )}
        </div>
      )}
    </div>
  </div>
);

const SIDEBAR_STORAGE_KEY = 'tapin-sidebar-collapsed';

// Reads the persisted rail state once, before first paint, instead of via an
// effect — avoids a synchronous setState-in-effect and the extra re-render
// that would otherwise flash the expanded rail before collapsing it.
function getInitialCollapsedState(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true';
}

interface DashboardLayoutProps {
  children: ReactNode;
  /** Page-specific controls rendered in the top bar, immediately left of the account menu. */
  headerActions?: ReactNode;
}

export default function DashboardLayout({ children, headerActions }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuthStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isCollapsed, setIsCollapsed] = React.useState<boolean>(getInitialCollapsedState);
  const [profileBranding, setProfileBranding] = React.useState<{
    companyId: string;
    logo: string | null;
    name: string;
  } | null>(null);

  // Prefer the freshly fetched profile for the current company, then fall back
  // to the values already present in the session payload.
  const branding =
    profileBranding && profileBranding.companyId === user?.companyId ? profileBranding : null;
  const orgLogo = branding?.logo ?? user?.company?.logo ?? null;
  const orgName = branding?.name ?? user?.company?.name ?? 'TapIn';

  // Wait for Zustand persist hydration before deciding whether a session
  // exists. Checking the raw `auth-storage` key is unreliable: logout writes a
  // null state there, which used to keep the layout stuck on the spinner.
  const authHydrated = React.useSyncExternalStore(
    (onStoreChange) => useAuthStore.persist.onFinishHydration(onStoreChange),
    () => useAuthStore.persist.hasHydrated(),
    () => false
  );

  const activeNav = getNavItems(user?.role, user?.company?.features).find((item) => isActivePath(pathname, item.href));
  const sectionLabel = activeNav?.label ?? 'Overview';

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      return next;
    });
  };

  // Redirect if not logged in once hydration is settled.
  // Also redirect employees away from admin console to their portal,
  // and redirect unauthorized roles or restricted modules away from dashboard pages.
  React.useEffect(() => {
    if (!authHydrated || !user) {
      if (authHydrated && !user) router.replace('/login');
      return;
    }

    if (user.role === 'EMPLOYEE') {
      router.replace('/portal');
      return;
    }

    if (!isRouteAllowedForRole(pathname, user.role, user?.company?.features)) {
      router.replace('/dashboard');
    }
  }, [authHydrated, user, pathname, router]);

  // Refresh branding from the settings endpoint for admins only. Managers get
  // a 403 from that admin-guarded route, so they use the session payload.
  React.useEffect(() => {
    if (!user) return;
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') return;
    let cancelled = false;
    const fetchProfile = async () => {
      try {
        const res = await api.get('/attendance/settings/company-profile');
        if (cancelled) return;
        setProfileBranding({
          companyId: user.companyId || '',
          logo: res.data?.logo ?? null,
          name: res.data?.name || user.company?.name || 'TapIn',
        });
      } catch (err) {
        console.error(err);
      }
    };
    fetchProfile();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#2563EB]" />
      </div>
    );
  }

  const routeAllowed = isRouteAllowedForRole(pathname, user.role, user?.company?.features);

  if (!routeAllowed) {
    const isFeatureRestricted =
      user?.company?.features &&
      Object.entries(PATH_TO_FEATURE_KEY).some(
        ([prefix, featKey]) => pathname.startsWith(prefix) && user.company?.features?.[featKey] === false
      );

    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas p-4 font-sans">
        <div className="flex flex-col items-center gap-3 p-8 bg-white rounded-3xl shadow-xl border border-line max-w-sm text-center">
          <div className="h-14 w-14 rounded-2xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center shadow-xs">
            <ShieldAlert size={28} />
          </div>
          <div>
            <h2 className="text-lg font-black text-ink tracking-tight">Access Restricted</h2>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              {isFeatureRestricted
                ? 'This module has been restricted for your organization. Please contact your platform administrator. Redirecting to your dashboard…'
                : `Your role (${user.role}) does not have permission to access this page. Redirecting to your dashboard…`}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-canvas">
      <ClientOnly>
        <ForceChangePassword />
      </ClientOnly>

      {/* ── Desktop sidebar — collapses to an icon-only rail */}
      <aside
        suppressHydrationWarning
        style={{ background: SIDEBAR_GRADIENT }}
        className={cn(
          'sticky top-0 hidden h-screen flex-shrink-0 flex-col transition-[width] duration-200 lg:flex',
          isCollapsed ? 'w-20' : 'w-72'
        )}
      >
        <ClientOnly>
          <Sidebar
            pathname={pathname}
            user={user}
            collapsed={isCollapsed}
            onToggleCollapse={toggleCollapse}
            logoUrl={orgLogo}
            orgName={orgName}
          />
        </ClientOnly>
      </aside>

      {/* ── Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar — one header for mobile + desktop, account menu always top-right */}
        <header className="sticky top-0 z-30 flex h-16 flex-shrink-0 items-center justify-between gap-3 bg-[linear-gradient(180deg,#0A1642_0%,#10246B_55%,#172F80_100%)] px-4 text-white lg:border-b lg:border-line lg:bg-canvas/85 lg:bg-none lg:px-7 lg:text-ink lg:backdrop-blur-md">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex min-w-0 items-center gap-3 lg:hidden">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#2563EB]">
                {orgLogo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={orgLogo} alt={orgName} className="h-full w-full object-cover" />
                ) : (
                  <Building2 size={18} className="text-white" />
                )}
              </div>
              <span className="truncate text-base font-semibold tracking-tight">Admin Panel</span>
            </div>

            <div className="hidden min-w-0 items-center lg:flex">
              <span className="truncate text-sm font-semibold text-ink">{sectionLabel}</span>
            </div>
          </div>

          <div className="flex flex-shrink-0 items-center gap-2">
            {headerActions}
            <UserMenu variant="auto" />
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="rounded-lg p-2 text-[#D6E0FF] transition-colors hover:bg-white/10 hover:text-white lg:hidden"
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>

      {/* ── Mobile drawer — always full width, collapse only applies to desktop */}
      {isMobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div
            className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col shadow-2xl lg:hidden"
            style={{ background: SIDEBAR_GRADIENT }}
          >
            <ClientOnly>
              <Sidebar
                pathname={pathname}
                user={user}
                onNavClick={() => setIsMobileMenuOpen(false)}
                onClose={() => setIsMobileMenuOpen(false)}
                logoUrl={orgLogo}
                orgName={orgName}
              />
            </ClientOnly>
          </div>
        </>
      )}
    </div>
  );
}