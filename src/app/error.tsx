'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';

/**
 * Error Page
 * Catches errors in the app router and displays a user-friendly error page.
 * Auto-resets when the user navigates to a different page.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const initialPathRef = useRef(pathname);

  // Auto-reset when pathname changes (user navigates to a different page)
  useEffect(() => {
    if (pathname !== initialPathRef.current) {
      reset();
    }
  }, [pathname, reset]);

  useEffect(() => {
    // Log the error to console in development
    console.error('App error boundary caught error', {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    });
  }, [error]);

  const handleGoHome = () => {
    // Use router.push to properly navigate and trigger reset
    router.push('/dashboard');
  };

  const handleTryAgain = () => {
    // Reset the error boundary
    reset();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Error Icon */}
        <div className="mb-8">
          <div className="w-24 h-24 bg-gradient-to-br from-red-100 to-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-12 h-12 text-red-500" />
          </div>
        </div>

        {/* Error Message */}
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Something Went Wrong
        </h1>
        <p className="text-gray-600 mb-8">
          We encountered an unexpected error. Don't worry, your data is safe. Please try again or contact support if the problem persists.
        </p>

        {/* Error Details (Development Only) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8 text-left">
            <p className="text-xs font-mono text-red-800 break-words">
              {error.message}
            </p>
            {error.digest && (
              <p className="text-xs font-mono text-red-600 mt-2">
                Error ID: {error.digest}
              </p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
          <button
            onClick={handleTryAgain}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
          >
            Try Again
          </button>
          <button
            onClick={handleGoHome}
            className="bg-white text-gray-900 px-8 py-3 rounded-lg font-semibold border-2 border-gray-200 hover:border-gray-300 hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all duration-200"
          >
            Go to Dashboard
          </button>
        </div>

        {/* Help Text */}
        <div className="pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            Need help? Contact{' '}
            <a
              href="mailto:support@varity.so"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              support@varity.so
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
