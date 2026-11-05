'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Megaphone,
  Bell,
  Calendar,
  AlertCircle,
  Loader2,
  Pin,
  Tag,
} from 'lucide-react';

interface NoticeItem {
  id: string;
  title: string;
  content: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  createdAt: string;
  author?: {
    name?: string;
  };
  department?: {
    name?: string;
  };
}

export default function EmployeeNoticeBoardPage() {
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const loadNotices = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await api.get('/notices');
      const payload = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data?.notices)
            ? res.data.notices
            : [];
      setNotices(payload);
    } catch (err: unknown) {
      console.error('Failed to load notices:', err);
      setErrorMsg('Could not load company notices.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadNotices();
  }, [loadNotices]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      
      {/* Header Bar */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
          <Megaphone className="text-blue-600" size={26} />
          <span>Notice Board &amp; Announcements</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Stay informed with official company broadcasts, policy updates, and holiday circulars.
        </p>
      </div>

      {errorMsg && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 flex items-center gap-2 text-sm text-red-800">
          <AlertCircle size={18} className="text-red-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Notices Feed */}
      {loading ? (
        <div className="py-20 text-center text-slate-400">
          <Loader2 size={32} className="animate-spin mx-auto mb-2 text-blue-600" />
          <p className="text-xs font-semibold">Loading announcements...</p>
        </div>
      ) : notices.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400 shadow-xs">
          <Bell size={36} className="mx-auto mb-2 text-slate-300" />
          <p className="text-sm font-bold text-slate-700">No active notices</p>
          <p className="text-xs text-slate-400 mt-0.5">When administration publishes news or alerts, they will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notices.map((notice) => {
            const isUrgent = notice.priority === 'URGENT' || notice.priority === 'HIGH';
            const postDate = new Date(notice.createdAt).toLocaleDateString([], {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });

            return (
              <div
                key={notice.id}
                className={`bg-white rounded-3xl border p-6 shadow-xs transition hover:shadow-md ${
                  isUrgent ? 'border-amber-300 ring-1 ring-amber-100' : 'border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      {isUrgent ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 uppercase tracking-wider">
                          <Pin size={11} />
                          <span>Important Notice</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wider">
                          Announcement
                        </span>
                      )}

                      {notice.department?.name && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                          <Tag size={11} />
                          <span>{notice.department.name}</span>
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                      {notice.title}
                    </h3>
                  </div>

                  <span className="text-xs text-slate-400 whitespace-nowrap flex items-center gap-1">
                    <Calendar size={13} />
                    <span>{postDate}</span>
                  </span>
                </div>

                <div className="mt-3 text-sm text-slate-600 leading-relaxed whitespace-pre-line border-t border-slate-100 pt-3">
                  {notice.content}
                </div>

                {notice.author?.name && (
                  <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between text-xs text-slate-400">
                    <span>Published by {notice.author.name}</span>
                    <span className="text-slate-300">Official Communication</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
