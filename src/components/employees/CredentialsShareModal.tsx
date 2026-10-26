'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Copy, Eye, EyeOff, ShieldCheck, X, UserPlus } from 'lucide-react';
import { useToast } from '@/components/ui/toast';

interface CredentialsData {
  name: string;
  email: string;
  password: string;
  employeeCode: string;
}

interface Props {
  isOpen: boolean;
  credentials: CredentialsData | null;
  onClose: () => void;
  onAddAnother: () => void;
}

export default function CredentialsShareModal({ isOpen, credentials, onClose, onAddAnother }: Props) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [showPassword, setShowPassword] = useState(true);

  if (!isOpen || !credentials) return null;

  const loginUrl = typeof window !== 'undefined' ? `${window.location.origin}/login` : 'https://portal.tapinhr.com/login';

  const fullText = `Welcome to TapIn HR Portal!
You have been registered as an employee.

Name: ${credentials.name} (${credentials.employeeCode})
Portal URL: ${loginUrl}
Email: ${credentials.email}
Temporary Password: ${credentials.password}

Note: You will be required to change your password upon your first login.`;

  const handleCopyFull = async () => {
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('Failed to copy the credentials to the clipboard.');
    }
  };

  const handleCopyField = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // fallback
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
          onClick={onClose}
        />

        {/* Modal card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.18 }}
          className="relative w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden p-6"
        >
          {/* Header */}
          <div className="flex items-start justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 border border-emerald-100">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">Account Created</h3>
                <p className="text-xs text-slate-500 mt-0.5">Share onboarding credentials with the employee</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Credentials Display */}
          <div className="my-5 space-y-3">
            {/* Employee Name & Code */}
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Employee</p>
                <p className="text-xs font-bold text-slate-800 mt-0.5">{credentials.name}</p>
              </div>
              <span className="text-[11px] font-mono font-semibold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                #{credentials.employeeCode}
              </span>
            </div>

            {/* Email field */}
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="min-w-0 pr-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Login Email</p>
                <p className="text-xs font-semibold text-slate-700 truncate mt-0.5">{credentials.email}</p>
              </div>
              <button
                type="button"
                onClick={() => handleCopyField(credentials.email)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors flex-shrink-0"
                title="Copy Email"
              >
                <Copy size={14} />
              </button>
            </div>

            {/* Password field */}
            <div className="flex items-center justify-between p-3 bg-blue-50/50 rounded-xl border border-blue-100/80">
              <div className="min-w-0 pr-2">
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Temporary Password</p>
                <p className="text-sm font-mono font-bold text-slate-800 tracking-wide mt-0.5">
                  {showPassword ? credentials.password : '••••••••••••'}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
                <button
                  type="button"
                  onClick={() => handleCopyField(credentials.password)}
                  className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-100/60 transition-colors"
                  title="Copy password"
                >
                  <Copy size={14} />
                </button>
              </div>
            </div>

            {/* Notice */}
            <div className="p-3 bg-amber-50/70 border border-amber-200/60 rounded-xl text-[11px] text-amber-800 flex items-start gap-2">
              <ShieldCheck size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="leading-snug">
                The employee will be forced to choose a new password upon signing in for the first time.
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={handleCopyFull}
              className={`w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'btn-primary'
              }`}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied Full Template!' : 'Copy Credentials (Ready to Share)'}
            </button>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={onAddAnother}
                className="inline-flex items-center justify-center gap-1.5 py-2 text-xs font-bold btn-secondary rounded-xl"
              >
                <UserPlus size={13} />
                Add Another
              </button>
              <button
                type="button"
                onClick={onClose}
                className="py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
