'use client';

import React, { useEffect, useState } from 'react';
import {Users,TrendingUp,Activity,UserCheck,UserMinus,Timer,ArrowUpRight,} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { io } from 'socket.io-client';

// ── Stat card
function StatCard({
   label,
   value,
   icon: Icon,
   accent,
   sub,
}: {
   label: string;
   value: string | number;
   icon: React.ElementType;
   accent: string;
   sub?: string;
}) {
   return (
      <div className="group relative bg-white border border-slate-100 rounded-xl p-5 flex flex-col gap-4 hover:shadow-md hover:border-slate-200 transition-all duration-200">
         <div className="flex items-start justify-between">
            <div
               className="w-8 h-8 rounded-lg flex items-center justify-center"
               style={{ backgroundColor: `${accent}14` }}
            >
               <Icon size={15} style={{ color: accent }} />
            </div>
            <ArrowUpRight
               size={13}
               className="text-slate-300 group-hover:text-slate-400 transition-colors"
            />
         </div>
         <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">
               {label}
            </p>
            <p className="text-3xl font-semibold text-slate-800 tracking-tight leading-none">
               {value}
            </p>
            {sub && <p className="text-xs text-slate-400 mt-1.5">{sub}</p>}
         </div>
      </div>
   );
}

// ── Pulse status badge
function StatusBadge({ action }: { action: string }) {
   const lower = action?.toLowerCase() || '';
   if (lower.includes('late'))
      return (
         <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-md">
            Late
         </span>
      );
   if (lower.includes('absent') || lower.includes('missing'))
      return (
         <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-md">
            Absent
         </span>
      );
   if (lower.includes('check') || lower.includes('in'))
      return (
         <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md">
            On time
         </span>
      );
   return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md">
         {action}
      </span>
   );
}

const AVATAR_COLORS = [
   '#6366F1', '#0D9E7A', '#F59E0B', '#E8405A', '#8B5CF6', '#2563EB',
];
function avatarColor(name: string) {
   return AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];
}

type PulseItem = {
   name?: string;
   action: string;
   time?: string;
   color?: string;
   companyId?: string;
};

