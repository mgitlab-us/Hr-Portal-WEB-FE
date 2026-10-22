'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

export interface DesignationOption {
  id: string;
  name: string;
  departmentId: string;
}

interface DesignationSelectProps {
  departmentId?: string | null;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  legacyLabel?: string | null;
}

const selectClasses =
  'w-full appearance-none bg-white border border-slate-200 rounded-lg py-2.5 px-3 pr-8 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed';

export default function DesignationSelect({
  departmentId,
  value,
  onChange,
  disabled,
  legacyLabel,
}: DesignationSelectProps) {
  const [designations, setDesignations] = useState<DesignationOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!departmentId) return;

    let discarded = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      setDesignations([]);

      try {
        const response = await api.get('/designations', {
          params: { departmentId },
        });
        if (!discarded) {
          setDesignations(Array.isArray(response.data) ? response.data : []);
        }
      } catch (err: unknown) {
        if (!discarded) {
          const requestError = err as { response?: { data?: { message?: string } } };
          setError(
            requestError?.response?.data?.message ||
              'Unable to load designations for this department.'
          );
        }
      } finally {
        if (!discarded) setLoading(false);
      }
    };

    load();

    return () => {
      discarded = true;
    };
  }, [departmentId]);

  const options = departmentId ? designations : [];
  const isDisabled = disabled || !departmentId || loading;

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={isDisabled}
          className={selectClasses}
        >
          <option value="">Unassigned</option>
          {legacyLabel ? (
            <option value="__legacy__">{legacyLabel} (legacy)</option>
          ) : null}
          {options.map((designation) => (
            <option key={designation.id} value={designation.id}>
              {designation.name}
            </option>
          ))}
        </select>
        {loading ? (
          <Loader2
            size={13}
            className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-400"
          />
        ) : (
          <ChevronDown
            size={13}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
        )}
      </div>
      {!departmentId ? (
        <p className="text-[10px] text-slate-400 italic">
          Select a department first
        </p>
      ) : error ? (
        <p className="text-[10px] text-red-500">{error}</p>
      ) : !loading && options.length === 0 ? (
        <p className="text-[10px] text-slate-400 italic">
          No designations configured for this department
        </p>
      ) : null}
    </div>
  );
}
