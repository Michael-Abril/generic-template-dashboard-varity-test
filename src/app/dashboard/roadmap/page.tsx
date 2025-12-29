'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Layout } from '@/components/Layout';
import { usePrivy } from '@privy-io/react-auth';
import { useWalletSync } from '@/hooks/useWalletSync';
import {
  Target,
  Plus,
  TrendingUp,
  DollarSign,
  Package,
  Settings,
  AlertCircle,
  CheckCircle2,
  Loader2,
  MoreVertical,
  Edit2,
  Trash2,
  Calendar,
} from 'lucide-react';
import {
  getRoadmap,
  createMilestone,
  updateMilestone,
  deleteMilestone,
  updateMilestoneProgress,
} from '@/services/planningService';
import {
  Milestone,
  MilestoneCreate,
  MilestoneStatus,
  TimeframeType,
  GoalType,
  MILESTONE_STATUSES,
  GOAL_TYPES,
  getCurrentQuarter,
  getCurrentMonth,
} from '@/types/planning';
import { logger } from '@/lib/logger';

const GOAL_ICONS: Record<GoalType, React.ElementType> = {
  growth: TrendingUp,
  revenue: DollarSign,
  product: Package,
  operations: Settings,
};

const TIMEFRAME_TYPES = [
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'custom', label: 'Custom' },
];

const PRESET_COLORS = [
  { value: '#3b82f6', label: 'Blue', class: 'bg-blue-500' },
  { value: '#10b981', label: 'Green', class: 'bg-green-500' },
  { value: '#8b5cf6', label: 'Purple', class: 'bg-purple-500' },
  { value: '#f59e0b', label: 'Orange', class: 'bg-orange-500' },
  { value: '#ef4444', label: 'Red', class: 'bg-red-500' },
  { value: '#6366f1', label: 'Indigo', class: 'bg-indigo-500' },
];

