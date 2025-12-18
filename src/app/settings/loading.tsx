/**
 * Settings Loading State
 * Skeleton UI for settings page
 */
export default function SettingsLoading() {
  return (
    <div className="min-h-screen bg-gray-50 p-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="mb-8">
        <div className="h-8 w-40 bg-gray-200 rounded mb-2"></div>
        <div className="h-4 w-64 bg-gray-200 rounded"></div>
      </div>

      {/* Settings Sections */}
      <div className="max-w-4xl space-y-6">
        {/* Profile Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="h-6 w-48 bg-gray-300 rounded mb-6"></div>
          <div className="space-y-4">
            <div>
              <div className="h-4 w-24 bg-gray-200 rounded mb-2"></div>
              <div className="h-10 bg-gray-100 rounded"></div>
            </div>
            <div>
              <div className="h-4 w-24 bg-gray-200 rounded mb-2"></div>
              <div className="h-10 bg-gray-100 rounded"></div>
            </div>
          </div>
        </div>

        {/* Security Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="h-6 w-40 bg-gray-300 rounded mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-gray-100">
                <div>
                  <div className="h-5 w-48 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 w-64 bg-gray-200 rounded"></div>
                </div>
                <div className="h-6 w-12 bg-gray-300 rounded-full"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Preferences Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="h-6 w-56 bg-gray-300 rounded mb-6"></div>
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i}>
                <div className="h-4 w-32 bg-gray-200 rounded mb-2"></div>
                <div className="h-10 bg-gray-100 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
