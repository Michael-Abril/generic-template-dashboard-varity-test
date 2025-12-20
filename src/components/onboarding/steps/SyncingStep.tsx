'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Check, Clock, Database, Shield, Sparkles, ArrowRight } from 'lucide-react';
import { IntegrationLogo } from '@/components/IntegrationLogo';

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
    { id: 'encrypt', label: 'Encrypting with your key', icon: Shield, status: 'pending' },
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
        console.error('Sync error:', err);
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
    <div className="px-6 py-6 sm:px-8 sm:py-8">
      {/* Header */}
      <div className="text-center mb-5">
        <div className="flex justify-center mb-3">
          <div className="relative">
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${syncComplete ? 'bg-green-600' : 'bg-blue-600'}`}>
              <IntegrationLogo integration={integration} size="md" />
            </div>
            {!syncComplete && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center border-2 border-white">
                <RefreshCw className="w-3 h-3 text-white animate-spin" />
              </div>
            )}
            {syncComplete && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-600 rounded-full flex items-center justify-center border-2 border-white">
                <Check className="w-3 h-3 text-white" />
              </div>
            )}
          </div>
        </div>
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">
          {syncComplete ? 'Sync Complete' : `Syncing ${integrationName}`}
        </h2>
        <p className="text-gray-600 text-sm max-w-md mx-auto">
          {syncComplete
            ? 'Your data is ready. Let\'s meet your AI assistant.'
            : 'This may take a moment.'}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="max-w-sm mx-auto mb-5">
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ease-out ${syncComplete ? 'bg-green-500' : 'bg-blue-600'}`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>{completedCount} of {stages.length}</span>
          <span>{Math.round(progressPercent)}%</span>
        </div>
      </div>

      {/* Sync Stages */}
      <div className="max-w-sm mx-auto space-y-1.5 mb-4">
        {stages.map((stage) => {
          const Icon = stage.icon;
          const isCompleted = stage.status === 'completed';
          const isInProgress = stage.status === 'in_progress';

          return (
            <div
              key={stage.id}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isCompleted
                  ? 'bg-green-50 border border-green-100'
                  : isInProgress
                  ? 'bg-blue-50 border border-blue-100'
                  : 'bg-gray-50 border border-gray-100'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  isCompleted
                    ? 'bg-green-500'
                    : isInProgress
                    ? 'bg-blue-600'
                    : 'bg-gray-300'
                }`}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4 text-white" />
                ) : isInProgress ? (
                  <RefreshCw className="w-4 h-4 text-white animate-spin" />
                ) : (
                  <Icon className="w-4 h-4 text-white" />
                )}
              </div>
              <span
                className={`text-sm font-medium ${
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
        <div className="max-w-sm mx-auto mb-5">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700 text-sm font-medium mb-3">{error}</p>
            <div className="flex gap-2">
              <button
                onClick={handleRetry}
                className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={onComplete}
                className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Skip for Now
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">
              You can sync again from the dashboard
            </p>
          </div>
        </div>
      )}

      {/* Info Note */}
      {syncComplete && (
        <div className="max-w-sm mx-auto">
          <p className="text-center text-sm text-gray-500">
            Redirecting to your dashboard...
          </p>
        </div>
      )}

      {/* Skip option - appears after delay (only if no error) */}
      {showSkip && !syncComplete && !error && (
        <div className="max-w-sm mx-auto mt-6">
          <button
            onClick={onComplete}
            className="w-full text-gray-500 hover:text-gray-700 font-medium text-sm py-2 flex items-center justify-center gap-2 transition-colors"
          >
            Continue anyway
            <ArrowRight className="w-4 h-4" />
          </button>
          <p className="text-center text-xs text-gray-400 mt-1">
            You can sync again from the dashboard
          </p>
        </div>
      )}
    </div>
  );
}
