"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import fetchApi from "@/app/api/apiHelper";
import Image from "next/image";
import { SidebarToggle } from "./LayoutShell";

interface AppHeaderProps {
  userType?: 'owner' | 'requestor';
  userEmail?: string;
  isLoading?: boolean;
  pageTitle?: string;
  onSidebarToggle?: () => void;
  showSidebarToggle?: boolean;
  className?: string;
}

export default function AppHeader({ 
  userType, 
  userEmail, 
  isLoading, 
  pageTitle,
  onSidebarToggle,
  showSidebarToggle = false,
  className = ""
}: AppHeaderProps) {
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

  return (
    <div className={`bg-[rgb(70,160,35)] px-4 sm:px-6 pt-1 sm:pt-2 md:pt-3 pb-2 sm:pb-3 md:pb-4 flex items-center justify-between border-b-[3px] border-[rgb(55,125,28)] relative ${className}`}>
      <div className="flex items-center space-x-4 min-w-0 flex-1">
        {/* Mobile Sidebar Toggle */}
        {showSidebarToggle && onSidebarToggle && (
          <SidebarToggle onClick={onSidebarToggle} />
        )}

        {/* Home Button */}
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

        {/* Page Title */}
        {pageTitle && (
          <h1 className="text-white font-bold text-lg sm:text-xl md:text-2xl font-sans truncate">
            {pageTitle}
          </h1>
        )}
      </div>

      {/* Right side - User info and logo */}
      <div className="flex items-center gap-4 min-w-0 flex-shrink-0">
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
                        <div className="w-10 h-10 bg-[rgb(70,160,35)] rounded-full flex items-center justify-center text-white">
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
        <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 flex-shrink-0">
          <a
            href="https://genomecanada.ca/project/climate-smart-data-collaboration-centre-cs-dcc/"
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0"
          >
            <Image
              src="/CS-DCC_Logo-EN_Colour.png"
              alt="Logo"
              width={112}
              height={112}
              className="rounded-full bg-[rgba(180,230,160,0.3)] object-contain"
            />
          </a>
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
}
