'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, LogOut, Settings, User } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

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

interface UserMenuProps {
  /**
   * `dark` is used on the gradient mobile header, `light` on white surfaces.
   * `auto` renders dark on mobile and light from `lg` upwards.
   */
  variant?: 'light' | 'dark' | 'auto';
}

export default function UserMenu({ variant = 'light' }: UserMenuProps) {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const dark = variant === 'dark';
  const auto = variant === 'auto';

  const triggerClass = auto
    ? 'relative z-50 flex items-center gap-2 rounded-full border border-white/15 bg-white/10 py-1 pl-1 pr-2 transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 lg:gap-2.5 lg:border-line lg:bg-white lg:shadow-sm lg:hover:border-[#CFDBF7] lg:hover:bg-white lg:focus-visible:ring-[#2563EB]/50'
    : dark
      ? 'relative z-50 flex items-center gap-2 rounded-full border border-white/15 bg-white/10 py-1 pl-1 pr-2 transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60'
      : 'relative z-50 flex items-center gap-2.5 rounded-full border border-line bg-white py-1 pl-1 pr-2 shadow-sm transition-colors hover:border-[#CFDBF7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/50';

  const nameColor = auto ? 'text-white lg:text-ink' : dark ? 'text-white' : 'text-ink';
  const roleColor = auto ? 'text-[#AFC0F0] lg:text-ink-soft' : dark ? 'text-[#AFC0F0]' : 'text-ink-soft';
  const chevronColor = auto ? 'text-[#AFC0F0] lg:text-ink-faint' : dark ? 'text-[#AFC0F0]' : 'text-ink-faint';

  // Close on Escape, or on any pointer press outside this menu. A fixed
  // backdrop does not work inside the top bar because `backdrop-blur` makes the
  // header the containing block for fixed children, clipping it to 64px.
  React.useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onPointerDown = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };

    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  const close = () => setOpen(false);

  const handleLogout = () => {
    close();
    logout();
    router.replace('/login');
  };

  return (
    <>
      <div ref={containerRef} className="relative z-50">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label="Account menu"
          className={triggerClass}
        >
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#2563EB] text-xs font-bold text-white">
            {getInitials(user?.name)}
          </span>
          <span className="hidden min-w-0 flex-col text-left md:flex">
            <span className={`max-w-[140px] truncate text-[13px] font-semibold leading-tight ${nameColor}`}>
              {user?.name || 'Administrator'}
            </span>
            <span className={`max-w-[140px] truncate text-[11px] leading-tight ${roleColor}`}>
              {formatRole(user?.role)}
            </span>
          </span>
          <ChevronDown size={15} className={`flex-shrink-0 ${chevronColor}`} />
        </button>

        {open && (
          <div
            role="menu"
            className="absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-2xl border border-line bg-white shadow-[0_12px_40px_rgba(15,27,77,0.14)]"
          >
            <div className="flex items-center gap-3 border-b border-line px-4 py-3.5">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#1D4ED8] text-xs font-bold text-white">
                {getInitials(user?.name)}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold leading-tight text-ink">
                  {user?.name || 'Administrator'}
                </p>
                <p className="truncate text-xs text-ink-soft">{formatRole(user?.role)}</p>
              </div>
            </div>

            <div className="space-y-0.5 p-1.5">
              <button
                type="button"
                onClick={() => {
                  close();
                  if (user?.role === 'EMPLOYEE') {
                    router.push('/portal/profile');
                  } else {
                    router.push('/dashboard/profile');
                  }
                }}
                className={MENU_ITEM}
                role="menuitem"
              >
                <User size={16} className="text-ink-soft" />
                My Profile &amp; Security
              </button>
              {user?.role === 'SUPER_ADMIN' && (
                <button
                  type="button"
                  onClick={() => { close(); router.push('/dashboard/settings'); }}
                  className={MENU_ITEM}
                  role="menuitem"
                >
                  <Settings size={16} className="text-ink-soft" />
                  Company Setup
                </button>
              )}
              <button
                type="button"
                onClick={handleLogout}
                role="menuitem"
                className="flex w-full items-center gap-3 rounded-lg bg-rose-50 px-3 py-2.5 text-left text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/50"
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>

    </>
  );
}
