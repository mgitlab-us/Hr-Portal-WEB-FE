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
  Globe,
  Mail,
  Copy,
  Check,
  Loader2,
  AlertTriangle,
  UserCheck,
  XCircle,
  CheckCircle,
  Clock,
  FileText,
  ShieldCheck,
  ShieldOff,
  X,
  Inbox,
  ArrowRight,
  Layers,
  Sliders,
  Wallet,
  FileCheck,
  Plane,
  Megaphone,
  ScrollText,
  BarChart3,
  Phone,
  Briefcase,
  Gauge,
} from 'lucide-react';

/* ----------------------------- Types ----------------------------- */

interface CompanyItem {
  id: string;
  name: string;
  isActive: boolean;
  timezone: string;
  createdAt: string;
  updatedAt: string;
  features?: Record<string, boolean>;
  maxEmployees?: number | null;
  maxDepartments?: number | null;
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

interface CompanyDetails {
  id: string;
  name: string;
  isActive: boolean;
  timezone: string;
  logo?: string | null;
  workMinutesPerDay: number;
  breakMinutesAllocated: number;
  gracePeriodMinutes: number;
  expectedCheckinHour: number;
  expectedCheckinMinute: number;
  officeLat?: number | null;
  officeLng?: number | null;
  officeRadius?: number | null;
  weekends?: number[];
  sickLeaveDays?: number;
  casualLeaveDays?: number;
  vacationLeaveDays?: number;
  features: Record<string, boolean>;
  maxEmployees?: number | null;
  maxDepartments?: number | null;
  createdAt: string;
  updatedAt: string;
  departments: Array<{
    id: string;
    name: string;
    createdAt: string;
    _count: { employees: number };
    admins: Array<{ employee: { id: string; name: string; email: string } }>;
    managers: Array<{ employee: { id: string; name: string; email: string } }>;
  }>;
  employees: Array<{
    id: string;
    name: string;
    email: string;
    isActive: boolean;
    createdAt: string;
    profile?: { phone?: string | null; designation?: string | null } | null;
  }>;
  stats: {
    totalEmployees: number;
    activeEmployees: number;
    inactiveEmployees: number;
    totalDepartments: number;
    totalShiftProfiles: number;
    totalNotices: number;
    totalGroups: number;
    roles: {
      superAdmin: number;
      admin: number;
      manager: number;
      employee: number;
    };
  };
}

const AVAILABLE_FEATURES = [
  {
    key: 'payroll',
    name: 'Payroll & Payslips',
    description: 'Salary structures, monthly payments disbursement, and branded PDF payslips.',
    icon: Wallet,
  },
  {
    key: 'corrections',
    name: 'Attendance Corrections',
    description: 'Employee punch edit requests and multi-tier approval workflows.',
    icon: FileCheck,
  },
  {
    key: 'leaves',
    name: 'Leaves & Time Off',
    description: 'Leave quota management, anniversary cycles, and approver balance reviews.',
    icon: Plane,
  },
  {
    key: 'noticeBoard',
    name: 'Notice Board',
    description: 'Company-wide and department-targeted broadcast announcements.',
    icon: Megaphone,
  },
  {
    key: 'shifts',
    name: 'Custom Shifts',
    description: 'Custom shift templates, flexible working hours, and grace allowances.',
    icon: Clock,
  },
  {
    key: 'groups',
    name: 'Collaboration Groups',
    description: 'Team workspaces, internal messaging channels, and meeting calendar.',
    icon: Users,
  },
  {
    key: 'auditLogs',
    name: 'Audit Trail',
    description: 'Immutable security log of admin actions, salary changes, and settings.',
    icon: ScrollText,
  },
  {
    key: 'documents',
    name: 'Employee Documents',
    description: 'Encrypted document vault for contracts, credentials, and verification files.',
    icon: FileText,
  },
  {
    key: 'analytics',
    name: 'Advanced Analytics',
    description: 'Monthly exportable reports, attendance pulse trends, and company metrics.',
    icon: BarChart3,
  },
];

interface OnboardingRequestItem {
  id: string;
  companyName: string;
  timezone: string;
  adminName: string;
  adminEmail: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string | null;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PlatformAdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

type Tab = 'ORGANIZATIONS' | 'ONBOARDING';
type CompanyFilter = 'ALL' | 'ACTIVE' | 'SUSPENDED';
type RequestFilter = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED';
type ToastState = { message: string; type: 'error' | 'success' } | null;

/* ------------------------ Helpers ------------------------ */

const formatDate = (iso: string, withTime = false) =>
  new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });

const daysSince = (iso: string) =>
  Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));

const waitingLabel = (iso: string) => {
  const d = daysSince(iso);
  if (d === 0) return 'Submitted today';
  if (d === 1) return 'Waiting 1 day';
  return `Waiting ${d} days`;
};

const getErrorMessage = (err: unknown, fallback: string) => {
  const e = err as { response?: { data?: { message?: string } } };
  return e?.response?.data?.message || fallback;
};

const avatarPalette = [
  'bg-blue-100 text-blue-700',
  'bg-emerald-100 text-emerald-700',
  'bg-violet-100 text-violet-700',
  'bg-amber-100 text-amber-800',
  'bg-rose-100 text-rose-700',
  'bg-cyan-100 text-cyan-700',
];

const avatarTone = (name = '') => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return avatarPalette[hash % avatarPalette.length];
};

/* ------------------------ UI primitives ------------------------ */

function Avatar({ name, muted = false }: { name?: string; muted?: boolean }) {
  return (
    <div
      className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
        muted ? 'bg-slate-200 text-slate-500' : avatarTone(name)
      }`}
    >
      {name?.charAt(0)?.toUpperCase() || '?'}
    </div>
  );
}

function StatusPill({
  tone,
  icon,
  children,
}: {
  tone: 'green' | 'amber' | 'red';
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  const styles = {
    green: 'bg-green-100 text-green-800',
    amber: 'bg-amber-100 text-amber-900',
    red: 'bg-red-100 text-red-800',
  } as const;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${styles[tone]}`}>
      {icon}
      {children}
    </span>
  );
}

function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={label}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
        checked ? 'bg-green-500' : 'bg-slate-300'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-[22px]' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

