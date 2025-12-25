'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { initAnalytics, trackPageView, isAnalyticsEnabled } from '@/lib/monitoring/analytics';

/**
 * Analytics component that initializes analytics on mount
 * and tracks page views on route changes.
 *
 * Add this component to your root layout to enable analytics.
 */
export function Analytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialize analytics on mount
  useEffect(() => {
    initAnalytics();
  }, []);

  // Track page views on route changes
  useEffect(() => {
    if (!isAnalyticsEnabled()) return;

    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '');

    trackPageView({
      path: url,
      title: document.title,
      referrer: document.referrer,
    });
  }, [pathname, searchParams]);

  // This component doesn't render anything
  return null;
}
