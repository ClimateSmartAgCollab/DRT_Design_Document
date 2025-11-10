"use client";
import React from "react";
import { useTheme } from "../Form/hooks/useTheme";

interface StandardSidebarProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
}

export default function StandardSidebar({ 
  children, 
  title = "Navigation",
  className = ""
}: StandardSidebarProps) {
  const theme = useTheme();

  return (
    <div className={`space-y-6 ${className}`}>
      {title && (
        <h2 
          className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2"
          style={{ fontFamily: theme.fonts.heading }}
        >
          {title}
        </h2>
      )}
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
}

// Common sidebar section component
export function SidebarSection({ 
  title, 
  children, 
  className = "" 
}: { 
  title?: string; 
  children: React.ReactNode; 
  className?: string; 
}) {
  return (
    <div className={`space-y-3 ${className}`}>
      {title && (
        <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide">
          {title}
        </h3>
      )}
      <div className="space-y-2">
        {children}
      </div>
    </div>
  );
}

// Sidebar link component
export function SidebarLink({ 
  href, 
  children, 
  isActive = false, 
  onClick,
  className = "" 
}: { 
  href?: string; 
  children: React.ReactNode; 
  isActive?: boolean; 
  onClick?: () => void;
  className?: string; 
}) {
  const baseClasses = "block px-3 py-2 text-sm rounded-md transition-colors";
  const activeClasses = isActive 
    ? "bg-blue-100 text-blue-700 font-medium" 
    : "text-gray-700 hover:bg-gray-100 hover:text-gray-900";
  
  const combinedClasses = `${baseClasses} ${activeClasses} ${className}`;

  if (href) {
    return (
      <a href={href} className={combinedClasses}>
        {children}
      </a>
    );
  }

  return (
    <button onClick={onClick} className={combinedClasses}>
      {children}
    </button>
  );
}
