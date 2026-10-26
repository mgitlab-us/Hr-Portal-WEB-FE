'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface FilterChipOption {
  label: string;
  value: string;
  count?: number;
}

interface FilterChipsProps {
  options: FilterChipOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export default function FilterChips({
  options,
  value,
  onChange,
  className,
}: FilterChipsProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={active}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
              active
                ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-700'
            )}
          >
            {option.label}
            {typeof option.count === 'number' && (
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none',
                  active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                )}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
