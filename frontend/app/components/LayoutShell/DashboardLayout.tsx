"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import fetchApi from "@/app/api/apiHelper";
import LayoutShell from "./LayoutShell";

interface DashboardLayoutProps {
  children: React.ReactNode;
  userType: 'owner' | 'requestor';
  userEmail?: string;
  isLoading?: boolean;
  pageTitle?: string;
  pageSubtitle?: string;
  pageDescription?: string;
  sidebar?: React.ReactNode;
  sidebarTitle?: string;
  showSidebar?: boolean;
  className?: string;
}

export default function DashboardLayout({ 
  children, 
  userType, 
  userEmail, 
  isLoading,
  pageTitle,
  pageSubtitle,
  pageDescription,
  sidebar,
  sidebarTitle,
  showSidebar = false,
  className = ""
}: DashboardLayoutProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const endpoint = userType === 'owner' ? '/drt/owner/logout/' : '/drt/requestor/logout/';
      const response = await fetchApi(endpoint, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Logout failed');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.clear();
      const redirectPath = userType === 'owner' 
        ? '/negotiation/owner/email-entry' 
        : '/negotiation/email-entry';
      router.push(redirectPath);
    },
    onError: (error) => {
      console.error('Logout error:', error);
      setIsLoggingOut(false);
      // Still redirect even if logout fails
      const redirectPath = userType === 'owner' 
        ? '/negotiation/owner/email-entry' 
        : '/negotiation/email-entry';
      router.push(redirectPath);
    },
  });

  const handleLogout = async () => {
    setIsLoggingOut(true);
    logoutMutation.mutate();
  };

  const getHomepagePath = () => {
    return userType === 'owner' 
      ? '/negotiation/owner/homepage' 
      : '/negotiation/homepage';
  };
  const header = (
    <div className="bg-[#216b96] w-full px-4 sm:px-6 pt-4 sm:pt-6 md:pt-8 pb-6 sm:pb-8 md:pb-12 flex items-start justify-between border-b border-[#2382A0] relative">
      <div className="w-full">
        <div className="flex items-start justify-between gap-4 min-w-0">
          {/* Title / Description */}
          <div className="flex-1 min-w-0">
            <div>
              <span className="block text-white font-sans font-bold text-xl sm:text-2xl md:text-3xl leading-tight">
                {pageTitle || (userType === 'owner' ? 'Owner Dashboard' : 'Requestor Dashboard')}
              </span>
              {pageSubtitle && (
                <span className="block text-white font-sans font-light text-lg sm:text-xl md:text-2xl mt-1 ml-1">
                  {pageSubtitle}
                </span>
              )}
            </div>

            {pageDescription && (
              <div className="mt-4 sm:mt-6 md:mt-8 lg:mt-10 md:pl-6 lg:pl-10">
                <h2 className="text-white font-bold text-lg sm:text-xl md:text-2xl font-sans">
                  Welcome
                </h2>
                <p className="text-white font-sans text-sm sm:text-base mt-2">
                  {pageDescription}
                </p>
              </div>
            )}
          </div>

          {/* Right side - User info and logo */}
          <div className="flex items-start gap-4 min-w-0 flex-shrink-0">
            {/* Homepage Link */}
            {userType && (
              <button
                onClick={() => router.push(getHomepagePath())}
                className="flex items-center space-x-2 text-white hover:text-gray-200 transition-colors px-3 py-2 rounded-md hover:bg-white hover:bg-opacity-10 flex-shrink-0"
              >
                <svg 
                  className="w-5 h-5" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" 
                  />
                </svg>
                <span className="font-sans font-medium text-sm sm:text-base">
                  Homepage
                </span>
              </button>
            )}

            {/* User Avatar Dropdown */}
            {userType && (
              <div className="relative flex-shrink-0">
                {isLoading ? (
                  <div className="flex items-center space-x-2 text-white">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                    <span className="text-sm">Loading...</span>
                  </div>
                ) : userEmail ? (
                  <div className="relative">
                    <button
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="flex items-center space-x-2 text-white hover:text-gray-200 transition-colors focus:outline-none"
                    >
                      <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-white flex-shrink-0">
                        <svg 
                          className="w-4 h-4" 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            strokeWidth={2} 
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" 
                          />
                        </svg>
                      </div>
                      <svg 
                        className={`w-3 h-3 transition-transform ${isDropdownOpen ? 'rotate-180' : ''} flex-shrink-0`}
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={2} 
                          d="M19 9l-7 7-7-7" 
                        />
                      </svg>
                    </button>

                    {isDropdownOpen && (
                      <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                        <div className="p-4 border-b border-gray-100">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-[#216b96] rounded-full flex items-center justify-center text-white">
                              <svg 
                                className="w-5 h-5" 
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                              >
                                <path 
                                  strokeLinecap="round" 
                                  strokeLinejoin="round" 
                                  strokeWidth={2} 
                                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" 
                                />
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{userEmail}</p>
                              <p className="text-xs text-gray-500 capitalize">{userType}</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="p-2">
                          <button
                            onClick={handleLogout}
                            disabled={isLoggingOut}
                            className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isLoggingOut ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                                <span>Logging out...</span>
                              </>
                            ) : (
                              <>
                                <svg 
                                  className="w-4 h-4" 
                                  fill="none" 
                                  stroke="currentColor" 
                                  viewBox="0 0 24 24"
                                >
                                  <path 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round" 
                                    strokeWidth={2} 
                                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" 
                                  />
                                </svg>
                                <span>Log out</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-white opacity-75">
                    Not authenticated
                  </div>
                )}
              </div>
            )}

            {/* Logo */}
            <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 lg:w-36 lg:h-36 flex-shrink-0">
              <a
                href="https://genomecanada.ca/project/climate-smart-data-collaboration-centre-cs-dcc/"
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0"
              >
                <img
                  src="/CS-DCC_Logo-EN_Colour.png"
                  alt="Logo"
                  className="w-full h-full rounded-full bg-blue-200 object-contain"
                />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Dropdown backdrop */}
      {isDropdownOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsDropdownOpen(false)}
        />
      )}
    </div>
  );

  return (
    <LayoutShell
      header={header}
      sidebar={sidebar}
      sidebarTitle={sidebarTitle}
      showSidebar={showSidebar && !!sidebar}
      className={className}
    >
      <div className="flex flex-col items-center w-full px-2 sm:px-4 py-6 sm:py-8 md:py-10">
        <div className="max-w-3xl w-full">
          {children}
        </div>
      </div>
    </LayoutShell>
  );
}
