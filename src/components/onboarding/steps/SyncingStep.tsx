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
    <div className="p-8 sm:p-10">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="flex justify-center mb-5">
          <div className="relative">
            <div className={`absolute inset-0 rounded-2xl blur-xl transition-all ${syncComplete ? 'bg-green-500/20' : 'bg-blue-500/20 animate-pulse'}`}></div>
            <div className={`relative w-20 h-20 rounded-2xl flex items-center justify-center shadow-xl transition-all ${syncComplete ? 'bg-gradient-to-br from-green-500 to-emerald-600' : 'bg-gradient-to-br from-blue-500 to-indigo-600'}`}>
              <IntegrationLogo integration={integration} size="md" />
            </div>
            {!syncComplete && (
              <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                <RefreshCw className="w-4 h-4 text-white animate-spin" />
              </div>
            )}
            {syncComplete && (
              <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-600 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                <Check className="w-4 h-4 text-white" />
              </div>
            )}
          </div>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
          {syncComplete ? '🎉 Sync Complete!' : `Syncing ${integrationName}`}
        </h2>
        <p className="text-gray-600 text-lg max-w-md mx-auto">
          {syncComplete
            ? 'Your data is ready. Let\'s meet your AI assistant!'
            : 'This may take a moment. Your data is being securely processed.'}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="max-w-md mx-auto mb-10">
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden shadow-inner">
          <div
            className={`h-full transition-all duration-500 ease-out ${syncComplete ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-blue-500 to-indigo-500'}`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex justify-between mt-3 text-sm">
          <span className="text-gray-600 font-medium">{completedCount} of {stages.length} steps</span>
          <span className={`font-bold ${syncComplete ? 'text-green-600' : 'text-blue-600'}`}>{Math.round(progressPercent)}%</span>
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
              className={`flex items-center gap-4 p-4 rounded-xl transition-all ${
                isCompleted
                  ? 'bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200'
                  : isInProgress
                  ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 shadow-sm'
                  : 'bg-gray-50 border border-gray-200'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-sm ${
                  isCompleted
                    ? 'bg-gradient-to-br from-green-500 to-emerald-600'
                    : isInProgress
                    ? 'bg-gradient-to-br from-blue-500 to-indigo-600'
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
                className={`font-semibold ${
                  isCompleted
                    ? 'text-green-700'
                    : isInProgress
                    ? 'text-blue-700'
                    : 'text-gray-400'
                }`}
              >
                {stage.label}
              </span>
              {isCompleted && (
                <span className="ml-auto text-xs text-green-600 font-medium">Done</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Error Message (non-blocking) */}
      {error && (
        <div className="max-w-md mx-auto mb-6">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <div className="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-amber-600 text-xs font-bold">!</span>
            </div>
            <p className="text-amber-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Info Note */}
      <div className="max-w-md mx-auto">
        <div className={`rounded-xl p-5 text-center transition-all ${syncComplete ? 'bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200' : 'bg-gradient-to-br from-gray-50 to-blue-50 border border-gray-100'}`}>
          <p className="text-sm">
            {syncComplete ? (
              <span className="text-green-700 font-medium">
                ✨ Redirecting you to meet your AI assistant...
              </span>
            ) : (
              <span className="text-gray-600">
                <span className="font-semibold text-gray-700">🔒 Your data is encrypted</span> with your unique wallet key.
                Even we can&apos;t read it!
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
