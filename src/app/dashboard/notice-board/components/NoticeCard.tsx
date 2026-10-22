'use client';

import React, { useState } from 'react';
import { Pencil, Trash2, Users, Building2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { NOTICE_TYPE_META, type Notice } from '../types';

interface NoticeCardProps {
  notice: Notice;
  departmentName?: string | null;
  onEdit?: () => void;
  onDelete?: () => void;
}

export default function NoticeCard({
  notice,
  departmentName,
  onEdit,
  onDelete,
}: NoticeCardProps) {
  const [expanded, setExpanded] = useState(false);
  const meta = NOTICE_TYPE_META[notice.type] ?? NOTICE_TYPE_META.ANNOUNCEMENT;
  const isLong = notice.content.length > 220;
  const body = expanded || !isLong ? notice.content : `${notice.content.slice(0, 220).trimEnd()}…`;

  const formattedDate = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(notice.createdAt));

  return (
    <article
      className={cn(
        'group flex h-full flex-col rounded-2xl border border-slate-200 border-l-4 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md',
        meta.border
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <Badge variant="outline" className={cn('gap-1.5 font-semibold', meta.badge)}>
          <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
          {meta.label}
        </Badge>

        {(onEdit || onDelete) && (
          <div className="flex items-center gap-1 opacity-70 transition-opacity group-hover:opacity-100">
            {onEdit && (
              <button
                type="button"
                onClick={onEdit}
                aria-label={`Edit ${notice.title}`}
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <Pencil size={15} />
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={onDelete}
                aria-label={`Delete ${notice.title}`}
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        )}
      </div>

      <h3 className="text-base font-semibold leading-snug tracking-tight text-slate-900">
        {notice.title}
      </h3>
      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-500">{body}</p>

      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="mt-2 w-fit text-xs font-semibold text-blue-600 hover:text-blue-700"
        >
          {expanded ? 'Show less' : 'Read more'}
        </button>
      )}

      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-5 text-[11px] font-medium text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          {notice.departmentId ? <Building2 size={13} /> : <Users size={13} />}
          {notice.departmentId ? departmentName || 'Department' : 'All employees'}
        </span>
        <span>{formattedDate}</span>
      </div>
    </article>
  );
}
