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

// ============================================================================
// Google Workspace Skeletons
// ============================================================================

// Gmail email row skeleton
export function GmailRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
      <Skeleton className="w-4 h-4 rounded" />
      <Skeleton className="w-4 h-4 rounded" />
      <Skeleton className="w-36 h-4 rounded" />
      <div className="flex-1 flex items-center gap-2">
        <Skeleton className="w-48 h-4 rounded" />
        <Skeleton className="w-2 h-4 rounded" />
        <Skeleton className="flex-1 h-4 rounded" />
      </div>
      <Skeleton className="w-16 h-3 rounded" />
    </div>
  );
}

// Gmail inbox skeleton - full component
export function GmailInboxSkeleton() {
  return (
    <div className="flex h-full">
      {/* Sidebar skeleton */}
      <div className="w-64 border-r bg-white p-4 space-y-2">
        <Skeleton className="h-12 w-full rounded-2xl mb-4" />
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-9 w-full rounded-r-full" />
        ))}
        <div className="pt-4 mt-4 border-t border-gray-200">
          <Skeleton className="h-4 w-16 mb-3" />
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-8 w-full rounded-r-full mb-1" />
          ))}
        </div>
      </div>
      {/* Email list skeleton */}
      <div className="flex-1">
        <div className="p-4 border-b space-y-3">
          <Skeleton className="h-10 w-full rounded-lg" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="w-4 h-4 rounded" />
              <Skeleton className="w-8 h-8 rounded-full" />
            </div>
            <Skeleton className="w-32 h-4 rounded" />
          </div>
        </div>
        <div className="divide-y divide-gray-100">
          {[...Array(10)].map((_, i) => (
            <GmailRowSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

// Calendar event skeleton
export function CalendarEventSkeleton() {
  return (
    <div className="flex items-start gap-4 p-4 border-b border-gray-100">
      <Skeleton className="w-1 h-12 rounded-full" />
      <div className="w-20">
        <Skeleton className="h-4 w-16 mb-1" />
        <Skeleton className="h-3 w-12" />
      </div>
      <div className="flex-1">
        <Skeleton className="h-5 w-48 mb-2" />
        <Skeleton className="h-3 w-32" />
      </div>
    </div>
  );
}

// Calendar view skeleton
export function CalendarSkeleton() {
  return (
    <div className="flex h-full">
      {/* Sidebar skeleton */}
      <div className="w-64 border-r bg-white p-4">
        <Skeleton className="h-12 w-full rounded-2xl mb-4" />
        {/* Mini calendar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <Skeleton className="h-4 w-32" />
            <div className="flex gap-1">
              <Skeleton className="w-6 h-6 rounded" />
              <Skeleton className="w-6 h-6 rounded" />
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {[...Array(35)].map((_, i) => (
              <Skeleton key={i} className="h-6 w-6 rounded-full" />
            ))}
          </div>
        </div>
        <Skeleton className="h-4 w-24 mb-2" />
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-6 w-full rounded mb-1" />
        ))}
      </div>
      {/* Calendar grid skeleton */}
      <div className="flex-1">
        <div className="border-b p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex gap-1">
              <Skeleton className="w-8 h-8 rounded-full" />
              <Skeleton className="w-8 h-8 rounded-full" />
            </div>
            <Skeleton className="w-20 h-8 rounded-md" />
            <Skeleton className="w-40 h-6 rounded" />
          </div>
          <Skeleton className="w-48 h-8 rounded-lg" />
        </div>
        <div className="p-4 grid grid-cols-7 gap-4">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-16 w-full rounded" />
              <Skeleton className="h-12 w-full rounded" />
              <Skeleton className="h-8 w-full rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Drive file skeleton
export function DriveFileSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <Skeleton className="w-12 h-12 rounded-lg" />
        <Skeleton className="w-6 h-6 rounded" />
      </div>
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-3 w-16" />
    </div>
  );
}

// Drive explorer skeleton - full component
export function DriveExplorerSkeleton() {
  return (
    <div className="flex h-full">
      {/* Sidebar skeleton */}
      <div className="w-56 border-r bg-white p-3">
        <Skeleton className="h-12 w-full rounded-2xl mb-4" />
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-9 w-full rounded-full mb-1" />
        ))}
        <div className="mt-4 pt-4 border-t">
          <Skeleton className="h-3 w-16 mb-2" />
          <Skeleton className="h-1.5 w-full rounded-full mb-1" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      {/* Main content skeleton */}
      <div className="flex-1 p-6">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-20 rounded-lg" />
        </div>
        <Skeleton className="h-10 w-full max-w-2xl rounded-full mb-6" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {[...Array(12)].map((_, i) => (
            <DriveFileSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

// Contact row skeleton
export function ContactRowSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 border-b border-gray-100">
      <Skeleton className="w-10 h-10 rounded-full" />
      <div className="flex-1">
        <Skeleton className="h-4 w-32 mb-2" />
        <div className="flex gap-4">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-3 w-28" />
        </div>
      </div>
      <Skeleton className="w-8 h-8 rounded-lg" />
    </div>
  );
}

// Contacts list skeleton - full component
export function ContactsListSkeleton() {
  return (
    <div className="bg-white rounded-lg border">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
      <div className="divide-y divide-gray-100">
        {[...Array(8)].map((_, i) => (
          <ContactRowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
