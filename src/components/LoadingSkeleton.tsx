/**
 * LoadingSkeleton Component
 *
 * Reusable skeleton loading states for different page types
 */

import React from 'react';

export const DashboardSkeleton = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-8 animate-pulse">
      {/* Header skeleton */}
      <div className="mb-8">
        <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-96"></div>
      </div>

      {/* KPI cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="h-4 bg-gray-200 rounded w-24 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-32 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-20"></div>
          </div>
        ))}
      </div>

      {/* Chart area skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <div className="h-6 bg-gray-200 rounded w-48 mb-6"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <div className="h-6 bg-gray-200 rounded w-48 mb-6"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    </div>
  );
};

export const MarketplaceSkeleton = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-8 animate-pulse">
      {/* Header skeleton */}
      <div className="mb-8">
        <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-96"></div>
      </div>

      {/* Search bar skeleton */}
      <div className="mb-6 flex gap-4">
        <div className="flex-1 h-12 bg-gray-200 rounded"></div>
        <div className="w-64 h-12 bg-gray-200 rounded"></div>
      </div>

      {/* Product grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gray-200 rounded"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-24"></div>
              </div>
            </div>
            <div className="h-12 bg-gray-200 rounded mb-4"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const AnalyticsSkeleton = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-8 animate-pulse">
      {/* Header skeleton */}
      <div className="mb-8">
        <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-96"></div>
      </div>

      {/* Filter tabs skeleton */}
      <div className="mb-6 flex gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-10 bg-gray-200 rounded w-24"></div>
        ))}
      </div>

      {/* Charts grid skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="h-6 bg-gray-200 rounded w-48 mb-6"></div>
            <div className="h-80 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const AIAssistantSkeleton = () => {
  return (
    <div className="h-screen flex bg-gray-50 animate-pulse">
      {/* Sidebar skeleton */}
      <div className="w-64 bg-white border-r border-gray-200 p-4">
        <div className="h-8 bg-gray-200 rounded mb-4"></div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>

      {/* Chat area skeleton */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="h-6 bg-gray-200 rounded w-48"></div>
        </div>

        {/* Messages */}
        <div className="flex-1 p-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i}>
              <div className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-md">
                  <div className="h-16 bg-gray-200 rounded-lg"></div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Input box */}
        <div className="bg-white border-t border-gray-200 p-4">
          <div className="h-12 bg-gray-200 rounded"></div>
        </div>
      </div>
    </div>
  );
};

export const ProductCardSkeleton = () => {
  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 animate-pulse">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 bg-gray-200 rounded"></div>
        <div className="flex-1">
          <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-24"></div>
        </div>
      </div>
      <div className="h-12 bg-gray-200 rounded mb-4"></div>
      <div className="h-8 bg-gray-200 rounded"></div>
    </div>
  );
};

export const PageSkeleton = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-8 animate-pulse">
      <div className="max-w-7xl mx-auto">
        <div className="h-8 bg-gray-200 rounded w-64 mb-8"></div>
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    </div>
  );
};
