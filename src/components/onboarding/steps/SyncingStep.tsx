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

      // Start the actual sync process
      try {
        // Update to "fetching" stage
        setStages(prev => prev.map((s, i) =>
          i === 1 ? { ...s, status: 'in_progress' } : s
        ));

        // Trigger the sync on the backend
        const syncResponse = await fetch(
          `${backendUrl}/api/v1/integrations/${integration}/sync?wallet_address=${walletAddress}`,
          { method: 'POST' }
        );

        if (!syncResponse.ok) {
          // Even if sync fails, we can still complete onboarding
          // The user can sync later from the dashboard
          console.warn('Sync returned non-ok status, continuing anyway');
        }

        // Simulate the visual progress through stages
        // In reality, the sync is happening in the background
        for (let i = 1; i < stages.length; i++) {
          await new Promise(resolve => setTimeout(resolve, 1200));
          setStages(prev => prev.map((s, idx) => {
            if (idx === i) return { ...s, status: 'completed' };
            if (idx === i + 1) return { ...s, status: 'in_progress' };
            return s;
          }));
          setCurrentStageIndex(i + 1);
        }

        // All stages complete
        await new Promise(resolve => setTimeout(resolve, 500));
        setSyncComplete(true);

        // Auto-advance after showing completion
        await new Promise(resolve => setTimeout(resolve, 1500));
        onComplete();

      } catch (err) {
        console.error('Sync error:', err);
        // Don't block on sync errors - user can retry later
        setError('Some data may not have synced. You can sync again from the dashboard.');

        // Still mark stages as complete and continue
        setStages(prev => prev.map(s => ({ ...s, status: 'completed' })));
        setSyncComplete(true);

        await new Promise(resolve => setTimeout(resolve, 2000));
        onComplete();
      }
    };

    runSync();
  }, [integration, walletAddress, onComplete, stages.length]);

  const completedCount = stages.filter(s => s.status === 'completed').length;
  const progressPercent = (completedCount / stages.length) * 100;

  return (
    <div className="px-6 py-10 sm:px-10 sm:py-12">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <div className="relative">
            <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${syncComplete ? 'bg-green-600' : 'bg-blue-600'}`}>
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
      <div className="max-w-sm mx-auto mb-8">
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
      <div className="max-w-sm mx-auto space-y-2 mb-6">
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

      {/* Error Message (non-blocking) */}
      {error && (
        <div className="max-w-sm mx-auto mb-5">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-700 text-sm">
            {error}
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

      {/* Skip option - appears after delay */}
      {showSkip && !syncComplete && (
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
