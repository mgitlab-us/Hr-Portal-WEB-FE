'use client';

import React from 'react';

const DEFAULT_INPUT_CLASS =
  'w-full min-w-0 rounded-lg border border-slate-200 bg-white px-2 py-2.5 text-center text-sm font-medium text-slate-800 outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20';

interface DurationInputProps {
  /** Total duration in minutes. */
  value: number;
  /** Receives the new total duration in minutes. */
  onChange: (totalMinutes: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  inputClassName?: string;
  ariaLabel?: string;
}

/**
 * Hours + minutes editor for a duration stored in minutes.
 * Typing 75 into the minutes field normalises to 1h 15m.
 */
export function DurationInput({
  value,
  onChange,
  min = 0,
  max = 24 * 60,
  disabled = false,
  inputClassName = DEFAULT_INPUT_CLASS,
  ariaLabel = 'Duration',
}: DurationInputProps) {
  const safeValue = Math.min(max, Math.max(min, Math.round(Number(value) || 0)));
  const hours = Math.floor(safeValue / 60);
  const minutes = safeValue % 60;

  const commit = (nextHours: number, nextMinutes: number) => {
    const total = nextHours * 60 + nextMinutes;
    onChange(Math.min(max, Math.max(0, total)));
  };

  const parsePart = (raw: string) => {
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
  };

  return (
    <div className="flex items-center gap-1.5">
      <input
        type="number"
        min={0}
        max={Math.floor(max / 60)}
        value={hours}
        disabled={disabled}
        aria-label={`${ariaLabel} hours`}
        onChange={(event) => commit(parsePart(event.target.value), minutes)}
        className={inputClassName}
      />
      <span className="text-[11px] font-semibold text-slate-400">h</span>
      <input
        type="number"
        min={0}
        max={59}
        value={minutes}
        disabled={disabled}
        aria-label={`${ariaLabel} minutes`}
        onChange={(event) => commit(hours, parsePart(event.target.value))}
        className={inputClassName}
      />
      <span className="text-[11px] font-semibold text-slate-400">m</span>
    </div>
  );
}
