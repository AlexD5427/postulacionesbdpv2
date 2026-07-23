'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { ThemeProvider } from 'next-themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/design-system/primitives/Tooltip';
import {
  applyAccessibilityToDocument,
  useAccessibilityStore,
} from '@/features/accessibility/state/accessibility-store';
import { applyLocaleToDocument, useI18nStore } from '@/features/i18n/i18n-store';
import { SmoothScroll } from '@/features/shell/components/SmoothScroll';

/**
 * Keeps <html> data-attributes in sync with the accessibility store. An inline
 * script in the document head already applied stored values before paint (see
 * layout.tsx) to avoid a flash; this handles subsequent updates + OS changes.
 */
function AccessibilityEffect() {
  const prefs = useAccessibilityStore();
  useEffect(() => {
    applyAccessibilityToDocument(prefs);
  }, [prefs]);
  return null;
}

/** Keeps <html lang> in sync with the chosen locale (post-hydration updates). */
function LocaleEffect() {
  const locale = useI18nStore((s) => s.locale);
  useEffect(() => {
    applyLocaleToDocument(locale);
  }, [locale]);
  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  // One QueryClient per browser session; created lazily to avoid sharing state
  // across requests during SSR.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="data-theme"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <TooltipProvider delayDuration={200}>
          <AccessibilityEffect />
          <LocaleEffect />
          <SmoothScroll />
          {children}
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
