'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Target,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  DollarSign,
  Package,
  Settings,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { getRoadmap, updateMilestoneProgress } from '@/services/planningService';
import {
  Milestone,
  MilestoneStatus,
  GoalType,
  MILESTONE_STATUSES,
  GOAL_TYPES,
  getCurrentQuarter,
} from '@/types/planning';
import { logger } from '@/lib/logger';

interface RoadmapWidgetProps {
  walletAddress: string;
}

const GOAL_ICONS: Record<GoalType, React.ElementType> = {
  growth: TrendingUp,
  revenue: DollarSign,
  product: Package,
  operations: Settings,
};

export function RoadmapWidget({ walletAddress }: RoadmapWidgetProps) {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTimeframe, setCurrentTimeframe] = useState(getCurrentQuarter());
  const [overallProgress, setOverallProgress] = useState(0);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    inProgress: 0,
    atRisk: 0,
  });

  const fetchRoadmap = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await getRoadmap(walletAddress);
      setMilestones(response.milestones);
      setCurrentTimeframe(response.current_timeframe);
      setOverallProgress(response.overall_progress);
      setStats({
        total: response.total_count,
        completed: response.completed_count,
        inProgress: response.in_progress_count,
        atRisk: response.at_risk_count,
      });
    } catch (err) {
      logger.error('Error fetching roadmap:', err);
      setError('Unable to load roadmap');
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    if (walletAddress) {
      fetchRoadmap();
    }
  }, [walletAddress, fetchRoadmap]);

  const getStatusBadge = (status: MilestoneStatus) => {
    const config = MILESTONE_STATUSES[status];
    return (
      <span
        className={`text-xs px-2 py-0.5 rounded-full ${config.bgColor} ${config.textColor}`}
        role="status"
        aria-label={`Status: ${config.label}`}
      >
        {config.label}
      </span>
    );
  };

  const getGoalIcon = (goalType: GoalType) => {
    const Icon = GOAL_ICONS[goalType] || Target;
    const config = GOAL_TYPES[goalType];
    return (
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center bg-${config.color}-100`}
        style={{ backgroundColor: `var(--${config.color}-100, #dbeafe)` }}
      >
        <Icon className={`w-4 h-4 text-${config.color}-600`} style={{ color: `var(--${config.color}-600, #2563eb)` }} />
      </div>
    );
  };

  const getProgressColor = (progress: number, status: MilestoneStatus) => {
    if (status === 'at_risk') return 'bg-amber-500';
    if (status === 'completed') return 'bg-green-500';
    if (progress >= 75) return 'bg-green-500';
    if (progress >= 50) return 'bg-blue-500';
    if (progress >= 25) return 'bg-yellow-500';
    return 'bg-gray-400';
  };

  if (isLoading) {
    return (
      <div
        className="bg-white border border-gray-200 rounded-xl p-5"
        aria-busy="true"
        aria-label="Loading roadmap"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="h-5 bg-gray-200 rounded w-32 animate-pulse" />
          <div className="h-4 bg-gray-200 rounded w-20 animate-pulse" />
        </div>
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="w-8 h-8 rounded-lg bg-gray-200" />
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-2 bg-gray-200 rounded w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="bg-white border border-gray-200 rounded-xl p-5"
        role="alert"
        aria-live="assertive"
      >
        <div className="text-center py-4">
          <AlertCircle className="w-8 h-8 text-yellow-500 mx-auto mb-2" aria-hidden="true" />
          <p className="text-sm text-gray-600">{error}</p>
          <button
            onClick={fetchRoadmap}
            className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
            aria-label="Retry loading roadmap"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  // Get current timeframe milestones for display (max 4)
  const displayMilestones = milestones.slice(0, 4);

  return (
    <div
      className="bg-white border border-gray-200 rounded-xl p-5"
      role="region"
      aria-labelledby="roadmap-widget-title"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 id="roadmap-widget-title" className="font-semibold text-gray-900">Company Roadmap</h3>
          {stats.atRisk > 0 && (
            <span className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
              <AlertCircle className="w-3 h-3" />
              {stats.atRisk} need attention
            </span>
          )}
        </div>
        <Link
          href="/dashboard/roadmap"
          className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          View all
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Overall Progress */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">{currentTimeframe} Goals</span>
          <span className="text-sm text-gray-600">
            {stats.completed}/{stats.total} Done
          </span>
        </div>
        <div
          className="h-2 bg-gray-200 rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={overallProgress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${currentTimeframe} goals progress`}
        >
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-500"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
        <div className="mt-1 text-xs text-gray-500 text-right">{overallProgress}% complete</div>
      </div>

      {/* Milestones */}
      {displayMilestones.length === 0 ? (
        <div className="py-6 text-center">
          <Target className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-900">No goals yet</p>
          <p className="text-xs text-gray-500 mt-1">Create your first milestone to track progress</p>
          <Link
            href="/dashboard/roadmap"
            className="inline-flex items-center gap-1 mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            <Target className="w-4 h-4" />
            Add a goal
          </Link>
        </div>
      ) : (
        <div className="space-y-3" role="list" aria-label="Milestones">
          {displayMilestones.map((milestone) => (
            <Link
              key={milestone.id}
              href="/dashboard/roadmap"
              role="listitem"
              aria-label={`${milestone.title}: ${milestone.progress_percent}% complete, ${MILESTONE_STATUSES[milestone.status].label}`}
              className="group block p-3 -mx-1 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start gap-3">
                {/* Goal Icon */}
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${milestone.color}20` }}
                  aria-hidden="true"
                >
                  {(() => {
                    const Icon = GOAL_ICONS[milestone.goal_type] || Target;
                    return <Icon className="w-4 h-4" style={{ color: milestone.color }} />;
                  })()}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                      {milestone.title}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    {getStatusBadge(milestone.status)}
                    <span className="text-xs text-gray-500">{milestone.timeframe_value}</span>
                  </div>
                  {/* Progress Bar */}
                  <div
                    className="h-1.5 bg-gray-200 rounded-full overflow-hidden"
                    role="progressbar"
                    aria-valuenow={milestone.progress_percent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${milestone.title} progress`}
                  >
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${getProgressColor(
                        milestone.progress_percent,
                        milestone.status
                      )}`}
                      style={{ width: `${milestone.progress_percent}%` }}
                    />
                  </div>
                  <div className="mt-1 text-xs text-gray-500">{milestone.progress_percent}%</div>
                </div>
              </div>
            </Link>
          ))}

          {/* Show more link if there are more milestones */}
          {milestones.length > 4 && (
            <Link
              href="/dashboard/roadmap"
              className="block pt-2 text-center text-sm text-gray-500 hover:text-blue-600 transition-colors"
            >
              +{milestones.length - 4} more goals
            </Link>
          )}
        </div>
      )}

      {/* Quick Stats Footer */}
      {stats.total > 0 && (
        <div
          className="mt-4 pt-3 border-t border-gray-100 grid grid-cols-3 gap-4 text-center"
          role="group"
          aria-label="Milestone statistics"
        >
          <div>
            <p className="text-lg font-semibold text-gray-900">{stats.inProgress}</p>
            <p className="text-xs text-gray-500">In Progress</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-green-600">{stats.completed}</p>
            <p className="text-xs text-gray-500">Completed</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-amber-600">{stats.atRisk}</p>
            <p className="text-xs text-gray-500">Need Attention</p>
          </div>
        </div>
      )}
    </div>
  );
}
