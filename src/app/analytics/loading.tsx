/**
 * Analytics Loading State
 * Skeleton UI for analytics page
 */
export default function AnalyticsLoading() {
  return (
    <div className="min-h-screen bg-gray-50 p-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="mb-8">
        <div className="h-8 w-48 bg-gray-200 rounded mb-2"></div>
        <div className="h-4 w-64 bg-gray-200 rounded"></div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6">
            <div className="h-4 w-32 bg-gray-200 rounded mb-4"></div>
            <div className="h-10 w-40 bg-gray-300 rounded"></div>
          </div>
        ))}
      </div>

      {/* Large Chart */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="h-6 w-48 bg-gray-200 rounded mb-6"></div>
        <div className="h-96 bg-gray-100 rounded"></div>
      </div>

      {/* Two Column Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="h-6 w-40 bg-gray-200 rounded mb-6"></div>
          <div className="h-64 bg-gray-100 rounded"></div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="h-6 w-40 bg-gray-200 rounded mb-6"></div>
          <div className="h-64 bg-gray-100 rounded"></div>
        </div>
      </div>
    </div>
  );
}
