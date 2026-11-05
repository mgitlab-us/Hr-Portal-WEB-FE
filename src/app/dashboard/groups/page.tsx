'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { ArrowRight, Loader2, Plus, Users } from 'lucide-react';

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

export default function GroupsPage() {
  const [groups, setGroups] = useState<TeamGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const loadGroups = useCallback(async () => {
    try {
      const { data } = await api.get('/groups');
      setGroups(data);
    } catch (error) {
      console.error('Failed to load groups', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadGroups();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadGroups]);

  const handleCreateGroup = async () => {
    if (!name.trim()) return;

    try {
      setCreating(true);
      await api.post('/groups', {
        name,
        description,
      });
      setName('');
      setDescription('');
      await loadGroups();
    } finally {
      setCreating(false);
    }
  };

  return (
    <DashboardLayout>
      <main className="min-h-screen bg-slate-100 p-6 text-slate-900">
        <div className="mx-auto max-w-7xl space-y-6">
          <header className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Team collaboration</p>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">Groups</h1>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 shadow-sm ring-1 ring-slate-200">
              <Users className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-slate-700">{groups.length} groups</span>
            </div>
          </header>

          <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
            <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">Create group</h2>
              <div className="space-y-3">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Group name"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500"
                />
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Short description"
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500"
                />
                <button
                  onClick={handleCreateGroup}
                  disabled={creating || !name.trim()}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Create group
                </button>
              </div>
            </aside>

            <section className="space-y-4">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">Your groups</h2>
              </div>

              {loading ? (
                <div className="flex items-center gap-2 rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading groups...
                </div>
              ) : groups.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500 shadow-sm">
                  No groups yet. Create one to get started.
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {groups.map((group) => (
                    <Link
                      key={group.id}
                      href={`/dashboard/groups/${group.id}`}
                      className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-sm font-semibold text-blue-700">
                            {group.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-900">{group.name}</h3>
                            <p className="text-xs text-slate-500">{group.members.length} members</p>
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:text-blue-600" />
                      </div>

                      <p className="mt-4 line-clamp-3 text-sm text-slate-600">
                        {group.description || 'No description yet.'}
                      </p>

                      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-500">
                        <span>{group.meetings.length} meetings</span>
                        <span>Open</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </DashboardLayout>
  );
}
