/**
 * Marketplace Loading State
 * Skeleton UI for marketplace page
 */
export default function MarketplaceLoading() {
  return (
    <div className="min-h-screen bg-gray-50 p-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="mb-8">
        <div className="h-10 w-64 bg-gray-200 rounded mb-3"></div>
        <div className="h-5 w-96 bg-gray-200 rounded"></div>
      </div>

      {/* Category Filter Skeleton */}
      <div className="flex gap-3 mb-8 overflow-x-auto">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-10 w-32 bg-gray-200 rounded-full flex-shrink-0"></div>
        ))}
      </div>

      {/* Product Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            {/* Logo */}
            <div className="w-16 h-16 bg-gray-200 rounded-lg mb-4"></div>

            {/* Title & Developer */}
            <div className="h-6 w-40 bg-gray-300 rounded mb-2"></div>
            <div className="h-4 w-32 bg-gray-200 rounded mb-4"></div>

            {/* Description */}
            <div className="space-y-2 mb-4">
              <div className="h-3 w-full bg-gray-200 rounded"></div>
              <div className="h-3 w-5/6 bg-gray-200 rounded"></div>
            </div>

            {/* Price & Button */}
            <div className="flex items-center justify-between">
              <div className="h-6 w-24 bg-gray-200 rounded"></div>
              <div className="h-10 w-32 bg-blue-200 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
