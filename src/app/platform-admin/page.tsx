'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import {
  Building2,
  Users,
  Search,
  RefreshCw,
  LogOut,
  Calendar,
  Globe,
  Layers,
  ShieldCheck,
  Mail,
  Copy,
  Check,
  TrendingUp,
  Power,
  PowerOff,
  Loader2,
  AlertTriangle,
} from 'lucide-react';

interface CompanyItem {
  id: string;
  name: string;
  isActive: boolean;
  timezone: string;
  createdAt: string;
  updatedAt: string;
  employees?: Array<{
    name: string;
    email: string;
    createdAt: string;
  }>;
  _count: {
    employees: number;
    departments: number;
  };
}

interface PlatformAdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export default function PlatformAdminDashboardPage() {
  const router = useRouter();
  const [adminUser, setAdminUser] = useState<PlatformAdminUser | null>(null);
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [confirmToggle, setConfirmToggle] = useState<{ company: CompanyItem; activate: boolean } | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      // 1. Verify Platform Admin identity
      const meRes = await api.get('/platform-admin/me');
      setAdminUser(meRes.data);

      // 2. Fetch all onboarded companies
      const companiesRes = await api.get('/platform-admin/companies');
      setCompanies(companiesRes.data || []);
    } catch (err: unknown) {
      console.error('Failed to load platform data:', err);
      // Not authenticated or invalid token
      localStorage.removeItem('accessToken');
      localStorage.removeItem('platformAdminUser');
      router.replace('/platform-admin/login');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    // Check initial token
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) {
      router.replace('/platform-admin/login');
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData, router]);

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('platformAdminUser');
    router.replace('/platform-admin/login');
  };

  const copyToClipboard = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleToggleStatus = async (company: CompanyItem, activate: boolean) => {
    setConfirmToggle(null);
    setTogglingId(company.id);
    try {
      await api.patch(`/platform-admin/companies/${company.id}/status`, { activate });
      // Update local state optimistically
      setCompanies((prev) =>
        prev.map((c) => (c.id === company.id ? { ...c, isActive: activate } : c))
      );
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      alert(e?.response?.data?.message || 'Failed to update organization status.');
    } finally {
      setTogglingId(null);
    }
  };

  // Filtered companies based on search
  const filteredCompanies = useMemo(() => {
    if (!searchQuery.trim()) return companies;
    const q = searchQuery.toLowerCase().trim();
    return companies.filter((c) => {
      const nameMatch = c.name?.toLowerCase().includes(q);
      const idMatch = c.id?.toLowerCase().includes(q);
      const ownerEmailMatch = c.employees?.[0]?.email?.toLowerCase().includes(q);
      const ownerNameMatch = c.employees?.[0]?.name?.toLowerCase().includes(q);
      return nameMatch || idMatch || ownerEmailMatch || ownerNameMatch;
    });
  }, [companies, searchQuery]);

  // Aggregate Metrics
  const totalEmployeesAcrossPlatform = useMemo(() => {
    return companies.reduce((acc, curr) => acc + (curr._count?.employees || 0), 0);
  }, [companies]);

  const activeCount = useMemo(() => companies.filter((c) => c.isActive).length, [companies]);
  const suspendedCount = useMemo(() => companies.filter((c) => !c.isActive).length, [companies]);

  return (
    <div className="min-h-screen bg-[#070d24] text-slate-100 flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-[#0c1840]/90 backdrop-blur-md border-b border-white/10 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-md shadow-blue-500/25 border border-white/20">
            <ShieldCheck size={22} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-lg tracking-tight text-white">TapIn</span>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2 py-0.5 rounded-full">
                Platform Admin
              </span>
            </div>
            <p className="text-[11px] text-blue-200/60 font-medium">Cross-Organization Management</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {adminUser && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-blue-200 font-medium">{adminUser.email}</span>
            </div>
          )}

          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 hover:text-white transition cursor-pointer"
            title="Refresh organizations list"
          >
            <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-300 hover:text-red-200 text-xs font-semibold transition cursor-pointer"
          >
            <LogOut size={14} />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Confirm Deactivation Modal */}
      {confirmToggle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#0c1840] border border-white/15 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${confirmToggle.activate ? 'bg-emerald-500/20 border border-emerald-400/30' : 'bg-rose-500/20 border border-rose-400/30'}`}>
                {confirmToggle.activate
                  ? <Power size={20} className="text-emerald-400" />
                  : <PowerOff size={20} className="text-rose-400" />
                }
              </div>
              <div>
                <h2 className="font-black text-white text-base">
                  {confirmToggle.activate ? 'Activate Organization' : 'Suspend Organization'}
                </h2>
                <p className="text-xs text-blue-200/60 font-medium">{confirmToggle.company.name}</p>
              </div>
            </div>

            {!confirmToggle.activate && (
              <div className="flex items-start gap-2 bg-rose-500/10 border border-rose-400/20 rounded-xl px-4 py-3 mb-4">
                <AlertTriangle size={15} className="text-rose-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-rose-300 leading-relaxed">
                  <strong className="font-bold">All employees and admins</strong> of this organization — including the Super Admin — will be immediately blocked from logging in. Existing sessions may remain active until they expire.
                </p>
              </div>
            )}

            {confirmToggle.activate && (
              <div className="flex items-start gap-2 bg-emerald-500/10 border border-emerald-400/20 rounded-xl px-4 py-3 mb-4">
                <Power size={15} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-emerald-300 leading-relaxed">
                  All employees and admins of this organization will regain access immediately.
                </p>
              </div>
            )}

            <p className="text-sm text-slate-300 mb-6">
              Are you sure you want to <strong className="text-white">{confirmToggle.activate ? 'activate' : 'suspend'}</strong> <strong className="text-white">&ldquo;{confirmToggle.company.name}&rdquo;</strong>?
            </p>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmToggle(null)}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleToggleStatus(confirmToggle.company, confirmToggle.activate)}
                className={`px-5 py-2 rounded-xl text-sm font-bold text-white transition cursor-pointer ${
                  confirmToggle.activate
                    ? 'bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-900/40'
                    : 'bg-rose-600 hover:bg-rose-500 shadow-lg shadow-rose-900/40'
                }`}
              >
                {confirmToggle.activate ? 'Yes, Activate' : 'Yes, Suspend'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-8 space-y-8">
        {/* Banner with Metrics */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Registered Organizations
              </h1>
              <p className="text-xs sm:text-sm text-blue-200/70 mt-1">
                Overview and live directory of all client companies onboarded on the platform.
              </p>
            </div>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-blue-200/60 block">
                  Total Organizations
                </span>
                <span className="text-3xl font-black text-white mt-1 block">
                  {companies.length}
                </span>
                <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1 mt-1">
                  <TrendingUp size={12} /> Live tenants
                </span>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-blue-500/15 border border-blue-400/20 flex items-center justify-center text-blue-400">
                <Building2 size={24} />
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-blue-200/60 block">
                  Total Employees
                </span>
                <span className="text-3xl font-black text-white mt-1 block">
                  {totalEmployeesAcrossPlatform}
                </span>
                <span className="text-[11px] text-blue-300 font-medium mt-1 block">
                  Across all organizations
                </span>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-indigo-500/15 border border-indigo-400/20 flex items-center justify-center text-indigo-400">
                <Users size={24} />
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-blue-200/60 block">
                  Active
                </span>
                <span className="text-3xl font-black text-emerald-400 mt-1 block">
                  {activeCount}
                </span>
                <span className="text-[11px] text-emerald-300/70 font-medium mt-1 block">
                  Organizations online
                </span>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/15 border border-emerald-400/20 flex items-center justify-center text-emerald-400">
                <Power size={24} />
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-blue-200/60 block">
                  Suspended
                </span>
                <span className={`text-3xl font-black mt-1 block ${suspendedCount > 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                  {suspendedCount}
                </span>
                <span className="text-[11px] text-rose-300/70 font-medium mt-1 block">
                  Access revoked
                </span>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-purple-500/15 border border-purple-400/20 flex items-center justify-center text-purple-400">
                <Layers size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* Search & Actions Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search size={16} />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by company name, owner, or ID..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>

          <div className="text-xs text-blue-200/60 font-medium">
            Showing <strong className="text-white">{filteredCompanies.length}</strong> of{' '}
            <strong className="text-white">{companies.length}</strong> companies
          </div>
        </div>

        {/* Companies Table / Cards */}
        {loading && companies.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-3xl p-16 flex flex-col items-center justify-center">
            <RefreshCw size={32} className="animate-spin text-blue-400 mb-3" />
            <p className="text-sm font-semibold text-slate-300">Loading organizations...</p>
          </div>
        ) : filteredCompanies.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-3xl p-16 text-center">
            <Building2 size={40} className="mx-auto text-slate-500 mb-3" />
            <h3 className="text-base font-bold text-white">No organizations found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {searchQuery ? 'Try adjusting your search keywords.' : 'No organizations have registered yet.'}
            </p>
          </div>
        ) : (
          <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="text-[11px] uppercase tracking-wider text-blue-200/60 bg-white/5 border-b border-white/10">
                  <tr>
                    <th className="px-6 py-4 font-bold">Organization</th>
                    <th className="px-6 py-4 font-bold">Primary Owner</th>
                    <th className="px-6 py-4 font-bold">Scale</th>
                    <th className="px-6 py-4 font-bold">Timezone</th>
                    <th className="px-6 py-4 font-bold">Registered On</th>
                    <th className="px-6 py-4 font-bold text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredCompanies.map((company) => {
                    const owner = company.employees?.[0];
                    const isToggling = togglingId === company.id;
                    const createdDate = new Date(company.createdAt).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    });

                    return (
                      <tr
                        key={company.id}
                        className={`hover:bg-white/5 transition duration-150 ${!company.isActive ? 'opacity-60' : ''}`}
                      >
                        {/* Company Details */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`h-10 w-10 flex-shrink-0 rounded-xl flex items-center justify-center font-black text-sm ${company.isActive ? 'bg-blue-600/20 border border-blue-500/30 text-blue-400' : 'bg-slate-600/20 border border-slate-500/30 text-slate-500'}`}>
                              {company.name?.charAt(0)?.toUpperCase() || 'C'}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-white text-[15px]">{company.name}</span>
                                {!company.isActive && (
                                  <span className="text-[9px] font-bold uppercase tracking-wider bg-rose-500/15 text-rose-400 border border-rose-400/20 px-1.5 py-0.5 rounded-full">
                                    Suspended
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="font-mono text-[10px] text-slate-400">
                                  ID: {company.id.slice(0, 12)}...
                                </span>
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(company.id)}
                                  className="text-slate-400 hover:text-white transition p-0.5 rounded cursor-pointer"
                                  title="Copy full Company ID"
                                >
                                  {copiedId === company.id ? (
                                    <Check size={11} className="text-emerald-400" />
                                  ) : (
                                    <Copy size={11} />
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Owner */}
                        <td className="px-6 py-4">
                          {owner ? (
                            <div>
                              <div className="font-semibold text-slate-200 text-xs sm:text-sm">
                                {owner.name}
                              </div>
                              <div className="text-xs text-blue-300/80 flex items-center gap-1 mt-0.5">
                                <Mail size={11} />
                                <span>{owner.email}</span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-500 italic">No admin assigned</span>
                          )}
                        </td>

                        {/* Scale */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                              <Users size={12} />
                              {company._count.employees} staff
                            </span>
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-purple-300 bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 rounded-lg">
                              <Layers size={12} />
                              {company._count.departments} depts
                            </span>
                          </div>
                        </td>

                        {/* Timezone */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium">
                            <Globe size={13} className="text-slate-400" />
                            <span>{company.timezone || 'Asia/Karachi'}</span>
                          </div>
                        </td>

                        {/* Registered Date */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium">
                            <Calendar size={13} className="text-slate-400" />
                            <span>{createdDate}</span>
                          </div>
                        </td>

                        {/* Status Toggle */}
                        <td className="px-6 py-4 text-right">
                          {isToggling ? (
                            <Loader2 size={18} className="animate-spin text-slate-400 ml-auto" />
                          ) : company.isActive ? (
                            <button
                              type="button"
                              onClick={() => setConfirmToggle({ company, activate: false })}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-rose-300 bg-rose-500/10 border border-rose-400/20 hover:bg-rose-500/20 hover:text-rose-200 transition cursor-pointer"
                              title={`Suspend ${company.name}`}
                            >
                              <PowerOff size={12} />
                              Suspend
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmToggle({ company, activate: true })}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-400/20 hover:bg-emerald-500/20 hover:text-emerald-200 transition cursor-pointer"
                              title={`Activate ${company.name}`}
                            >
                              <Power size={12} />
                              Activate
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

