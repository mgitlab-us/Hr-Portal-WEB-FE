'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { ArrowLeft, Loader2, MessageSquareText } from 'lucide-react';

type Member = {
  employeeId: string;
  name: string;
  email: string;
  role: string;
};

type Meeting = {
  id: string;
  title: string;
  description?: string | null;
  startsAt: string;
  endsAt: string;
  timezone?: string;
  attendees: Array<{
    employeeId: string;
    name: string;
    email: string;
    status: string;
  }>;
};

type TeamGroup = {
  id: string;
  name: string;
  description?: string | null;
  members: Member[];
  meetings: Meeting[];
};

export default function GroupChatPage() {
  const params = useParams<{ groupId: string }>();
  const [group, setGroup] = useState<TeamGroup | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadGroup = async () => {
      try {
        const { data } = await api.get('/groups');
        const found = data.find((item: TeamGroup) => item.id === params.groupId);
        setGroup(found ?? null);
      } catch (error) {
        console.error('Failed to load group', error);
      } finally {
        setLoading(false);
      }
    };

    void loadGroup();
  }, [params.groupId]);

  return (
    <DashboardLayout>
      <main className="min-h-screen bg-slate-100 p-6 text-slate-900">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex items-center justify-between gap-3">
            <Link href="/dashboard/groups" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-600">
              <ArrowLeft className="h-4 w-4" />
              Back to groups
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading chat...
            </div>
          ) : !group ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500 shadow-sm">
              Group not found.
            </div>
          ) : (
            <>
              <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Group chat</p>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">{group.name}</h1>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1.5 text-sm font-medium text-violet-700">
                    <MessageSquareText className="h-4 w-4" />
                    Coming soon
                  </div>
                </div>
              </header>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap gap-2">
                  <Link href={`/dashboard/groups/${group.id}`} className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200">
                    Overview
                  </Link>
                  <Link href={`/dashboard/groups/${group.id}/members`} className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200">
                    Members
                  </Link>
                  <Link href={`/dashboard/groups/${group.id}/meetings`} className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200">
                    Meetings
                  </Link>
                  <Link href={`/dashboard/groups/${group.id}/chat`} className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white">
                    Chat
                  </Link>
                </div>
              </div>

              <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
                <MessageSquareText className="mx-auto mb-3 h-8 w-8 text-violet-500" />
                <h2 className="text-xl font-semibold text-slate-900">Group chat is next.</h2>
                <p className="mt-2 text-slate-600">
                  This section will handle direct group messaging, avatars, and threaded conversations after the core structure is in place.
                </p>
              </div>
            </>
          )}
        </div>
      </main>
    </DashboardLayout>
  );
}
