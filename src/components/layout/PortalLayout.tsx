'use client';

import React, { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Clock,
  CalendarCheck,
  CalendarDays,
  FileCheck,
  Wallet,
  FileText,
  Megaphone,
  Menu,
  X,
  Building2,
  ChevronsLeft,
  ChevronsRight,
  ArrowRight,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import ForceChangePassword from '@/components/auth/ForceChangePassword';
import ClientOnly from '@/components/shared/ClientOnly';
import UserMenu from '@/components/layout/UserMenu';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── Sidebar theme (identical to DashboardLayout)
const SIDEBAR_GRADIENT = 'linear-gradient(180deg, #0A1642 0%, #10246B 55%, #172F80 100%)';
const ACTIVE_BG = '#2563EB';
const SIDEBAR_STORAGE_KEY = 'tapin-portal-sidebar-collapsed';

// ── Navigation config
export interface PortalNavEntry {
  href: string;
  icon: React.ElementType;
  label: string;
}

export const portalNavItems: PortalNavEntry[] = [
  { href: '/portal', icon: Clock, label: 'Punch Clock' },
  { href: '/portal/attendance', icon: CalendarCheck, label: 'My Attendance' },
  { href: '/portal/leaves', icon: CalendarDays, label: 'Leaves' },
  { href: '/portal/corrections', icon: FileCheck, label: 'Corrections' },
  { href: '/portal/payslips', icon: Wallet, label: 'Payslips' },
  { href: '/portal/documents', icon: FileText, label: 'Documents' },
  { href: '/portal/notices', icon: Megaphone, label: 'Notices' },
];

function isActivePath(pathname: string, href: string) {
  if (href === '/portal') return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

// Reads the persisted rail state once, before first paint
function getInitialCollapsedState(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true';
}

// ── Tooltip shown when the rail is collapsed to icons
const RailTooltip = ({ label }: { label: string }) => (
  <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg bg-[#0A1642] px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg ring-1 ring-white/10 transition-opacity duration-150 group-hover:opacity-100">
    {label}
  </span>
);

interface NavItemProps extends PortalNavEntry {
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

interface PortalSidebarProps {
  pathname: string;
  isAdminRole: boolean;
  onNavClick?: () => void;
  onClose?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  logoUrl?: string | null;
  orgName?: string;
}

const PortalSidebar = ({
  pathname,
  isAdminRole,
  onNavClick,
  onClose,
  collapsed,
  onToggleCollapse,
  logoUrl,
  orgName,
}: PortalSidebarProps) => (
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
            <div className="min-w-0">
              <span className="block truncate text-[17px] font-semibold tracking-tight">
                {orgName || 'TapIn'}
              </span>
              <span className="block text-[11px] font-medium text-[#8FA3D9]">Staff Portal</span>
            </div>
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
        {portalNavItems.map((item) => (
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

      {/* Admin switch link */}
      {isAdminRole && !collapsed && (
        <div className="px-4 pb-2">
          <Link
            href="/dashboard"
            onClick={onNavClick}
            className="flex items-center justify-between rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-[#D6E0FF] transition hover:bg-white/15 hover:text-white"
          >
            <span>Admin Console</span>
            <ArrowRight size={15} />
          </Link>
        </div>
      )}
      {isAdminRole && collapsed && (
        <div className="group relative flex justify-center px-3 pb-2">
          <Link
            href="/dashboard"
            onClick={onNavClick}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 transition hover:bg-white/15"
            aria-label="Switch to Admin Console"
          >
            <ArrowRight size={18} />
          </Link>
          <RailTooltip label="Admin Console" />
        </div>
      )}

      {/* Collapse toggle */}
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

interface PortalLayoutProps {
  children: ReactNode;
}

export default function PortalLayout({ children }: PortalLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuthStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isCollapsed, setIsCollapsed] = React.useState<boolean>(getInitialCollapsedState);

  const authHydrated = React.useSyncExternalStore(
    (onStoreChange) => useAuthStore.persist.onFinishHydration(onStoreChange),
    () => useAuthStore.persist.hasHydrated(),
    () => false
  );

  React.useEffect(() => {
    if (authHydrated && !user) {
      router.replace('/login');
    }
  }, [authHydrated, user, router]);

  // Mobile drawer: close on Escape and lock background scroll while open
  React.useEffect(() => {
    if (!isMobileMenuOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMobileMenuOpen(false);
    };
    const previousOverflow = document.body.style.overflow;

    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileMenuOpen]);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      return next;
    });
  };

  if (!user) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-canvas">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#2563EB]" />
      </div>
    );
  }

  const isAdminRole = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(user.role || '');
  const orgLogo = user.company?.logo ?? null;
  const orgName = user.company?.name ?? 'TapIn';

  // Active section label for the header
  const activeNav = portalNavItems.find((item) => isActivePath(pathname, item.href));
  const sectionLabel = activeNav?.label ?? 'Staff Portal';

  return (
    <div className="flex min-h-dvh bg-canvas">
      <ClientOnly>
        <ForceChangePassword />
      </ClientOnly>

      {/* ── Desktop sidebar */}
      <aside
        suppressHydrationWarning
        style={{ background: SIDEBAR_GRADIENT }}
        className={cn(
          'sticky top-0 hidden h-dvh flex-shrink-0 flex-col transition-[width] duration-200 lg:flex',
          isCollapsed ? 'w-20' : 'w-72'
        )}
      >
        <ClientOnly>
          <PortalSidebar
            pathname={pathname}
            isAdminRole={isAdminRole}
            collapsed={isCollapsed}
            onToggleCollapse={toggleCollapse}
            logoUrl={orgLogo}
            orgName={orgName}
          />
        </ClientOnly>
      </aside>

      {/* ── Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 flex-shrink-0 items-center justify-between gap-3 bg-[linear-gradient(180deg,#0A1642_0%,#10246B_55%,#172F80_100%)] px-4 text-white sm:px-6 lg:border-b lg:border-line lg:bg-canvas/85 lg:bg-none lg:px-8 lg:text-ink lg:backdrop-blur-md">
          <div className="flex min-w-0 items-center gap-3">
            {/* Mobile brand + current section */}
            <div className="flex min-w-0 items-center gap-3 lg:hidden">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#2563EB]">
                {orgLogo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={orgLogo} alt={orgName} className="h-full w-full object-cover" />
                ) : (
                  <Building2 size={18} className="text-white" />
                )}
              </div>
              <span className="truncate text-base font-semibold tracking-tight">{sectionLabel}</span>
            </div>

            {/* Desktop section label */}
            <div className="hidden min-w-0 items-center lg:flex">
              <span className="truncate text-sm font-semibold text-ink">{sectionLabel}</span>
            </div>
          </div>

          <div className="flex flex-shrink-0 items-center gap-2">
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

        {/* Page content: the single place that owns page gutters and max width */}
        <main className="flex-1">
          <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
            {children}
          </div>
        </main>
      </div>

      {/* ── Mobile drawer */}
      {isMobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col shadow-2xl lg:hidden"
            style={{ background: SIDEBAR_GRADIENT }}
          >
            <ClientOnly>
              <PortalSidebar
                pathname={pathname}
                isAdminRole={isAdminRole}
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