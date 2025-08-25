// drt_frontend/app/components/NegotiationLayout.tsx
"use client";
import React from "react";
import NegotiationHeader from "./NegotiationHeader";

interface NegotiationLayoutProps {
  children: React.ReactNode;
  userType: 'owner' | 'requestor';
  userEmail?: string;
  isLoading?: boolean;
  pageTitle?: string;
}

export default function NegotiationLayout({ 
  children, 
  userType, 
  userEmail, 
  isLoading,
  pageTitle
}: NegotiationLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <NegotiationHeader 
        userType={userType} 
        userEmail={userEmail} 
        isLoading={isLoading}
        pageTitle={pageTitle}
      />
      <div className="flex flex-col items-center w-full px-2 sm:px-4 py-6 sm:py-8 md:py-10">
        {children}
      </div>
    </div>
  );
}
