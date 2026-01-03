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
    <div className="px-6 py-10 sm:px-12 sm:py-12">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
            <Building2 className="w-7 h-7 text-white" />
          </div>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          Tell us about your company
        </h2>
        <p className="text-gray-600 text-base">
          Just 3 quick fields to personalize your experience
        </p>
      </div>

      {/* Form - Compact layout */}
      <div className="space-y-5 max-w-lg mx-auto">
        {/* Company Name */}
        <div>
          <label htmlFor="company-name" className="block text-sm font-semibold text-gray-700 mb-2">
            Company Name <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <input
            id="company-name"
            type="text"
            value={companyName}
            onChange={(e) => onUpdate({ companyName: e.target.value })}
            placeholder="Acme Inc."
            aria-required="true"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base text-gray-900 bg-white shadow-sm transition-shadow hover:shadow-md"
          />
        </div>

        {/* Industry */}
        <div>
          <label htmlFor="industry" className="block text-sm font-semibold text-gray-700 mb-2">
            Industry <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <select
            id="industry"
            value={industry}
            onChange={(e) => onUpdate({ industry: e.target.value })}
            aria-required="true"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base text-gray-900 bg-white shadow-sm transition-shadow hover:shadow-md"
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
          <label htmlFor="contact-name" className="block text-sm font-semibold text-gray-700 mb-2">
            Your Name
          </label>
          <input
            id="contact-name"
            type="text"
            value={contactName}
            onChange={(e) => onUpdate({ contactName: e.target.value })}
            placeholder="John Smith"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base text-gray-900 bg-white shadow-sm transition-shadow hover:shadow-md"
          />
        </div>

        {/* Email */}
        <div>
          <label htmlFor="contact-email" className="block text-sm font-semibold text-gray-700 mb-2">
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
            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base text-gray-900 shadow-sm transition-shadow hover:shadow-md ${
              emailTouched && contactEmail && !isValidEmail(contactEmail)
                ? 'border-red-300 bg-red-50'
                : 'border-gray-300 bg-white'
            }`}
          />
          {emailTouched && contactEmail && !isValidEmail(contactEmail) && (
            <p id="email-error" role="alert" className="mt-2 text-sm text-red-600">Please enter a valid email</p>
          )}
        </div>

        {/* Company Size - Optional */}
        <div>
          <label htmlFor="company-size" className="block text-sm font-semibold text-gray-700 mb-2">
            Company Size
          </label>
          <select
            id="company-size"
            value={companySize}
            onChange={(e) => onUpdate({ companySize: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base text-gray-900 bg-white shadow-sm transition-shadow hover:shadow-md"
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
          <label htmlFor="referral-source" className="block text-sm font-semibold text-gray-700 mb-2">
            How did you hear about us?
          </label>
          <select
            id="referral-source"
            value={referralSource}
            onChange={(e) => onUpdate({ referralSource: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base text-gray-900 bg-white shadow-sm transition-shadow hover:shadow-md"
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
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex flex-col-reverse sm:flex-row gap-3 mt-8 max-w-lg mx-auto">
        <button
          onClick={onBack}
          className="w-full sm:w-auto px-6 py-3 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-all flex items-center justify-center gap-2 text-base shadow-sm hover:shadow-md"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <button
          onClick={handleSaveAndContinue}
          disabled={!isValid || saving}
          className="w-full sm:flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:from-gray-400 disabled:to-gray-400 flex items-center justify-center gap-2 text-base shadow-lg shadow-blue-200/50 hover:shadow-xl hover:shadow-blue-200/60"
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
      <p className="text-center text-sm text-gray-500 mt-5">
        Your data is encrypted and secure
      </p>
    </div>
  );
}
