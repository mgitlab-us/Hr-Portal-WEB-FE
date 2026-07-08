'use client';
import React, { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Users, Clock, FileCheck, Plane, Settings, LogOut, Menu, X, History, Calendar, Building2, PanelLeftClose, PanelLeftOpen, BarChart3 } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import ForceChangePassword from '@/components/auth/ForceChangePassword';
import ClientOnly from '@/components/shared/ClientOnly';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── Sidebar's active state — solid bold blue, white text/icon, no dim tint.
const ACTIVE_BG = '#2563EB';
const ACTIVE_TEXT = '#FFFFFF';
const ACTIVE_ICON = '#FFFFFF';
const ACTIVE_DOT = 'rgba(255, 255, 255, 0.75)';

interface NavItemProps {
  href: string;
  icon: React.ElementType;
  label: string;
  active: boolean;
  collapsed?: boolean;
  onClick?: () => void;
}

const NavItem = ({ href, icon: Icon, label, active, collapsed, onClick }: NavItemProps) => (
  <div className="relative group">
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 rounded-xl text-sm transition-all duration-150',
        collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5',
        active
          ? 'font-medium shadow-sm'
          : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100 font-normal'
      )}
      style={active ? { backgroundColor: ACTIVE_BG, color: ACTIVE_TEXT } : undefined}
    >
      <Icon
        size={collapsed ? 18 : 15}
        className="flex-shrink-0"
        style={{ color: active ? ACTIVE_ICON : undefined }}
      />
      {!collapsed && <span className="tracking-tight">{label}</span>}
      {!collapsed && active && (
        <div className="ml-auto w-1 h-1 rounded-full" style={{ backgroundColor: ACTIVE_DOT }} />
      )}
    </Link>

    {/* Tooltip — only relevant when the rail is collapsed to icons */}
    {collapsed && (
      <span className="pointer-events-none absolute left-full top-1/2 ml-2 -translate-y-1/2 whitespace-nowrap rounded-lg bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-sm transition-opacity duration-150 group-hover:opacity-100 z-50">
        {label}
      </span>
    )}
  </div>
);

const baseNavItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Overview' },
  { href: '/dashboard/employees', icon: Users, label: 'Employees' },
  { href: '/dashboard/shifts', icon: History, label: 'Shifts' },
  { href: '/dashboard/attendance', icon: Clock, label: 'Attendance' },
  { href: '/dashboard/analytics', icon: BarChart3, label: 'Analytics' },
  { href: '/dashboard/corrections', icon: FileCheck, label: 'Corrections' },
  { href: '/dashboard/leaves', icon: Plane, label: 'Leaves' },
  { href: '/dashboard/holidays', icon: Calendar, label: 'Holidays' },
  { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
];

const superAdminNavItems = [
  { href: '/dashboard/departments', icon: Building2, label: 'Departments', superAdminOnly: true },
];

interface SidebarUser {
  name?: string | null;
  role?: string | null;
}

interface SidebarProps {
  pathname: string;
  user: SidebarUser | null;
  onLogout: () => void;
  onNavClick?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  logoUrl?: string | null;
  orgName?: string;
}

