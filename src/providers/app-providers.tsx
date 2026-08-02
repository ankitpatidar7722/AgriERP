"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/features/auth/auth-context";
import { LanguageProvider } from "@/features/i18n/provider";
import { ApiError } from "@/types/api";

export function AppProviders({ children }: { children: React.ReactNode }) {
  // Created in state, not at module scope: a module-level client would be
  // shared across requests during SSR and leak one user's cache into another's.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // A counter clerk switching tabs does not want every grid to
            // re-fetch; 30s is long enough to feel instant, short enough that
            // stock figures stay believable.
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: (failureCount, error) => {
              // Retrying a 4xx just repeats the same rejection. Only transient
              // failures are worth a second attempt.
              if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
                return false;
              }
              return failureCount < 2;
            },
          },
          mutations: {
            retry: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        // "system", not "light". With enableSystem set but a concrete default,
        // next-themes pins the theme to that default and the OS preference is
        // never consulted - so enableSystem does nothing and a machine set to
        // dark still gets a white screen. The navbar toggle overrides this and
        // its choice is remembered.
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <AuthProvider>
          <LanguageProvider>
            {children}
            <Toaster richColors closeButton position="top-right" />
          </LanguageProvider>
        </AuthProvider>
      </ThemeProvider>
      {process.env.NODE_ENV === "development" && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
