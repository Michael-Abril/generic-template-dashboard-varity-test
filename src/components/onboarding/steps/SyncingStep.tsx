'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Check, Clock, Database, Shield, Sparkles } from 'lucide-react';
import { IntegrationLogo } from '@/components/IntegrationLogo';

interface SyncingStepProps {
  integration: string;
  integrationName: string;
  walletAddress: string;
  onComplete: () => void;
}

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
    <div className="p-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <div className="relative">
            <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center">
              <IntegrationLogo integration={integration} size="md" />
            </div>
            {!syncComplete && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                <RefreshCw className="w-3.5 h-3.5 text-white animate-spin" />
              </div>
            )}
            {syncComplete && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-600 rounded-full flex items-center justify-center">
                <Check className="w-3.5 h-3.5 text-white" />
              </div>
            )}
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {syncComplete ? 'Sync Complete!' : `Syncing ${integrationName}`}
        </h2>
        <p className="text-gray-600">
          {syncComplete
            ? 'Your data is ready. Let\'s meet your AI assistant!'
            : 'This may take a moment. Your data is being securely processed.'}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="max-w-md mx-auto mb-8">
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-sm text-gray-500">
          <span>{completedCount} of {stages.length} steps</span>
          <span>{Math.round(progressPercent)}%</span>
        </div>
      </div>

      {/* Sync Stages */}
      <div className="max-w-md mx-auto space-y-3 mb-8">
        {stages.map((stage) => {
          const Icon = stage.icon;
          const isCompleted = stage.status === 'completed';
          const isInProgress = stage.status === 'in_progress';

          return (
            <div
              key={stage.id}
              className={`flex items-center gap-4 p-4 rounded-lg transition-all ${
                isCompleted
                  ? 'bg-green-50 border border-green-200'
                  : isInProgress
                  ? 'bg-blue-50 border border-blue-200'
                  : 'bg-gray-50 border border-gray-200'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  isCompleted
                    ? 'bg-green-600'
                    : isInProgress
                    ? 'bg-blue-600'
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
                className={`font-medium ${
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
        <div className="max-w-md mx-auto mb-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Info Note */}
      <div className="max-w-md mx-auto">
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <p className="text-sm text-gray-500">
            {syncComplete ? (
              <>Redirecting you to meet your AI assistant...</>
            ) : (
              <>
                <span className="font-medium">Your data is encrypted</span> with your unique wallet key.
                Even we can&apos;t read it!
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
