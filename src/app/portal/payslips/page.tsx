'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Wallet,
  Download,
  ChevronDown,
  ChevronUp,
  DollarSign,
  TrendingUp,
  TrendingDown,
  FileText,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

interface Payslip {
  id: string;
  month: number;
  year: number;
  grossSalary: number;
  totalDeductions: number;
  netSalary: number;
  paymentStatus: string;
  paidAt?: string | null;
  baseSalary?: number;
  houseRentAllowance?: number;
  transportAllowance?: number;
  medicalAllowance?: number;
  otherAllowance?: number;
  taxDeduction?: number;
  otherDeduction?: number;
}

interface YTDStats {
  gross: number;
  deductions: number;
  net: number;
}

interface PayslipApiResponse {
  grossSalary?: number;
  grossAmount?: number;
  netSalary?: number;
  netAmount?: number;
  amount?: number;
  totalDeductions?: number;
  paymentStatus?: string;
  status?: string;
  paidAt?: string | null;
  paymentDate?: string | null;
}

const formatCurrency = (amount?: number | null) => {
  return (amount ?? 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const getMonthName = (month: number, year: number) => {
  const d = new Date(year, month - 1, 1);
  return d.toLocaleString('default', { month: 'long', year: 'numeric' });
};

export default function MyPayslipsPage() {
  const [payments, setPayments] = useState<Payslip[]>([]);
  const [ytd, setYtd] = useState<YTDStats>({ gross: 0, deductions: 0, net: 0 });
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const loadPayslips = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await api.get('/salary/me/payslips');
      const normalizedPayments = (res.data?.payments || []).map((slip: PayslipApiResponse) => ({
        ...slip,
        grossSalary: slip.grossSalary ?? slip.grossAmount ?? 0,
        netSalary: slip.netSalary ?? slip.netAmount ?? slip.amount ?? 0,
        totalDeductions: slip.totalDeductions ?? 0,
        paymentStatus: slip.paymentStatus ?? slip.status ?? 'PAID',
        paidAt: slip.paidAt ?? slip.paymentDate ?? null,
      }));
      setPayments(normalizedPayments);
      setYtd(res.data?.ytd || { gross: 0, deductions: 0, net: 0 });
    } catch (err: unknown) {
      console.error('Failed to load payslips:', err);
      setErrorMsg('Could not load payslip history.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPayslips();
  }, [loadPayslips]);

  const handleDownload = async (slip: Payslip) => {
    try {
      setDownloadingId(slip.id);
      const res = await api.get(`/salary/me/payslips/${slip.id}/pdf`, {
        responseType: 'blob',
      });

      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payslip-${slip.year}-${String(slip.month).padStart(2, '0')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: unknown) {
      console.error('Download payslip error:', err);
      alert('Could not download payslip PDF.');
    } finally {
      setDownloadingId(null);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
          <Wallet className="text-blue-600" size={26} />
          <span>My Payslips &amp; Earnings</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Access your disbursed salary records, tax withholdings, and official branded PDF payslips.
        </p>
      </div>

      {/* Alerts */}
      {errorMsg && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 flex items-center justify-between text-sm text-red-800">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} className="text-red-600 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')} className="text-xs font-bold text-red-600">Dismiss</button>
        </div>
      )}

      {/* Year-To-Date (YTD) Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-5 text-white shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-200">YTD Net Payout</span>
            <span className="p-1.5 rounded-xl bg-white/10 text-white">
              <TrendingUp size={16} />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black mt-3 tabular-nums">
            ${formatCurrency(ytd.net)}
          </div>
          <p className="text-[11px] text-blue-100/80 mt-1">Total take-home salary this financial year</p>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">YTD Gross Earnings</span>
            <span className="p-1.5 rounded-xl bg-slate-100 text-slate-600">
              <DollarSign size={16} />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-3 tabular-nums">
            ${formatCurrency(ytd.gross)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Base pay + recurring allowances</p>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">YTD Deductions</span>
            <span className="p-1.5 rounded-xl bg-rose-50 text-rose-600">
              <TrendingDown size={16} />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-600 mt-3 tabular-nums">
            ${formatCurrency(ytd.deductions)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Withholding taxes &amp; contributions</p>
        </div>

      </div>

      {/* Payslips Feed */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Payment History ({payments.length})
          </span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <Loader2 size={32} className="animate-spin mx-auto mb-2 text-blue-600" />
            <p className="text-xs font-semibold">Loading your payslips...</p>
          </div>
        ) : payments.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <FileText size={36} className="mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-bold text-slate-700">No payslips issued yet</p>
            <p className="text-xs text-slate-400 mt-0.5">Disbursed salary records will appear here as soon as HR processes payroll.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {payments.map((slip) => {
              const isExpanded = expandedId === slip.id;
              const isDownloading = downloadingId === slip.id;

              return (
                <div key={slip.id} className="transition">
                  {/* Primary Row */}
                  <div className="p-5 hover:bg-slate-50/80 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    
                    {/* Month & Status */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-base">
                          {getMonthName(slip.month, slip.year)}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 size={11} />
                          <span>PAID</span>
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        {slip.paidAt ? `Paid on ${new Date(slip.paidAt).toLocaleDateString()}` : 'Disbursed'}
                      </p>
                    </div>

                    {/* Financial Figures */}
                    <div className="flex items-center gap-6">
                      <div className="text-left sm:text-right">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Net Take-Home</span>
                        <span className="text-lg font-black text-slate-900 tabular-nums block">
                          ${formatCurrency(slip.netSalary)}
                        </span>
                      </div>

                      {/* Download PDF button */}
                      <button
                        onClick={() => handleDownload(slip)}
                        disabled={isDownloading}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200 transition disabled:opacity-50"
                        title="Download official PDF payslip"
                      >
                        {isDownloading ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Download size={14} />
                        )}
                        <span className="hidden md:inline">Download PDF</span>
                      </button>

                      {/* Expand button */}
                      <button
                        onClick={() => toggleExpand(slip.id)}
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                        aria-label="Toggle breakdown"
                      >
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                    </div>

                  </div>

                  {/* Expandable Breakdown Drawer */}
                  {isExpanded && (
                    <div className="bg-slate-50 px-6 py-5 border-t border-slate-100 animate-in fade-in duration-150">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* Earnings Section */}
                        <div className="space-y-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
                            Earnings Breakdown
                          </span>
                          <div className="flex justify-between text-xs text-slate-600 py-1 border-b border-slate-200/60">
                            <span>Base Salary</span>
                            <span className="font-bold text-slate-900">${formatCurrency(slip.baseSalary)}</span>
                          </div>
                          <div className="flex justify-between text-xs text-slate-600 py-1 border-b border-slate-200/60">
                            <span>House Rent Allowance (HRA)</span>
                            <span className="font-bold text-slate-900">${formatCurrency(slip.houseRentAllowance)}</span>
                          </div>
                          <div className="flex justify-between text-xs text-slate-600 py-1 border-b border-slate-200/60">
                            <span>Transport Allowance</span>
                            <span className="font-bold text-slate-900">${formatCurrency(slip.transportAllowance)}</span>
                          </div>
                          <div className="flex justify-between text-xs text-slate-600 py-1 border-b border-slate-200/60">
                            <span>Medical Allowance</span>
                            <span className="font-bold text-slate-900">${formatCurrency(slip.medicalAllowance)}</span>
                          </div>
                          <div className="flex justify-between text-xs text-slate-600 py-1 border-b border-slate-200/60">
                            <span>Other Allowances</span>
                            <span className="font-bold text-slate-900">${formatCurrency(slip.otherAllowance)}</span>
                          </div>
                          <div className="flex justify-between text-xs font-bold text-slate-900 pt-2">
                            <span>Total Gross Earnings</span>
                            <span className="text-blue-600">${formatCurrency(slip.grossSalary)}</span>
                          </div>
                        </div>

                        {/* Deductions Section */}
                        <div className="space-y-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
                            Deductions Breakdown
                          </span>
                          <div className="flex justify-between text-xs text-slate-600 py-1 border-b border-slate-200/60">
                            <span>Income Tax Deduction</span>
                            <span className="font-bold text-rose-600">${formatCurrency(slip.taxDeduction)}</span>
                          </div>
                          <div className="flex justify-between text-xs text-slate-600 py-1 border-b border-slate-200/60">
                            <span>Other Deductions</span>
                            <span className="font-bold text-rose-600">${formatCurrency(slip.otherDeduction)}</span>
                          </div>
                          <div className="flex justify-between text-xs font-bold text-slate-900 pt-2">
                            <span>Total Deductions</span>
                            <span className="text-rose-600">-${formatCurrency(slip.totalDeductions)}</span>
                          </div>
                        </div>

                      </div>
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
