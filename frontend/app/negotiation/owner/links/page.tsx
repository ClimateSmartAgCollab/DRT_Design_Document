"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import fetchApi from "@/app/api/apiHelper";
import { Providers } from "@/app/providers";
import Image from "next/image";

type LinkEntry = {
  url: string;
  questionnaireId: string;
  licenseId: string;
  expiry: string;
  label: string;
  tags: string;
  recordLabel: string;
};

async function fetchOwnerLinks(): Promise<LinkEntry[]> {
  const res = await fetchApi("/drt/owner/links/");
  if (res.status === 401) throw new Error("Not authenticated");
  if (!res.ok) {
    let errMsg = `Unexpected status ${res.status}`;
    try {
      const errJson = await res.json();
      errMsg = errJson.error || errMsg;
    } catch {}
    throw new Error(errMsg);
  }
  const data = (await res.json()) as { links: LinkEntry[] };
  return data.links;
}

export default function OwnerLinks() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  // Authentication check
  const whoamiQuery = useQuery({
    queryKey: ["owner", "whoami"],
    queryFn: async () => {
      const res = await fetchApi("/drt/owner/whoami/");
      if (!res.ok) throw new Error("Not authenticated");
      return res.json();
    },
    retry: false,
  });

  const {
    data: links,
    error,
    isLoading,
    isError,
  } = useQuery<LinkEntry[], Error>({
    queryKey: ["owner", "links"],
    queryFn: fetchOwnerLinks,
    retry: 0,
    staleTime: Infinity,
    enabled: !!whoamiQuery.data, // Only fetch links if authenticated
  });

  useEffect(() => {
    if (whoamiQuery.isError) {
      router.replace("/negotiation/owner/email-entry");
    }
  }, [whoamiQuery.isError, router]);

  useEffect(() => {
    if (isError && error?.message === "Not authenticated") {
      router.replace("/negotiation/owner/email-entry");
    }
  }, [isError, error, router]);

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetchApi('/drt/owner/logout/', {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Logout failed');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.clear();
      router.push('/negotiation/owner/email-entry');
    },
    onError: (error) => {
      console.error('Logout error:', error);
      setIsLoggingOut(false);
      // Still redirect even if logout fails
      router.push('/negotiation/owner/email-entry');
    },
  });

  const handleLogout = async () => {
    setIsLoggingOut(true);
    logoutMutation.mutate();
  };

  if (whoamiQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-600">
        Loading owner…
      </div>
    );
  }

  if (whoamiQuery.isError || !whoamiQuery.data) {
    return null;
  }

  if (isLoading) {
    return (
      <Providers>
        <main className="min-h-dvh bg-white flex flex-col">
          {/* Header Bar */}
          <header className="bg-[#216b96] w-full px-4 sm:px-6 pt-4 sm:pt-6 md:pt-8 pb-6 sm:pb-8 md:pb-12 flex items-start justify-between border-b border-[#2382A0] relative">
            <div className="container-default section-y w-full">
              <div className="flex items-start justify-between gap-4 min-w-0">
                {/* Title / Help */}
                <div className="flex-1 min-w-0">
                  <div>
                    <span className="block text-white font-sans font-bold text-xl sm:text-2xl md:text-3xl leading-tight">
                      My Links
                    </span>
                  </div>
                  {/* Homepage Link */}
                  <div className="mt-4 sm:mt-6 md:mt-8 lg:mt-10 md:pl-6 lg:pl-10">
                    <button
                      onClick={() => router.push("/negotiation/owner/homepage")}
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
                </div>
                <div className="flex items-start gap-2 sm:gap-4 min-w-0 flex-shrink-0">
                  {/* User Avatar Dropdown */}
                  <div className="relative flex-shrink-0">
                    {whoamiQuery.isLoading ? (
                      <div className="flex items-center space-x-2 text-white">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                        <span className="text-sm">Loading...</span>
                      </div>
                    ) : whoamiQuery.data?.email ? (
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
                                  <p className="text-sm font-medium text-gray-900">{whoamiQuery.data.email}</p>
                                  <p className="text-xs text-gray-500 capitalize">owner</p>
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

                  {/* Logo */}
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
                        className="rounded-full bg-blue-200 object-contain"
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
          </header>

          <div className="flex flex-col items-center w-full px-2 sm:px-4 py-6 sm:py-8 md:py-10">
            <div className="max-w-4xl w-full">
              <p>Loading your links…</p>
            </div>
          </div>
        </main>
      </Providers>
    );
  }

  if (isError) {
    return (
      <Providers>
        <main className="min-h-dvh bg-white flex flex-col">
          {/* Header Bar */}
          <header className="bg-[#216b96] w-full px-4 sm:px-6 pt-4 sm:pt-6 md:pt-8 pb-6 sm:pb-8 md:pb-12 flex items-start justify-between border-b border-[#2382A0] relative">
            <div className="container-default section-y w-full">
              <div className="flex items-start justify-between gap-4 min-w-0">
                {/* Title / Help */}
                <div className="flex-1 min-w-0">
                  <div>
                    <span className="block text-white font-sans font-bold text-xl sm:text-2xl md:text-3xl leading-tight">
                      My Links
                    </span>
                  </div>
                  {/* Homepage Link */}
                  <div className="mt-4 sm:mt-6 md:mt-8 lg:mt-10 md:pl-6 lg:pl-10">
                    <button
                      onClick={() => router.push("/negotiation/owner/homepage")}
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
                </div>
                <div className="flex items-start gap-2 sm:gap-4 min-w-0 flex-shrink-0">
                  {/* User Avatar Dropdown */}
                  <div className="relative flex-shrink-0">
                    {whoamiQuery.isLoading ? (
                      <div className="flex items-center space-x-2 text-white">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                        <span className="text-sm">Loading...</span>
                      </div>
                    ) : whoamiQuery.data?.email ? (
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
                                  <p className="text-sm font-medium text-gray-900">{whoamiQuery.data.email}</p>
                                  <p className="text-xs text-gray-500 capitalize">owner</p>
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

                  {/* Logo */}
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
                        className="rounded-full bg-blue-200 object-contain"
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
          </header>

          <div className="flex flex-col items-center w-full px-2 sm:px-4 py-6 sm:py-8 md:py-10">
            <div className="max-w-4xl w-full">
              <p className="text-red-500">{error?.message}</p>
            </div>
          </div>
        </main>
      </Providers>
    );
  }

  return (
    <Providers>
      <main className="min-h-dvh bg-white flex flex-col">
        {/* Header Bar */}
        <header className="bg-[#216b96] w-full px-4 sm:px-6 pt-4 sm:pt-6 md:pt-8 pb-6 sm:pb-8 md:pb-12 flex items-start justify-between border-b border-[#2382A0] relative">
          <div className="container-default section-y w-full">
            <div className="flex items-start justify-between gap-4 min-w-0">
              {/* Title / Help */}
              <div className="flex-1 min-w-0">

                <div>
                  <span className="block text-white font-sans font-bold text-xl sm:text-2xl md:text-3xl leading-tight">
                    My Links
                  </span>
                </div>

                {/* Homepage Link */}
                <div className="mt-4 sm:mt-6 md:mt-8 lg:mt-10 md:pl-6 lg:pl-10">
                  <button
                    onClick={() => router.push("/negotiation/owner/homepage")}
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
              </div>
              <div className="flex items-start gap-2 sm:gap-4 min-w-0 flex-shrink-0">
                {/* User Avatar Dropdown */}
                <div className="relative flex-shrink-0">
                  {whoamiQuery.isLoading ? (
                    <div className="flex items-center space-x-2 text-white">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                      <span className="text-sm">Loading...</span>
                    </div>
                  ) : whoamiQuery.data?.email ? (
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
                                <p className="text-sm font-medium text-gray-900">{whoamiQuery.data.email}</p>
                                <p className="text-xs text-gray-500 capitalize">owner</p>
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

                {/* Logo */}
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
                      className="rounded-full bg-blue-200 object-contain"
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
        </header>

        <div className="flex flex-col items-center w-full px-2 sm:px-4 py-6 sm:py-8 md:py-10">
          <div className="max-w-4xl w-full space-y-6">
            {links && links.length === 0 ? (
              <p>No links found for your account.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {links?.map((link) => (
                  <div
                    key={`${link.url}-${link.questionnaireId}`}
                    className="bg-white border border-gray-200 rounded-2xl shadow-lg p-6 flex flex-col justify-between hover:shadow-2xl transition-transform transform hover:-translate-y-1"
                  >
                    <div className="mb-4">
                      <h2 className="text-xl font-semibold text-red-800 break-words">
                        {link.recordLabel}
                      </h2>
                      <p className="text-lg text-gray-700 break-words">
                        {link.label}
                        {link.tags ? ` (${link.tags})` : ""}
                      </p>
                    </div>

                    <div className="text-sm text-gray-600 space-y-2 mb-6">
                      <p>
                        <span className="font-medium">Questionnaire:</span>{" "}
                        <code className="break-all bg-gray-100 px-1 rounded">
                          {link.questionnaireId}
                        </code>
                      </p>
                      <p>
                        <span className="font-medium">License ID:</span>{" "}
                        <code className="break-all bg-gray-100 px-1 rounded">
                          {link.licenseId}
                        </code>
                      </p>
                      <p>
                        <span className="font-medium">Expires:</span>{" "}
                        <time className="whitespace-nowrap">{link.expiry}</time>
                      </p>
                      <p>
                        <span className="font-medium">URL:</span>{" "}
                        <code className="break-all bg-gray-100 px-1 rounded">
                          {link.url}
                        </code>
                      </p>
                    </div>

                    <div className="flex space-x-3">
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 text-center py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                      >
                        Visit
                      </a>
                      <button
                        onClick={() => navigator.clipboard.writeText(link.url)}
                        className="flex-1 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
                      >
                        Copy URL
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </Providers>
  );
}
