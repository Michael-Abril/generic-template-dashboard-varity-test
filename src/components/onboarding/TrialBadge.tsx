'use client';

import { Sparkles, Star } from 'lucide-react';

interface TrialBadgeProps {
  tier: '30_day' | '14_day';
  days: number;
}

export function TrialBadge({ tier, days }: TrialBadgeProps) {
  const isFirstTier = tier === '30_day';

  return (
    <div className="relative">
      {/* Glow effect */}
      {isFirstTier && (
        <div className="absolute inset-0 bg-gradient-to-r from-amber-400/30 to-orange-500/30 rounded-full blur-lg"></div>
      )}

      <div
        className={`relative inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold shadow-lg ${
          isFirstTier
            ? 'bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 text-white'
            : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white'
        }`}
      >
        {isFirstTier ? (
          <Star className="w-4 h-4 fill-current" />
        ) : (
          <Sparkles className="w-4 h-4" />
        )}
        <span>{days}-Day Free Trial</span>
        {isFirstTier && (
          <span className="bg-white/25 px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wide">
            EARLY ADOPTER
          </span>
        )}
      </div>
    </div>
  );
}
