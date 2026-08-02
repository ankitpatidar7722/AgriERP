"use client";

import {
  LanguageProvider,
  DeviceProvider,
  SearchPreferencesProvider,
  GlobalAlertProvider,
  PageTitleProvider,
  TooltipProvider,
} from "indas-ui";

/**
 * The context tree indas-ui components expect around them.
 *
 * The DataGrid reads device, search-preference, language and alert contexts.
 * Its own AppShell would supply these; this app has its own shell, so the
 * providers are gathered here and wrapped around the authenticated area once.
 *
 * Left out on purpose:
 *   - CurrencyProvider  - it fetches live exchange rates from an external API
 *                         (api.frankfurter.app) on mount, which fails under the
 *                         app's CSP and is pure noise: this app formats its own
 *                         rupee amounts and never asks the library to.
 *   - ThemeProvider     - the app themes with next-themes; two theme systems
 *                         fighting over the same DOM is worse than none.
 *   - QueryProvider     - the app already has its own TanStack Query client.
 *   - AuthSessionProvider - the app uses its own JWT auth, not next-auth.
 */
export function IndasProvider({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <DeviceProvider>
        <SearchPreferencesProvider>
          <GlobalAlertProvider>
            <PageTitleProvider>
              <TooltipProvider>{children}</TooltipProvider>
            </PageTitleProvider>
          </GlobalAlertProvider>
        </SearchPreferencesProvider>
      </DeviceProvider>
    </LanguageProvider>
  );
}
