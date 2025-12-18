/**
 * AI Assistant Loading State
 * Skeleton UI for AI assistant page
 */
export default function AIAssistantLoading() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col animate-pulse">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-6">
        <div className="h-8 w-64 bg-gray-200 rounded"></div>
      </div>

      {/* Chat Container */}
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full p-6">
        {/* Message Bubbles Skeleton */}
        <div className="flex-1 space-y-4 mb-4">
          {/* Assistant Message */}
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-200 rounded-full flex-shrink-0"></div>
            <div className="bg-white rounded-lg shadow p-4 max-w-lg">
              <div className="h-4 w-64 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 w-48 bg-gray-200 rounded"></div>
            </div>
          </div>

          {/* User Message */}
          <div className="flex items-start gap-3 justify-end">
            <div className="bg-blue-100 rounded-lg p-4 max-w-lg">
              <div className="h-4 w-40 bg-blue-200 rounded"></div>
            </div>
            <div className="w-8 h-8 bg-gray-200 rounded-full flex-shrink-0"></div>
          </div>

          {/* Assistant Message */}
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-200 rounded-full flex-shrink-0"></div>
            <div className="bg-white rounded-lg shadow p-4 max-w-lg">
              <div className="h-4 w-72 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 w-56 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 w-64 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>

        {/* Input Box Skeleton */}
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4">
          <div className="h-12 bg-gray-100 rounded mb-3"></div>
          <div className="flex justify-between items-center">
            <div className="h-4 w-32 bg-gray-200 rounded"></div>
            <div className="h-10 w-24 bg-blue-200 rounded"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