export default function RoadmapPage() {
  const { user, authenticated } = usePrivy();
  const { address: walletAddress } = useWalletSync();

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

  // Filters
  const [selectedTimeframeType, setSelectedTimeframeType] = useState<TimeframeType | 'all'>('all');

  // Dialogs
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const [deletingMilestoneId, setDeletingMilestoneId] = useState<number | null>(null);

  // Form state
  const [formData, setFormData] = useState<MilestoneCreate>({
    wallet_address: walletAddress || '',
    title: '',
    description: '',
    timeframe_type: 'quarterly',
    timeframe_value: getCurrentQuarter(),
    target_date: '',
    goal_type: 'growth',
    color: '#3b82f6',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Progress update
  const [updatingProgressId, setUpdatingProgressId] = useState<number | null>(null);
  const [progressValues, setProgressValues] = useState<Record<number, number>>({});

  const fetchRoadmap = useCallback(async () => {
    if (!walletAddress) return;

    try {
      setIsLoading(true);
      setError(null);
      const response = await getRoadmap(walletAddress, {
        timeframe_type: selectedTimeframeType === 'all' ? undefined : selectedTimeframeType,
      });
      setMilestones(response.milestones);
      setCurrentTimeframe(response.current_timeframe);
      setOverallProgress(response.overall_progress);
      setStats({
        total: response.total_count,
        completed: response.completed_count,
        inProgress: response.in_progress_count,
        atRisk: response.at_risk_count,
      });

      // Initialize progress values
      const progressMap: Record<number, number> = {};
      response.milestones.forEach((m) => {
        progressMap[m.id] = m.progress_percent;
      });
      setProgressValues(progressMap);
    } catch (err) {
      logger.error('Error fetching roadmap:', err);
      setError('Unable to load roadmap. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress, selectedTimeframeType]);

  useEffect(() => {
    if (walletAddress) {
      fetchRoadmap();
    }
  }, [walletAddress, fetchRoadmap]);

  const handleOpenAddDialog = () => {
    setFormData({
      wallet_address: walletAddress || '',
      title: '',
      description: '',
      timeframe_type: 'quarterly',
      timeframe_value: getCurrentQuarter(),
      target_date: '',
      goal_type: 'growth',
      color: '#3b82f6',
    });
    setFormErrors({});
    setEditingMilestone(null);
    setIsAddDialogOpen(true);
  };

  const handleOpenEditDialog = (milestone: Milestone) => {
    setFormData({
      wallet_address: walletAddress || '',
      title: milestone.title,
      description: milestone.description || '',
      timeframe_type: milestone.timeframe_type,
      timeframe_value: milestone.timeframe_value,
      target_date: milestone.target_date || '',
      goal_type: milestone.goal_type,
      color: milestone.color,
    });
    setFormErrors({});
    setEditingMilestone(milestone);
    setIsAddDialogOpen(true);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.title.trim()) {
      errors.title = 'Goal title is required';
    }
    if (!formData.timeframe_value.trim()) {
      errors.timeframe_value = 'Timeframe is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      if (editingMilestone) {
        // Update
        await updateMilestone(editingMilestone.id, walletAddress!, {
          title: formData.title,
          description: formData.description,
          timeframe_type: formData.timeframe_type,
          timeframe_value: formData.timeframe_value,
          target_date: formData.target_date || undefined,
          goal_type: formData.goal_type,
          color: formData.color,
        });
      } else {
        // Create
        await createMilestone(formData);
      }
      setIsAddDialogOpen(false);
      fetchRoadmap();
    } catch (err) {
      logger.error('Error saving milestone:', err);
      setFormErrors({ submit: 'Failed to save goal. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (milestoneId: number) => {
    if (!confirm('Are you sure you want to delete this goal?')) return;

    setDeletingMilestoneId(milestoneId);
    try {
      await deleteMilestone(milestoneId, walletAddress!);
      fetchRoadmap();
    } catch (err) {
      logger.error('Error deleting milestone:', err);
      alert('Failed to delete goal. Please try again.');
    } finally {
      setDeletingMilestoneId(null);
    }
  };

  const handleProgressChange = async (milestoneId: number, newProgress: number) => {
    setProgressValues((prev) => ({ ...prev, [milestoneId]: newProgress }));
  };

  const handleProgressBlur = async (milestoneId: number) => {
    const newProgress = progressValues[milestoneId];
    const milestone = milestones.find((m) => m.id === milestoneId);

    if (!milestone || milestone.progress_percent === newProgress) return;

    setUpdatingProgressId(milestoneId);
    try {
      await updateMilestoneProgress(milestoneId, walletAddress!, newProgress);
      fetchRoadmap();
    } catch (err) {
      logger.error('Error updating progress:', err);
      // Revert to original
      setProgressValues((prev) => ({ ...prev, [milestoneId]: milestone.progress_percent }));
    } finally {
      setUpdatingProgressId(null);
    }
  };

  const getStatusBadge = (status: MilestoneStatus) => {
    const config = MILESTONE_STATUSES[status];
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full ${config.bgColor} ${config.textColor}`}>
        {config.label}
      </span>
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

  const filteredMilestones = useMemo(() => {
    return milestones;
  }, [milestones]);

  if (!authenticated) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Target className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">Please sign in to view your roadmap.</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Company Roadmap</h1>
              <p className="text-gray-600 mt-1">Track your business goals and milestones</p>
            </div>
            <button
              onClick={handleOpenAddDialog}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Goal
            </button>
          </div>

          {/* Timeframe Tabs */}
          <div className="flex items-center gap-2 border-b border-gray-200">
            <button
              onClick={() => setSelectedTimeframeType('all')}
              className={`px-4 py-2 font-medium transition-colors border-b-2 ${
                selectedTimeframeType === 'all'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              All
            </button>
            {TIMEFRAME_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => setSelectedTimeframeType(type.value as TimeframeType)}
                className={`px-4 py-2 font-medium transition-colors border-b-2 ${
                  selectedTimeframeType === type.value
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Overall Progress */}
        {stats.total > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{currentTimeframe} Progress</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {stats.completed} of {stats.total} goals completed
                </p>
              </div>
              {stats.atRisk > 0 && (
                <span className="flex items-center gap-1 text-sm font-medium text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full">
                  <AlertCircle className="w-4 h-4" />
                  {stats.atRisk} need attention
                </span>
              )}
            </div>
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
            <div className="mt-2 text-sm text-gray-600 text-right">{overallProgress}% complete</div>

            {/* Stats Grid */}
            <div className="mt-6 grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">{stats.inProgress}</p>
                <p className="text-sm text-gray-600 mt-1">Working on it</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
                <p className="text-sm text-gray-600 mt-1">Complete</p>
              </div>
              <div className="text-center p-4 bg-amber-50 rounded-lg">
                <p className="text-2xl font-bold text-amber-600">{stats.atRisk}</p>
                <p className="text-sm text-gray-600 mt-1">Need Attention</p>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading your roadmap...</p>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-red-700">{error}</p>
            <button
              onClick={fetchRoadmap}
              className="mt-4 text-sm text-red-600 hover:text-red-700 font-medium"
            >
              Try again
            </button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && filteredMilestones.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
            <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No goals yet</h3>
            <p className="text-gray-600 mb-6">
              Create your first milestone to start tracking your company's progress
            </p>
            <button
              onClick={handleOpenAddDialog}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add your first goal
            </button>
          </div>
        )}

        {/* Milestone Cards Grid */}
        {!isLoading && !error && filteredMilestones.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMilestones.map((milestone) => {
              const Icon = GOAL_ICONS[milestone.goal_type] || Target;
              const progress = progressValues[milestone.id] ?? milestone.progress_percent;

              return (
                <div
                  key={milestone.id}
                  className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-lg transition-shadow"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${milestone.color}20` }}
                    >
                      <Icon className="w-5 h-5" style={{ color: milestone.color }} />
                    </div>
                    <div className="relative">
                      <button className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      <div className="absolute right-0 mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                        <button
                          onClick={() => handleOpenEditDialog(milestone)}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(milestone.id)}
                          disabled={deletingMilestoneId === milestone.id}
                          className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                    {milestone.title}
                  </h3>

                  {/* Description */}
                  {milestone.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{milestone.description}</p>
                  )}

                  {/* Status and Timeframe */}
                  <div className="flex items-center gap-2 mb-4">
                    {getStatusBadge(milestone.status)}
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {milestone.timeframe_value}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-700">Progress</span>
                      <span className="text-xs text-gray-600">{progress}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${getProgressColor(
                          progress,
                          milestone.status
                        )}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Progress Slider */}
                  <div className="pt-3 border-t border-gray-100">
                    <label className="text-xs text-gray-600 mb-1 block">Update progress:</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={progress}
                        onChange={(e) => handleProgressChange(milestone.id, parseInt(e.target.value))}
                        onMouseUp={() => handleProgressBlur(milestone.id)}
                        onTouchEnd={() => handleProgressBlur(milestone.id)}
                        className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        disabled={updatingProgressId === milestone.id}
                      />
                      {updatingProgressId === milestone.id && (
                        <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add/Edit Dialog */}
        {isAddDialogOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingMilestone ? 'Edit Goal' : 'Add New Goal'}
                </h2>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Goal Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Increase monthly revenue by 20%"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {formErrors.title && <p className="text-xs text-red-600 mt-1">{formErrors.title}</p>}
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Add more details about this goal..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>

                {/* Timeframe Type */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Timeframe Type</label>
                    <select
                      value={formData.timeframe_type}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          timeframe_type: e.target.value as TimeframeType,
                          timeframe_value:
                            e.target.value === 'quarterly'
                              ? getCurrentQuarter()
                              : e.target.value === 'monthly'
                              ? getCurrentMonth()
                              : '',
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    >
                      {TIMEFRAME_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Timeframe Value */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Timeframe <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.timeframe_value}
                      onChange={(e) => setFormData({ ...formData, timeframe_value: e.target.value })}
                      placeholder={
                        formData.timeframe_type === 'quarterly'
                          ? 'Q1 2025'
                          : formData.timeframe_type === 'monthly'
                          ? 'Jan 2025'
                          : 'Phase 1'
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {formErrors.timeframe_value && (
                      <p className="text-xs text-red-600 mt-1">{formErrors.timeframe_value}</p>
                    )}
                  </div>
                </div>

                {/* Target Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Target Date</label>
                  <input
                    type="date"
                    value={formData.target_date}
                    onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Goal Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Goal Type</label>
                  <div className="grid grid-cols-2 gap-3">
                    {(Object.keys(GOAL_TYPES) as GoalType[]).map((type) => {
                      const config = GOAL_TYPES[type];
                      const Icon = GOAL_ICONS[type];
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setFormData({ ...formData, goal_type: type })}
                          className={`flex items-center gap-3 p-3 border-2 rounded-lg transition-all ${
                            formData.goal_type === type
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: `var(--${config.color}-100, #dbeafe)` }}
                          >
                            <Icon
                              className="w-4 h-4"
                              style={{ color: `var(--${config.color}-600, #2563eb)` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-900">{config.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Color Picker */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                  <div className="flex items-center gap-2">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, color: color.value })}
                        className={`w-10 h-10 rounded-lg ${color.class} transition-all ${
                          formData.color === color.value
                            ? 'ring-2 ring-offset-2 ring-gray-900'
                            : 'hover:scale-110'
                        }`}
                        title={color.label}
                      />
                    ))}
                  </div>
                </div>

                {/* Error Message */}
                {formErrors.submit && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700">{formErrors.submit}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setIsAddDialogOpen(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    {editingMilestone ? 'Save Changes' : 'Create Goal'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
