'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastVariant = 'success' | 'error' | 'info';

type ToastInput = {
  title?: string;
  message: string;
  variant?: ToastVariant;
  duration?: number;
};

type ToastItem = {
  id: number;
  title?: string;
  message: string;
  variant: ToastVariant;
  duration: number;
};

type ToastContextValue = {
  toast: {
    success: (message: string, title?: string) => void;
    error: (message: string, title?: string) => void;
    info: (message: string, title?: string) => void;
  };
  dismiss: (id: number) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

let nextToastId = 0;

const VARIANT_META: Record<
  ToastVariant,
  { title: string; icon: React.ElementType; accent: string; iconClass: string; bar: string }
> = {
  success: {
    title: 'Success',
    icon: CheckCircle2,
    accent: 'border-l-emerald-500',
    iconClass: 'bg-emerald-50 text-emerald-600',
    bar: 'bg-emerald-500',
  },
  error: {
    title: 'Something went wrong',
    icon: AlertCircle,
    accent: 'border-l-rose-500',
    iconClass: 'bg-rose-50 text-rose-600',
    bar: 'bg-rose-500',
  },
  info: {
    title: 'Notice',
    icon: Info,
    accent: 'border-l-blue-500',
    iconClass: 'bg-blue-50 text-blue-600',
    bar: 'bg-blue-500',
  },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const push = useCallback(
    (input: ToastInput) => {
      const variant = input.variant ?? 'info';
      const duration = input.duration ?? (variant === 'error' ? 6000 : 4500);
      const id = ++nextToastId;

      setToasts((current) => [
        ...current.slice(-3),
        {
          id,
          title: input.title,
          message: input.message,
          variant,
          duration,
        },
      ]);

      const timer = setTimeout(() => dismiss(id), duration);
      timers.current.set(id, timer);
    },
    [dismiss]
  );

  useEffect(
    () => () => {
      timers.current.forEach((timer) => clearTimeout(timer));
      timers.current.clear();
    },
    []
  );

  const toast = useMemo(
    () => ({
      success: (message: string, title?: string) =>
        push({ message, title, variant: 'success' }),
      error: (message: string, title?: string) =>
        push({ message, title, variant: 'error' }),
      info: (message: string, title?: string) =>
        push({ message, title, variant: 'info' }),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-4 top-4 z-[120] flex flex-col items-end gap-2 sm:left-auto sm:right-4 sm:w-full sm:max-w-sm"
      >
        {toasts.map((item) => {
          const meta = VARIANT_META[item.variant];
          const Icon = meta.icon;

          return (
            <div
              key={item.id}
              role={item.variant === 'error' ? 'alert' : 'status'}
              className={cn(
                'pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-xl border border-slate-200 border-l-4 bg-white/95 p-4 shadow-xl shadow-slate-900/10 backdrop-blur animate-in slide-in-from-right-5 fade-in duration-200',
                meta.accent
              )}
            >
              <span
                className={cn(
                  'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                  meta.iconClass
                )}
              >
                <Icon size={16} />
              </span>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-800">
                  {item.title ?? meta.title}
                </p>
                <p className="mt-0.5 text-xs leading-5 text-slate-500">
                  {item.message}
                </p>
              </div>

              <button
                type="button"
                onClick={() => dismiss(item.id)}
                aria-label="Dismiss notification"
                className="shrink-0 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <X size={14} />
              </button>

              <span className="absolute inset-x-0 bottom-0 h-0.5 bg-slate-100">
                <span
                  className={cn('block h-full origin-left', meta.bar)}
                  style={{
                    animation: `toast-progress ${item.duration}ms linear forwards`,
                  }}
                />
              </span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
