/**
 * Integrations Loading State
 * Skeleton UI for integrations page
 */
export default function IntegrationsLoading() {
  return (
    <div className="min-h-screen bg-gray-50 p-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="mb-8">
        <div className="h-8 w-56 bg-gray-200 rounded mb-2"></div>
        <div className="h-4 w-80 bg-gray-200 rounded"></div>
      </div>

      {/* Integration Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6">
            {/* Integration Header */}
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 bg-gray-200 rounded"></div>
              <div className="flex-1">
                <div className="h-6 w-40 bg-gray-300 rounded mb-2"></div>
                <div className="h-4 w-24 bg-gray-200 rounded"></div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2 mb-4">
              <div className="h-3 w-full bg-gray-200 rounded"></div>
              <div className="h-3 w-4/5 bg-gray-200 rounded"></div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <div className="h-10 w-32 bg-blue-200 rounded"></div>
              <div className="h-10 w-24 bg-gray-200 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
