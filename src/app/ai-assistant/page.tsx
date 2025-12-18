'use client';

import dynamic from 'next/dynamic';
import { AIAssistantSkeleton } from '@/components/LoadingSkeleton';

/**
 * AI Assistant Page - Dynamic Import Wrapper
 *
 * This page uses Next.js dynamic imports to reduce initial bundle size
 * and improve load times. The main AI assistant content is loaded on-demand.
 */

const AIAssistantContent = dynamic(
  () => import('@/components/pages/AIAssistantContent'),
  {
    loading: () => <AIAssistantSkeleton />,
    ssr: false
  }
);

export default function AIAssistantPage() {
  return <AIAssistantContent />;
}
