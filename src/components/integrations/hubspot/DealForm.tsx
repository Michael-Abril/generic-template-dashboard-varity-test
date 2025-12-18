'use client';

import { useState } from 'react';
import { X, Save, DollarSign, Calendar, TrendingUp, Building, User } from 'lucide-react';

interface DealFormData {
  dealname: string;
  amount?: number;
  dealstage: string;
  pipeline?: string;
  closedate?: string;
  dealtype?: string;
  hubspot_owner_id?: string;
  description?: string;
  hs_priority?: string;
  associated_company?: string;
  associated_contact?: string;
}

interface DealFormProps {
  deal?: DealFormData;
  onSave: (deal: DealFormData) => void;
  onCancel: () => void;
  loading?: boolean;
}

const DEAL_STAGES = [
  { id: 'appointmentscheduled', label: 'Appointment Scheduled' },
  { id: 'qualifiedtobuy', label: 'Qualified To Buy' },
  { id: 'presentationscheduled', label: 'Presentation Scheduled' },
  { id: 'decisionmakerboughtin', label: 'Decision Maker Bought-In' },
  { id: 'contractsent', label: 'Contract Sent' },
  { id: 'closedwon', label: 'Closed Won' },
  { id: 'closedlost', label: 'Closed Lost' },
];

const DEAL_TYPES = [
  'newbusiness',
  'existingbusiness',
];

const PRIORITIES = [
  { id: 'low', label: 'Low' },
  { id: 'medium', label: 'Medium' },
  { id: 'high', label: 'High' },
];

const PIPELINES = [
  { id: 'default', label: 'Sales Pipeline' },
  { id: 'support', label: 'Support Pipeline' },
];

export function DealForm({ deal, onSave, onCancel, loading = false }: DealFormProps) {
  const [formData, setFormData] = useState<DealFormData>(deal || {
    dealname: '',
    amount: undefined,
    dealstage: 'appointmentscheduled',
    pipeline: 'default',
    closedate: '',
    dealtype: 'newbusiness',
    hubspot_owner_id: '',
    description: '',
    hs_priority: 'medium',
    associated_company: '',
    associated_contact: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: keyof DealFormData, value: string | number | undefined) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.dealname || !formData.dealname.trim()) {
      newErrors.dealname = 'Deal name is required';
    }

    if (!formData.dealstage) {
      newErrors.dealstage = 'Deal stage is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validate()) {
      onSave(formData);
    }
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'closedwon':
        return 'bg-green-100 text-green-800';
      case 'closedlost':
        return 'bg-red-100 text-red-800';
      case 'contractsent':
      case 'decisionmakerboughtin':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between bg-[#FF7A59]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-white">
              {deal ? 'Edit Deal' : 'Create Deal'}
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Deal Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-gray-600" />
                Deal Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Deal Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.dealname}
                    onChange={(e) => handleChange('dealname', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                      errors.dealname ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Acme Corp - Enterprise Deal"
                  />
                  {errors.dealname && (
                    <p className="mt-1 text-sm text-red-600">{errors.dealname}</p>
                  )}
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
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="50000"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Close Date
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="date"
                      value={formData.closedate || ''}
                      onChange={(e) => handleChange('closedate', e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Deal Type
                  </label>
                  <select
                    value={formData.dealtype || 'newbusiness'}
                    onChange={(e) => handleChange('dealtype', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    {DEAL_TYPES.map(type => (
                      <option key={type} value={type}>
                        {type === 'newbusiness' ? 'New Business' : 'Existing Business'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={formData.hs_priority || 'medium'}
                    onChange={(e) => handleChange('hs_priority', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    {PRIORITIES.map(priority => (
                      <option key={priority.id} value={priority.id}>
                        {priority.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Pipeline & Stage */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Pipeline & Stage</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pipeline
                  </label>
                  <select
                    value={formData.pipeline || 'default'}
                    onChange={(e) => handleChange('pipeline', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    {PIPELINES.map(pipeline => (
                      <option key={pipeline.id} value={pipeline.id}>
                        {pipeline.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Deal Stage <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.dealstage}
                    onChange={(e) => handleChange('dealstage', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                      errors.dealstage ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    {DEAL_STAGES.map(stage => (
                      <option key={stage.id} value={stage.id}>
                        {stage.label}
                      </option>
                    ))}
                  </select>
                  {errors.dealstage && (
                    <p className="mt-1 text-sm text-red-600">{errors.dealstage}</p>
                  )}
                </div>
              </div>

              {/* Stage Preview */}
              <div className="mt-4">
                <div className="flex items-center space-x-2 overflow-x-auto pb-2">
                  {DEAL_STAGES.map((stage, index) => (
                    <div
                      key={stage.id}
                      className={`flex items-center ${index !== DEAL_STAGES.length - 1 ? 'flex-1' : ''}`}
                    >
                      <div
                        className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
                          formData.dealstage === stage.id
                            ? getStageColor(stage.id)
                            : 'bg-gray-50 text-gray-400'
                        }`}
                      >
                        {stage.label}
                      </div>
                      {index !== DEAL_STAGES.length - 1 && (
                        <div className="w-4 h-px bg-gray-300 mx-1" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Associations */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Associations</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Associated Company
                  </label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={formData.associated_company || ''}
                      onChange={(e) => handleChange('associated_company', e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="Search for a company..."
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Associated Contact
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={formData.associated_contact || ''}
                      onChange={(e) => handleChange('associated_contact', e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="Search for a contact..."
                    />
                  </div>
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
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="Notes about this deal..."
              />
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-[#FF7A59] text-white rounded-lg hover:bg-[#FF5C35] disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{loading ? 'Saving...' : 'Save Deal'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
