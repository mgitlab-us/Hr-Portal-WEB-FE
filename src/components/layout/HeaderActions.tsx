'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  Bell,
  User,
  Settings,
  LogOut,
  X,
  AlertTriangle,
  Plane,
  FileCheck,
  Activity,
  CornerDownLeft,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { getNavItems } from '@/components/layout/DashboardLayout';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: 'geofence' | 'leave' | 'correction' | 'notice';
  read: boolean;
}

interface HeaderActionsProps {
  notifications: NotificationItem[];
  onNotificationsChange: (next: NotificationItem[]) => void;
  /** The layout renders the global account menu; pages can hide the local one. */
  showProfile?: boolean;
}

type MenuName = 'search' | 'notifications' | 'profile';

const NOTIFICATION_STYLES: Record<
  NotificationItem['type'],
  { icon: React.ElementType; color: string; bg: string }
> = {
  geofence: { icon: AlertTriangle, color: '#B91C1C', bg: '#FEE2E2' },
  leave: { icon: Plane, color: '#2563EB', bg: '#EFF6FF' },
  correction: { icon: FileCheck, color: '#7C3AED', bg: '#F5F3FF' },
  notice: { icon: Activity, color: '#1D4ED8', bg: '#DBEAFE' },
};

const POPOVER =
  'absolute right-0 top-full z-50 mt-3 overflow-hidden rounded-2xl border border-line bg-white shadow-[0_12px_40px_rgba(15,27,77,0.14)] max-sm:fixed max-sm:inset-x-3 max-sm:top-16 max-sm:mt-0';

const MENU_ITEM =
  'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-ink transition-colors hover:bg-[#F1F5FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/40';

