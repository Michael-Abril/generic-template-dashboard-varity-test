'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Check, Clock, Database, Shield, Sparkles, ArrowRight } from 'lucide-react';
import { IntegrationLogo } from '@/components/IntegrationLogo';
import { logger } from '@/lib/logger';

interface SyncingStepProps {
  integration: string;
  integrationName: string;
  walletAddress: string;
  onComplete: () => void;
}

const SKIP_DELAY_MS = 5000; // Show skip option after 5 seconds

interface SyncStage {
  id: string;
  label: string;
  icon: React.ElementType;
  status: 'pending' | 'in_progress' | 'completed';
}

export function SyncingStep({
  integration,
  integrationName,
  walletAddress,
  onComplete,
}: SyncingStepProps) {
  const [stages, setStages] = useState<SyncStage[]>([
    { id: 'connect', label: 'Connection verified', icon: Check, status: 'completed' },
    { id: 'fetch', label: 'Fetching your data', icon: Database, status: 'pending' },
    { id: 'encrypt', label: 'Securing your data', icon: Shield, status: 'pending' },
    { id: 'store', label: 'Storing securely', icon: Clock, status: 'pending' },
    { id: 'index', label: 'Preparing AI insights', icon: Sparkles, status: 'pending' },
  ]);
  const [currentStageIndex, setCurrentStageIndex] = useState(1);
  const [syncComplete, setSyncComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSkip, setShowSkip] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  const handleRetry = () => {
    // Reset states and retry sync
    setError(null);
    setShowSkip(false);
    setStages([
      { id: 'connect', label: 'Connection verified', icon: Check, status: 'completed' },
      { id: 'fetch', label: 'Fetching your data', icon: Database, status: 'pending' },
      { id: 'encrypt', label: 'Encrypting with your key', icon: Shield, status: 'pending' },
      { id: 'store', label: 'Storing securely', icon: Clock, status: 'pending' },
      { id: 'index', label: 'Preparing AI insights', icon: Sparkles, status: 'pending' },
    ]);
    setCurrentStageIndex(1);
    setRetryKey(prev => prev + 1);
  };

  // Show skip option after delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSkip(true);
    }, SKIP_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const runSync = async () => {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

      try {
        // Stage 1: Fetching data
        setStages(prev => prev.map((s, i) =>
          i === 1 ? { ...s, status: 'in_progress' } : s
        ));

        // Trigger the sync on the backend
        const syncResponse = await fetch(
          `${backendUrl}/api/v1/integrations/${integration}/sync?wallet_address=${walletAddress}`,
          { method: 'POST' }
        );

        if (!syncResponse.ok) {
          const errorData = await syncResponse.json().catch(() => ({}));
          throw new Error(errorData.detail || `Sync failed with status ${syncResponse.status}`);
        }

        // Mark fetching complete, start encrypting
        setStages(prev => prev.map((s, i) => {
          if (i === 1) return { ...s, status: 'completed' };
          if (i === 2) return { ...s, status: 'in_progress' };
          return s;
        }));
        setCurrentStageIndex(2);
        await new Promise(resolve => setTimeout(resolve, 500));

        // Mark encrypting complete, start storing
        setStages(prev => prev.map((s, i) => {
          if (i === 2) return { ...s, status: 'completed' };
          if (i === 3) return { ...s, status: 'in_progress' };
          return s;
        }));
        setCurrentStageIndex(3);
        await new Promise(resolve => setTimeout(resolve, 500));

        // Mark storing complete, start indexing
        setStages(prev => prev.map((s, i) => {
          if (i === 3) return { ...s, status: 'completed' };
          if (i === 4) return { ...s, status: 'in_progress' };
          return s;
        }));
        setCurrentStageIndex(4);
        await new Promise(resolve => setTimeout(resolve, 500));

        // Mark indexing complete
        setStages(prev => prev.map(s => ({ ...s, status: 'completed' })));
        setSyncComplete(true);

        // Auto-advance after showing success
        await new Promise(resolve => setTimeout(resolve, 1500));
        onComplete();

      } catch (err) {
        logger.error('Sync error:', err);
        const errorMessage = err instanceof Error ? err.message : 'Sync failed';
        setError(errorMessage);

        // Mark current stage as failed (stays in progress)
        // Don't auto-advance - let user choose to skip or retry
        setShowSkip(true);
      }
    };

    runSync();
  }, [integration, walletAddress, onComplete, retryKey]);

  const completedCount = stages.filter(s => s.status === 'completed').length;
  const progressPercent = (completedCount / stages.length) * 100;

  return (
    <div className="px-6 py-10 sm:px-12 sm:py-12">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <div className="relative">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg ${syncComplete ? 'bg-gradient-to-br from-green-600 to-emerald-600 shadow-green-200' : 'bg-gradient-to-br from-blue-600 to-indigo-600 shadow-blue-200'}`}>
              <IntegrationLogo integration={integration} size="md" />
            </div>
            {!syncComplete && (
              <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center border-3 border-white shadow-md">
                <RefreshCw className="w-4 h-4 text-white animate-spin" />
              </div>
            )}
            {syncComplete && (
              <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-green-600 rounded-full flex items-center justify-center border-3 border-white shadow-md">
                <Check className="w-4 h-4 text-white" />
              </div>
            )}
          </div>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          {syncComplete ? 'Sync Complete' : `Syncing ${integrationName}`}
        </h2>
        <p className="text-gray-600 text-base max-w-xl mx-auto">
          {syncComplete
            ? 'Your data is ready. Let\'s meet your AI assistant.'
            : 'This may take a moment.'}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="max-w-md mx-auto mb-8">
        <div
          className="h-2.5 bg-gray-100 rounded-full overflow-hidden shadow-inner"
          role="progressbar"
          aria-valuenow={Math.round(progressPercent)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Sync progress: ${Math.round(progressPercent)}%`}
        >
          <div
            className={`h-full transition-all duration-500 ease-out ${syncComplete ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-blue-600 to-indigo-600'}`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex justify-between mt-3 text-sm text-gray-600 font-medium">
          <span>{completedCount} of {stages.length} complete</span>
          <span>{Math.round(progressPercent)}%</span>
        </div>
      </div>

      {/* Sync Stages */}
      <div className="max-w-md mx-auto space-y-2.5 mb-6">
        {stages.map((stage) => {
          const Icon = stage.icon;
          const isCompleted = stage.status === 'completed';
          const isInProgress = stage.status === 'in_progress';

          return (
            <div
              key={stage.id}
              className={`flex items-center gap-4 px-5 py-4 rounded-xl transition-all shadow-sm ${
                isCompleted
                  ? 'bg-green-50 border-2 border-green-200'
                  : isInProgress
                  ? 'bg-blue-50 border-2 border-blue-200'
                  : 'bg-gray-50 border border-gray-200'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-md ${
                  isCompleted
                    ? 'bg-gradient-to-br from-green-500 to-emerald-500'
                    : isInProgress
                    ? 'bg-gradient-to-br from-blue-600 to-indigo-600'
                    : 'bg-gray-300'
                }`}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5 text-white" />
                ) : isInProgress ? (
                  <RefreshCw className="w-5 h-5 text-white animate-spin" />
                ) : (
                  <Icon className="w-5 h-5 text-white" />
                )}
              </div>
              <span
                className={`text-base font-semibold ${
                  isCompleted
                    ? 'text-green-700'
                    : isInProgress
                    ? 'text-blue-700'
                    : 'text-gray-400'
                }`}
              >
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Error Message with Retry */}
      {error && (
        <div className="max-w-md mx-auto mb-6">
          <div className="bg-red-50 border border-red-200 rounded-xl p-5 shadow-sm">
            <p className="text-red-700 text-sm font-medium mb-4">{error}</p>
            <div className="flex gap-3">
              <button
                onClick={handleRetry}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-base font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-200/50"
              >
                Try Again
              </button>
              <button
                onClick={onComplete}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl text-base font-medium hover:bg-gray-50 transition-all shadow-sm"
              >
                Skip for Now
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-3 text-center">
              You can sync again from the dashboard
            </p>
          </div>
        </div>
      )}

      {/* Info Note */}
      {syncComplete && (
        <div className="max-w-md mx-auto">
          <p className="text-center text-base text-gray-600">
            Redirecting to your dashboard...
          </p>
        </div>
      )}

      {/* Skip option - appears after delay (only if no error) */}
      {showSkip && !syncComplete && !error && (
        <div className="max-w-md mx-auto mt-8">
          <button
            onClick={onComplete}
            className="w-full text-gray-600 hover:text-gray-900 font-medium text-base py-3 flex items-center justify-center gap-2 transition-colors hover:bg-gray-50 rounded-xl"
          >
            Continue anyway
            <ArrowRight className="w-5 h-5" />
          </button>
          <p className="text-center text-sm text-gray-500 mt-2">
            You can sync again from the dashboard
          </p>
        </div>
      )}
    </div>
  );
}
