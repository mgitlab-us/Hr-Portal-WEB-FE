'use client';

import React, { useState } from 'react';
import {
   BarChart3,
   Download,
   Calendar,
   FileText,
   Users,
   TrendingUp,
   ArrowUpRight,
   Loader2,
} from 'lucide-react';
import { api } from '@/lib/api';
import DashboardLayout from '@/components/layout/DashboardLayout';

export default function ReportsPage() {
   const [downloading, setDownloading] = useState<string | null>(null);
   const currentYear = new Date().getFullYear();
   const currentMonth = new Date().getMonth() + 1;

   const monthLabel = new Date().toLocaleString('default', {
      month: 'long',
      year: 'numeric',
   });

   const handleDownload = async (type: 'pdf' | 'excel', name: string) => {
      setDownloading(name);
      const endpoint = type === 'pdf' ? '/reports/monthly-pdf' : '/reports/monthly';
      const filename = `${name}-${currentYear}-${currentMonth}.${type === 'pdf' ? 'pdf' : 'xlsx'}`;
      try {
         const response = await api.get(
            `${endpoint}?year=${currentYear}&month=${currentMonth}`,
            { responseType: 'blob' }
         );
         const url = window.URL.createObjectURL(new Blob([response.data]));
         const link = document.createElement('a');
         link.href = url;
         link.setAttribute('download', filename);
         document.body.appendChild(link);
         link.click();
         link.remove();
      } catch {
         alert('Failed to generate report.');
      } finally {
         setDownloading(null);
      }
   };

   // Mock weekly bars — replace with real data when available
   const weeks = [
      { label: 'Week 1', days: [40, 70, 45, 90, 65, 80] },
      { label: 'Week 2', days: [50, 60, 85, 30, 75, 88] },
      { label: 'Week 3', days: [40, 95, 55, 70, 82, 66] },
      { label: 'Week 4', days: [60, 50, 78, 92, 45, 70] },
   ];
   const allBars = weeks.flatMap((w) => w.days);

   return (
      <DashboardLayout>
         <div className="p-6 lg:p-8 space-y-6">

            {/* ── Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
               <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">
                     Admin · Reports
                  </p>
                  <h1 className="text-2xl font-semibold text-slate-800 tracking-tight">
                     Organisation Reports
                  </h1>
                  <p className="text-sm text-slate-400 mt-0.5">
                     Analytics and historical performance exports
                  </p>
               </div>
               <div className="inline-flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600">
                  <Calendar size={13} className="text-slate-400" />
                  {monthLabel}
               </div>
            </div>

            {/* ── Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

               {/* Chart — spans 2 cols */}
               <div className="lg:col-span-2 bg-white border border-slate-100 rounded-xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-5">
                     <div>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-0.5">
                           This month
                        </p>
                        <h2 className="text-sm font-semibold text-slate-700">
                           Attendance Overview
                        </h2>
                     </div>
                     <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-sm bg-indigo-500" />
                        <span className="text-xs text-slate-400">Attendance %</span>
                     </div>
                  </div>

                  {/* Bar chart */}
                  <div className="flex items-end gap-1 h-44 px-1">
                     {allBars.map((h, i) => (
                        <div
                           key={i}
                           className="flex-1 group relative flex flex-col justify-end"
                           style={{ height: '100%' }}
                        >
                           {/* Tooltip */}
                           <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] font-medium px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                              {h}%
                           </div>
                           <div
                              className="w-full rounded-sm bg-indigo-100 group-hover:bg-indigo-500 transition-colors duration-150"
                              style={{ height: `${h}%` }}
                           />
                        </div>
                     ))}
                  </div>

                  {/* Week labels */}
                  <div className="flex mt-3 px-1">
                     {weeks.map((w) => (
                        <div
                           key={w.label}
                           className="flex-1 text-center text-[9px] font-semibold text-slate-400 uppercase tracking-wider"
                        >
                           {w.label}
                        </div>
                     ))}
                  </div>
               </div>

               {/* Insight card */}
               <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm flex flex-col justify-between">
                  <div>
                     <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">
                        AI Insight
                     </p>
                     <h2 className="text-sm font-semibold text-slate-700 mb-3">
                        Predictive Analysis
                     </h2>
                     <p className="text-sm text-slate-500 leading-relaxed">
                        Friday mornings may see a{' '}
                        <span className="font-semibold text-slate-700">12% rise</span> in late
                        arrivals based on historical patterns this month.
                     </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-50">
                     <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center">
                           <TrendingUp size={13} className="text-indigo-500" />
                        </div>
                        <span className="text-xs font-medium text-slate-500">
                           Ready for review
                        </span>
                     </div>
                  </div>
               </div>
            </div>

            {/* ── Export Reports */}
            <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
               <div className="px-5 py-4 border-b border-slate-100">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-0.5">
                     Exports
                  </p>
                  <h2 className="text-sm font-semibold text-slate-700">
                     Download Reports
                  </h2>
               </div>

               <div className="divide-y divide-slate-50">
                  {/* Monthly Summary */}
                  <div
                     onClick={() => handleDownload('pdf', 'organization-summary')}
                     className="flex items-center justify-between px-5 py-4 hover:bg-slate-50/60 cursor-pointer group transition-colors"
                  >
                     <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                           {downloading === 'organization-summary' ? (
                              <Loader2 size={14} className="text-emerald-600 animate-spin" />
                           ) : (
                              <FileText size={14} className="text-emerald-600" />
                           )}
                        </div>
                        <div>
                           <p className="text-sm font-medium text-slate-700">
                              Monthly Summary Report
                           </p>
                           <p className="text-xs text-slate-400 mt-0.5">
                              Full organisation attendance overview · PDF
                           </p>
                        </div>
                     </div>
                     <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md uppercase tracking-wide">
                           PDF
                        </span>
                        <ArrowUpRight
                           size={14}
                           className="text-slate-300 group-hover:text-slate-500 transition-colors"
                        />
                     </div>
                  </div>

                  {/* Staff Analysis */}
                  <div
                     onClick={() => handleDownload('excel', 'attendance-analysis')}
                     className="flex items-center justify-between px-5 py-4 hover:bg-slate-50/60 cursor-pointer group transition-colors"
                  >
                     <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                           {downloading === 'attendance-analysis' ? (
                              <Loader2 size={14} className="text-blue-600 animate-spin" />
                           ) : (
                              <Users size={14} className="text-blue-600" />
                           )}
                        </div>
                        <div>
                           <p className="text-sm font-medium text-slate-700">
                              Staff Detailed Analysis
                           </p>
                           <p className="text-xs text-slate-400 mt-0.5">
                              Comprehensive raw data for audit · XLSX
                           </p>
                        </div>
                     </div>
                     <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md uppercase tracking-wide">
                           XLSX
                        </span>
                        <ArrowUpRight
                           size={14}
                           className="text-slate-300 group-hover:text-slate-500 transition-colors"
                        />
                     </div>
                  </div>
               </div>
            </div>

         </div>
      </DashboardLayout>
   );
}