function formatRole(role?: string | null) {
  if (!role) return 'Admin';
  return role
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getInitials(name?: string | null) {
  const initials = (name || '')
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return initials || 'A';
}

export default function HeaderActions({
  notifications,
  onNotificationsChange,
  showProfile = true,
}: HeaderActionsProps) {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [openMenu, setOpenMenu] = React.useState<MenuName | null>(null);
  const [query, setQuery] = React.useState('');

  const unreadCount = notifications.filter((n) => !n.read).length;
  const results = getNavItems(user?.role).filter((item) =>
    item.label.toLowerCase().includes(query.trim().toLowerCase())
  );

  // Close any open menu on Escape
  React.useEffect(() => {
    if (!openMenu) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenMenu(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [openMenu]);

  const close = () => {
    setOpenMenu(null);
    setQuery('');
  };

  const toggle = (menu: MenuName) => {
    setQuery('');
    setOpenMenu((current) => (current === menu ? null : menu));
  };

  const handleToggleNotifications = () => {
    // Opening the panel marks everything as read
    if (openMenu !== 'notifications' && unreadCount > 0) {
      onNotificationsChange(notifications.map((n) => ({ ...n, read: true })));
    }
    toggle('notifications');
  };

  const go = (href: string) => {
    close();
    router.push(href);
  };

  const handleLogout = () => {
    close();
    logout();
    router.replace('/login');
  };

  return (
    <div className="relative z-20 flex items-center gap-1.5 sm:gap-3">
      {/* Backdrop — sits below the buttons so switching menus takes one click */}
      {openMenu && <div className="fixed inset-0 z-40" onClick={close} aria-hidden="true" />}

      {/* ── Quick search */}
      <div className="relative z-50">
        <button
          onClick={() => toggle('search')}
          aria-label="Search pages"
          aria-expanded={openMenu === 'search'}
          className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#DCE8FF] text-[#2563EB] transition-colors hover:bg-[#CFE0FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/50"
        >
          <Search size={18} />
        </button>

        {openMenu === 'search' && (
          <div className={`${POPOVER} sm:w-72`}>
            <div className="flex items-center gap-2.5 border-b border-line px-4 py-3">
              <Search size={15} className="flex-shrink-0 text-ink-faint" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && results[0]) go(results[0].href);
                }}
                placeholder="Jump to a page…"
                className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
              />
              {query && results[0] && <CornerDownLeft size={13} className="flex-shrink-0 text-ink-faint" />}
            </div>
            <div className="max-h-72 overflow-y-auto p-1.5">
              {results.length > 0 ? (
                results.map((item) => (
                  <button key={item.href} onClick={() => go(item.href)} className={MENU_ITEM}>
                    <item.icon size={16} className="text-ink-soft" />
                    {item.label}
                  </button>
                ))
              ) : (
                <p className="px-3 py-6 text-center text-sm text-ink-faint">No pages match “{query}”</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Notifications */}
      <div className="relative z-50">
        <button
          onClick={handleToggleNotifications}
          aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
          aria-expanded={openMenu === 'notifications'}
          className="relative flex h-11 w-11 items-center justify-center rounded-full border border-line bg-white text-[#3B4A7A] shadow-sm transition-colors hover:border-[#CFDBF7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/50"
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
          )}
        </button>

        {openMenu === 'notifications' && (
          <div className={`${POPOVER} sm:w-80`}>
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <span className="text-sm font-bold text-ink">Notifications</span>
              {notifications.length > 0 && (
                <button
                  onClick={() => onNotificationsChange([])}
                  className="text-xs font-semibold text-blue-600 transition-colors hover:text-blue-700"
                >
                  Clear all
                </button>
              )}
            </div>

            <div className="max-h-72 divide-y divide-line overflow-y-auto">
              {notifications.length > 0 ? (
                notifications.map((notif) => {
                  const style = NOTIFICATION_STYLES[notif.type] ?? NOTIFICATION_STYLES.notice;
                  const Icon = style.icon;
                  return (
                    <div key={notif.id} className="group relative flex gap-3 p-3.5 transition-colors hover:bg-[#F7F9FF]">
                      <div
                        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl"
                        style={{ backgroundColor: style.bg, color: style.color }}
                      >
                        <Icon size={15} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate pr-5 text-xs font-semibold leading-tight text-ink">{notif.title}</p>
                        <p className="mt-0.5 text-[11px] leading-snug text-ink-soft">{notif.message}</p>
                        <span className="mt-1 block text-[10px] text-ink-faint">
                          {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <button
                        onClick={() => onNotificationsChange(notifications.filter((n) => n.id !== notif.id))}
                        className="absolute right-3 top-3 rounded-md p-1 text-blue-500 transition-colors hover:bg-blue-50 hover:text-blue-700"
                        aria-label="Remove notification"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  );
                })
              ) : (
                <p className="px-4 py-8 text-center text-sm text-ink-faint">No notifications yet</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Profile */}
      {showProfile && (
        <div className="relative z-50">
        <button
          onClick={() => toggle('profile')}
          aria-label="Account menu"
          aria-expanded={openMenu === 'profile'}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1D4ED8] text-[13px] font-bold text-white shadow-sm transition-colors hover:bg-[#1E40AF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/50 focus-visible:ring-offset-2"
        >
          {getInitials(user?.name)}
        </button>

        {openMenu === 'profile' && (
          <div className={`${POPOVER} sm:w-56`}>
            <div className="flex items-center gap-3 border-b border-line px-4 py-3.5">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#1D4ED8] text-xs font-bold text-white">
                {getInitials(user?.name)}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold leading-tight text-ink">{user?.name || 'Administrator'}</p>
                <p className="truncate text-xs text-ink-soft">{formatRole(user?.role)}</p>
              </div>
            </div>

            <div className="space-y-0.5 p-1.5">
              {/* TODO: point Profile at a dedicated profile page once one exists */}
              <Link href="/dashboard/settings" onClick={close} className={MENU_ITEM}>
                <User size={16} className="text-ink-soft" />
                Profile
              </Link>
              <Link href="/dashboard/settings" onClick={close} className={MENU_ITEM}>
                <Settings size={16} className="text-ink-soft" />
                Settings
              </Link>
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-lg bg-rose-50 px-3 py-2.5 text-left text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/50"
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </div>
          </div>
        )}
        </div>
      )}
    </div>
  );
}