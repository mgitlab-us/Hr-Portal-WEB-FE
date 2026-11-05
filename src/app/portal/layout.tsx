import React from 'react';
import PortalLayout from '@/components/layout/PortalLayout';

export const metadata = {
  title: 'Employee Portal | iTapIn',
  description: 'Employee self-service portal for attendance, leaves, corrections, payslips, and documents',
};

export default function RootPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PortalLayout>{children}</PortalLayout>;
}

