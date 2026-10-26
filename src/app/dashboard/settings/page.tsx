'use client';

import React, { Suspense, lazy } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, Wrench, History, Calendar, Settings2, Lock, Building2 } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuthStore } from '@/store/authStore';

// ── Lazy-loaded tab panels (no DashboardLayout inside them)
const GeneralPanel = lazy(() => import('./panels/GeneralPanel'));
const ShiftsPanel = lazy(() => import('./panels/ShiftsPanel'));
const HolidaysPanel = lazy(() => import('./panels/HolidaysPanel'));
const DepartmentConfigPanel = lazy(
  () => import('@/components/departments/DepartmentConfigPanel')
);

type TabId = 'general' | 'departments' | 'shifts' | 'holidays';

const TABS: { id: TabId; label: string; icon: React.ReactNode; superAdminOnly?: boolean }[] = [
  { id: 'general', label: 'Company defaults', icon: <Settings2 size={15} />, superAdminOnly: true },
  { id: 'departments', label: 'Departments', icon: <Building2 size={15} /> },
  { id: 'shifts', label: 'Shift templates', icon: <History size={15} />, superAdminOnly: true },
  { id: 'holidays', label: 'Company holidays', icon: <Calendar size={15} />, superAdminOnly: true },
];

function TabPanelLoader() {
  return (
    <div className="flex items-center justify-center py-24">
      <Loader2 size={18} className="text-slate-400 animate-spin" />
    </div>
  );
}

function CompanySetupContent() {
  const { user } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Filter tabs by role before resolving the query param so a deep link cannot
  // open a super-admin-only panel for an HR admin.
  const visibleTabs = TABS.filter(t => !(t.superAdminOnly && user?.role !== 'SUPER_ADMIN'));
  const defaultTab: TabId = user?.role === 'SUPER_ADMIN' ? 'general' : 'departments';
  const tabParam = searchParams.get('tab') as TabId | null;
  const activeTab: TabId =
    tabParam && visibleTabs.some(t => t.id === tabParam) ? tabParam : defaultTab;

  const setTab = (id: TabId) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', id);
    router.replace(`/dashboard/settings?${params.toString()}`, { scroll: false });
  };
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 size={18} className="text-slate-400 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-slate-50">
        {/* ── Page Header */}
        <div className="bg-white border-b border-slate-100 px-6 lg:px-8 pt-6 pb-0">
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-1">
              <Wrench size={13} className="text-slate-400" />
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                {isSuperAdmin ? 'Admin · Company Setup' : 'Admin · Department Setup'}
              </p>
            </div>
            <h1 className="text-2xl font-semibold text-slate-800 tracking-tight">
              {isSuperAdmin ? 'Company Setup' : 'Department Setup'}
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">
              {isSuperAdmin
                ? 'Company-wide defaults and department-specific overrides, separated by scope'
                : 'Shift rules, holidays and leave allowances for the departments you manage'}
            </p>
          </div>

          {/* ── Tab Bar */}
          <div className="flex items-center gap-1 overflow-x-auto">
            {visibleTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-all -mb-px ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Tab Content */}
        <div className="p-6 lg:p-8">
          <Suspense fallback={<TabPanelLoader />}>
            {activeTab === 'general' && user?.role === 'SUPER_ADMIN' && <GeneralPanel />}
            {activeTab === 'general' && user?.role !== 'SUPER_ADMIN' && (
              <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                  <Lock size={16} className="text-red-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Access Restricted</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs">
                    Only Super Admins can modify organisation-level settings.
                  </p>
                </div>
              </div>
            )}
            {activeTab === 'departments' && <DepartmentConfigPanel embedded />}
            {activeTab === 'shifts' && isSuperAdmin && <ShiftsPanel />}
            {activeTab === 'holidays' && isSuperAdmin && <HolidaysPanel />}
          </Suspense>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function CompanySetupPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
          <Loader2 size={18} className="animate-spin text-slate-400" />
        </div>
      }
    >
      <CompanySetupContent />
    </Suspense>
  );
}