'use client';
import dynamic from 'next/dynamic';
import { MarketplaceSkeleton } from '@/components/LoadingSkeleton';

const MarketplaceContent = dynamic(
  () => import('@/components/pages/MarketplaceContent'),
  {
    loading: () => <MarketplaceSkeleton />,
    ssr: false
  }
);

export default function MarketplacePage() {
  return <MarketplaceContent />;
}
