'use client';

import { useState } from 'react';
import { Building2, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';

interface CompanyProfileStepProps {
  companyName: string;
  industry: string;
  companySize: string;
  primaryGoal: string;
  onUpdate: (data: {
    companyName?: string;
    industry?: string;
    companySize?: string;
    primaryGoal?: string;
  }) => void;
  onNext: () => void;
  onBack: () => void;
  walletAddress: string;
}

const INDUSTRIES = [
  'Technology / Software',
  'Finance / Accounting',
  'Healthcare / Medical',
  'Retail / E-commerce',
  'Professional Services',
  'Manufacturing',
  'Construction',
  'Real Estate',
  'Food & Hospitality',
  'Transportation / Logistics',
  'Non-profit',
  'Other',
];

const COMPANY_SIZES = [
  { value: '1', label: 'Just me (1 employee)' },
  { value: '2-10', label: '2-10 employees' },
  { value: '11-50', label: '11-50 employees' },
  { value: '51-200', label: '51-200 employees' },
  { value: '201-500', label: '201-500 employees' },
  { value: '500+', label: '500+ employees' },
];

const PRIMARY_GOALS = [
  { value: 'finances', label: 'Track finances and cash flow' },
  { value: 'crm', label: 'Manage customer relationships' },
  { value: 'operations', label: 'Streamline operations' },
  { value: 'reporting', label: 'Automate reporting' },
  { value: 'all', label: 'All of the above' },
];

export function CompanyProfileStep({
  companyName,
  industry,
  companySize,
  primaryGoal,
  onUpdate,
  onNext,
  onBack,
  walletAddress,
}: CompanyProfileStepProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid = companyName.trim().length > 0 && industry.length > 0;

  const handleSaveAndContinue = async () => {
    if (!isValid) return;

    setSaving(true);
    setError(null);

    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

      const response = await fetch(
        `${backendUrl}/api/v1/settings?wallet_address=${walletAddress}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            company_name: companyName,
            industry: industry,
            company_size: companySize,
            primary_goal: primaryGoal,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to save company profile');
      }

      onNext();
    } catch (err) {
      console.error('Error saving company profile:', err);
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center">
            <Building2 className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Tell us about your company
        </h2>
        <p className="text-gray-600">
          This helps us personalize your AI assistant and dashboard
        </p>
      </div>

      {/* Form */}
      <div className="space-y-6 max-w-lg mx-auto">
        {/* Company Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Company Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={companyName}
            onChange={(e) => onUpdate({ companyName: e.target.value })}
            placeholder="Acme Inc."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>

        {/* Industry */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Industry <span className="text-red-500">*</span>
          </label>
          <select
            value={industry}
            onChange={(e) => onUpdate({ industry: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
          >
            <option value="">Select your industry</option>
            {INDUSTRIES.map((ind) => (
              <option key={ind} value={ind}>
                {ind}
              </option>
            ))}
          </select>
        </div>

        {/* Company Size */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Company Size
          </label>
          <select
            value={companySize}
            onChange={(e) => onUpdate({ companySize: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
          >
            <option value="">Select company size</option>
            {COMPANY_SIZES.map((size) => (
              <option key={size.value} value={size.value}>
                {size.label}
              </option>
            ))}
          </select>
        </div>

        {/* Primary Goal */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Primary Goal
          </label>
          <div className="space-y-2">
            {PRIMARY_GOALS.map((goal) => (
              <label
                key={goal.value}
                className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                  primaryGoal === goal.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="primaryGoal"
                  value={goal.value}
                  checked={primaryGoal === goal.value}
                  onChange={(e) => onUpdate({ primaryGoal: e.target.value })}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-gray-700">{goal.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex gap-4 mt-8 max-w-lg mx-auto">
        <button
          onClick={onBack}
          className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <button
          onClick={handleSaveAndContinue}
          disabled={!isValid || saving}
          className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              Continue
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