const Sidebar = ({ pathname, user, onLogout, onNavClick, collapsed, onToggleCollapse, logoUrl, orgName }: SidebarProps) => (
  <div className="flex flex-col h-full">
    {/* Logo */}
    <div
      className={cn(
        'flex items-center border-b border-slate-100 py-5',
        collapsed ? 'justify-center px-2' : 'justify-between px-4'
      )}
    >
      <div className="flex items-center min-w-0">
        <div
          className={cn(
            'rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0 overflow-hidden transition-all',
            collapsed ? 'w-8 h-8' : 'w-9 h-9'
          )}
        >
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={orgName || 'Company logo'} className="w-full h-full object-cover" />
          ) : (
            <Building2 size={collapsed ? 16 : 18} className="text-white" />
          )}
        </div>
      </div>
      {!collapsed && onToggleCollapse && (
        <button
          onClick={onToggleCollapse}
          className="p-1 text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0"
          aria-label="Collapse sidebar"
        >
          <PanelLeftClose size={16} />
        </button>
      )}
    </div>

    {collapsed && onToggleCollapse && (
      <button
        onClick={onToggleCollapse}
        className="mx-auto mt-3 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        aria-label="Expand sidebar"
      >
        <PanelLeftOpen size={18} />
      </button>
    )}

    {/* Nav */}
    <nav className={cn('flex-1 py-4 space-y-0.5 overflow-y-auto', collapsed ? 'px-2' : 'px-3')}>
      {!collapsed && (
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-3 mb-2">
          Menu
        </p>
      )}
      {(() => {
        const navItems = user?.role === 'SUPER_ADMIN'
          ? [
            ...baseNavItems.slice(0, 2),
            ...superAdminNavItems,
            ...baseNavItems.slice(2),
          ]
          : baseNavItems;

        return navItems
          .filter(item => {
            if (user?.role === 'SUPER_ADMIN') {
              // Boss monitors Attendance but doesn't handle Corrections or Leaves
              return !['Corrections', 'Leaves'].includes(item.label);
            }
            // HR Manager (ADMIN) sees everything
            return true;
          })
          .map((item) => (
            <NavItem
              key={item.href}
              {...item}
              active={pathname === item.href}
              onClick={onNavClick}
              collapsed={collapsed}
            />
          ));
      })()}
    </nav>

    {/* User + Logout */}
    <div className={cn('border-t border-slate-100 py-4 space-y-0.5', collapsed ? 'px-2' : 'px-3')}>
      <div
        className={cn(
          'flex items-center gap-2.5 py-2.5 rounded-lg mb-1',
          collapsed ? 'justify-center px-0' : 'px-3'
        )}
      >
        <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-xs font-semibold text-slate-600 flex-shrink-0">
          {user?.name?.charAt(0)?.toUpperCase() || 'A'}
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-700 truncate leading-none">
              {user?.name || 'Administrator'}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wider">
              {user?.role || 'Admin'}
            </p>
          </div>
        )}
      </div>
      <div className="relative group">
        <button
          onClick={onLogout}
          className={cn(
            'w-full flex items-center gap-3 py-2.5 rounded-lg text-sm text-slate-500 hover:text-red-600 hover:bg-red-50 transition-all duration-150',
            collapsed ? 'justify-center px-0' : 'px-3'
          )}
        >
          <LogOut size={collapsed ? 16 : 14} className="flex-shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>
        {collapsed && (
          <span className="pointer-events-none absolute left-full top-1/2 ml-2 -translate-y-1/2 whitespace-nowrap rounded-lg bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-sm transition-opacity duration-150 group-hover:opacity-100 z-50">
            Sign out
          </span>
        )}
      </div>
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

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isCollapsed, setIsCollapsed] = React.useState<boolean>(getInitialCollapsedState);
  const [orgLogo, setOrgLogo] = React.useState<string | null>(null);
  const [orgName, setOrgName] = React.useState<string>('TapIn');

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      return next;
    });
  };

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  // Redirect if not logged in
  React.useEffect(() => {
    if (!user && !localStorage.getItem('auth-storage')) {
      router.replace('/login');
    }
  }, [user, router]);

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
    return () => { cancelled = true; };
  }, [user]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <ClientOnly>
        <ForceChangePassword />
      </ClientOnly>

      {/* ── Desktop Sidebar — collapses to an icon-only rail */}
      <aside
        suppressHydrationWarning
        className={cn(
          'hidden lg:flex flex-col bg-slate-50 border-r border-slate-100 sticky top-0 h-screen flex-shrink-0 transition-all duration-200',
          isCollapsed ? 'w-16' : 'w-56'
        )}
      >
        <ClientOnly>
          <Sidebar
            pathname={pathname}
            user={user}
            onLogout={handleLogout}
            collapsed={isCollapsed}
            onToggleCollapse={toggleCollapse}
            logoUrl={orgLogo}
            orgName={orgName}
          />
        </ClientOnly>
      </aside>

      {/* ── Main */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-slate-100">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center overflow-hidden">
              {orgLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={orgLogo} alt={orgName} className="w-full h-full object-cover" />
              ) : (
                <Building2 size={16} className="text-white" />
              )}
            </div>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors"
          >
            {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* ── Mobile Drawer — always full width, collapse only applies to desktop */}
      {isMobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          {/* Drawer */}
          <div className="fixed inset-y-0 left-0 z-50 w-56 bg-slate-50 border-r border-slate-100 flex flex-col lg:hidden shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center overflow-hidden">
                  {orgLogo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={orgLogo} alt={orgName} className="w-full h-full object-cover" />
                  ) : (
                    <Building2 size={16} className="text-white" />
                  )}
                </div>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <ClientOnly>
                <Sidebar
                  pathname={pathname}
                  user={user}
                  onLogout={handleLogout}
                  onNavClick={() => setIsMobileMenuOpen(false)}
                  logoUrl={orgLogo}
                  orgName={orgName}
                />
              </ClientOnly>
            </div>
          </div>
        </>
      )}
    </div>
  );
}