export default function DashboardOverview() {
   const { user } = useAuthStore();
   const [stats, setStats] = useState({
      overallAttendance: 0,
      present: 0,
      total: 0,
      absent: 0,
      late: 0,
      avgWorkHours: '0.0',
   });
   const [pulse, setPulse] = useState<PulseItem[]>([]);

   useEffect(() => {
      if (!user?.companyId || user?.mustChangePassword) return;

      const fetchDashboard = async () => {
         try {
            const [statsRes, pulseRes] = await Promise.all([
               api.get('/attendance/stats/company'),
               api.get('/attendance/stats/company-pulse'),
            ]);
            setStats(statsRes.data);
            setPulse(pulseRes.data);
         } catch (err) {
            console.error('Overview data fetch failed:', err);
         }
      };

      fetchDashboard();

      const socketUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000').replace(/\/api\/v1$/, '');
      const socket = io(socketUrl, {
         auth: { companyId: user.companyId },
         transports: ['websocket'],
      });

      socket.on('connect_error', (err) => {
         console.error('Socket connection error:', err);
      });

      socket.on('activity:pulse', (data) => {
         if (data.companyId !== user.companyId) return;
         setPulse((prev) => [data, ...prev].slice(0, 8));
         fetchDashboard();
      });

      return () => {
         socket.disconnect();
      };
   }, [user]);

   const today = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
   });

   return (
      <DashboardLayout>
         <div className="min-h-screen bg-slate-50 p-6 lg:p-8 space-y-6">

            {/* ── Header */}
            <div className="flex items-start justify-between">
               <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">
                     Admin · Command Center
                  </p>
                  <h1 className="text-2xl font-semibold text-slate-800 tracking-tight">
                     Dashboard
                  </h1>
                  <p className="text-sm text-slate-400 mt-0.5">{today}</p>
               </div>
               <div className="flex items-center gap-2 bg-white border border-slate-100 rounded-lg px-3 py-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                     Live
                  </span>
               </div>
            </div>

            {/* ── Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
               <StatCard
                  label="Total Staff"
                  value={stats.total}
                  icon={Users}
                  accent="#6366F1"
                  sub="Active personnel"
               />
               <StatCard
                  label="Present Today"
                  value={stats.present}
                  icon={UserCheck}
                  accent="#0D9E7A"
                  sub={`${Math.round(stats.overallAttendance)}% attendance`}
               />
               <StatCard
                  label="Late Arrivals"
                  value={stats.late}
                  icon={Timer}
                  accent="#F59E0B"
                  sub="Flagged today"
               />
               <StatCard
                  label="Absent"
                  value={stats.absent}
                  icon={UserMinus}
                  accent="#E8405A"
                  sub="Not checked in"
               />
            </div>

            {/* ── Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

               {/* Live Activity */}
               <div className="lg:col-span-2 bg-white border border-slate-100 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
                     <div>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-0.5">
                           Real-time
                        </p>
                        <h2 className="text-sm font-semibold text-slate-700">
                           Staff Activity
                        </h2>
                     </div>
                     <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                           Listening
                        </span>
                     </div>
                  </div>

                  {pulse.length > 0 ? (
                     <div className="divide-y divide-slate-50">
                        {pulse.map((item, i) => {
                           const color = item.color || avatarColor(item.name || '');
                           return (
                              <div
                                 key={i}
                                 className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50/60 transition-colors"
                              >
                                 <div
                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
                                    style={{ backgroundColor: color }}
                                 >
                                    {item.name?.charAt(0)?.toUpperCase()}
                                 </div>
                                 <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-700 truncate">
                                       {item.name}
                                    </p>
                                    <p className="text-xs text-slate-400 truncate">
                                       {item.action}
                                    </p>
                                 </div>
                                 <div className="flex items-center gap-3 flex-shrink-0">
                                    <StatusBadge action={item.action} />
                                    <span className="text-xs font-medium text-slate-400 tabular-nums w-14 text-right">
                                       {item.time}
                                    </span>
                                 </div>
                              </div>
                           );
                        })}
                     </div>
                  ) : (
                     <div className="flex flex-col items-center justify-center py-16 text-slate-300">
                        <Activity size={28} className="mb-3" />
                        <p className="text-xs font-medium text-slate-400">
                           Awaiting activity…
                        </p>
                     </div>
                  )}
               </div>

               {/* Attendance Rate */}
               <div className="space-y-4">
                  <div className="bg-white border border-slate-100 rounded-xl p-5">
                     <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">
                        Monthly Pulse
                     </p>
                     <h2 className="text-sm font-semibold text-slate-700 mb-5">
                        Attendance Rate
                     </h2>

                     <div className="flex items-end gap-2 mb-4">
                        <span className="text-4xl font-semibold text-slate-800 tracking-tight leading-none">
                           {stats.overallAttendance}
                        </span>
                        <span className="text-lg font-medium text-slate-400 mb-0.5">%</span>
                     </div>

                     {/* Progress bar */}
                     <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mb-3">
                        <div
                           className="h-full bg-indigo-500 rounded-full transition-all duration-700"
                           style={{ width: `${stats.overallAttendance}%` }}
                        />
                     </div>

                     <p className="text-xs text-slate-400">
                        Average on-time arrival rate this month
                     </p>

                     <div className="mt-4 pt-4 border-t border-slate-50 flex items-center gap-1.5">
                        <TrendingUp size={12} className="text-emerald-500" />
                        <span className="text-xs font-medium text-slate-500">
                           +4% vs previous cycle
                        </span>
                     </div>
                  </div>

                  {/* Avg Work Hours */}
                  <div className="bg-white border border-slate-100 rounded-xl p-5">
                     <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">
                        Productivity
                     </p>
                     <h2 className="text-sm font-semibold text-slate-700 mb-4">
                        Avg. Work Hours
                     </h2>
                     <div className="flex items-end gap-1.5">
                        <span className="text-4xl font-semibold text-slate-800 tracking-tight leading-none">
                            {stats.avgWorkHours}
                        </span>
                     </div>
                     <p className="text-xs text-slate-400 mt-2">Daily team average</p>
                  </div>
               </div>

            </div>
         </div>
      </DashboardLayout>
   );
}