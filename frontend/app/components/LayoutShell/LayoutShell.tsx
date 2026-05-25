"use client";
import React, { useState, useEffect } from "react";
import { useTheme } from "../Form/hooks/useTheme";

interface LayoutShellProps {
  children: React.ReactNode;
  header: React.ReactNode;
  sidebar?: React.ReactNode;
  sidebarTitle?: string;
  showSidebar?: boolean;
  className?: string;
}

export default function LayoutShell({
  children,
  header,
  sidebar,
  sidebarTitle = "Navigation",
  showSidebar = true,
  className = "",
}: LayoutShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const theme = useTheme();

  // Handle mobile detection and sidebar state
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024; // lg breakpoint
      setIsMobile(mobile);
      if (!mobile) {
        setIsSidebarOpen(false); // Close mobile sidebar when switching to desktop
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    if (isSidebarOpen && isMobile) {
      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as Element;
        if (!target.closest('[data-sidebar]') && !target.closest('[data-sidebar-toggle]')) {
          setIsSidebarOpen(false);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isSidebarOpen, isMobile]);

  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      {/* Header - Always at top */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
        {header}
      </header>

      {/* Main Layout Container */}
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar */}
        {showSidebar && sidebar && (
          <>
            {/* Desktop Sidebar - Always visible on lg+ */}
            <aside
              className="hidden lg:flex lg:w-80 lg:flex-col lg:bg-white lg:border-r lg:border-gray-200"
              data-sidebar
            >
              <div className="flex-1 overflow-y-auto">
                <div className="p-6">
                  <h2 
                    className="mb-4 text-xl font-semibold text-gray-800"
                    style={{ fontFamily: theme.fonts.heading }}
                  >
                    {sidebarTitle}
                  </h2>
                  {sidebar}
                </div>
              </div>
            </aside>

            {/* Mobile Sidebar Overlay */}
            {isMobile && (
              <>
                {/* Backdrop */}
                {isSidebarOpen && (
                  <div 
                    className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                  />
                )}

                {/* Mobile Sidebar */}
                <aside
                  className={`fixed left-0 top-16 z-50 h-[calc(100vh-4rem)] w-80 transform bg-white border-r border-gray-200 transition-transform duration-300 ease-in-out lg:hidden ${
                    isSidebarOpen ? "translate-x-0" : "-translate-x-full"
                  }`}
                  data-sidebar
                >
                  <div className="flex h-full flex-col">
                    <div className="flex items-center justify-between border-b border-gray-200 p-4">
                      <h2 
                        className="text-lg font-semibold text-gray-800"
                        style={{ fontFamily: theme.fonts.heading }}
                      >
                        {sidebarTitle}
                      </h2>
                      <button
                        onClick={() => setIsSidebarOpen(false)}
                        className="rounded-md p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                      >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4">
                      {sidebar}
                    </div>
                  </div>
                </aside>
              </>
            )}
          </>
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto">
          <div className="h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

// Mobile Sidebar Toggle Button Component
export function SidebarToggle({ 
  onClick, 
  className = "" 
}: { 
  onClick: () => void; 
  className?: string; 
}) {
  return (
    <button
      onClick={onClick}
      className={`lg:hidden rounded-md p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[rgb(70,160,35)] ${className}`}
      data-sidebar-toggle
      aria-label="Toggle sidebar"
    >
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>
  );
}
