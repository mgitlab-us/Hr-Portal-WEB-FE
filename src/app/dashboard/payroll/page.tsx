'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck,
  CheckCircle2,
  Clock3,
  Download,
  Eye,
  Loader2,
  PencilLine,
  Search,
  Users,
  Wallet,
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { api } from '@/lib/api';
import { formatDateDMY, formatMonthYear } from '@/lib/datetime';

type SalaryStructure = {
  baseSalary: number;
  houseRentAllowance: number;
  transportAllowance: number;
  medicalAllowance: number;
  otherAllowance: number;
  taxDeduction: number;
  otherDeduction: number;
};

type SalaryPayment = {
  id: string;
  month: number;
  year: number;
  amount: number;
  netAmount: number;
  grossAmount: number;
  totalDeductions: number;
  status: 'PENDING' | 'PAID';
  paymentDate: string | null;
  referenceId: string | null;
};

type PayrollRow = {
  id: string;
  name: string;
  email: string;
  employeeCode: string | null;
  designation: string | null;
  department: string | null;
  baseSalary: number;
  structure: SalaryStructure | null;
  grossSalary: number;
  totalDeductions: number;
  netSalary: number;
  hasStructure: boolean;
  payment: SalaryPayment | null;
};

type StructureForm = Record<keyof SalaryStructure, string>;

type BatchPayResult = {
  paidCount?: number;
  skippedCount?: number;
  skipped?: Array<{ reason?: string }>;
};

const errorMessage = (error: unknown, fallback: string) => {
  const err = error as { response?: { data?: { message?: string } } };
  return err.response?.data?.message || fallback;
};

const fetchPayrollRows = async (month: number, year: number) => {
  const res = await api.get<PayrollRow[]>('/salary/status', { params: { month, year } });
  return Array.isArray(res.data) ? res.data : [];
};

