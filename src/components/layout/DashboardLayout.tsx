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
  Settings,
  Menu,
  X,
  History,
  Calendar,
  Building2,
  ChevronsLeft,
  ChevronsRight,
  BarChart3,
  Megaphone,
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
  { href: '/dashboard/shifts', icon: History, label: 'Shifts' },
  { href: '/dashboard/attendance', icon: Clock, label: 'Attendance' },
  { href: '/dashboard/analytics', icon: BarChart3, label: 'Analytics' },
  { href: '/dashboard/notice-board', icon: Megaphone, label: 'Notice Board' },
  { href: '/dashboard/corrections', icon: FileCheck, label: 'Corrections' },
  { href: '/dashboard/leaves', icon: Plane, label: 'Leaves' },
  { href: '/dashboard/holidays', icon: Calendar, label: 'Holidays' },
  { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
];

const superAdminNavItems: NavEntry[] = [
  { href: '/dashboard/departments', icon: Building2, label: 'Departments' },
];

/**
 * Role-aware nav list, shared by the sidebar and the header quick-search.
 * SUPER_ADMIN monitors Attendance but doesn't handle Corrections or Leaves;
 * HR Manager (ADMIN) sees everything except Departments.
 */
export function getNavItems(role?: string | null): NavEntry[] {
  if (role === 'SUPER_ADMIN') {
    return [
      ...baseNavItems.slice(0, 2),
      ...superAdminNavItems,
      ...baseNavItems.slice(2),
    ].filter((item) => !['Corrections', 'Leaves'].includes(item.label));
  }
  return baseNavItems;
}

function isActivePath(pathname: string, href: string) {
  if (href === '/dashboard') return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
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
        {getNavItems(user?.role).map((item) => (
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
  const [orgLogo, setOrgLogo] = React.useState<string | null>(null);
  const [orgName, setOrgName] = React.useState<string>('TapIn');

  // Wait for Zustand persist hydration before deciding whether a session
  // exists. Checking the raw `auth-storage` key is unreliable: logout writes a
  // null state there, which used to keep the layout stuck on the spinner.
  const authHydrated = React.useSyncExternalStore(
    (onStoreChange) => useAuthStore.persist.onFinishHydration(onStoreChange),
    () => useAuthStore.persist.hasHydrated(),
    () => false
  );

  const activeNav = getNavItems(user?.role).find((item) => isActivePath(pathname, item.href));
  const sectionLabel = activeNav?.label ?? 'Overview';

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      return next;
    });
  };

  // Redirect if not logged in once hydration is settled.
  React.useEffect(() => {
    if (authHydrated && !user) {
      router.replace('/login');
    }
  }, [authHydrated, user, router]);

  // Fetch the organisation's branding (logo + name) once a user is present.
  React.useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const fetchProfile = async () => {
      try {
        const res = await api.get('/attendance/settings/company-profile');
        if (cancelled) return;
        if (res.data?.logo) setOrgLogo(res.data.logo);
        if (res.data?.name) setOrgName(res.data.name);
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