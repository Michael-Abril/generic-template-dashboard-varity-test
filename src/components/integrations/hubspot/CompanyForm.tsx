'use client';

import { useState } from 'react';
import { X, Save, Building, Globe, Phone, Mail, MapPin, Users, DollarSign } from 'lucide-react';

interface CompanyFormData {
  name: string;
  domain?: string;
  industry?: string;
  type?: string;
  phone?: string;
  description?: string;
  city?: string;
  state?: string;
  country?: string;
  zip?: string;
  address?: string;
  annualrevenue?: number;
  numberofemployees?: number;
  lifecyclestage?: string;
  hs_lead_status?: string;
  website?: string;
}

interface CompanyFormProps {
  company?: CompanyFormData;
  onSave: (company: CompanyFormData) => void;
  onCancel: () => void;
  loading?: boolean;
}

const INDUSTRIES = [
  'ACCOUNTING',
  'APPAREL_FASHION',
  'BANKING',
  'BIOTECHNOLOGY',
  'BUSINESS_SUPPLIES',
  'COMPUTER_SOFTWARE',
  'CONSTRUCTION',
  'CONSUMER_SERVICES',
  'EDUCATION',
  'FINANCIAL_SERVICES',
  'HEALTHCARE',
  'HOSPITALITY',
  'INSURANCE',
  'INTERNET',
  'LEGAL_SERVICES',
  'MANUFACTURING',
  'MARKETING_ADVERTISING',
  'MEDIA',
  'NON_PROFIT',
  'REAL_ESTATE',
  'RETAIL',
  'TECHNOLOGY',
  'TELECOMMUNICATIONS',
  'TRANSPORTATION',
  'OTHER',
];

const COMPANY_TYPES = [
  'PROSPECT',
  'PARTNER',
  'RESELLER',
  'VENDOR',
  'CUSTOMER',
  'OTHER',
];

const LIFECYCLE_STAGES = [
  'subscriber',
  'lead',
  'marketingqualifiedlead',
  'salesqualifiedlead',
  'opportunity',
  'customer',
  'evangelist',
  'other',
];

export function CompanyForm({ company, onSave, onCancel, loading = false }: CompanyFormProps) {
  const [formData, setFormData] = useState<CompanyFormData>(company || {
    name: '',
    domain: '',
    industry: '',
    type: '',
    phone: '',
    description: '',
    city: '',
    state: '',
    country: '',
    zip: '',
    address: '',
    annualrevenue: undefined,
    numberofemployees: undefined,
    lifecyclestage: 'lead',
    hs_lead_status: 'NEW',
    website: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: keyof CompanyFormData, value: string | number | undefined) => {
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

    if (!formData.name || !formData.name.trim()) {
      newErrors.name = 'Company name is required';
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

  const formatIndustry = (industry: string) => {
    return industry.split('_').map(word =>
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
              <Building className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-white">
              {company ? 'Edit Company' : 'Create Company'}
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
            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Building className="w-5 h-5 mr-2 text-gray-600" />
                Company Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                      errors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Acme Inc."
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Domain
                  </label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={formData.domain || ''}
                      onChange={(e) => handleChange('domain', e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="acme.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Website
                  </label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="url"
                      value={formData.website || ''}
                      onChange={(e) => handleChange('website', e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="https://acme.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Industry
                  </label>
                  <select
                    value={formData.industry || ''}
                    onChange={(e) => handleChange('industry', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">Select industry...</option>
                    {INDUSTRIES.map(industry => (
                      <option key={industry} value={industry}>
                        {formatIndustry(industry)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  <select
                    value={formData.type || ''}
                    onChange={(e) => handleChange('type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">Select type...</option>
                    {COMPANY_TYPES.map(type => (
                      <option key={type} value={type}>
                        {type.charAt(0) + type.slice(1).toLowerCase()}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="tel"
                      value={formData.phone || ''}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Company Metrics */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <DollarSign className="w-5 h-5 mr-2 text-gray-600" />
                Company Metrics
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Annual Revenue
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="number"
                      value={formData.annualrevenue || ''}
                      onChange={(e) => handleChange('annualrevenue', e.target.value ? parseFloat(e.target.value) : undefined)}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="1000000"
                      min="0"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Number of Employees
                  </label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="number"
                      value={formData.numberofemployees || ''}
                      onChange={(e) => handleChange('numberofemployees', e.target.value ? parseInt(e.target.value) : undefined)}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="50"
                      min="0"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lifecycle Stage
                  </label>
                  <select
                    value={formData.lifecyclestage || 'lead'}
                    onChange={(e) => handleChange('lifecyclestage', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    {LIFECYCLE_STAGES.map(stage => (
                      <option key={stage} value={stage}>
                        {stage.replace(/([A-Z])/g, ' $1').trim().replace(/^./, str => str.toUpperCase())}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Address Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <MapPin className="w-5 h-5 mr-2 text-gray-600" />
                Address
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Street Address
                  </label>
                  <input
                    type="text"
                    value={formData.address || ''}
                    onChange={(e) => handleChange('address', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="123 Main St"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={formData.city || ''}
                    onChange={(e) => handleChange('city', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="San Francisco"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    State/Province
                  </label>
                  <input
                    type="text"
                    value={formData.state || ''}
                    onChange={(e) => handleChange('state', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="CA"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Zip/Postal Code
                  </label>
                  <input
                    type="text"
                    value={formData.zip || ''}
                    onChange={(e) => handleChange('zip', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="94105"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Country
                  </label>
                  <input
                    type="text"
                    value={formData.country || ''}
                    onChange={(e) => handleChange('country', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="United States"
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
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="Notes about this company..."
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
            <span>{loading ? 'Saving...' : 'Save Company'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
