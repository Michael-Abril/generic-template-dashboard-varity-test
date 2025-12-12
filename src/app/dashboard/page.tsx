'use client';

import dynamic from 'next/dynamic';
import { DashboardSkeleton } from '@/components/LoadingSkeleton';

/**
 * Dashboard Page - Dynamic Import Wrapper
 *
 * This page uses Next.js dynamic imports to reduce initial bundle size
 * and improve load times. The main dashboard content is loaded on-demand.
 */

const DashboardContent = dynamic(
  () => import('@/components/pages/DashboardContent'),
  {
    loading: () => <DashboardSkeleton />,
    ssr: false
  }
);

export default function DashboardPage() {
  return <DashboardContent />;
}
