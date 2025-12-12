/**
 * Skeleton Loading Components
 *
 * Professional shimmer loading placeholders for better UX
 */

import React from 'react';

interface SkeletonProps {
  className?: string;
}

// Base skeleton with shimmer animation
export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] rounded ${className}`}
      style={{ animation: 'shimmer 1.5s infinite' }}
    />
  );
}

// Card skeleton for product/integration cards
export function CardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-start gap-3 mb-4">
        <Skeleton className="w-12 h-12 rounded-lg" />
        <div className="flex-1">
          <Skeleton className="h-5 w-32 mb-2" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-3/4 mb-4" />
      <div className="border-t border-gray-200 pt-4 mt-4">
        <Skeleton className="h-8 w-24" />
      </div>
    </div>
  );
}

// Stats card skeleton for KPIs
export function StatsSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <Skeleton className="h-4 w-24 mb-2" />
      <Skeleton className="h-8 w-16" />
    </div>
  );
}

// Table row skeleton
export function TableRowSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 border-b border-gray-100">
      <Skeleton className="w-10 h-10 rounded-full" />
      <div className="flex-1">
        <Skeleton className="h-4 w-48 mb-2" />
        <Skeleton className="h-3 w-32" />
      </div>
      <Skeleton className="h-6 w-20 rounded-full" />
    </div>
  );
}

// Full page loading skeleton for marketplace
export function MarketplaceSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsSkeleton />
        <StatsSkeleton />
        <StatsSkeleton />
      </div>

      {/* Product grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

// Dashboard loading skeleton
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Skeleton className="w-12 h-12 rounded-lg" />
              <div>
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-6 w-24" />
              </div>
            </div>
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>

      {/* Chart area */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <Skeleton className="h-6 w-48 mb-4" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>

      {/* Activity list */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <Skeleton className="h-6 w-40" />
        </div>
        {[...Array(5)].map((_, i) => (
          <TableRowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

// Integration list skeleton
export function IntegrationsSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Skeleton className="w-16 h-16 rounded-lg" />
              <div>
                <Skeleton className="h-5 w-32 mb-2" />
                <Skeleton className="h-4 w-48 mb-2" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-10 w-28 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}
