'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { AlertTriangle, ArrowLeft, CalendarDays, Loader2 } from 'lucide-react';

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

export default function GroupCalendarPage() {
  const params = useParams<{ groupId: string }>();
  const [group, setGroup] = useState<TeamGroup | null>(null);
  const [loading, setLoading] = useState(true);

  const loadGroup = useCallback(async () => {
    try {
      const { data } = await api.get('/groups');
      const found = data.find((item: TeamGroup) => item.id === params.groupId);
      setGroup(found ?? null);
    } catch (error) {
      console.error('Failed to load group calendar', error);
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

  const days = useMemo(() => {
    const now = new Date();
    const result: Array<{ label: string; dateKey: string; meetings: Meeting[] }> = [];

    for (let i = 0; i < 7; i += 1) {
      const date = new Date(now);
      date.setDate(now.getDate() + i);
      date.setHours(0, 0, 0, 0);

      const meetings = (group?.meetings ?? []).filter((meeting) => {
        const start = new Date(meeting.startsAt);
        const end = new Date(meeting.endsAt);
        return start <= date && end >= date;
      });

      result.push({
        label: date.toLocaleDateString('en-US', { weekday: 'short' }),
        dateKey: date.toISOString().slice(0, 10),
        meetings,
      });
    }

    return result;
  }, [group]);

  const busyMembers = useMemo(() => {
    if (!group) return [] as Array<{ name: string; count: number }>;

    const map = new Map<string, number>();

    group.meetings.forEach((meeting) => {
      meeting.attendees.forEach((attendee) => {
        map.set(attendee.name, (map.get(attendee.name) ?? 0) + 1);
      });
    });

    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [group]);

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
              Loading calendar...
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
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Team calendar</p>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">{group.name}</h1>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-700">
                    <CalendarDays className="h-4 w-4" />
                    {group.meetings.length} meetings
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
                  <Link href={`/dashboard/groups/${group.id}/calendar`} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white">
                    Calendar
                  </Link>
                  <Link href={`/dashboard/groups/${group.id}/chat`} className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200">
                    Chat
                  </Link>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-lg font-semibold text-slate-900">Weekly schedule</h2>
                  <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {days.map((day) => (
                      <div key={day.dateKey} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-slate-900">{day.label}</p>
                          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{day.meetings.length}</span>
                        </div>

                        <div className="mt-3 space-y-2">
                          {day.meetings.length === 0 ? (
                            <p className="text-xs text-slate-500">No meetings</p>
                          ) : (
                            day.meetings.map((meeting) => (
                              <div key={meeting.id} className="rounded-xl border border-amber-200 bg-amber-50 p-2">
                                <p className="text-sm font-semibold text-slate-900">{meeting.title}</p>
                                <p className="mt-1 text-[11px] text-slate-600">
                                  {new Date(meeting.startsAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - {' '}
                                  {new Date(meeting.endsAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                    Busy members
                  </div>
                  <div className="mt-4 space-y-3">
                    {busyMembers.length === 0 ? (
                      <p className="text-sm text-slate-500">No busy slots in the current week.</p>
                    ) : (
                      busyMembers.map(({ name, count }) => (
                        <div key={name} className="flex items-center justify-between rounded-2xl bg-slate-50 p-3">
                          <span className="font-medium text-slate-900">{name}</span>
                          <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                            {count} slots
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </aside>
              </div>
            </>
          )}
        </div>
      </main>
    </DashboardLayout>
  );
}
