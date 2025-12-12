/**
 * Onboarding Loading State
 * Skeleton UI for onboarding page
 */
export default function OnboardingLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-6 animate-pulse">
      <div className="max-w-2xl w-full">
        {/* Progress Bar Skeleton */}
        <div className="mb-8">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full w-1/3 bg-blue-300 rounded-full"></div>
          </div>
        </div>

        {/* Card Skeleton */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Title */}
          <div className="h-8 w-64 bg-gray-300 rounded mb-4"></div>
          <div className="h-4 w-full bg-gray-200 rounded mb-8"></div>

          {/* Form Fields */}
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i}>
                <div className="h-4 w-32 bg-gray-200 rounded mb-2"></div>
                <div className="h-12 bg-gray-100 rounded"></div>
              </div>
            ))}
          </div>

          {/* Buttons */}
          <div className="flex gap-4 mt-8">
            <div className="h-12 w-32 bg-gray-200 rounded"></div>
            <div className="h-12 flex-1 bg-blue-200 rounded"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