const MONTHS = [
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

const STRUCTURE_FIELDS: Array<{
  key: keyof SalaryStructure;
  label: string;
  group: 'earning' | 'deduction';
}> = [
  { key: 'baseSalary', label: 'Basic salary', group: 'earning' },
  { key: 'houseRentAllowance', label: 'House rent allowance', group: 'earning' },
  { key: 'transportAllowance', label: 'Transport allowance', group: 'earning' },
  { key: 'medicalAllowance', label: 'Medical allowance', group: 'earning' },
  { key: 'otherAllowance', label: 'Other allowances', group: 'earning' },
  { key: 'taxDeduction', label: 'Income tax', group: 'deduction' },
  { key: 'otherDeduction', label: 'Other deductions', group: 'deduction' },
];

const money = (value: number | null | undefined) =>
  `PKR ${Number(value ?? 0).toLocaleString('en-PK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const emptyForm = (): StructureForm => ({
  baseSalary: '',
  houseRentAllowance: '',
  transportAllowance: '',
  medicalAllowance: '',
  otherAllowance: '',
  taxDeduction: '',
  otherDeduction: '',
});

const emptySalaryStructure = (): SalaryStructure => ({
  baseSalary: 0,
  houseRentAllowance: 0,
  transportAllowance: 0,
  medicalAllowance: 0,
  otherAllowance: 0,
  taxDeduction: 0,
  otherDeduction: 0,
});

const formFromRow = (row: PayrollRow): StructureForm => {
  const structure = row.structure ?? emptySalaryStructure();
  return {
    baseSalary: String(structure.baseSalary || ''),
    houseRentAllowance: String(structure.houseRentAllowance || ''),
    transportAllowance: String(structure.transportAllowance || ''),
    medicalAllowance: String(structure.medicalAllowance || ''),
    otherAllowance: String(structure.otherAllowance || ''),
    taxDeduction: String(structure.taxDeduction || ''),
    otherDeduction: String(structure.otherDeduction || ''),
  };
};

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

export default function PayrollPage() {
  const { toast } = useToast();
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const [rows, setRows] = useState<PayrollRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [editRow, setEditRow] = useState<PayrollRow | null>(null);
  const [structureForm, setStructureForm] = useState<StructureForm>(emptyForm);
  const [savingStructure, setSavingStructure] = useState(false);
  const [payTarget, setPayTarget] = useState<PayrollRow | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [batching, setBatching] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const reloadPayroll = async () => {
    setLoading(true);
    try {
      const data = await fetchPayrollRows(month, year);
      setRows(data);
      setSelected([]);
    } catch (error) {
      toast.error(errorMessage(error, 'Could not load payroll for the selected month.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let discarded = false;

    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchPayrollRows(month, year);
        if (!discarded) {
          setRows(data);
          setSelected([]);
        }
      } catch (error) {
        if (!discarded) {
          toast.error(errorMessage(error, 'Could not load payroll for the selected month.'));
        }
      } finally {
        if (!discarded) setLoading(false);
      }
    };

    load();

    return () => {
      discarded = true;
    };
  }, [month, year, toast]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) =>
      [row.name, row.email, row.employeeCode, row.designation, row.department]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [rows, search]);

  const paidRows = rows.filter((row) => row.payment?.status === 'PAID');
  const pendingRows = rows.filter((row) => row.payment?.status !== 'PAID');
  const totalNet = rows.reduce((sum, row) => sum + Number(row.netSalary || 0), 0);
  const paidNet = paidRows.reduce((sum, row) => sum + Number(row.payment?.netAmount || 0), 0);
  const pendingNet = pendingRows.reduce((sum, row) => sum + Number(row.netSalary || 0), 0);
  const selectableRows = filteredRows.filter(
    (row) => row.payment?.status !== 'PAID' && row.hasStructure
  );
  const allVisibleSelected =
    selectableRows.length > 0 && selectableRows.every((row) => selected.includes(row.id));

  const formTotals = useMemo(() => {
    const value = (key: keyof SalaryStructure) => Math.max(0, Number(structureForm[key] || 0));
    const gross =
      value('baseSalary') +
      value('houseRentAllowance') +
      value('transportAllowance') +
      value('medicalAllowance') +
      value('otherAllowance');
    const deductions = value('taxDeduction') + value('otherDeduction');
    return { gross, deductions, net: Math.max(0, gross - deductions) };
  }, [structureForm]);

  const openStructure = (row: PayrollRow) => {
    setEditRow(row);
    setStructureForm(formFromRow(row));
  };

  const toggleSelected = (employeeId: string) => {
    setSelected((current) =>
      current.includes(employeeId)
        ? current.filter((id) => id !== employeeId)
        : [...current, employeeId]
    );
  };

  const toggleAll = () => {
    if (allVisibleSelected) {
      setSelected((current) =>
        current.filter((id) => !selectableRows.some((row) => row.id === id))
      );
    } else {
      setSelected((current) => [
        ...new Set([...current, ...selectableRows.map((row) => row.id)]),
      ]);
    }
  };

  const saveStructure = async () => {
    if (!editRow) return;

    setSavingStructure(true);
    try {
      const payload = Object.fromEntries(
        Object.entries(structureForm).map(([key, value]) => [
          key,
          Math.max(0, Number(value || 0)),
        ])
      );
      await api.put(`/salary/${editRow.id}/structure`, payload);
      toast.success(`Salary structure saved for ${editRow.name}.`);
      setEditRow(null);
      await reloadPayroll();
    } catch (error) {
      toast.error(errorMessage(error, 'Could not save the salary structure.'));
    } finally {
      setSavingStructure(false);
    }
  };

  const markPaid = async (row: PayrollRow) => {
    setPayingId(row.id);
    try {
      await api.post(`/salary/${row.id}/mark-paid`, { month, year });
      toast.success(`${row.name}'s salary for ${formatMonthYear(new Date(year, month - 1, 1))} is marked as paid.`);
      setPayTarget(null);
      await reloadPayroll();
    } catch (error) {
      toast.error(errorMessage(error, 'Could not mark this salary as paid.'));
    } finally {
      setPayingId(null);
    }
  };

  const markSelectedPaid = async () => {
    if (selected.length === 0) return;
    setBatching(true);
    try {
      const res = await api.post<BatchPayResult>('/salary/batch-mark-paid', {
        month,
        year,
        payments: selected.map((employeeId) => ({ employeeId })),
      });
      const paidCount = Number(res.data?.paidCount || 0);
      const skippedCount = Number(res.data?.skippedCount || 0);
      if (paidCount > 0) {
        toast.success(
          `${paidCount} salary payment${paidCount === 1 ? '' : 's'} recorded${
            skippedCount ? `, ${skippedCount} skipped` : ''
          }.`
        );
      }
      if (skippedCount > 0) {
        toast.info(
          res.data?.skipped?.[0]?.reason ||
            'Some employees were skipped. Check their salary structures and try again.'
        );
      }
      await reloadPayroll();
    } catch (error) {
      toast.error(errorMessage(error, 'Could not record the selected payments.'));
    } finally {
      setBatching(false);
    }
  };

  const downloadPayslip = async (row: PayrollRow, preview = false) => {
    setDownloadingId(row.id);
    try {
      const res = await api.get(`/salary/${row.id}/payslip`, {
        params: { month, year },
        responseType: 'blob',
      });
      const blob = res.data instanceof Blob ? res.data : new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      if (preview) {
        const win = window.open(url, '_blank', 'noopener,noreferrer');
        if (!win) {
          const link = document.createElement('a');
          link.href = url;
          link.download = `payslip-${row.employeeCode || row.id}.pdf`;
          link.click();
        }
      } else {
        const link = document.createElement('a');
        link.href = url;
        link.download = `payslip-${row.employeeCode || row.id}-${year}-${String(month).padStart(2, '0')}.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      toast.error(errorMessage(error, 'Could not generate the payslip PDF.'));
    } finally {
      setDownloadingId(null);
    }
  };

  const yearOptions = Array.from({ length: 6 }, (_, index) => today.getFullYear() - 3 + index);

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-slate-50 pb-16">
        <div className="border-b border-slate-100 bg-white px-6 pb-5 pt-6 lg:px-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <Wallet size={13} className="text-slate-400" />
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                  Admin / Payroll
                </p>
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-800">Payroll</h1>
              <p className="mt-0.5 text-sm text-slate-400">
                Review salary structures, generate branded payslips and record monthly payments.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
              <select
                value={month}
                onChange={(event) => setMonth(Number(event.target.value))}
                className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 outline-none focus:border-blue-400"
              >
                {MONTHS.map((label, index) => (
                  <option key={label} value={index + 1}>
                    {label}
                  </option>
                ))}
              </select>
              <select
                value={year}
                onChange={(event) => setYear(Number(event.target.value))}
                className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 outline-none focus:border-blue-400"
              >
                {yearOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <Button
                variant="outline"
                className="h-9 border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                onClick={reloadPayroll}
                disabled={loading}
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : null}
                Refresh
              </Button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              icon={<Wallet size={17} />}
              label="Payroll this month"
              value={money(totalNet)}
              hint={`${rows.length} employee${rows.length === 1 ? '' : 's'}`}
              tone="blue"
            />
            <SummaryCard
              icon={<BadgeCheck size={17} />}
              label="Paid"
              value={money(paidNet)}
              hint={`${paidRows.length} completed`}
              tone="emerald"
            />
            <SummaryCard
              icon={<Clock3 size={17} />}
              label="Pending"
              value={money(pendingNet)}
              hint={`${pendingRows.length} awaiting payment`}
              tone="amber"
            />
            <SummaryCard
              icon={<Users size={17} />}
              label="Missing structure"
              value={String(rows.filter((row) => !row.hasStructure).length)}
              hint="Set before paying"
              tone="rose"
            />
          </div>
        </div>

        <div className="px-6 pt-6 lg:px-8">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-4">
              <div className="relative min-w-[240px] flex-1">
                <Search
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search employee, code, department…"
                  className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-blue-400 focus:bg-white"
                />
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>{formatMonthYear(new Date(year, month - 1, 1))}</span>
                <span className="text-slate-300">•</span>
                <span>{filteredRows.length} result{filteredRows.length === 1 ? '' : 's'}</span>
              </div>
              {selected.length > 0 && (
                <Button
                  onClick={markSelectedPaid}
                  disabled={batching}
                  className="h-9 bg-blue-600 text-white hover:bg-blue-700"
                >
                  {batching ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={14} />
                  )}
                  Mark {selected.length} paid
                </Button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-left">
                <thead className="bg-slate-50/80 text-[10px] uppercase tracking-widest text-slate-400">
                  <tr>
                    <th className="w-12 px-4 py-3">
                      <input
                        type="checkbox"
                        aria-label="Select all pending employees"
                        checked={allVisibleSelected}
                        onChange={toggleAll}
                        disabled={selectableRows.length === 0}
                        className="h-4 w-4 rounded border-slate-300 accent-blue-600"
                      />
                    </th>
                    <th className="px-4 py-3 font-semibold">Employee</th>
                    <th className="px-4 py-3 font-semibold">Salary structure</th>
                    <th className="px-4 py-3 font-semibold">Deductions</th>
                    <th className="px-4 py-3 font-semibold">Net salary</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-16 text-center">
                        <Loader2 size={20} className="mx-auto animate-spin text-slate-400" />
                        <p className="mt-2 text-sm text-slate-400">Loading payroll…</p>
                      </td>
                    </tr>
                  ) : filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-16 text-center">
                        <Wallet size={28} className="mx-auto text-slate-300" />
                        <p className="mt-2 text-sm font-medium text-slate-500">No employees found</p>
                        <p className="text-xs text-slate-400">
                          Try another month or clear the search filter.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row) => {
                      const paid = row.payment?.status === 'PAID';
                      const structure = row.structure ?? emptySalaryStructure();
                      const allowances = Number(row.grossSalary || 0) - Number(structure.baseSalary || 0);
                      return (
                        <tr key={row.id} className="align-middle transition-colors hover:bg-slate-50/60">
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              aria-label={`Select ${row.name}`}
                              checked={selected.includes(row.id)}
                              onChange={() => toggleSelected(row.id)}
                              disabled={paid || !row.hasStructure}
                              className="h-4 w-4 rounded border-slate-300 accent-blue-600 disabled:opacity-40"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-600">
                                {initials(row.name) || '?'}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-800">
                                  {row.name}
                                </p>
                                <p className="truncate text-[11px] text-slate-400">
                                  {row.employeeCode || 'No code'}
                                  {row.designation ? ` • ${row.designation}` : ''}
                                </p>
                                {row.department && (
                                  <p className="truncate text-[11px] text-slate-400">{row.department}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {row.hasStructure ? (
                              <>
                                <p className="text-sm font-semibold text-slate-700">
                                  {money(row.grossSalary)}
                                </p>
                                <p className="text-[11px] text-slate-400">
                                  Basic {money(structure.baseSalary)} + allowances {money(allowances)}
                                </p>
                              </>
                            ) : (
                              <span className="inline-flex rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-600">
                                Structure not set
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {money(row.totalDeductions)}
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm font-semibold text-slate-800">
                              {money(paid ? row.payment?.netAmount : row.netSalary)}
                            </p>
                            {paid && row.payment?.paymentDate && (
                              <p className="text-[11px] text-slate-400">
                                {formatDateDMY(row.payment.paymentDate)}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {paid ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                                <CheckCircle2 size={12} />
                                Paid
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                                <Clock3 size={12} />
                                Pending
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                title="Preview payslip"
                                onClick={() => downloadPayslip(row, true)}
                                disabled={downloadingId === row.id}
                                className="text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                              >
                                {downloadingId === row.id ? (
                                  <Loader2 size={14} className="animate-spin" />
                                ) : (
                                  <Eye size={15} />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                title="Edit salary structure"
                                onClick={() => openStructure(row)}
                                className="text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                              >
                                <PencilLine size={15} />
                              </Button>
                              {paid ? (
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  title="Download payslip"
                                  onClick={() => downloadPayslip(row)}
                                  className="text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                                >
                                  <Download size={15} />
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  title="Mark as paid"
                                  onClick={() => setPayTarget(row)}
                                  disabled={!row.hasStructure}
                                  className="text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  <CheckCircle2 size={15} />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {selected.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-blue-100 bg-blue-50/60 px-5 py-3">
                <p className="text-xs font-medium text-blue-800">
                  {selected.length} pending employee{selected.length === 1 ? '' : 's'} selected for{' '}
                  {formatMonthYear(new Date(year, month - 1, 1))}.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelected([])}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-700"
                  >
                    Clear
                  </button>
                  <Button
                    onClick={markSelectedPaid}
                    disabled={batching}
                    className="h-8 bg-blue-600 text-white hover:bg-blue-700"
                  >
                    {batching ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <CheckCircle2 size={14} />
                    )}
                    Mark selected paid
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={!!editRow} onOpenChange={(open) => !open && setEditRow(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Salary structure</DialogTitle>
            <DialogDescription>
              Set the monthly earnings and deductions for {editRow?.name}. New payments snapshot
              these values so historical payslips never change.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            {(['earning', 'deduction'] as const).map((group) => (
              <div key={group} className="rounded-xl border border-slate-200 p-4">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                  {group === 'earning' ? 'Earnings' : 'Deductions'}
                </p>
                <div className="space-y-3">
                  {STRUCTURE_FIELDS.filter((field) => field.group === group).map((field) => (
                    <label key={field.key} className="block">
                      <span className="mb-1 block text-xs font-medium text-slate-500">
                        {field.label}
                      </span>
                      <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 focus-within:border-blue-400 focus-within:bg-white">
                        <span className="pl-3 text-[10px] font-semibold text-slate-400">PKR</span>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={structureForm[field.key]}
                          onChange={(event) =>
                            setStructureForm((current) => ({
                              ...current,
                              [field.key]: event.target.value,
                            }))
                          }
                          placeholder="0.00"
                          className="h-10 w-full bg-transparent px-2 text-sm text-slate-800 outline-none placeholder:text-slate-300"
                        />
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3 rounded-xl bg-slate-50 p-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                Gross
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-800">{money(formTotals.gross)}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                Deductions
              </p>
              <p className="mt-1 text-sm font-semibold text-rose-600">{money(formTotals.deductions)}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                Net salary
              </p>
              <p className="mt-1 text-sm font-semibold text-emerald-700">{money(formTotals.net)}</p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditRow(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={saveStructure}
              disabled={savingStructure}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              {savingStructure ? <Loader2 size={14} className="animate-spin" /> : null}
              Save structure
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!payTarget} onOpenChange={(open) => !open && setPayTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Mark salary as paid?</DialogTitle>
            <DialogDescription>
              Record {payTarget?.name}&apos;s salary for{' '}
              {formatMonthYear(new Date(year, month - 1, 1))}. The payment will snapshot the current
              salary structure and generate a downloadable payslip.
            </DialogDescription>
          </DialogHeader>
          {payTarget && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Net salary</span>
                <span className="font-semibold text-slate-800">{money(payTarget.netSalary)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-slate-500">Department</span>
                <span className="font-medium text-slate-700">{payTarget.department || '—'}</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPayTarget(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => payTarget && markPaid(payTarget)}
              disabled={!!payingId}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              {payingId ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              Mark paid
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  tone: 'blue' | 'emerald' | 'amber' | 'rose';
}) {
  const tones = {
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
  } as const;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            {label}
          </p>
          <p className="mt-1 text-lg font-semibold tracking-tight text-slate-800">{value}</p>
          <p className="mt-0.5 text-[11px] text-slate-400">{hint}</p>
        </div>
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${tones[tone]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
