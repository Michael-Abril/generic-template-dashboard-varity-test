'use client';

import { useState } from 'react';
import { X, Save, Ticket, AlertCircle, User, Building, MessageSquare } from 'lucide-react';

interface TicketFormData {
  subject: string;
  content?: string;
  hs_pipeline: string;
  hs_pipeline_stage: string;
  hs_ticket_priority?: string;
  hs_ticket_category?: string;
  source_type?: string;
  associated_contact?: string;
  associated_company?: string;
}

interface TicketFormProps {
  ticket?: TicketFormData;
  onSave: (ticket: TicketFormData) => void;
  onCancel: () => void;
  loading?: boolean;
}

const TICKET_PIPELINES = [
  { id: '0', label: 'Support Pipeline' },
];

const TICKET_STAGES = [
  { id: '1', label: 'New', pipeline: '0' },
  { id: '2', label: 'Waiting on contact', pipeline: '0' },
  { id: '3', label: 'Waiting on us', pipeline: '0' },
  { id: '4', label: 'Closed', pipeline: '0' },
];

const PRIORITIES = [
  { id: 'LOW', label: 'Low', color: 'bg-gray-100 text-gray-800' },
  { id: 'MEDIUM', label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
  { id: 'HIGH', label: 'High', color: 'bg-orange-100 text-orange-800' },
];

const CATEGORIES = [
  'PRODUCT_ISSUE',
  'BILLING_ISSUE',
  'FEATURE_REQUEST',
  'GENERAL_INQUIRY',
  'TECHNICAL_SUPPORT',
  'OTHER',
];

const SOURCE_TYPES = [
  'CHAT',
  'EMAIL',
  'FORM',
  'PHONE',
  'SOCIAL_MEDIA',
  'OTHER',
];

export function TicketForm({ ticket, onSave, onCancel, loading = false }: TicketFormProps) {
  const [formData, setFormData] = useState<TicketFormData>(ticket || {
    subject: '',
    content: '',
    hs_pipeline: '0',
    hs_pipeline_stage: '1',
    hs_ticket_priority: 'MEDIUM',
    hs_ticket_category: '',
    source_type: '',
    associated_contact: '',
    associated_company: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: keyof TicketFormData, value: string) => {
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

    if (!formData.subject || !formData.subject.trim()) {
      newErrors.subject = 'Subject is required';
    }

    if (!formData.hs_pipeline_stage) {
      newErrors.hs_pipeline_stage = 'Status is required';
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

  const formatCategory = (category: string) => {
    return category.split('_').map(word =>
      word.charAt(0) + word.slice(1).toLowerCase()
    ).join(' ');
  };

  const formatSource = (source: string) => {
    return source.split('_').map(word =>
      word.charAt(0) + word.slice(1).toLowerCase()
    ).join(' ');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between bg-[#FF7A59]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <Ticket className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-white">
              {ticket ? 'Edit Ticket' : 'Create Ticket'}
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
            {/* Ticket Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Ticket className="w-5 h-5 mr-2 text-gray-600" />
                Ticket Information
              </h3>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subject <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => handleChange('subject', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                      errors.subject ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Brief description of the issue"
                  />
                  {errors.subject && (
                    <p className="mt-1 text-sm text-red-600">{errors.subject}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <div className="relative">
                    <MessageSquare className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <textarea
                      value={formData.content || ''}
                      onChange={(e) => handleChange('content', e.target.value)}
                      rows={4}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="Detailed description of the issue..."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Status & Priority */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <AlertCircle className="w-5 h-5 mr-2 text-gray-600" />
                Status & Priority
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pipeline
                  </label>
                  <select
                    value={formData.hs_pipeline}
                    onChange={(e) => handleChange('hs_pipeline', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    {TICKET_PIPELINES.map(pipeline => (
                      <option key={pipeline.id} value={pipeline.id}>
                        {pipeline.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.hs_pipeline_stage}
                    onChange={(e) => handleChange('hs_pipeline_stage', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                      errors.hs_pipeline_stage ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    {TICKET_STAGES.filter(s => s.pipeline === formData.hs_pipeline).map(stage => (
                      <option key={stage.id} value={stage.id}>
                        {stage.label}
                      </option>
                    ))}
                  </select>
                  {errors.hs_pipeline_stage && (
                    <p className="mt-1 text-sm text-red-600">{errors.hs_pipeline_stage}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={formData.hs_ticket_priority || 'MEDIUM'}
                    onChange={(e) => handleChange('hs_ticket_priority', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    {PRIORITIES.map(priority => (
                      <option key={priority.id} value={priority.id}>
                        {priority.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={formData.hs_ticket_category || ''}
                    onChange={(e) => handleChange('hs_ticket_category', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">Select category...</option>
                    {CATEGORIES.map(category => (
                      <option key={category} value={category}>
                        {formatCategory(category)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Source
                  </label>
                  <select
                    value={formData.source_type || ''}
                    onChange={(e) => handleChange('source_type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">Select source...</option>
                    {SOURCE_TYPES.map(source => (
                      <option key={source} value={source}>
                        {formatSource(source)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Priority Preview */}
              <div className="mt-4 flex items-center space-x-2">
                <span className="text-sm text-gray-500">Selected Priority:</span>
                {PRIORITIES.map(p => (
                  formData.hs_ticket_priority === p.id && (
                    <span
                      key={p.id}
                      className={`px-2 py-1 rounded-full text-xs font-medium ${p.color}`}
                    >
                      {p.label}
                    </span>
                  )
                ))}
              </div>
            </div>

            {/* Associations */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Associations</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </div>
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
            <span>{loading ? 'Saving...' : 'Save Ticket'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
