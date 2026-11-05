'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { ArrowLeft, CalendarDays, Loader2, Plus } from 'lucide-react';

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

const emptyForm = {
  title: '',
  description: '',
  startsAt: '',
  endsAt: '',
  timezone: 'Asia/Karachi',
};

export default function GroupMeetingsPage() {
  const params = useParams<{ groupId: string }>();
  const [group, setGroup] = useState<TeamGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

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

  const handleCreateMeeting = async () => {
    if (!group || !form.title.trim() || !form.startsAt || !form.endsAt) return;

    try {
      setCreating(true);
      setError(null);
      await api.post(`/groups/${group.id}/meetings`, {
        title: form.title,
        description: form.description,
        startsAt: form.startsAt,
        endsAt: form.endsAt,
        timezone: form.timezone,
      });
      setForm(emptyForm);
      await loadGroup();
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { message?: string } } };
      const message = apiError?.response?.data?.message || 'This meeting overlaps with an existing schedule and cannot be created.';
      setError(message);
      console.error('Failed to create meeting', err);
    } finally {
      setCreating(false);
    }
  };

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
              Loading meetings...
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
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Schedule</p>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">{group.name} meetings</h1>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1.5 text-sm font-medium text-sky-700">
                    <CalendarDays className="h-4 w-4" />
                    {group.meetings.length} planned
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
                  <Link href={`/dashboard/groups/${group.id}/meetings`} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white">
                    Meetings
                  </Link>
                  <Link href={`/dashboard/groups/${group.id}/calendar`} className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200">
                    Calendar
                  </Link>
                  <Link href={`/dashboard/groups/${group.id}/chat`} className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200">
                    Chat
                  </Link>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-lg font-semibold text-slate-900">New meeting</h2>
                  <div className="mt-4 space-y-3">
                    <input
                      value={form.title}
                      onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                      placeholder="Meeting title"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500"
                    />
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                      placeholder="Agenda or notes"
                      rows={3}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500"
                    />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input
                        type="datetime-local"
                        value={form.startsAt}
                        onChange={(e) => setForm((prev) => ({ ...prev, startsAt: e.target.value }))}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500"
                      />
                      <input
                        type="datetime-local"
                        value={form.endsAt}
                        onChange={(e) => setForm((prev) => ({ ...prev, endsAt: e.target.value }))}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500"
                      />
                    </div>
                    <input
                      value={form.timezone}
                      onChange={(e) => setForm((prev) => ({ ...prev, timezone: e.target.value }))}
                      placeholder="Timezone"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500"
                    />
                    {error && (
                      <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                        {error}
                      </div>
                    )}

                    <button
                      onClick={handleCreateMeeting}
                      disabled={creating || !form.title.trim() || !form.startsAt || !form.endsAt}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      Create meeting
                    </button>
                  </div>
                </aside>

                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-lg font-semibold text-slate-900">Upcoming schedule</h2>
                  <div className="mt-4 space-y-3">
                    {group.meetings.length === 0 ? (
                      <p className="text-sm text-slate-500">No meetings scheduled yet.</p>
                    ) : (
                      group.meetings.map((meeting) => (
                        <div key={meeting.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-semibold text-slate-900">{meeting.title}</p>
                              <p className="text-sm text-slate-600">{meeting.description || 'No agenda provided.'}</p>
                            </div>
                            <span className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                              {meeting.timezone || 'Asia/Karachi'}
                            </span>
                          </div>

                          <div className="mt-3 text-sm text-slate-600">
                            <p>Starts: {new Date(meeting.startsAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                            <p>Ends: {new Date(meeting.endsAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              </div>
            </>
          )}
        </div>
      </main>
    </DashboardLayout>
  );
}
