'use client';

import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { ArrowLeft, CalendarDays, Loader2, MessageSquareText, Users } from 'lucide-react';

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

const tabs = [
  { href: '', label: 'Overview', icon: Users },
  { href: '/members', label: 'Members', icon: Users },
  { href: '/meetings', label: 'Meetings', icon: CalendarDays },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/chat', label: 'Chat', icon: MessageSquareText },
] as const;

export default function GroupOverviewPage() {
  const params = useParams<{ groupId: string }>();
  const pathname = usePathname();
  const [group, setGroup] = useState<TeamGroup | null>(null);
  const [loading, setLoading] = useState(true);

  const loadGroup = useCallback(async () => {
    try {
      const { data } = await api.get('/groups');
      const found = data.find((item: TeamGroup) => item.id === params.groupId);
      setGroup(found ?? null);
    } catch (error) {
      console.error('Failed to load group', error);
    } finally {
      setLoading(false);
    }
  }, [params.groupId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadGroup();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadGroup]);

  const upcomingMeetings = useMemo(
    () => [...(group?.meetings ?? [])].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()).slice(0, 3),
    [group]
  );

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
              Loading group...
            </div>
          ) : !group ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500 shadow-sm">
              Group not found.
            </div>
          ) : (
            <>
              <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-lg font-semibold text-blue-700">
                      {group.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Group overview</p>
                      <h1 className="text-3xl font-bold tracking-tight text-slate-900">{group.name}</h1>
                    </div>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700">
                    <Users className="h-4 w-4" />
                    {group.members.length} members
                  </div>
                </div>
              </header>

              <div className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
                <nav className="flex flex-wrap gap-2">
                  {tabs.map(({ href, label, icon: Icon }) => {
                    const isActive =
                      href === ''
                        ? !pathname.includes('/members') && !pathname.includes('/meetings') && !pathname.includes('/calendar') && !pathname.includes('/chat')
                        : pathname.includes(href);
                    const tabHref = `/dashboard/groups/${params.groupId}${href}`;
                    return (
                      <Link
                        key={label}
                        href={tabHref}
                        className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition ${
                          isActive ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {label}
                      </Link>
                    );
                  })}
                </nav>
              </div>

              <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-lg font-semibold text-slate-900">About this group</h2>
                  <p className="mt-3 text-slate-600">{group.description || 'No group description yet.'}</p>

                  <div className="mt-6 grid gap-4 sm:grid-cols-3">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Members</p>
                      <p className="mt-3 text-2xl font-bold text-slate-900">{group.members.length}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Meetings</p>
                      <p className="mt-3 text-2xl font-bold text-slate-900">{group.meetings.length}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Status</p>
                      <p className="mt-3 text-lg font-semibold text-emerald-600">Active</p>
                    </div>
                  </div>
                </section>

                <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-lg font-semibold text-slate-900">Members</h2>
                  <div className="mt-4 space-y-3">
                    {group.members.slice(0, 5).map((member) => (
                      <div key={member.employeeId} className="flex items-center justify-between rounded-2xl bg-slate-50 p-3">
                        <div>
                          <p className="font-medium text-slate-900">{member.name}</p>
                          <p className="text-xs text-slate-500">{member.email}</p>
                        </div>
                        <span className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                          {member.role}
                        </span>
                      </div>
                    ))}
                  </div>
                </aside>
              </div>

              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900">Upcoming meetings</h2>
                  <Link href={`/dashboard/groups/${group.id}/meetings`} className="text-sm font-medium text-blue-600 hover:text-blue-700">
                    View all
                  </Link>
                </div>

                <div className="mt-4 space-y-3">
                  {upcomingMeetings.length === 0 ? (
                    <p className="text-sm text-slate-500">No meetings scheduled yet.</p>
                  ) : (
                    upcomingMeetings.map((meeting) => (
                      <div key={meeting.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="font-semibold text-slate-900">{meeting.title}</p>
                            <p className="text-sm text-slate-600">{meeting.description || 'No agenda provided.'}</p>
                          </div>
                          <span className="text-xs font-medium text-slate-500">{meeting.timezone || 'Asia/Karachi'}</span>
                        </div>
                        <p className="mt-2 text-sm text-slate-600">
                          {new Date(meeting.startsAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </>
          )}
        </div>
      </main>
    </DashboardLayout>
  );
}
