"use client";

import React from 'react';
import AuthGuard from '@/components/AuthGuard';
import ClientLayout from '../components/ClientLayout';

export default function SettingsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClientLayout>
      <AuthGuard>
        {children}
      </AuthGuard>
    </ClientLayout>
  );
}
