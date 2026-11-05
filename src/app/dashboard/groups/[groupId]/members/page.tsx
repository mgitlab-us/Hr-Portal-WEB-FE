'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { ArrowLeft, Loader2, Plus, Users } from 'lucide-react';

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

export default function GroupMembersPage() {
  const params = useParams<{ groupId: string }>();
  const [group, setGroup] = useState<TeamGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [adding, setAdding] = useState(false);

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

  const handleAddMember = async () => {
    if (!group || !email.trim()) return;

    try {
      setAdding(true);
      await api.post(`/groups/${group.id}/members`, { email });
      setEmail('');
      const { data } = await api.get('/groups');
      const found = data.find((item: TeamGroup) => item.id === params.groupId);
      setGroup(found ?? null);
    } catch (error) {
      console.error('Failed to add member', error);
    } finally {
      setAdding(false);
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
              Loading members...
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
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Group members</p>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">{group.name}</h1>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700">
                    <Users className="h-4 w-4" />
                    {group.members.length} members
                  </div>
                </div>
              </header>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap gap-2">
                  <Link href={`/dashboard/groups/${group.id}`} className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200">
                    Overview
                  </Link>
                  <Link href={`/dashboard/groups/${group.id}/members`} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white">
                    Members
                  </Link>
                  <Link href={`/dashboard/groups/${group.id}/meetings`} className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200">
                    Meetings
                  </Link>
                  <Link href={`/dashboard/groups/${group.id}/chat`} className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200">
                    Chat
                  </Link>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-lg font-semibold text-slate-900">Members</h2>
                  <div className="mt-4 space-y-3">
                    {group.members.map((member) => (
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
                </section>

                <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-lg font-semibold text-slate-900">Invite member</h2>
                  <div className="mt-4 space-y-3">
                    <input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="employee@email.com"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500"
                    />
                    <button
                      onClick={handleAddMember}
                      disabled={adding || !email.trim()}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      Add member
                    </button>
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
