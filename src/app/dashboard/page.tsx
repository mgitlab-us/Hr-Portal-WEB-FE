'use client';

import React, { useEffect, useState } from 'react';
import { Users, TrendingUp, Activity, UserCheck, UserMinus, Timer, ArrowUpRight, Bell, BellRing, X, AlertTriangle, Plane, FileCheck } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { io } from 'socket.io-client';

// ── Duotone tone system — teal for positive/on-track, coral for attention-needed.
// Every colored surface in the dashboard draws from just these two ramps.
const TONES = {
   teal: { bg: '#E1F5EE', chip: '#9FE1CB', icon: '#0F6E56', accent: '#1D9E75', dark: '#04342C' },
   coral: { bg: '#FAECE7', chip: '#F0997B', icon: '#993C1D', accent: '#D85A30', dark: '#4A1B0C' },
} as const;

type Tone = keyof typeof TONES;

// ── Stat card
function StatCard({
   label,
   value,
   icon: Icon,
   tone,
   sub,
}: {
   label: string;
   value: string | number;
   icon: React.ElementType;
   tone: Tone;
   sub?: string;
}) {
   const t = TONES[tone];
   return (
      <div className="group relative bg-white border border-slate-100 rounded-2xl p-5 flex flex-col gap-4 hover:shadow-md hover:border-slate-200 transition-all duration-200">
         <div className="flex items-start justify-between">
            <div
               className="w-9 h-9 rounded-2xl flex items-center justify-center"
               style={{ backgroundColor: t.bg }}
            >
               <Icon size={15} style={{ color: t.icon }} />
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

// ── Pulse status badge — collapsed to the two-tone system
function StatusBadge({ action }: { action: string }) {
   const lower = action?.toLowerCase() || '';
   if (lower.includes('late'))
      return (
         <span
            className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-0.5 rounded-full"
            style={{ color: TONES.coral.icon, backgroundColor: TONES.coral.bg }}
         >
            Late
         </span>
      );
   if (lower.includes('absent') || lower.includes('missing'))
      return (
         <span
            className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-0.5 rounded-full"
            style={{ color: TONES.coral.icon, backgroundColor: TONES.coral.bg }}
         >
            Absent
         </span>
      );
   if (lower.includes('check') || lower.includes('in'))
      return (
         <span
            className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-0.5 rounded-full"
            style={{ color: TONES.teal.icon, backgroundColor: TONES.teal.bg }}
         >
            On time
         </span>
      );
   return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 bg-slate-50 border border-slate-100 px-2.5 py-0.5 rounded-full">
         {action}
      </span>
   );
}

// ── Avatar tone follows the same status logic as the badge, not a name hash,
// so a person's chip color always matches what happened (teal = fine, coral = flag).
function statusTone(action: string): Tone {
   const lower = action?.toLowerCase() || '';
   if (lower.includes('late') || lower.includes('absent') || lower.includes('missing')) return 'coral';
   return 'teal';
}

type PulseItem = {
   name?: string;
   action: string;
   time?: string;
   color?: string;
   companyId?: string;
};

// ── Circular attendance gauge
function AttendanceRing({ percent }: { percent: number }) {
   const clamped = Math.max(0, Math.min(100, percent));
   const radius = 30;
   const circumference = 2 * Math.PI * radius;
   const offset = circumference * (1 - clamped / 100);
   return (
      <svg width="76" height="76" viewBox="0 0 76 76" className="flex-shrink-0">
         <circle cx="38" cy="38" r={radius} fill="none" stroke={TONES.teal.bg} strokeWidth="8" />
         <circle
            cx="38"
            cy="38"
            r={radius}
            fill="none"
            stroke={TONES.teal.accent}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform="rotate(-90 38 38)"
            style={{ transition: 'stroke-dashoffset 700ms ease' }}
         />
      </svg>
   );
}

interface NotificationItem {
   id: string;
   title: string;
   message: string;
   timestamp: string;
   type: 'geofence' | 'leave' | 'correction' | 'notice';
   read: boolean;
}

export default function DashboardOverview() {
   const { user } = useAuthStore();
   const [stats, setStats] = useState({
      overallAttendance: 0,
      present: 0,
      total: 0,
      absent: 0,
      late: 0,
      onLeave: 0,
      avgWorkHours: '0.0',
      attendanceChange: null as number | null,
   });
   const [pulse, setPulse] = useState<PulseItem[]>([]);
   const [notifications, setNotifications] = useState<NotificationItem[]>([]);
   const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

   useEffect(() => {
      const init = () => {
         const saved = localStorage.getItem('tapin_notifications');
         if (saved) {
            try {
               setNotifications(JSON.parse(saved));
            } catch (e) {
               console.error('Failed to parse notifications:', e);
            }
         }
      };
      init();
   }, []);

   const saveNotifications = (newNotifs: NotificationItem[]) => {
      setNotifications(newNotifs);
      localStorage.setItem('tapin_notifications', JSON.stringify(newNotifs));
   };

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

      const socketUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1').replace(/\/api\/v1$/, '');
      const socket = io(socketUrl, {
         auth: { token: useAuthStore.getState().accessToken },
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

      socket.on('notification:geofence', (data) => {
         const newNotif: NotificationItem = {
            id: data.id || `geofence_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            title: data.title || 'Geofence Alert',
            message: data.message,
            timestamp: data.timestamp || new Date().toISOString(),
            type: 'geofence',
            read: false,
         };
         setNotifications((prev) => {
            const updated = [newNotif, ...prev];
            localStorage.setItem('tapin_notifications', JSON.stringify(updated));
            return updated;
         });
      });

      socket.on('notification:new', (data) => {
         const newNotif: NotificationItem = {
            id: data.id || `notif_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            title: data.title,
            message: data.message,
            timestamp: data.timestamp || new Date().toISOString(),
            type: data.type || 'notice',
            read: false,
         };
         setNotifications((prev) => {
            const updated = [newNotif, ...prev];
            localStorage.setItem('tapin_notifications', JSON.stringify(updated));
            return updated;
         });
      });

      socket.on('notice:new', (data) => {
         const newNotif: NotificationItem = {
            id: data.id || `notice_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            title: 'New Announcement',
            message: data.title,
            timestamp: data.createdAt || new Date().toISOString(),
            type: 'notice',
            read: false,
         };
         setNotifications((prev) => {
            const updated = [newNotif, ...prev];
            localStorage.setItem('tapin_notifications', JSON.stringify(updated));
            return updated;
         });
      });

      return () => {
         socket.disconnect();
      };
   }, [user]);

   const [today] = useState(() =>
      new Date().toLocaleDateString('en-US', {
         weekday: 'long',
         month: 'long',
         day: 'numeric',
         year: 'numeric',
      })
   );

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
               {/* ── Bell Icon / Dropdown */}
               <div className="relative">
                  <button 
                     onClick={() => {
                        setIsNotificationsOpen(!isNotificationsOpen);
                        // Mark all as read when opening
                        const marked = notifications.map(n => ({ ...n, read: true }));
                        saveNotifications(marked);
                     }}
                     className="relative flex items-center justify-center bg-white border border-slate-100 hover:border-slate-200 hover:shadow-sm rounded-full p-2.5 transition-all duration-200 cursor-pointer"
                  >
                     {notifications.some(n => !n.read) ? (
                        <BellRing size={16} className="text-slate-600 animate-bounce" style={{ color: TONES.coral.accent }} />
                     ) : (
                        <Bell size={16} className="text-slate-600" />
                     )}
                     
                     {notifications.filter(n => !n.read).length > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                           {notifications.filter(n => !n.read).length}
                        </span>
                     )}
                  </button>

                  {isNotificationsOpen && (
                     <>
                        {/* Backdrop to close */}
                        <div className="fixed inset-0 z-40" onClick={() => setIsNotificationsOpen(false)} />
                        
                        <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 overflow-hidden py-1">
                           <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100">
                              <span className="text-xs font-bold text-slate-700">Notifications</span>
                              {notifications.length > 0 && (
                                 <button 
                                    onClick={() => saveNotifications([])}
                                    className="text-[10px] font-semibold text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                                 >
                                    Clear all
                                 </button>
                              )}
                           </div>
                           
                           <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                              {notifications.length > 0 ? (
                                 notifications.map((notif) => {
                                     let iconColor: string = TONES.teal.icon;
                                     let iconBg: string = TONES.teal.bg;
                                    
                                    if (notif.type === 'geofence') {
                                       iconColor = TONES.coral.icon;
                                       iconBg = TONES.coral.bg;
                                    } else if (notif.type === 'leave') {
                                       iconColor = '#2563EB';
                                       iconBg = '#EFF6FF';
                                    } else if (notif.type === 'correction') {
                                       iconColor = '#8B5CF6';
                                       iconBg = '#F5F3FF';
                                    }
                                    
                                    return (
                                       <div key={notif.id} className="flex gap-2.5 p-3 hover:bg-slate-50 transition-colors relative group">
                                          <div 
                                             className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0"
                                             style={{ backgroundColor: iconBg, color: iconColor }}
                                          >
                                             {notif.type === 'geofence' ? (
                                                <AlertTriangle size={13} />
                                             ) : notif.type === 'leave' ? (
                                                <Plane size={13} />
                                             ) : notif.type === 'correction' ? (
                                                <FileCheck size={13} />
                                             ) : (
                                                <Activity size={13} />
                                             )}
                                          </div>
                                          
                                          <div className="flex-1 min-w-0">
                                             <p className="text-xs font-semibold text-slate-700 leading-tight truncate pr-4">
                                                {notif.title}
                                             </p>
                                             <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                                                {notif.message}
                                             </p>
                                             <span className="text-[9px] text-slate-400 mt-1 block">
                                                {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                             </span>
                                          </div>
                                          
                                          <button 
                                             onClick={(e) => {
                                                e.stopPropagation();
                                                saveNotifications(notifications.filter(n => n.id !== notif.id));
                                             }}
                                             className="absolute top-3 right-3 text-slate-300 hover:text-slate-500 transition-colors cursor-pointer"
                                             aria-label="Remove notification"
                                          >
                                             <X size={12} />
                                          </button>
                                       </div>
                                    );
                                 })
                              ) : (
                                 <div className="p-6 text-center text-slate-400">
                                    <p className="text-xs">No notifications yet</p>
                                 </div>
                              )}
                           </div>
                        </div>
                     </>
                  )}
               </div>
            </div>

            {/* ── Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
               <StatCard
                  label="Total Staff"
                  value={stats.total}
                  icon={Users}
                  tone="teal"
                  sub="Active personnel"
               />
               <StatCard
                  label="Present Today"
                  value={stats.present}
                  icon={UserCheck}
                  tone="teal"
                  sub={`${Math.round(stats.overallAttendance)}% attendance`}
               />
               <StatCard
                  label="On Leave"
                  value={stats.onLeave}
                  icon={Plane}
                  tone="teal"
                  sub="Approved leave"
               />
               <StatCard
                  label="Late Arrivals"
                  value={stats.late}
                  icon={Timer}
                  tone="coral"
                  sub="Flagged today"
               />
               <StatCard
                  label="Absent"
                  value={stats.absent}
                  icon={UserMinus}
                  tone="coral"
                  sub="Not checked in"
               />
            </div>

            {/* ── Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

               {/* Live Activity */}
               <div className="lg:col-span-2 bg-white border border-slate-100 rounded-2xl overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
                     <div>
                        <h2 className="text-sm font-semibold text-slate-700">
                           Staff Activity
                        </h2>
                     </div>
                     <div className="flex items-center gap-1.5">
                        <div
                           className="w-1.5 h-1.5 rounded-full animate-pulse"
                           style={{ backgroundColor: TONES.teal.accent }}
                        />
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                           Live
                        </span>
                     </div>
                  </div>

                  {pulse.length > 0 ? (
                     <div className="divide-y divide-slate-50">
                        {pulse.map((item, i) => {
                           const tone = TONES[statusTone(item.action)];
                           return (
                              <div
                                 key={i}
                                 className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50/60 transition-colors"
                              >
                                 <div
                                    className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
                                    style={{ backgroundColor: tone.accent }}
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
                  <div className="bg-white border border-slate-100 rounded-2xl p-5">
                     <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">
                        Monthly Pulse
                     </p>
                     <h2 className="text-sm font-semibold text-slate-700 mb-5">
                        Attendance Rate
                     </h2>

                     <div className="flex items-center gap-5 mb-1">
                        <AttendanceRing percent={stats.overallAttendance} />
                        <div>
                           <div className="flex items-end gap-1">
                              <span className="text-3xl font-semibold text-slate-800 tracking-tight leading-none">
                                 {stats.overallAttendance}
                              </span>
                              <span className="text-base font-medium text-slate-400 mb-0.5">%</span>
                           </div>
                           <p className="text-xs text-slate-400 mt-1.5">
                              On-time arrivals this month
                           </p>
                        </div>
                     </div>

                     <div className="mt-4 pt-4 border-t border-slate-50 flex items-center gap-1.5">
                        {stats.attendanceChange === null ? (
                           <span className="text-xs font-medium text-slate-400">Monitoring on-time trends...</span>
                        ) : stats.attendanceChange >= 0 ? (
                           <>
                              <TrendingUp size={12} style={{ color: TONES.teal.accent }} />
                              <span className="text-xs font-medium" style={{ color: TONES.teal.icon }}>
                                 +{stats.attendanceChange}% vs last month
                              </span>
                           </>
                        ) : (
                           <>
                              <TrendingUp size={12} className="rotate-180" style={{ color: TONES.coral.accent }} />
                              <span className="text-xs font-medium" style={{ color: TONES.coral.icon }}>
                                 {stats.attendanceChange}% vs last month
                              </span>
                           </>
                        )}
                     </div>
                  </div>

                  {/* Avg Work Hours */}
                  <div className="bg-white border border-slate-100 rounded-2xl p-5">
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