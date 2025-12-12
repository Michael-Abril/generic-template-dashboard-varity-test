'use client';

import dynamic from 'next/dynamic';
import { AnalyticsSkeleton } from '@/components/LoadingSkeleton';

/**
 * Analytics Page - Dynamic Import Wrapper
 *
 * This page uses Next.js dynamic imports to reduce initial bundle size
 * and improve load times. The main analytics content is loaded on-demand.
 */

const AnalyticsContent = dynamic(
  () => import('@/components/pages/AnalyticsContent'),
  {
    loading: () => <AnalyticsSkeleton />,
    ssr: false
  }
);

export default function AnalyticsPage() {
  return <AnalyticsContent />;
}