function StatCard({
  label,
  value,
  hint,
  icon,
  chip,
  valueClass = 'text-slate-900',
}: {
  label: string;
  value: number;
  hint: string;
  icon: React.ReactNode;
  chip: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${chip}`}>{icon}</div>
      <div className="min-w-0">
        <div className="text-xs font-medium text-slate-500">{label}</div>
        <div className={`text-2xl font-bold tabular-nums leading-tight ${valueClass}`}>{value}</div>
        <div className="truncate text-xs text-slate-400">{hint}</div>
      </div>
    </div>
  );
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ key: T; label: string; count: number }>;
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex self-start rounded-xl bg-slate-200/70 p-1 sm:self-auto">
      {options.map((o) => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
            value === o.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {o.label}
          <span
            className={`rounded-full px-1.5 text-[11px] tabular-nums ${
              value === o.key ? 'bg-slate-100 text-slate-700' : 'bg-slate-300/50 text-slate-600'
            }`}
          >
            {o.count}
          </span>
        </button>
      ))}
    </div>
  );
}

function Modal({
  title,
  subtitle,
  icon,
  iconClass,
  onClose,
  children,
  footer,
  maxWidth = 'max-w-md',
}: {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  iconClass: string;
  onClose: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
  maxWidth?: string;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`w-full ${maxWidth} max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 px-6 pt-6 flex-shrink-0">
          <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${iconClass}`}>
            {icon}
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            {subtitle && <p className="truncate text-sm text-slate-500">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5 text-sm leading-relaxed text-slate-600 overflow-y-auto flex-1">{children}</div>
        <div className="flex justify-end gap-2 bg-slate-50 px-6 py-4 flex-shrink-0 border-t border-slate-100">{footer}</div>
      </div>
    </div>
  );
}

const btnBase =
  'inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2';
const btnSecondary = `${btnBase} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-slate-400`;
const btnDanger = `${btnBase} bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500`;
const btnSuccess = `${btnBase} bg-green-600 text-white hover:bg-green-700 focus-visible:ring-green-500`;

/* ------------------------------ Page ------------------------------ */

export default function PlatformAdminDashboardPage() {
  const router = useRouter();
  const [adminUser, setAdminUser] = useState<PlatformAdminUser | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('ORGANIZATIONS');
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [onboardingRequests, setOnboardingRequests] = useState<OnboardingRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [companyFilter, setCompanyFilter] = useState<CompanyFilter>('ALL');
  const [onboardingFilter, setOnboardingFilter] = useState<RequestFilter>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [confirmToggle, setConfirmToggle] = useState<{ company: CompanyItem; activate: boolean } | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  // Onboarding approval / rejection modals
  const [confirmApproveModal, setConfirmApproveModal] = useState<OnboardingRequestItem | null>(null);
  const [rejectModal, setRejectModal] = useState<OnboardingRequestItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);

  // Company details & module permissions modal
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [companyDetails, setCompanyDetails] = useState<CompanyDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailsSubTab, setDetailsSubTab] = useState<'FEATURES' | 'LIMITS' | 'OVERVIEW' | 'DEPARTMENTS'>('FEATURES');
  const [editingFeatures, setEditingFeatures] = useState<Record<string, boolean>>({});
  const [savingFeatures, setSavingFeatures] = useState(false);
  const [editingLimits, setEditingLimits] = useState<{
    maxEmployees: number | null;
    maxDepartments: number | null;
    unlimitedEmployees: boolean;
    unlimitedDepartments: boolean;
  }>({
    maxEmployees: 50,
    maxDepartments: 10,
    unlimitedEmployees: false,
    unlimitedDepartments: false,
  });
  const [savingLimits, setSavingLimits] = useState(false);

  const showToast = useCallback((message: string, type: 'error' | 'success' = 'error') => {
    setToast({ message, type });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      // 1. Verify Platform Admin identity
      const meRes = await api.get('/platform-admin/me');
      setAdminUser(meRes.data);

      // 2. Fetch all onboarded companies and onboarding requests in parallel
      const [companiesRes, requestsRes] = await Promise.all([
        api.get('/platform-admin/companies'),
        api.get('/platform-admin/onboarding-requests').catch(() => ({ data: [] })),
      ]);

      setCompanies(companiesRes.data || []);
      setOnboardingRequests(requestsRes.data || []);
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

  const switchTab = (tab: Tab) => {
    setActiveTab(tab);
    setSearchQuery('');
  };

  const copyToClipboard = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Toggle company active/suspended status
  const handleToggleStatus = async (company: CompanyItem, activate: boolean) => {
    setConfirmToggle(null);
    setTogglingId(company.id);
    try {
      await api.patch(`/platform-admin/companies/${company.id}/status`, { activate });
      setCompanies((prev) =>
        prev.map((c) => (c.id === company.id ? { ...c, isActive: activate } : c))
      );
      showToast(`${company.name} ${activate ? 'activated' : 'suspended'}.`, 'success');
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Failed to update organization status.'));
    } finally {
      setTogglingId(null);
    }
  };

  // Approve onboarding request
  const handleApproveRequest = async (request: OnboardingRequestItem) => {
    setConfirmApproveModal(null);
    setProcessingRequestId(request.id);
    try {
      await api.post(`/platform-admin/onboarding-requests/${request.id}/approve`);
      await loadData();
      showToast(`${request.companyName} approved and onboarded.`, 'success');
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Failed to approve onboarding request.'));
    } finally {
      setProcessingRequestId(null);
    }
  };

  // Reject onboarding request
  const handleRejectRequest = async (request: OnboardingRequestItem) => {
    setRejectModal(null);
    setProcessingRequestId(request.id);
    const reason = rejectionReason.trim();
    setRejectionReason('');
    try {
      await api.post(`/platform-admin/onboarding-requests/${request.id}/reject`, { reason });
      await loadData();
      showToast(`${request.companyName} request rejected.`, 'success');
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Failed to reject onboarding request.'));
    } finally {
      setProcessingRequestId(null);
    }
  };

  const openCompanyDetails = async (companyId: string) => {
    setSelectedCompanyId(companyId);
    setLoadingDetails(true);
    setDetailsSubTab('FEATURES');
    try {
      const res = await api.get(`/platform-admin/companies/${companyId}`);
      setCompanyDetails(res.data);
      setEditingFeatures(res.data.features || {});
      setEditingLimits({
        maxEmployees: res.data.maxEmployees ?? 50,
        maxDepartments: res.data.maxDepartments ?? 10,
        unlimitedEmployees: res.data.maxEmployees == null,
        unlimitedDepartments: res.data.maxDepartments == null,
      });
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Failed to load organization details.'));
      setSelectedCompanyId(null);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleSaveFeatures = async () => {
    if (!selectedCompanyId) return;
    setSavingFeatures(true);
    try {
      const res = await api.patch(`/platform-admin/companies/${selectedCompanyId}/features`, {
        features: editingFeatures,
      });
      showToast(res.data?.message || 'Module access updated successfully.', 'success');
      if (companyDetails) {
        setCompanyDetails({
          ...companyDetails,
          features: res.data?.features || editingFeatures,
        });
      }
      setCompanies((prev) =>
        prev.map((c) =>
          c.id === selectedCompanyId ? { ...c, features: res.data?.features || editingFeatures } : c
        )
      );
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Failed to update module access.'));
    } finally {
      setSavingFeatures(false);
    }
  };

  const handleSaveLimits = async () => {
    if (!selectedCompanyId) return;
    const maxEmployees = editingLimits.unlimitedEmployees ? null : editingLimits.maxEmployees;
    const maxDepartments = editingLimits.unlimitedDepartments ? null : editingLimits.maxDepartments;
    if (!editingLimits.unlimitedEmployees && (!maxEmployees || maxEmployees < 1)) {
      showToast('Employee cap must be at least 1, or mark it unlimited.');
      return;
    }
    if (!editingLimits.unlimitedDepartments && (!maxDepartments || maxDepartments < 1)) {
      showToast('Department cap must be at least 1, or mark it unlimited.');
      return;
    }
    setSavingLimits(true);
    try {
      const res = await api.patch(`/platform-admin/companies/${selectedCompanyId}/limits`, {
        maxEmployees,
        maxDepartments,
      });
      showToast(res.data?.message || 'Capacity limits updated successfully.', 'success');
      const nextLimits = res.data?.company;
      if (companyDetails) {
        setCompanyDetails({
          ...companyDetails,
          maxEmployees: nextLimits?.maxEmployees ?? maxEmployees,
          maxDepartments: nextLimits?.maxDepartments ?? maxDepartments,
        });
      }
      setCompanies((prev) =>
        prev.map((c) =>
          c.id === selectedCompanyId
            ? {
                ...c,
                maxEmployees: nextLimits?.maxEmployees ?? maxEmployees,
                maxDepartments: nextLimits?.maxDepartments ?? maxDepartments,
              }
            : c
        )
      );
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Failed to update capacity limits.'));
    } finally {
      setSavingLimits(false);
    }
  };

  const closeRejectModal = useCallback(() => {
    setRejectModal(null);
    setRejectionReason('');
  }, []);
  const closeApproveModal = useCallback(() => setConfirmApproveModal(null), []);
  const closeToggleModal = useCallback(() => setConfirmToggle(null), []);

  // Metrics
  const totalEmployeesAcrossPlatform = useMemo(
    () => companies.reduce((acc, curr) => acc + (curr._count?.employees || 0), 0),
    [companies]
  );
  const activeCount = useMemo(() => companies.filter((c) => c.isActive).length, [companies]);
  const suspendedCount = useMemo(() => companies.filter((c) => !c.isActive).length, [companies]);

  const pendingRequestsCount = useMemo(
    () => onboardingRequests.filter((r) => r.status === 'PENDING').length,
    [onboardingRequests]
  );
  const approvedRequestsCount = useMemo(
    () => onboardingRequests.filter((r) => r.status === 'APPROVED').length,
    [onboardingRequests]
  );
  const rejectedRequestsCount = useMemo(
    () => onboardingRequests.filter((r) => r.status === 'REJECTED').length,
    [onboardingRequests]
  );

  // Filtered companies based on status filter and search
  const filteredCompanies = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return companies.filter((c) => {
      if (companyFilter === 'ACTIVE' && !c.isActive) return false;
      if (companyFilter === 'SUSPENDED' && c.isActive) return false;
      if (!q) return true;
      return (
        c.name?.toLowerCase().includes(q) ||
        c.id?.toLowerCase().includes(q) ||
        c.employees?.[0]?.email?.toLowerCase().includes(q) ||
        c.employees?.[0]?.name?.toLowerCase().includes(q)
      );
    });
  }, [companies, companyFilter, searchQuery]);

  // Filtered onboarding requests based on status and search
  const filteredRequests = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return onboardingRequests.filter((r) => {
      if (onboardingFilter !== 'ALL' && r.status !== onboardingFilter) return false;
      if (!q) return true;
      return (
        r.companyName?.toLowerCase().includes(q) ||
        r.adminName?.toLowerCase().includes(q) ||
        r.adminEmail?.toLowerCase().includes(q)
      );
    });
  }, [onboardingRequests, onboardingFilter, searchQuery]);

  const navItems: Array<{ key: Tab; label: string; icon: React.ReactNode; badge?: number }> = [
    { key: 'ORGANIZATIONS', label: 'Organizations', icon: <Building2 size={18} /> },
    { key: 'ONBOARDING', label: 'Onboarding requests', icon: <UserCheck size={18} />, badge: pendingRequestsCount },
  ];

  const thClass = 'px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500';
  const hasActiveFilter =
    searchQuery.trim() !== '' ||
    (activeTab === 'ORGANIZATIONS' ? companyFilter !== 'ALL' : onboardingFilter !== 'ALL');

  const clearFilters = () => {
    setSearchQuery('');
    setCompanyFilter('ALL');
    setOnboardingFilter('ALL');
  };

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-900">
      {/* ============ Sidebar (desktop) ============ */}
      <aside className="sticky top-0 hidden h-screen w-64 flex-shrink-0 flex-col bg-[#14213d] md:flex">
        <div className="flex items-center gap-3 px-6 py-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500 text-white">
            <ShieldCheck size={20} />
          </div>
          <div className="leading-tight">
            <div className="text-base font-bold text-white">TapIn</div>
            <div className="text-xs text-slate-400">Platform admin</div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-2">
          <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Manage
          </div>
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => switchTab(item.key)}
              className={`relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition cursor-pointer ${
                activeTab === item.key
                  ? 'bg-white/10 text-white'
                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              {activeTab === item.key && (
                <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r bg-blue-400" />
              )}
              {item.icon}
              <span className="flex-1 text-left">{item.label}</span>
              {!!item.badge && item.badge > 0 && (
                <span className="rounded-full bg-amber-400 px-2 py-0.5 text-xs font-bold text-slate-900">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="border-t border-white/10 p-4">
          {adminUser && (
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-sm font-bold text-blue-200">
                {(adminUser.name || adminUser.email).charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-white">{adminUser.name || 'Platform admin'}</div>
                <div className="truncate text-xs text-slate-400">{adminUser.email}</div>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white cursor-pointer"
          >
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      </aside>

      {/* ============ Main column ============ */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile header */}
        <header className="sticky top-0 z-30 bg-[#14213d] md:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500 text-white">
                <ShieldCheck size={17} />
              </div>
              <span className="text-sm font-bold text-white">TapIn Platform</span>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-lg p-2 text-slate-300 hover:bg-white/10 cursor-pointer"
              aria-label="Sign out"
            >
              <LogOut size={17} />
            </button>
          </div>
          <div className="flex gap-1 px-3 pb-3">
            {navItems.map((item) => (
              <button
                key={item.key}
                onClick={() => switchTab(item.key)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold cursor-pointer ${
                  activeTab === item.key ? 'bg-white/10 text-white' : 'text-slate-400'
                }`}
              >
                {item.label}
                {!!item.badge && item.badge > 0 && (
                  <span className="rounded-full bg-amber-400 px-1.5 text-[10px] font-bold text-slate-900">
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 space-y-5 px-4 py-6 sm:px-8 sm:py-8">
          {/* Page heading */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {activeTab === 'ORGANIZATIONS' ? 'Organizations' : 'Onboarding requests'}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {activeTab === 'ORGANIZATIONS'
                  ? 'Manage registered workspaces and control who can sign in.'
                  : 'Review applications from organizations requesting access.'}
              </p>
            </div>
            <button
              onClick={loadData}
              disabled={loading}
              className={`${btnSecondary} disabled:cursor-not-allowed disabled:opacity-60`}
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>

          {/* Attention banner */}
          {activeTab === 'ORGANIZATIONS' && pendingRequestsCount > 0 && (
            <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                  <Clock size={20} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-amber-950">
                    {pendingRequestsCount} onboarding {pendingRequestsCount === 1 ? 'request is' : 'requests are'} waiting for review
                  </div>
                  <div className="text-xs text-amber-800/80">
                    New organizations can&apos;t sign in until you approve them.
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  switchTab('ONBOARDING');
                  setOnboardingFilter('PENDING');
                }}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-amber-950 transition hover:bg-amber-400 cursor-pointer"
              >
                Review now
                <ArrowRight size={15} />
              </button>
            </div>
          )}

          {/* Stat cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {activeTab === 'ORGANIZATIONS' ? (
              <>
                <StatCard
                  label="Organizations"
                  value={companies.length}
                  hint="Registered tenants"
                  icon={<Building2 size={22} />}
                  chip="bg-blue-100 text-blue-600"
                />
                <StatCard
                  label="Employees"
                  value={totalEmployeesAcrossPlatform}
                  hint="Across all organizations"
                  icon={<Users size={22} />}
                  chip="bg-violet-100 text-violet-600"
                />
                <StatCard
                  label="Active"
                  value={activeCount}
                  hint="Can sign in"
                  icon={<ShieldCheck size={22} />}
                  chip="bg-green-100 text-green-600"
                  valueClass="text-green-700"
                />
                <StatCard
                  label="Suspended"
                  value={suspendedCount}
                  hint="Access revoked"
                  icon={<ShieldOff size={22} />}
                  chip="bg-red-100 text-red-600"
                  valueClass={suspendedCount > 0 ? 'text-red-700' : 'text-slate-400'}
                />
              </>
            ) : (
              <>
                <StatCard
                  label="Total applications"
                  value={onboardingRequests.length}
                  hint="All time"
                  icon={<FileText size={22} />}
                  chip="bg-blue-100 text-blue-600"
                />
                <StatCard
                  label="Pending"
                  value={pendingRequestsCount}
                  hint="Needs your review"
                  icon={<Clock size={22} />}
                  chip="bg-amber-100 text-amber-700"
                  valueClass={pendingRequestsCount > 0 ? 'text-amber-700' : 'text-slate-400'}
                />
                <StatCard
                  label="Approved"
                  value={approvedRequestsCount}
                  hint="Workspaces created"
                  icon={<CheckCircle size={22} />}
                  chip="bg-green-100 text-green-600"
                  valueClass="text-green-700"
                />
                <StatCard
                  label="Rejected"
                  value={rejectedRequestsCount}
                  hint="Declined"
                  icon={<XCircle size={22} />}
                  chip="bg-red-100 text-red-600"
                  valueClass={rejectedRequestsCount > 0 ? 'text-red-700' : 'text-slate-400'}
                />
              </>
            )}
          </div>

          {/* Toolbar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-sm">
              <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  activeTab === 'ORGANIZATIONS'
                    ? 'Search by name, owner, or ID'
                    : 'Search by company, applicant, or email'
                }
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-9 text-sm text-slate-900 shadow-sm placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {activeTab === 'ORGANIZATIONS' ? (
              <Segmented<CompanyFilter>
                value={companyFilter}
                onChange={setCompanyFilter}
                options={[
                  { key: 'ALL', label: 'All', count: companies.length },
                  { key: 'ACTIVE', label: 'Active', count: activeCount },
                  { key: 'SUSPENDED', label: 'Suspended', count: suspendedCount },
                ]}
              />
            ) : (
              <Segmented<RequestFilter>
                value={onboardingFilter}
                onChange={setOnboardingFilter}
                options={[
                  { key: 'ALL', label: 'All', count: onboardingRequests.length },
                  { key: 'PENDING', label: 'Pending', count: pendingRequestsCount },
                  { key: 'APPROVED', label: 'Approved', count: approvedRequestsCount },
                  { key: 'REJECTED', label: 'Rejected', count: rejectedRequestsCount },
                ]}
              />
            )}
          </div>

          {/* ================= ORGANIZATIONS TABLE ================= */}
          {activeTab === 'ORGANIZATIONS' && (
            <>
              {loading && companies.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-20 shadow-sm">
                  <Loader2 size={26} className="animate-spin text-blue-500" />
                  <p className="mt-3 text-sm text-slate-500">Loading organizations…</p>
                </div>
              ) : filteredCompanies.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-20 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                    <Inbox size={26} />
                  </div>
                  <h3 className="mt-4 text-sm font-semibold text-slate-900">No organizations found</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {hasActiveFilter ? 'Nothing matches your search or filter.' : 'No organizations registered yet.'}
                  </p>
                  {hasActiveFilter && (
                    <button
                      onClick={clearFilters}
                      className="mt-3 text-sm font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
                    <h2 className="text-sm font-semibold text-slate-900">Registered organizations</h2>
                    <span className="text-xs text-slate-500">
                      Showing {filteredCompanies.length} of {companies.length}
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="border-b border-slate-200 bg-slate-50">
                        <tr>
                          <th className={thClass}>Organization</th>
                          <th className={thClass}>Owner</th>
                          <th className={thClass}>Size</th>
                          <th className={thClass}>Timezone</th>
                          <th className={thClass}>Registered</th>
                          <th className={thClass}>Access</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredCompanies.map((company) => {
                          const owner = company.employees?.[0];
                          const isToggling = togglingId === company.id;

                          return (
                            <tr
                              key={company.id}
                              className={`transition ${
                                company.isActive ? 'hover:bg-slate-50' : 'bg-red-50/50 hover:bg-red-50'
                              }`}
                            >
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-3">
                                  <button
                                    type="button"
                                    onClick={() => openCompanyDetails(company.id)}
                                    className="cursor-pointer transition hover:opacity-80"
                                    title="View organization details & module access"
                                  >
                                    <Avatar name={company.name} muted={!company.isActive} />
                                  </button>
                                  <div className="min-w-0">
                                    <button
                                      type="button"
                                      onClick={() => openCompanyDetails(company.id)}
                                      className={`block text-left font-semibold transition cursor-pointer hover:underline ${
                                        company.isActive ? 'text-slate-900 hover:text-blue-600' : 'text-slate-500 hover:text-slate-700'
                                      }`}
                                    >
                                      {company.name}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => copyToClipboard(company.id)}
                                      className="mt-0.5 inline-flex items-center gap-1 font-mono text-xs text-slate-400 transition hover:text-slate-700 cursor-pointer"
                                      title="Copy company ID"
                                    >
                                      {company.id.slice(0, 8)}…
                                      {copiedId === company.id ? (
                                        <Check size={11} className="text-green-600" />
                                      ) : (
                                        <Copy size={11} />
                                      )}
                                    </button>
                                  </div>
                                </div>
                              </td>

                              <td className="px-5 py-4">
                                {owner ? (
                                  <div>
                                    <div className="font-medium text-slate-800">{owner.name}</div>
                                    <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                                      <Mail size={11} />
                                      {owner.email}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-xs italic text-slate-400">No admin assigned</span>
                                )}
                              </td>

                              <td className="px-5 py-4">
                                <div className="flex items-center gap-1.5 text-slate-700">
                                  <Users size={14} className="text-slate-400" />
                                  <span className="font-semibold tabular-nums">{company._count.employees}</span>
                                  <span className="text-xs text-slate-500">
                                    {company.maxEmployees != null ? `/ ${company.maxEmployees} employees` : 'employees · unlimited'}
                                  </span>
                                </div>
                                <div className="mt-0.5 flex items-center gap-1.5 text-slate-700">
                                  <Layers size={14} className="text-slate-400" />
                                  <span className="font-semibold tabular-nums">{company._count.departments}</span>
                                  <span className="text-xs text-slate-500">
                                    {company.maxDepartments != null ? `/ ${company.maxDepartments} depts` : 'depts · unlimited'}
                                  </span>
                                </div>
                              </td>

                              <td className="px-5 py-4 text-slate-600">
                                <div className="flex items-center gap-1.5">
                                  <Globe size={14} className="text-slate-400" />
                                  {company.timezone || 'Asia/Karachi'}
                                </div>
                              </td>

                              <td className="px-5 py-4 text-slate-600">{formatDate(company.createdAt)}</td>

                              <td className="px-5 py-4">
                                <div className="flex items-center gap-2.5">
                                  {isToggling ? (
                                    <Loader2 size={20} className="animate-spin text-slate-400" />
                                  ) : (
                                    <Switch
                                      checked={company.isActive}
                                      label={company.isActive ? `Suspend ${company.name}` : `Activate ${company.name}`}
                                      onChange={() =>
                                        setConfirmToggle({ company, activate: !company.isActive })
                                      }
                                    />
                                  )}
                                  <span
                                    className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                                      company.isActive ? 'text-green-700' : 'text-red-700'
                                    }`}
                                  >
                                    <span
                                      className={`h-2 w-2 rounded-full ${
                                        company.isActive ? 'bg-green-500' : 'bg-red-500'
                                      }`}
                                    />
                                    {company.isActive ? 'Active' : 'Suspended'}
                                  </span>

                                  <button
                                    type="button"
                                    onClick={() => openCompanyDetails(company.id)}
                                    className="ml-auto inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-2xs hover:border-blue-300 hover:bg-blue-50/50 hover:text-blue-700 transition cursor-pointer"
                                    title="View organization details & module access"
                                  >
                                    <Sliders size={12} className="text-blue-600" />
                                    Details
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ================= ONBOARDING TABLE ================= */}
          {activeTab === 'ONBOARDING' && (
            <>
              {loading && onboardingRequests.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-20 shadow-sm">
                  <Loader2 size={26} className="animate-spin text-blue-500" />
                  <p className="mt-3 text-sm text-slate-500">Loading applications…</p>
                </div>
              ) : filteredRequests.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-20 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                    <Inbox size={26} />
                  </div>
                  <h3 className="mt-4 text-sm font-semibold text-slate-900">No requests found</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {hasActiveFilter ? 'No requests match your filters.' : 'No onboarding requests at this time.'}
                  </p>
                  {hasActiveFilter && (
                    <button
                      onClick={clearFilters}
                      className="mt-3 text-sm font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
                    <h2 className="text-sm font-semibold text-slate-900">Applications</h2>
                    <span className="text-xs text-slate-500">
                      Showing {filteredRequests.length} of {onboardingRequests.length}
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="border-b border-slate-200 bg-slate-50">
                        <tr>
                          <th className={thClass}>Organization</th>
                          <th className={thClass}>Applicant</th>
                          <th className={thClass}>Timezone</th>
                          <th className={thClass}>Submitted</th>
                          <th className={thClass}>Status</th>
                          <th className={`${thClass} text-right`}>Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredRequests.map((req) => {
                          const isProcessing = processingRequestId === req.id;

                          return (
                            <tr
                              key={req.id}
                              className={`transition ${
                                req.status === 'PENDING' ? 'bg-amber-50/50 hover:bg-amber-50' : 'hover:bg-slate-50'
                              }`}
                            >
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-3">
                                  <Avatar name={req.companyName} />
                                  <div className="min-w-0">
                                    <div className="font-semibold text-slate-900">{req.companyName}</div>
                                    <div className="mt-0.5 font-mono text-xs text-slate-400">
                                      {req.id.slice(0, 8)}…
                                    </div>
                                  </div>
                                </div>
                              </td>

                              <td className="px-5 py-4">
                                <div className="font-medium text-slate-800">{req.adminName}</div>
                                <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                                  <Mail size={11} />
                                  {req.adminEmail}
                                </div>
                              </td>

                              <td className="px-5 py-4 text-slate-600">
                                <div className="flex items-center gap-1.5">
                                  <Globe size={14} className="text-slate-400" />
                                  {req.timezone}
                                </div>
                              </td>

                              <td className="px-5 py-4 text-slate-600">{formatDate(req.createdAt, true)}</td>

                              <td className="px-5 py-4">
                                {req.status === 'PENDING' && (
                                  <div>
                                    <StatusPill tone="amber" icon={<Clock size={12} />}>
                                      Pending review
                                    </StatusPill>
                                    <div className="mt-1 text-xs text-amber-800/80">{waitingLabel(req.createdAt)}</div>
                                  </div>
                                )}
                                {req.status === 'APPROVED' && (
                                  <div>
                                    <StatusPill tone="green" icon={<CheckCircle size={12} />}>
                                      Approved
                                    </StatusPill>
                                    <div className="mt-1 text-xs text-slate-500">
                                      {req.reviewedAt ? formatDate(req.reviewedAt) : ''}
                                      {req.reviewedBy ? ` · ${req.reviewedBy}` : ''}
                                    </div>
                                  </div>
                                )}
                                {req.status === 'REJECTED' && (
                                  <div>
                                    <StatusPill tone="red" icon={<XCircle size={12} />}>
                                      Rejected
                                    </StatusPill>
                                    <div className="mt-1 max-w-[220px] truncate text-xs text-slate-500" title={req.rejectionReason || undefined}>
                                      {req.rejectionReason
                                        ? req.rejectionReason
                                        : `${req.reviewedAt ? formatDate(req.reviewedAt) : ''}${
                                            req.reviewedBy ? ` · ${req.reviewedBy}` : ''
                                          }`}
                                    </div>
                                  </div>
                                )}
                              </td>

                              <td className="px-5 py-4 text-right">
                                {isProcessing ? (
                                  <Loader2 size={18} className="ml-auto animate-spin text-slate-400" />
                                ) : req.status === 'PENDING' ? (
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setRejectModal(req)}
                                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700 cursor-pointer"
                                    >
                                      Reject
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setConfirmApproveModal(req)}
                                      className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-green-700 cursor-pointer"
                                    >
                                      <Check size={13} />
                                      Approve
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-xs text-slate-400">No action needed</span>
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
            </>
          )}
        </main>
      </div>

      {/* ============ Modals ============ */}

      {confirmToggle && (
        <Modal
          title={confirmToggle.activate ? 'Activate organization' : 'Suspend organization'}
          subtitle={confirmToggle.company.name}
          icon={confirmToggle.activate ? <ShieldCheck size={22} /> : <ShieldOff size={22} />}
          iconClass={confirmToggle.activate ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}
          onClose={closeToggleModal}
          footer={
            <>
              <button type="button" onClick={closeToggleModal} className={btnSecondary}>
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleToggleStatus(confirmToggle.company, confirmToggle.activate)}
                className={confirmToggle.activate ? btnSuccess : btnDanger}
              >
                {confirmToggle.activate ? 'Activate' : 'Suspend'}
              </button>
            </>
          }
        >
          {confirmToggle.activate ? (
            <p>
              All employees and admins of <strong className="text-slate-900">{confirmToggle.company.name}</strong>{' '}
              will regain access immediately.
            </p>
          ) : (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-red-800">
              <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
              <p>
                All employees and admins of <strong>{confirmToggle.company.name}</strong> will be blocked from
                signing in immediately. Access stays blocked until you reactivate the organization.
              </p>
            </div>
          )}
        </Modal>
      )}

      {confirmApproveModal && (
        <Modal
          title="Approve application"
          subtitle={confirmApproveModal.companyName}
          icon={<CheckCircle size={22} />}
          iconClass="bg-green-100 text-green-600"
          onClose={closeApproveModal}
          footer={
            <>
              <button type="button" onClick={closeApproveModal} className={btnSecondary}>
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleApproveRequest(confirmApproveModal)}
                className={btnSuccess}
              >
                Approve &amp; onboard
              </button>
            </>
          }
        >
          <dl className="mb-4 divide-y divide-slate-100 rounded-xl border border-slate-200 text-sm">
            {[
              ['Company', confirmApproveModal.companyName],
              ['Super admin', confirmApproveModal.adminName],
              ['Email', confirmApproveModal.adminEmail],
              ['Timezone', confirmApproveModal.timezone],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 px-3.5 py-2.5">
                <dt className="text-slate-500">{label}</dt>
                <dd className="truncate font-medium text-slate-900">{value}</dd>
              </div>
            ))}
          </dl>
          <p>
            This creates the company record, provisions the Super Admin account, and sends an activation email to{' '}
            <strong className="text-slate-900">{confirmApproveModal.adminEmail}</strong>.
          </p>
        </Modal>
      )}

      {rejectModal && (
        <Modal
          title="Reject application"
          subtitle={rejectModal.companyName}
          icon={<XCircle size={22} />}
          iconClass="bg-red-100 text-red-600"
          onClose={closeRejectModal}
          footer={
            <>
              <button type="button" onClick={closeRejectModal} className={btnSecondary}>
                Cancel
              </button>
              <button type="button" onClick={() => handleRejectRequest(rejectModal)} className={btnDanger}>
                Reject request
              </button>
            </>
          }
        >
          <p className="mb-4">
            The organization for <strong className="text-slate-900">{rejectModal.companyName}</strong> (
            {rejectModal.adminEmail}) will not be created.
          </p>
          <label htmlFor="rejection-reason" className="mb-1.5 block text-sm font-semibold text-slate-700">
            Reason <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <textarea
            id="rejection-reason"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="e.g. Unverified organization or duplicate registration"
            rows={3}
            className="w-full rounded-xl border border-slate-300 p-3 text-sm text-slate-900 placeholder-slate-400 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
          />
        </Modal>
      )}

      {/* ============ Organization Details & Module Access Modal ============ */}
      {selectedCompanyId && (
        <Modal
          title={companyDetails?.name || 'Organization Details'}
          subtitle={companyDetails ? `ID: ${companyDetails.id}` : 'Loading details…'}
          icon={<Building2 size={22} />}
          iconClass="bg-blue-100 text-blue-600"
          maxWidth="max-w-3xl"
          onClose={() => {
            setSelectedCompanyId(null);
            setCompanyDetails(null);
          }}
          footer={
            <>
              <button
                type="button"
                onClick={() => {
                  setSelectedCompanyId(null);
                  setCompanyDetails(null);
                }}
                className={btnSecondary}
              >
                Close
              </button>
              {detailsSubTab === 'FEATURES' && (
                <button
                  type="button"
                  disabled={savingFeatures || loadingDetails}
                  onClick={handleSaveFeatures}
                  className={`${btnSuccess} flex items-center gap-1.5`}
                >
                  {savingFeatures ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <Check size={15} />
                      Save Module Access
                    </>
                  )}
                </button>
              )}
              {detailsSubTab === 'LIMITS' && (
                <button
                  type="button"
                  disabled={savingLimits || loadingDetails}
                  onClick={handleSaveLimits}
                  className={`${btnSuccess} flex items-center gap-1.5`}
                >
                  {savingLimits ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <Check size={15} />
                      Save Capacity Limits
                    </>
                  )}
                </button>
              )}
            </>
          }
        >
          {loadingDetails || !companyDetails ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 size={28} className="animate-spin text-blue-600" />
              <p className="mt-3 text-sm text-slate-500">Loading organization details and module settings…</p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Top Status & Tabs Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                      companyDetails.isActive
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        companyDetails.isActive ? 'bg-green-500' : 'bg-red-500'
                      }`}
                    />
                    {companyDetails.isActive ? 'Active Tenant' : 'Suspended Tenant'}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                    <Globe size={12} className="text-slate-400" />
                    {companyDetails.timezone}
                  </span>
                </div>

                {/* Sub tabs */}
                <div className="flex items-center rounded-xl bg-slate-100 p-1 text-xs font-medium text-slate-600">
                  <button
                    type="button"
                    onClick={() => setDetailsSubTab('FEATURES')}
                    className={`rounded-lg px-3 py-1.5 transition cursor-pointer ${
                      detailsSubTab === 'FEATURES'
                        ? 'bg-white font-semibold text-blue-700 shadow-xs'
                        : 'hover:text-slate-900'
                    }`}
                  >
                    Module Permissions
                  </button>
                  <button
                    type="button"
                    onClick={() => setDetailsSubTab('LIMITS')}
                    className={`rounded-lg px-3 py-1.5 transition cursor-pointer ${
                      detailsSubTab === 'LIMITS'
                        ? 'bg-white font-semibold text-blue-700 shadow-xs'
                        : 'hover:text-slate-900'
                    }`}
                  >
                    Capacity Limits
                  </button>
                  <button
                    type="button"
                    onClick={() => setDetailsSubTab('OVERVIEW')}
                    className={`rounded-lg px-3 py-1.5 transition cursor-pointer ${
                      detailsSubTab === 'OVERVIEW'
                        ? 'bg-white font-semibold text-blue-700 shadow-xs'
                        : 'hover:text-slate-900'
                    }`}
                  >
                    Work Setup &amp; Owner
                  </button>
                  <button
                    type="button"
                    onClick={() => setDetailsSubTab('DEPARTMENTS')}
                    className={`rounded-lg px-3 py-1.5 transition cursor-pointer ${
                      detailsSubTab === 'DEPARTMENTS'
                        ? 'bg-white font-semibold text-blue-700 shadow-xs'
                        : 'hover:text-slate-900'
                    }`}
                  >
                    Departments &amp; Staff ({companyDetails.stats.totalEmployees})
                  </button>
                </div>
              </div>

              {/* TAB 1: MODULE PERMISSIONS */}
              {detailsSubTab === 'FEATURES' && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3.5 text-xs text-blue-900">
                    <p className="font-semibold">Granular Organization Entitlements</p>
                    <p className="mt-0.5 text-blue-700">
                      Toggle modules on or off for this organization. Restricted modules are immediately hidden from all sidebar menus and direct API access is rejected with a 403 Forbidden.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {AVAILABLE_FEATURES.map((feat) => {
                      const Icon = feat.icon;
                      const isEnabled = editingFeatures[feat.key] !== false;

                      return (
                        <div
                          key={feat.key}
                          className={`flex items-start justify-between gap-3 rounded-xl border p-3.5 transition ${
                            isEnabled
                              ? 'border-slate-200 bg-white hover:border-blue-200'
                              : 'border-amber-200 bg-amber-50/40'
                          }`}
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <div
                              className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${
                                isEnabled
                                  ? 'bg-blue-100 text-blue-600'
                                  : 'bg-amber-100 text-amber-700'
                              }`}
                            >
                              <Icon size={18} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-900 text-sm">
                                  {feat.name}
                                </span>
                                <span
                                  className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                                    isEnabled
                                      ? 'bg-green-100 text-green-700'
                                      : 'bg-amber-200 text-amber-800'
                                  }`}
                                >
                                  {isEnabled ? 'Enabled' : 'Restricted'}
                                </span>
                              </div>
                              <p className="mt-1 text-xs text-slate-500 line-clamp-2">
                                {feat.description}
                              </p>
                            </div>
                          </div>

                          <div className="flex-shrink-0 pt-0.5">
                            <Switch
                              checked={isEnabled}
                              label={`Toggle ${feat.name}`}
                              onChange={() => {
                                setEditingFeatures((prev) => ({
                                  ...prev,
                                  [feat.key]: !isEnabled,
                                }));
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 2: CAPACITY LIMITS */}
              {detailsSubTab === 'LIMITS' && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3.5 text-xs text-blue-900">
                    <p className="font-semibold">Plan capacity for this organization</p>
                    <p className="mt-0.5 text-blue-700">
                      Caps block new employees and departments once reached. Existing records stay; lowering a cap below current usage only prevents further growth. Null/unlimited removes the cap.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                          <Users size={18} />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900">Employee seats</h3>
                          <p className="text-xs text-slate-500">
                            Using {companyDetails.stats.activeEmployees}
                            {companyDetails.maxEmployees != null ? ` of ${companyDetails.maxEmployees}` : ' (unlimited)'}
                          </p>
                        </div>
                      </div>
                      <label className="mt-3 flex items-center gap-2 text-xs font-medium text-slate-600">
                        <input
                          type="checkbox"
                          checked={editingLimits.unlimitedEmployees}
                          onChange={(e) =>
                            setEditingLimits((prev) => ({
                              ...prev,
                              unlimitedEmployees: e.target.checked,
                              maxEmployees: e.target.checked ? prev.maxEmployees : prev.maxEmployees || 50,
                            }))
                          }
                        />
                        Unlimited employees
                      </label>
                      <input
                        type="number"
                        min={1}
                        disabled={editingLimits.unlimitedEmployees}
                        value={editingLimits.unlimitedEmployees ? '' : editingLimits.maxEmployees ?? ''}
                        onChange={(e) =>
                          setEditingLimits((prev) => ({
                            ...prev,
                            maxEmployees: e.target.value === '' ? null : Number(e.target.value),
                          }))
                        }
                        className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 disabled:bg-slate-50 disabled:text-slate-400"
                        placeholder="e.g. 50"
                      />
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                          <Layers size={18} />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900">Departments</h3>
                          <p className="text-xs text-slate-500">
                            Using {companyDetails.stats.totalDepartments}
                            {companyDetails.maxDepartments != null ? ` of ${companyDetails.maxDepartments}` : ' (unlimited)'}
                          </p>
                        </div>
                      </div>
                      <label className="mt-3 flex items-center gap-2 text-xs font-medium text-slate-600">
                        <input
                          type="checkbox"
                          checked={editingLimits.unlimitedDepartments}
                          onChange={(e) =>
                            setEditingLimits((prev) => ({
                              ...prev,
                              unlimitedDepartments: e.target.checked,
                              maxDepartments: e.target.checked ? prev.maxDepartments : prev.maxDepartments || 10,
                            }))
                          }
                        />
                        Unlimited departments
                      </label>
                      <input
                        type="number"
                        min={1}
                        disabled={editingLimits.unlimitedDepartments}
                        value={editingLimits.unlimitedDepartments ? '' : editingLimits.maxDepartments ?? ''}
                        onChange={(e) =>
                          setEditingLimits((prev) => ({
                            ...prev,
                            maxDepartments: e.target.value === '' ? null : Number(e.target.value),
                          }))
                        }
                        className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 disabled:bg-slate-50 disabled:text-slate-400"
                        placeholder="e.g. 10"
                      />
                    </div>
                  </div>

                  {(companyDetails.maxEmployees != null &&
                    companyDetails.stats.activeEmployees >= companyDetails.maxEmployees) ||
                  (companyDetails.maxDepartments != null &&
                    companyDetails.stats.totalDepartments >= companyDetails.maxDepartments) ? (
                    <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                      <Gauge size={14} className="mt-0.5 flex-shrink-0" />
                      <span>This organization is currently at one or more caps. New creates will be rejected until you raise the limit.</span>
                    </div>
                  ) : null}
                </div>
              )}

              {/* TAB 3: WORK SETUP & OWNER */}
              {detailsSubTab === 'OVERVIEW' && (
                <div className="space-y-4">
                  {/* Super admin owner card */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Organization Super Admin (Owner)
                    </h3>
                    {companyDetails.employees && companyDetails.employees.length > 0 ? (
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-2 text-slate-800">
                          <Users size={15} className="text-slate-400" />
                          <span className="font-medium">{companyDetails.employees[0].name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-800">
                          <Mail size={15} className="text-slate-400" />
                          <span>{companyDetails.employees[0].email}</span>
                        </div>
                        {companyDetails.employees[0].profile?.phone && (
                          <div className="flex items-center gap-2 text-slate-800">
                            <Phone size={15} className="text-slate-400" />
                            <span>{companyDetails.employees[0].profile.phone}</span>
                          </div>
                        )}
                        {companyDetails.employees[0].profile?.designation && (
                          <div className="flex items-center gap-2 text-slate-800">
                            <Briefcase size={15} className="text-slate-400" />
                            <span>{companyDetails.employees[0].profile.designation}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Clock size={14} className="text-slate-400" />
                          <span>Joined {formatDate(companyDetails.employees[0].createdAt)}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-2 text-xs italic text-slate-400">No Super Admin record found</p>
                    )}
                  </div>

                  {/* Operational Settings */}
                  <div className="rounded-xl border border-slate-200 p-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                      Work &amp; Attendance Configuration
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                      <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-100">
                        <span className="text-slate-500">Standard Work Day</span>
                        <div className="mt-1 font-semibold text-slate-800 text-sm">
                          {Math.floor(companyDetails.workMinutesPerDay / 60)} hrs ({companyDetails.workMinutesPerDay} mins)
                        </div>
                      </div>
                      <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-100">
                        <span className="text-slate-500">Break Allocation</span>
                        <div className="mt-1 font-semibold text-slate-800 text-sm">
                          {companyDetails.breakMinutesAllocated} mins
                        </div>
                      </div>
                      <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-100">
                        <span className="text-slate-500">Grace Period</span>
                        <div className="mt-1 font-semibold text-slate-800 text-sm">
                          {companyDetails.gracePeriodMinutes} mins
                        </div>
                      </div>
                      <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-100">
                        <span className="text-slate-500">Expected Check-in</span>
                        <div className="mt-1 font-semibold text-slate-800 text-sm">
                          {String(companyDetails.expectedCheckinHour).padStart(2, '0')}:
                          {String(companyDetails.expectedCheckinMinute).padStart(2, '0')}
                        </div>
                      </div>
                      <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-100">
                        <span className="text-slate-500">Office Radius</span>
                        <div className="mt-1 font-semibold text-slate-800 text-sm">
                          {companyDetails.officeRadius || 70} meters
                        </div>
                      </div>
                      <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-100">
                        <span className="text-slate-500">Registered Date</span>
                        <div className="mt-1 font-semibold text-slate-800 text-sm">
                          {formatDate(companyDetails.createdAt)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: DEPARTMENTS & STAFF */}
              {detailsSubTab === 'DEPARTMENTS' && (
                <div className="space-y-4">
                  {/* Role metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                      <span className="text-slate-500">Super Admins</span>
                      <div className="mt-1 text-base font-bold text-slate-900">
                        {companyDetails.stats.roles.superAdmin}
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                      <span className="text-slate-500">HR Admins</span>
                      <div className="mt-1 text-base font-bold text-slate-900">
                        {companyDetails.stats.roles.admin}
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                      <span className="text-slate-500">Managers</span>
                      <div className="mt-1 text-base font-bold text-slate-900">
                        {companyDetails.stats.roles.manager}
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                      <span className="text-slate-500">Employees</span>
                      <div className="mt-1 text-base font-bold text-slate-900">
                        {companyDetails.stats.roles.employee}
                      </div>
                    </div>
                  </div>

                  {/* Department list */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                      Departments ({companyDetails.departments.length})
                    </h3>
                    {companyDetails.departments.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
                        No departments created yet in this organization.
                      </p>
                    ) : (
                      <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
                        {companyDetails.departments.map((dept) => (
                          <div key={dept.id} className="flex items-center justify-between p-3 text-xs">
                            <div>
                              <div className="font-semibold text-slate-800 text-sm">{dept.name}</div>
                              <div className="mt-0.5 text-slate-500">
                                {dept.admins.length > 0
                                  ? `HR Lead: ${dept.admins.map((a) => a.employee.name).join(', ')}`
                                  : 'No HR lead assigned'}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 font-semibold text-slate-700">
                              <Users size={13} className="text-slate-400" />
                              <span>{dept._count.employees} staff</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </Modal>
      )}

      {/* ============ Toast ============ */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-[60] max-w-sm" role="status">
          <div className="flex items-start gap-2.5 rounded-xl bg-slate-900 px-4 py-3 text-sm text-white shadow-xl">
            {toast.type === 'success' ? (
              <CheckCircle size={17} className="mt-0.5 flex-shrink-0 text-green-400" />
            ) : (
              <AlertTriangle size={17} className="mt-0.5 flex-shrink-0 text-red-400" />
            )}
            <span className="flex-1">{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="text-slate-400 hover:text-white cursor-pointer"
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}