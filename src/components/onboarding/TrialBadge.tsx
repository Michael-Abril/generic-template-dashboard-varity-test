'use client';

import { Clock } from 'lucide-react';

interface TrialBadgeProps {
  tier: '30_day' | '14_day';
  days: number;
}

export function TrialBadge({ tier, days }: TrialBadgeProps) {
  const isFirstTier = tier === '30_day';

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
        isFirstTier
          ? 'bg-green-100 text-green-700 border border-green-200'
          : 'bg-blue-100 text-blue-700 border border-blue-200'
      }`}
    >
      <Clock className="w-3.5 h-3.5" />
      <span>{days}-day trial</span>
      {isFirstTier && (
        <span className="bg-green-600 text-white px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase">
          Early
        </span>
      )}
    </div>
  );
}
