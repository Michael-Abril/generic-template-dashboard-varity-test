'use client';

import { useState, useEffect } from 'react';
import { X, Save, Loader2, DollarSign, Calendar, TrendingUp, Building, Percent } from 'lucide-react';

interface OpportunityFormProps {
  opportunity?: any;
  isOpen: boolean;
  onClose: () => void;
  onSave: (opportunity: any) => Promise<void>;
  walletAddress: string;
}

interface OpportunityFormData {
  name: string;
  account_id?: string;
  account_name?: string;
  amount?: number;
  close_date: string;
  stage: string;
  probability?: number;
  type?: string;
  lead_source?: string;
  next_step?: string;
  description?: string;
  forecast_category?: string;
}

const STAGES = [
  'Prospecting',
  'Qualification',
  'Needs Analysis',
  'Value Proposition',
  'Id. Decision Makers',
  'Perception Analysis',
  'Proposal/Price Quote',
  'Negotiation/Review',
  'Closed Won',
  'Closed Lost',
];

const STAGE_PROBABILITY: Record<string, number> = {
  'Prospecting': 10,
  'Qualification': 20,
  'Needs Analysis': 30,
  'Value Proposition': 40,
  'Id. Decision Makers': 50,
  'Perception Analysis': 60,
  'Proposal/Price Quote': 70,
  'Negotiation/Review': 80,
  'Closed Won': 100,
  'Closed Lost': 0,
};

const OPPORTUNITY_TYPES = [
  'Existing Customer - Upgrade',
  'Existing Customer - Replacement',
  'Existing Customer - Downgrade',
  'New Customer',
];

const LEAD_SOURCES = [
  'Web',
  'Phone Inquiry',
  'Partner Referral',
  'Purchased List',
  'Other',
];

const FORECAST_CATEGORIES = [
  'Pipeline',
  'Best Case',
  'Commit',
  'Omitted',
  'Closed',
];

export default function OpportunityForm({ opportunity, isOpen, onClose, onSave, walletAddress }: OpportunityFormProps) {
  const [formData, setFormData] = useState<OpportunityFormData>({
    name: '',
    close_date: new Date().toISOString().split('T')[0],
    stage: 'Prospecting',
    probability: 10,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (opportunity) {
      setFormData({
        name: opportunity.name || '',
        account_id: opportunity.account_id,
        account_name: opportunity.account_name,
        amount: opportunity.amount,
        close_date: opportunity.close_date || new Date().toISOString().split('T')[0],
        stage: opportunity.stage || 'Prospecting',
        probability: opportunity.probability ?? STAGE_PROBABILITY[opportunity.stage] ?? 10,
        type: opportunity.type,
        lead_source: opportunity.lead_source,
        next_step: opportunity.next_step,
        description: opportunity.description,
        forecast_category: opportunity.forecast_category,
      });
    } else {
      setFormData({
        name: '',
        close_date: new Date().toISOString().split('T')[0],
        stage: 'Prospecting',
        probability: 10,
      });
    }
  }, [opportunity, isOpen]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Opportunity name is required';
    }
    if (!formData.close_date) {
      newErrors.close_date = 'Close date is required';
    }
    if (!formData.stage) {
      newErrors.stage = 'Stage is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        ...formData,
        id: opportunity?.id,
      });
      onClose();
    } catch (error) {
      console.error('Error saving opportunity:', error);
      setErrors({ submit: 'Failed to save opportunity. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: keyof OpportunityFormData, value: any) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };

      // Auto-update probability when stage changes
      if (field === 'stage' && STAGE_PROBABILITY[value] !== undefined) {
        updated.probability = STAGE_PROBABILITY[value];
      }

      return updated;
    });

    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-[#032D60]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-white">
              {opportunity ? 'Edit Opportunity' : 'New Opportunity'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Opportunity Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Opportunity Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Opportunity Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none ${
                      errors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Acme Corp - Enterprise Deal"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account Name
                  </label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={formData.account_name || ''}
                      onChange={(e) => handleChange('account_name', e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder="Acme Corporation"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  <select
                    value={formData.type || ''}
                    onChange={(e) => handleChange('type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value="">--None--</option>
                    {OPPORTUNITY_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lead Source
                  </label>
                  <select
                    value={formData.lead_source || ''}
                    onChange={(e) => handleChange('lead_source', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value="">--None--</option>
                    {LEAD_SOURCES.map(source => (
                      <option key={source} value={source}>{source}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="number"
                      value={formData.amount || ''}
                      onChange={(e) => handleChange('amount', e.target.value ? parseFloat(e.target.value) : undefined)}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder="50000"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Stage Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Stage Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Close Date <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="date"
                      value={formData.close_date}
                      onChange={(e) => handleChange('close_date', e.target.value)}
                      className={`w-full pl-10 pr-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none ${
                        errors.close_date ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                  </div>
                  {errors.close_date && (
                    <p className="mt-1 text-sm text-red-600">{errors.close_date}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stage <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.stage}
                    onChange={(e) => handleChange('stage', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none ${
                      errors.stage ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    {STAGES.map(stage => (
                      <option key={stage} value={stage}>{stage}</option>
                    ))}
                  </select>
                  {errors.stage && (
                    <p className="mt-1 text-sm text-red-600">{errors.stage}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Probability (%)
                  </label>
                  <div className="relative">
                    <Percent className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="number"
                      value={formData.probability || 0}
                      onChange={(e) => handleChange('probability', parseInt(e.target.value) || 0)}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      min="0"
                      max="100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Forecast Category
                  </label>
                  <select
                    value={formData.forecast_category || ''}
                    onChange={(e) => handleChange('forecast_category', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value="">--None--</option>
                    {FORECAST_CATEGORIES.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Next Step
                  </label>
                  <input
                    type="text"
                    value={formData.next_step || ''}
                    onChange={(e) => handleChange('next_step', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="Schedule demo call"
                  />
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                placeholder="Details about this opportunity..."
              />
            </div>

            {errors.submit && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{errors.submit}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-[#0176D3] text-white rounded-md hover:bg-[#014486] transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Opportunity</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
