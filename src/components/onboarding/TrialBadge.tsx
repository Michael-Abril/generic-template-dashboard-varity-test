'use client';

import { Sparkles } from 'lucide-react';

interface TrialBadgeProps {
  tier: '30_day' | '14_day';
  days: number;
}

export function TrialBadge({ tier, days }: TrialBadgeProps) {
  const isFirstTier = tier === '30_day';

  return (
    <div
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${
        isFirstTier
          ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
          : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white'
      }`}
    >
      <Sparkles className="w-4 h-4" />
      <span>{days}-Day Free Trial</span>
      {isFirstTier && (
        <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
          Early Adopter
        </span>
      )}
    </div>
  );
}
