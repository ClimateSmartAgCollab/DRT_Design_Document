// drt_frontend/app/components/NegotiationLayout.tsx
"use client";
import React from "react";
import { LayoutShell, AppHeader } from "./LayoutShell";

interface NegotiationLayoutProps {
  children: React.ReactNode;
  userType: 'owner' | 'requestor';
  userEmail?: string;
  isLoading?: boolean;
  pageTitle?: string;
  sidebar?: React.ReactNode;
  sidebarTitle?: string;
  showSidebar?: boolean;
}

export default function NegotiationLayout({ 
  children, 
  userType, 
  userEmail, 
  isLoading,
  pageTitle,
  sidebar,
  sidebarTitle,
  showSidebar = false
}: NegotiationLayoutProps) {
  const header = (
    <AppHeader 
      userType={userType} 
      userEmail={userEmail} 
      isLoading={isLoading}
      pageTitle={pageTitle}
      showSidebarToggle={showSidebar && !!sidebar}
    />
  );

  return (
    <LayoutShell
      header={header}
      sidebar={sidebar}
      sidebarTitle={sidebarTitle}
      showSidebar={showSidebar && !!sidebar}
    >
      <div className="p-4 sm:p-6 lg:p-8">
        {children}
      </div>
    </LayoutShell>
  );
}
