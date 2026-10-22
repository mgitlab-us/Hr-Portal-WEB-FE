'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DepartmentConfigPanel from '@/components/departments/DepartmentConfigPanel';
import { useAuthStore } from '@/store/authStore';

export default function DepartmentSetupPage() {
  const { user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (user && user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      router.replace('/dashboard');
    }
  }, [user, router]);

  if (user && user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-slate-50">
        <div className="px-6 py-6 lg:px-8 lg:py-8">
          <DepartmentConfigPanel />
        </div>
      </div>
    </DashboardLayout>
  );
}
