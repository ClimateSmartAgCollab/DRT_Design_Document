"use client";
import { useEffect, ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools }            from "@tanstack/react-query-devtools";
import { FormDataProvider }              from "./components/Form/context/FormDataContext";
import { defaultTokens, ThemeTokens }    from "../theme/tokens.default";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { 
      staleTime: 300_000, // 5 minutes
      retry: 2,
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      refetchOnReconnect: true,
    },
    mutations: { 
      retry: 1,
      onError: (error) => {
        console.error('Mutation error:', error);
      },
    },
  },
});

// select tokens via ENV or URL if needed
const tokens: ThemeTokens = defaultTokens;

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    const root = document.documentElement;
    // set logos & favicons
    root.style.setProperty("--logo-url", `url('${tokens.logoUrl}')`);
    if (tokens.faviconUrl) {
      document
        .querySelector("link[rel=icon]")
        ?.setAttribute("href", tokens.faviconUrl);
    }
    // set color & font variables
    Object.entries(tokens.colors).forEach(([k, v]) =>
      root.style.setProperty(`--color-${k}`, v as string)
    );
    Object.entries(tokens.fonts).forEach(([k, v]) =>
      root.style.setProperty(`--font-${k}`, v)
    );
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <FormDataProvider>
        {children}
      </FormDataProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
export default Providers;
