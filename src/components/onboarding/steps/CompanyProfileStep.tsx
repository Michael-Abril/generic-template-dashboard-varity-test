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
    <div className="p-8 sm:p-10">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="flex justify-center mb-5">
          <div className="relative">
            <div className="absolute inset-0 bg-blue-500/20 rounded-2xl blur-xl"></div>
            <div className="relative w-18 h-18 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl">
              <Building2 className="w-9 h-9 text-white" />
            </div>
          </div>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
          Tell us about your company
        </h2>
        <p className="text-gray-600 text-lg max-w-md mx-auto">
          This helps us personalize your AI assistant and provide relevant insights
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

        {/* Divider */}
        <div className="relative py-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-4 text-sm font-medium text-gray-500 flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Contact Information
            </span>
          </div>
        </div>

        {/* Contact Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <User className="w-4 h-4 text-gray-400" />
            Your Name
          </label>
          <input
            type="text"
            value={contactName}
            onChange={(e) => onUpdate({ contactName: e.target.value })}
            placeholder="John Smith"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all hover:border-gray-400"
          />
        </div>

        {/* Contact Email */}
        <div>
          <label
            htmlFor="contact-email"
            className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2"
          >
            <Mail className="w-4 h-4 text-gray-400" />
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
            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
              emailTouched && contactEmail && !isValidEmail(contactEmail)
                ? 'border-red-300 bg-red-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          />
          {emailTouched && contactEmail && !isValidEmail(contactEmail) && (
            <p id="email-error" className="mt-1.5 text-sm text-red-600 flex items-center gap-1" role="alert">
              {getEmailError(contactEmail)}
            </p>
          )}
          <p id="email-hint" className="mt-1.5 text-xs text-gray-500">
            We&apos;ll send you trial updates, tips, and important notifications
          </p>
        </div>

        {/* Referral Source */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-gray-400" />
            How did you hear about us?
          </label>
          <select
            value={referralSource}
            onChange={(e) => onUpdate({ referralSource: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white hover:border-gray-400"
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
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm flex items-center gap-2">
            <div className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-red-600">!</span>
            </div>
            {error}
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex gap-4 mt-10 max-w-lg mx-auto">
        <button
          onClick={onBack}
          className="flex-1 px-6 py-3.5 border-2 border-gray-200 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <button
          onClick={handleSaveAndContinue}
          disabled={!isValid || saving}
          className="group flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3.5 rounded-xl font-bold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              Continue
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </button>
      </div>

      {/* Privacy note */}
      <p className="text-center text-xs text-gray-400 mt-6 max-w-md mx-auto">
        Your information is encrypted and secure. We never share your data with third parties.
      </p>
    </div>
  );
}
