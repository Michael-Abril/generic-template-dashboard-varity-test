'use client';

import { useState } from 'react';
import { Building2, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';

interface CompanyProfileStepProps {
  companyName: string;
  industry: string;
  companySize: string;
  primaryGoal: string;
  contactEmail: string;
  contactName: string;
  referralSource: string;
  onUpdate: (data: {
    companyName?: string;
    industry?: string;
    companySize?: string;
    primaryGoal?: string;
    contactEmail?: string;
    contactName?: string;
    referralSource?: string;
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

const REFERRAL_SOURCES = [
  'Search engine (Google, Bing)',
  'Social media',
  'Friend or colleague',
  'Industry publication',
  'Conference or event',
  'Other',
];

export function CompanyProfileStep({
  companyName,
  industry,
  companySize,
  contactEmail,
  contactName,
  referralSource,
  onUpdate,
  onNext,
  onBack,
  walletAddress,
}: CompanyProfileStepProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailTouched, setEmailTouched] = useState(false);

  const isValidEmail = (email: string): boolean => {
    if (!email) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const isValid = companyName.trim().length > 0 &&
                  industry.length > 0 &&
                  contactEmail.trim().length > 0 &&
                  isValidEmail(contactEmail);

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
            contact_email: contactEmail,
            company_size: companySize || null,
            contact_name: contactName || null,
            referral_source: referralSource || null,
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
    <div className="px-6 py-6 sm:px-8 sm:py-8">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="flex justify-center mb-3">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
            <Building2 className="w-6 h-6 text-white" />
          </div>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">
          Tell us about your company
        </h2>
        <p className="text-gray-500 text-sm">
          Just 3 quick fields to personalize your experience
        </p>
      </div>

      {/* Form - Compact layout */}
      <div className="space-y-4 max-w-sm mx-auto">
        {/* Company Name */}
        <div>
          <label htmlFor="company-name" className="block text-sm font-medium text-gray-700 mb-1">
            Company Name <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <input
            id="company-name"
            type="text"
            value={companyName}
            onChange={(e) => onUpdate({ companyName: e.target.value })}
            placeholder="Acme Inc."
            aria-required="true"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900 bg-white"
          />
        </div>

        {/* Industry */}
        <div>
          <label htmlFor="industry" className="block text-sm font-medium text-gray-700 mb-1">
            Industry <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <select
            id="industry"
            value={industry}
            onChange={(e) => onUpdate({ industry: e.target.value })}
            aria-required="true"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900 bg-white"
          >
            <option value="">Select your industry</option>
            {INDUSTRIES.map((ind) => (
              <option key={ind} value={ind}>
                {ind}
              </option>
            ))}
          </select>
        </div>

        {/* Your Name */}
        <div>
          <label htmlFor="contact-name" className="block text-sm font-medium text-gray-700 mb-1">
            Your Name
          </label>
          <input
            id="contact-name"
            type="text"
            value={contactName}
            onChange={(e) => onUpdate({ contactName: e.target.value })}
            placeholder="John Smith"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900 bg-white"
          />
        </div>

        {/* Email */}
        <div>
          <label htmlFor="contact-email" className="block text-sm font-medium text-gray-700 mb-1">
            Your Email <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <input
            id="contact-email"
            type="email"
            value={contactEmail}
            onChange={(e) => onUpdate({ contactEmail: e.target.value })}
            onBlur={() => setEmailTouched(true)}
            placeholder="you@company.com"
            aria-required="true"
            aria-invalid={emailTouched && contactEmail.length > 0 && !isValidEmail(contactEmail)}
            aria-describedby={emailTouched && contactEmail && !isValidEmail(contactEmail) ? 'email-error' : undefined}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900 ${
              emailTouched && contactEmail && !isValidEmail(contactEmail)
                ? 'border-red-300 bg-red-50'
                : 'border-gray-300 bg-white'
            }`}
          />
          {emailTouched && contactEmail && !isValidEmail(contactEmail) && (
            <p id="email-error" role="alert" className="mt-1 text-xs text-red-600">Please enter a valid email</p>
          )}
        </div>

        {/* Company Size - Optional */}
        <div>
          <label htmlFor="company-size" className="block text-sm font-medium text-gray-700 mb-1">
            Company Size
          </label>
          <select
            id="company-size"
            value={companySize}
            onChange={(e) => onUpdate({ companySize: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900 bg-white"
          >
            <option value="">Select size (optional)</option>
            <option value="1">Just me</option>
            <option value="2-10">2-10 employees</option>
            <option value="11-50">11-50 employees</option>
            <option value="51-200">51-200 employees</option>
            <option value="201-500">201-500 employees</option>
            <option value="500+">500+ employees</option>
          </select>
        </div>

        {/* How did you hear about us - Optional */}
        <div>
          <label htmlFor="referral-source" className="block text-sm font-medium text-gray-700 mb-1">
            How did you hear about us?
          </label>
          <select
            id="referral-source"
            value={referralSource}
            onChange={(e) => onUpdate({ referralSource: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900 bg-white"
          >
            <option value="">Select (optional)</option>
            {REFERRAL_SOURCES.map((source) => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </select>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-red-700 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex gap-3 mt-6 max-w-sm mx-auto">
        <button
          onClick={onBack}
          className="px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <button
          onClick={handleSaveAndContinue}
          disabled={!isValid || saving}
          className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
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

      {/* Privacy note */}
      <p className="text-center text-xs text-gray-500 mt-4">
        Your data is encrypted and secure
      </p>
    </div>
  );
}
