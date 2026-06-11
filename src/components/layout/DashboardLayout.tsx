'use client';
import React, { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {LayoutDashboard,Users,Clock,FileCheck,Plane,BarChart3,Settings,LogOut,ShieldCheck,Menu,X,History} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import ForceChangePassword from '@/components/auth/ForceChangePassword';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface NavItemProps {
  href: string;
  icon: React.ElementType;
  label: string;
  active: boolean;
  onClick?: () => void;
}

const NavItem = ({ href, icon: Icon, label, active, onClick }: NavItemProps) => (
  <Link
    href={href}
    onClick={onClick}
    className={cn(
      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150',
      active
        ? 'bg-white text-slate-800 font-medium shadow-sm'
        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100 font-normal'
    )}
  >
    <Icon
      size={15}
      className={cn(
        'flex-shrink-0',
        active ? 'text-slate-700' : 'text-slate-400'
      )}
    />
    <span className="tracking-tight">{label}</span>
    {active && (
      <div className="ml-auto w-1 h-1 rounded-full bg-indigo-500" />
    )}
  </Link>
);

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Overview' },
  { href: '/dashboard/employees', icon: Users, label: 'Employees' },
  { href: '/dashboard/shifts', icon: History, label: 'Shifts' },
  { href: '/dashboard/attendance', icon: Clock, label: 'Attendance' },
  { href: '/dashboard/corrections', icon: FileCheck, label: 'Corrections' },
  { href: '/dashboard/leaves', icon: Plane, label: 'Leaves' },
  { href: '/dashboard/reports', icon: BarChart3, label: 'Reports' },
  { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
];

// ── 1. Sidebar is now declared completely outside of the main component function ──
interface SidebarProps {
  pathname: string;
  user: any; // Replace with your exact User type if available
  onLogout: () => void;
  onNavClick?: () => void;
}

const Sidebar = ({ pathname, user, onLogout, onNavClick }: SidebarProps) => (
  <div className="flex flex-col h-full">
    {/* Logo */}
    <div className="flex items-center gap-2.5 px-4 py-5 border-b border-slate-100">
      <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0">
        <ShieldCheck size={14} className="text-white" />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-800 leading-none tracking-tight">
          TapIn
        </p>
        <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-widest font-medium">
          Admin
        </p>
      </div>
    </div>

    {/* Nav */}
    <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-3 mb-2">
        Menu
      </p>
      {navItems
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
          />
        ))}
    </nav>

    {/* User + Logout */}
    <div className="px-3 py-4 border-t border-slate-100 space-y-0.5">
      <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg mb-1">
        <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-xs font-semibold text-slate-600 flex-shrink-0">
          {user?.name?.charAt(0)?.toUpperCase() || 'A'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-700 truncate leading-none">
            {user?.name || 'Administrator'}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wider">
            {user?.role || 'Admin'}
          </p>
        </div>
      </div>
      <button
        onClick={onLogout}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-500 hover:text-red-600 hover:bg-red-50 transition-all duration-150"
      >
        <LogOut size={14} className="flex-shrink-0" />
        <span>Sign out</span>
      </button>
    </div>
  </div>
);

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <ForceChangePassword />

      {/* ── Desktop Sidebar */}
      <aside className="hidden lg:flex w-56 flex-col bg-slate-50 border-r border-slate-100 sticky top-0 h-screen flex-shrink-0">
        {/* ── 2. Pass necessary states and actions as props ── */}
        <Sidebar pathname={pathname} user={user} onLogout={handleLogout} />
      </aside>

      {/* ── Main */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center">
              <ShieldCheck size={13} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-slate-800">TapIn</span>
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

      {/* ── Mobile Drawer */}
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
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center">
                  <ShieldCheck size={13} className="text-white" />
                </div>
                <span className="text-sm font-semibold text-slate-800">TapIn</span>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {/* ── 3. Pass states and the close drawer click action as props ── */}
              <Sidebar 
                pathname={pathname} 
                user={user} 
                onLogout={handleLogout} 
                onNavClick={() => setIsMobileMenuOpen(false)} 
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
