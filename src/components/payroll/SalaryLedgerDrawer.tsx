'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Building2,
  Calendar,
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  History,
  Loader2,
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatDateDMY } from '@/lib/datetime';
import { useToast } from '@/components/ui/toast';

export interface SalaryLedgerRecord {
  id: string;
  employeeId: string;
  month: number;
  year: number;
  amount: number;
  netAmount: number;
  baseSalary: number;
  houseRentAllowance: number;
  transportAllowance: number;
  medicalAllowance: number;
  otherAllowance: number;
  taxDeduction: number;
  otherDeduction: number;
  grossAmount: number;
  totalDeductions: number;
  status: 'PAID' | 'PENDING';
  paymentDate: string | null;
  referenceId: string | null;
  createdAt: string;
}

interface SalaryLedgerDrawerProps {
  employeeId: string | null;
  employeeName?: string | null;
  employeeCode?: string | null;
  departmentName?: string | null;
  isOpen: boolean;
  onClose: () => void;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const formatCurrency = (val: number | null | undefined) =>
  `PKR ${Number(val ?? 0).toLocaleString('en-PK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function SalaryLedgerDrawer({
  employeeId,
  employeeName,
  employeeCode,
  departmentName,
  isOpen,
  onClose,
}: SalaryLedgerDrawerProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<SalaryLedgerRecord[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);

  // Clear records when the drawer closes so the next open starts fresh.
  useEffect(() => {
    if (!isOpen) {
      const timer = window.setTimeout(() => setRecords([]), 300);
      return () => window.clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !employeeId) return;

    let active = true;

    queueMicrotask(() => {
      if (active) setLoading(true);
    });

    api
      .get<SalaryLedgerRecord[]>(`/salary/${employeeId}/history`)
      .then((res) => {
        if (!active) return;
        setRecords(Array.isArray(res.data) ? res.data : []);
      })
      .catch((err) => {
        if (!active) return;
        console.error('Failed to load salary payment ledger:', err);
        toast.error('Could not load salary history for this employee.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen, employeeId, toast]);

  const availableYears = useMemo(() => {
    const years = Array.from(new Set(records.map((r) => r.year)));
    return years.sort((a, b) => b - a);
  }, [records]);

  const filteredRecords = useMemo(() => {
    if (selectedYear === 'ALL') return records;
    const yearNum = Number(selectedYear);
    return records.filter((r) => r.year === yearNum);
  }, [records, selectedYear]);

  const summary = useMemo(() => {
    const paidRecords = filteredRecords.filter((r) => r.status === 'PAID');
    const totalPaid = paidRecords.reduce((sum, r) => sum + r.netAmount, 0);
    const totalGross = paidRecords.reduce((sum, r) => sum + r.grossAmount, 0);
    const totalDeductions = paidRecords.reduce((sum, r) => sum + r.totalDeductions, 0);
    const pendingCount = filteredRecords.filter((r) => r.status !== 'PAID').length;

    return {
      totalPaid,
      totalGross,
      totalDeductions,
      paidCycles: paidRecords.length,
      pendingCount,
    };
  }, [filteredRecords]);

  const handleDownloadPayslip = async (record: SalaryLedgerRecord) => {
    if (!employeeId) return;
    const key = `${record.year}-${record.month}`;
    setDownloadingKey(key);

    try {
      const res = await api.get(`/salary/${employeeId}/payslip`, {
        params: { month: record.month, year: record.year },
        responseType: 'blob',
      });

      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `payslip-${employeeCode || 'EMP'}-${record.year}-${String(record.month).padStart(2, '0')}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Payslip download failed:', err);
      toast.error('Could not download payslip for this cycle.');
    } finally {
      setDownloadingKey(null);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="relative w-full max-w-3xl bg-white shadow-2xl flex flex-col h-full z-10 border-l border-slate-200"
          >
            {/* Drawer Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100/70 text-blue-700 flex items-center justify-center shadow-xs">
                  <Wallet size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-800 tracking-tight">
                      Salary Payment Ledger
                    </h2>
                    {employeeCode && (
                      <span className="text-xs font-mono font-medium bg-slate-200/80 text-slate-700 px-2 py-0.5 rounded-md">
                        {employeeCode}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                    <span className="font-semibold text-slate-700">{employeeName || 'Employee'}</span>
                    {departmentName && (
                      <>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1">
                          <Building2 size={12} className="text-slate-400" />
                          {departmentName}
                        </span>
                      </>
                    )}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                aria-label="Close ledger drawer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Filter Bar & Quick Stats */}
            <div className="px-6 py-4 bg-slate-50/30 border-b border-slate-100 space-y-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <Calendar size={15} className="text-slate-400" />
                  <span className="text-xs font-semibold text-slate-600">Cycle Year:</span>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="ALL">All Years ({records.length})</option>
                    {availableYears.map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="text-xs text-slate-500">
                  Showing <span className="font-semibold text-slate-700">{filteredRecords.length}</span> payment cycles
                </div>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Total Disbursed
                  </span>
                  <p className="text-sm sm:text-base font-bold text-emerald-700">
                    {formatCurrency(summary.totalPaid)}
                  </p>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Gross Earnings
                  </span>
                  <p className="text-sm sm:text-base font-bold text-slate-800">
                    {formatCurrency(summary.totalGross)}
                  </p>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Total Deductions
                  </span>
                  <p className="text-sm sm:text-base font-bold text-rose-600">
                    {formatCurrency(summary.totalDeductions)}
                  </p>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Cycles Summary
                  </span>
                  <p className="text-xs font-semibold text-slate-700 mt-0.5">
                    <span className="text-emerald-700">{summary.paidCycles} Paid</span>
                    {summary.pendingCount > 0 && (
                      <span className="text-amber-600 ml-1.5">• {summary.pendingCount} Pending</span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Ledger Records Table */}
            <div className="flex-1 overflow-y-auto p-6">
              {loading ? (
                <div className="h-64 flex flex-col items-center justify-center text-slate-400">
                  <Loader2 size={28} className="animate-spin text-blue-600 mb-3" />
                  <p className="text-xs font-medium">Fetching salary ledger records...</p>
                </div>
              ) : filteredRecords.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                  <History size={32} className="text-slate-300 mb-2" />
                  <p className="text-sm font-semibold text-slate-700">No payment records found</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm">
                    No payroll cycles have been processed or logged for this employee yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredRecords.map((item) => {
                    const monthName = MONTH_NAMES[item.month - 1] || `Month ${item.month}`;
                    const isPaid = item.status === 'PAID';
                    const key = `${item.year}-${item.month}`;
                    const isDownloading = downloadingKey === key;

                    return (
                      <div
                        key={item.id}
                        className={`border rounded-xl p-4 transition-all ${
                          isPaid
                            ? 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                            : 'bg-amber-50/30 border-amber-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          {/* Cycle & Status */}
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                isPaid ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-100 text-amber-700'
                              }`}
                            >
                              {isPaid ? <CheckCircle2 size={18} /> : <Clock3 size={18} />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-sm font-bold text-slate-800">
                                  {monthName} {item.year}
                                </h3>
                                <span
                                  className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                    isPaid
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                                  }`}
                                >
                                  {isPaid ? 'Paid' : 'Pending'}
                                </span>
                              </div>
                              <p className="text-xs text-slate-400 mt-0.5">
                                {isPaid && item.paymentDate
                                  ? `Disbursed on ${formatDateDMY(item.paymentDate)}`
                                  : `Created ${formatDateDMY(item.createdAt)}`}
                                {item.referenceId ? ` • Ref: ${item.referenceId}` : ''}
                              </p>
                            </div>
                          </div>

                          {/* Amounts & Download */}
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                Net Disbursed
                              </span>
                              <span className="text-base font-extrabold text-blue-700">
                                {formatCurrency(item.netAmount)}
                              </span>
                            </div>

                            {isPaid && (
                              <button
                                type="button"
                                onClick={() => handleDownloadPayslip(item)}
                                disabled={isDownloading}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-lg transition-colors disabled:opacity-50"
                                title="Download Payslip PDF"
                              >
                                {isDownloading ? (
                                  <Loader2 size={13} className="animate-spin text-blue-600" />
                                ) : (
                                  <Download size={13} />
                                )}
                                <span>Payslip</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Breakdown pills */}
                        <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                          <div>
                            <span className="text-slate-400 block text-[11px]">Basic Salary</span>
                            <span className="font-semibold text-slate-700">
                              {formatCurrency(item.baseSalary)}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[11px]">Gross Total</span>
                            <span className="font-semibold text-slate-700 flex items-center gap-1">
                              <TrendingUp size={11} className="text-emerald-500" />
                              {formatCurrency(item.grossAmount)}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[11px]">Total Deductions</span>
                            <span className="font-semibold text-rose-600 flex items-center gap-1">
                              <TrendingDown size={11} className="text-rose-500" />
                              {formatCurrency(item.totalDeductions)}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[11px]">Tax / Withholding</span>
                            <span className="font-semibold text-slate-700">
                              {formatCurrency(item.taxDeduction)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <FileText size={13} className="text-slate-400" />
                Authoritative company payroll ledger
              </span>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 text-xs font-semibold btn-secondary rounded-lg"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

