"use client";

import Image from "next/image";
import { useState } from "react";

interface HeaderProps {
  title: string;
  subtitle?: string;
  helpTitle?: string;
  helpDesc?: string;
  homepageLink?: {
    href: string;
    onClick: () => void;
  };
  languageDropdown?: {
    currentLang: "EN" | "FR";
    onLangChange: (lang: "EN" | "FR") => void;
  };
  userDropdown?: {
    email: string;
    role: string;
    isLoading?: boolean;
    isLoggingOut?: boolean;
    onLogout: () => void;
  };
}

export default function Header({
  title,
  subtitle,
  helpTitle,
  helpDesc,
  homepageLink,
  languageDropdown,
  userDropdown,
}: HeaderProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  return (
    <header className="bg-[rgb(70,160,35)] w-full px-4 sm:px-6 pt-4 sm:pt-6 md:pt-8 pb-6 sm:pb-8 md:pb-12 flex items-start justify-between border-b-4 border-[rgb(55,125,28)] relative">
      <div className="container-default section-y w-full">
        <div className="flex items-start justify-between gap-4 min-w-0">
          {/* Title / Help */}
          <div className="flex-1 min-w-0 flex items-start gap-3 sm:gap-4 md:gap-6">
            {/* DRT Logo */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-30 lg:h-32 flex-shrink-0">
              <a
                href="https://climatesmartagcollab.github.io/drt-ad/"
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0"
              >
                <Image
                  src="/drt-logo.png"
                  alt="DRT Logo"
                  width={240}
                  height={240}
                  className="rounded-3xl bg-[rgba(180,230,160,0.3)] object-contain"
                />
              </a>
            </div>
            <div className="flex-1 min-w-0">
              <div>
                <span className="block text-white font-sans font-bold text-xl sm:text-2xl md:text-3xl leading-tight">
                  {title}
                </span>
                {subtitle && (
                  <span className="block text-white font-sans font-light text-lg sm:text-xl md:text-2xl mt-1 ml-1">
                    {subtitle}
                  </span>
                )}
              </div>

              {/* Help Section (for main page) */}
              {helpTitle && helpDesc && (
                <div className="mt-4 sm:mt-6 md:mt-8 lg:mt-10 md:pl-6 lg:pl-10">
                  <h2 className="text-white font-bold text-lg sm:text-xl md:text-2xl font-sans">
                    {helpTitle}
                  </h2>
                  <p className="text-white font-sans text-sm sm:text-base mt-2">
                    {helpDesc}
                  </p>
                </div>
              )}

              {/* Homepage Link (for dashboards) */}
              {homepageLink && (
                <div className="mt-4 sm:mt-6 md:mt-8 lg:mt-10 md:pl-6 lg:pl-10">
                  <button
                    onClick={homepageLink.onClick}
                    className="flex items-center space-x-2 text-white hover:text-gray-200 transition-colors px-3 py-2 rounded-md hover:bg-white hover:bg-opacity-10"
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
                </div>
              )}
            </div>
          </div>
          <div className="flex items-start gap-2 sm:gap-4 min-w-0 flex-shrink-0">
            {/* Language Dropdown (for main page) */}
            {languageDropdown && (
              <div className="relative group flex-shrink-0">
                <button
                  className="flex items-center px-2 sm:px-4 py-1 sm:py-2 bg-[rgb(70,160,35)] text-white font-sans text-sm sm:text-lg rounded-full hover:bg-[rgb(55,125,28)] focus:outline-none focus:ring-2 focus:ring-[rgb(55,125,28)] focus:ring-offset-1"
                  aria-haspopup="listbox"
                  aria-expanded={false}
                  tabIndex={0}
                >
                  {languageDropdown.currentLang}
                  <svg
                    className="ml-1 sm:ml-2 w-3 h-3 sm:w-4 sm:h-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
                <div className="absolute left-0 mt-1 w-full bg-[rgb(70,160,35)] border-gray-200 rounded shadow-[0_4px_24px_rgba(0,0,0,0.35)] opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150 pointer-events-none group-hover:pointer-events-auto group-focus-within:pointer-events-auto">
                  <ul className="py-1">
                    <li>
                      <button
                        className="block w-full text-left px-2 sm:px-4 py-1 sm:py-2 text-white rounded hover:bg-[rgb(55,125,28)] font-sans text-sm sm:text-base"
                        onClick={() => languageDropdown.onLangChange("EN")}
                      >
                        EN
                      </button>
                    </li>
                    <li>
                      <button
                        className="block w-full text-left px-2 sm:px-4 py-1 sm:py-2 text-white rounded hover:bg-[rgb(55,125,28)] font-sans text-sm sm:text-base"
                        onClick={() => languageDropdown.onLangChange("FR")}
                      >
                        FR
                      </button>
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {/* User Avatar Dropdown (for dashboards) */}
            {userDropdown && (
              <div className="relative flex-shrink-0">
                {userDropdown.isLoading ? (
                  <div className="flex items-center space-x-2 text-white">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                    <span className="text-sm">Loading...</span>
                  </div>
                ) : userDropdown.email ? (
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
                        className={`w-3 h-3 transition-transform ${isDropdownOpen ? "rotate-180" : ""} flex-shrink-0`}
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
                              <p className="text-sm font-medium text-gray-900">
                                {userDropdown.email}
                              </p>
                              <p className="text-xs text-gray-500 capitalize">
                                {userDropdown.role}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="p-2">
                          <button
                            onClick={userDropdown.onLogout}
                            disabled={userDropdown.isLoggingOut}
                            className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {userDropdown.isLoggingOut ? (
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

            {/* CS-DCC Logo */}
            <div className="w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 lg:w-60 lg:h-60 flex-shrink-0">
              <a
                href="https://genomecanada.ca/project/climate-smart-data-collaboration-centre-cs-dcc/"
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0"
              >
                <Image
                  src="/CS-DCC_Logo-EN_Colour.png"
                  alt="Logo"
                  width={240}
                  height={240}
                  className="h-auto w-auto rounded-full bg-[rgba(180,230,160,0.3)] object-contain"
                />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Dropdown backdrop (for user dropdown) */}
      {isDropdownOpen && userDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsDropdownOpen(false)}
        />
      )}
    </header>
  );
}

