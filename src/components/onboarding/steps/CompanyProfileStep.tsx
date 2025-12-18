'use client';

import { useState } from 'react';
import { Building2, ArrowRight, ArrowLeft, Loader2, Mail, User, Megaphone } from 'lucide-react';

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

const REFERRAL_SOURCES = [
  { value: 'search', label: 'Google / Search Engine' },
  { value: 'social', label: 'Social Media (Twitter, LinkedIn)' },
  { value: 'friend', label: 'Friend or Colleague' },
  { value: 'partner', label: 'Partner or Affiliate' },
  { value: 'event', label: 'Conference or Event' },
  { value: 'other', label: 'Other' },
];

export function CompanyProfileStep({
  companyName,
  industry,
  companySize,
  primaryGoal,
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

  // RFC 5322 compliant email validation
  // Handles common business emails, subdomains, and edge cases
  const isValidEmail = (email: string): boolean => {
    if (!email) return false;

    // RFC 5322 Official Standard regex (simplified but comprehensive)
    const emailRegex = /^(?:[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?|\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-zA-Z0-9-]*[a-zA-Z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])$/;

    // Additional length check (max 254 chars per RFC 5321)
    if (email.length > 254) return false;

    // Local part max 64 chars
    const localPart = email.split('@')[0];
    if (localPart && localPart.length > 64) return false;

    return emailRegex.test(email);
  };

  // Get specific email validation error message
  const getEmailError = (email: string): string | null => {
    if (!email) return 'Email address is required';
    if (!email.includes('@')) return 'Email must contain @';
    if (email.length > 254) return 'Email is too long';
    const localPart = email.split('@')[0];
    if (localPart && localPart.length > 64) return 'Email username is too long';
    if (!isValidEmail(email)) return 'Please enter a valid email address';
    return null;
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
            company_size: companySize,
            primary_goal: primaryGoal,
            contact_email: contactEmail,
            contact_name: contactName,
            referral_source: referralSource,
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
    <div className="px-6 py-10 sm:px-10 sm:py-12">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center">
            <Building2 className="w-7 h-7 text-white" />
          </div>
        </div>
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">
          Tell us about your company
        </h2>
        <p className="text-gray-600 text-sm max-w-md mx-auto">
          This helps us personalize your AI assistant and provide relevant insights
        </p>
      </div>

      {/* Form */}
      <div className="space-y-5 max-w-md mx-auto">
        {/* Company Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Company Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={companyName}
            onChange={(e) => onUpdate({ companyName: e.target.value })}
            placeholder="Acme Inc."
            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900 bg-white"
          />
        </div>

        {/* Industry */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Industry <span className="text-red-500">*</span>
          </label>
          <select
            value={industry}
            onChange={(e) => onUpdate({ industry: e.target.value })}
            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900 bg-white"
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
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Company Size
          </label>
          <select
            value={companySize}
            onChange={(e) => onUpdate({ companySize: e.target.value })}
            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900 bg-white"
          >
            <option value="">Select company size</option>
            {COMPANY_SIZES.map((size) => (
              <option key={size.value} value={size.value}>
                {size.label}
              </option>
            ))}
          </select>
        </div>

        {/* Divider */}
        <div className="pt-2 pb-1">
          <div className="border-t border-gray-200" />
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mt-4 mb-2">Contact Information</p>
        </div>

        {/* Contact Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Your Name
          </label>
          <input
            type="text"
            value={contactName}
            onChange={(e) => onUpdate({ contactName: e.target.value })}
            placeholder="John Smith"
            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900 bg-white"
          />
        </div>

        {/* Contact Email */}
        <div>
          <label
            htmlFor="contact-email"
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            Email Address <span className="text-red-500">*</span>
          </label>
          <input
            id="contact-email"
            type="email"
            value={contactEmail}
            onChange={(e) => onUpdate({ contactEmail: e.target.value })}
            onBlur={() => setEmailTouched(true)}
            placeholder="john@company.com"
            aria-describedby="email-error email-hint"
            aria-invalid={emailTouched && !isValidEmail(contactEmail)}
            className={`w-full px-3.5 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900 ${
              emailTouched && contactEmail && !isValidEmail(contactEmail)
                ? 'border-red-300 bg-red-50'
                : 'border-gray-300 bg-white'
            }`}
          />
          {emailTouched && contactEmail && !isValidEmail(contactEmail) && (
            <p id="email-error" className="mt-1 text-sm text-red-600" role="alert">
              {getEmailError(contactEmail)}
            </p>
          )}
          <p id="email-hint" className="mt-1 text-xs text-gray-500">
            We&apos;ll send you trial updates and important notifications
          </p>
        </div>

        {/* Referral Source */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            How did you hear about us?
          </label>
          <select
            value={referralSource}
            onChange={(e) => onUpdate({ referralSource: e.target.value })}
            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900 bg-white"
          >
            <option value="">Select an option</option>
            {REFERRAL_SOURCES.map((source) => (
              <option key={source.value} value={source.value}>
                {source.label}
              </option>
            ))}
          </select>
        </div>

        {/* Primary Goal */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            What&apos;s your primary goal?
          </label>
          <div className="space-y-1.5">
            {PRIMARY_GOALS.map((goal) => (
              <label
                key={goal.value}
                className={`flex items-center gap-3 px-3.5 py-2.5 border rounded-lg cursor-pointer text-sm transition-colors ${
                  primaryGoal === goal.value
                    ? 'border-blue-500 bg-blue-50 text-blue-900'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
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
                <span>{goal.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex gap-3 mt-8 max-w-md mx-auto">
        <button
          onClick={onBack}
          className="px-5 py-2.5 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <button
          onClick={handleSaveAndContinue}
          disabled={!isValid || saving}
          className="flex-1 bg-blue-600 text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
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
      <p className="text-center text-xs text-gray-400 mt-5 max-w-sm mx-auto">
        Your information is encrypted and secure.
      </p>
    </div>
  );
}
