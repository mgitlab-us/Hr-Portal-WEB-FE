'use client';

import React from 'react';
import { Building2, Plus, Pencil, Trash2, UserCog, Users } from 'lucide-react';

interface Department {
  id: string;
  name: string;
  adminId?: string | null;
  admin?: { id: string; name: string; email: string } | null;
  admins: { id: string; name: string; email: string }[];
  managers: { id: string; name: string; email: string }[];
  canManage?: boolean;
  _count: { employees: number };
}

interface DepartmentOrgChartProps {
  companyName: string;
  departments: Department[];
  canEdit?: boolean;
  onAddDepartment: () => void;
  onEditDepartment: (dept: Department) => void;
  onDeleteDepartment: (dept: Department) => void;
}

export function DepartmentOrgChart({
  companyName,
  departments,
  canEdit = true,
  onAddDepartment,
  onEditDepartment,
  onDeleteDepartment,
}: DepartmentOrgChartProps) {
  const totalEmployees = departments.reduce((sum, d) => sum + d._count.employees, 0);

  return (
    <div className="chart-scroll overflow-x-auto overflow-y-hidden">
      <div className="min-w-max flex justify-center px-4 py-8 sm:px-10 sm:py-12">
        <ul className="org-tree">
          <li>
            {/* Company node — root of the tree */}
            <div className="inline-flex items-center gap-2.5 sm:gap-3 px-4 py-3 sm:px-5 sm:py-3.5 rounded-2xl bg-blue-600 shadow-md shadow-blue-900/10 min-w-[160px] sm:min-w-[200px] text-left">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                <Building2 size={15} className="text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white leading-none truncate">{companyName}</p>
                <p className="text-[10px] text-blue-100 mt-1.5 uppercase tracking-widest whitespace-nowrap">
                  {totalEmployees} {totalEmployees === 1 ? 'employee' : 'employees'} · {departments.length}{' '}
                  {departments.length === 1 ? 'dept' : 'depts'}
                </p>
              </div>
            </div>

            {departments.length > 0 && (
              <ul>
                {departments.map((dept) => (
                  <li key={dept.id}>
                    <div className="group relative inline-flex flex-col items-start gap-2 sm:gap-2.5 px-3 py-3 sm:px-4 sm:py-3.5 rounded-xl bg-white border border-slate-200 shadow-sm hover:border-[#2563EB]/40 hover:shadow-md transition-all min-w-[150px] sm:min-w-[200px] text-left">
                      <div className="flex items-center gap-2 sm:gap-2.5 w-full">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#EFF6FF] flex items-center justify-center flex-shrink-0">
                          <Building2 size={13} className="text-[#1D4ED8]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-700 truncate">{dept.name}</p>
                          {((dept.admins?.length ?? 0) > 0 || dept.admin) ? (
                            <p className="text-[11px] text-slate-400 truncate flex items-center gap-1">
                              <UserCog size={10} className="flex-shrink-0" />
                              <span className="truncate">
                                {dept.admins?.[0]?.name || dept.admin?.name}
                                {(dept.admins?.length ?? 0) > 1
                                  ? ` +${(dept.admins?.length ?? 1) - 1}`
                                  : ''}
                              </span>
                            </p>
                          ) : (
                            <p className="text-[11px] text-amber-600">No HR admin</p>
                          )}
                          <p className="text-[10px] text-slate-400 truncate">
                            {dept.managers?.length ?? 0} reporting manager
                            {(dept.managers?.length ?? 0) === 1 ? '' : 's'}
                          </p>
                        </div>
                      </div>

                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md">
                        <Users size={10} />
                        {dept._count.employees} {dept._count.employees === 1 ? 'employee' : 'employees'}
                      </span>

                      {/* Hover actions */}
                      {canEdit && (
                        <div className="absolute -top-2.5 -right-2.5 hidden group-hover:flex items-center gap-1">
                          <button
                            onClick={() => onEditDepartment(dept)}
                            className="p-1.5 bg-white border border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 rounded-full shadow-sm transition-colors"
                            aria-label={`Edit ${dept.name}`}
                          >
                            <Pencil size={11} />
                          </button>
                          <button
                            onClick={() => onDeleteDepartment(dept)}
                            className="p-1.5 bg-white border border-rose-200 text-rose-500 hover:bg-rose-50 hover:text-rose-600 rounded-full shadow-sm transition-colors"
                            aria-label={`Delete ${dept.name}`}
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      )}
                    </div>
                  </li>
                ))}

                {/* Add-department node — lives in the same row, as a branch of the tree */}
                {canEdit && (
                  <li>
                    <button
                      type="button"
                      onClick={onAddDepartment}
                      className="inline-flex flex-col items-center justify-center gap-1.5 px-3 py-3 sm:px-4 sm:py-3.5 rounded-xl border border-dashed border-blue-300 bg-blue-50 text-blue-700 hover:border-blue-400 hover:bg-blue-100 transition-colors min-w-[150px] sm:min-w-[200px] min-h-[68px] sm:min-h-[76px]"
                    >
                      <Plus size={16} />
                      <span className="text-xs font-medium">Add department</span>
                    </button>
                  </li>
                )}
              </ul>
            )}
          </li>
        </ul>
      </div>

      <style jsx>{`
        /* Force a light-themed native scrollbar even when the OS/browser is
           set to dark mode — otherwise Chrome/Edge draw a heavy black/gray
           bar along this scroll edge that clashes with the white card. */
        .chart-scroll {
          color-scheme: light;
          scrollbar-width: thin;
          scrollbar-color: #cbd5e1 transparent;
          padding-bottom: 4px;
        }
        .chart-scroll::-webkit-scrollbar {
          height: 8px;
        }
        .chart-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .chart-scroll::-webkit-scrollbar-thumb {
          background-color: #cbd5e1;
          border-radius: 999px;
        }
        .chart-scroll::-webkit-scrollbar-thumb:hover {
          background-color: #94a3b8;
        }

        .org-tree,
        .org-tree ul {
          padding-top: 28px;
          position: relative;
          transition: all 0.3s;
        }
        .org-tree {
          display: inline-flex;
          padding-top: 0;
        }
        .org-tree > li {
          padding-top: 0;
        }
        .org-tree ul {
          display: flex;
          padding-left: 0;
          margin: 0;
        }
        .org-tree li {
          list-style-type: none;
          position: relative;
          padding: 28px 14px 0 14px;
          text-align: center;
        }
        .org-tree li::before,
        .org-tree li::after {
          content: '';
          position: absolute;
          top: 0;
          right: 50%;
          border-top: 2px solid #cbd5e1;
          width: 50%;
          height: 28px;
        }
        .org-tree li::after {
          right: auto;
          left: 50%;
          border-left: 2px solid #cbd5e1;
        }
        .org-tree li:only-child::before,
        .org-tree li:only-child::after {
          display: none;
        }
        .org-tree li:only-child {
          padding-top: 0;
        }
        .org-tree li:first-child::before,
        .org-tree li:last-child::after {
          border: 0 none;
        }
        .org-tree li:last-child::before {
          border-right: 2px solid #cbd5e1;
          border-radius: 0 6px 0 0;
        }
        .org-tree li:first-child::after {
          border-radius: 6px 0 0 0;
        }
        .org-tree ul::before {
          content: '';
          position: absolute;
          top: 0;
          left: 50%;
          border-left: 2px solid #cbd5e1;
          width: 0;
          height: 28px;
        }

        @media (max-width: 640px) {
          .org-tree,
          .org-tree ul {
            padding-top: 20px;
          }
          .org-tree > li {
            padding-top: 0;
          }
          .org-tree li {
            padding: 20px 8px 0 8px;
          }
          .org-tree li::before,
          .org-tree li::after {
            height: 20px;
          }
          .org-tree ul::before {
            height: 20px;
          }
        }
      `}</style>
    </div>
  );
}