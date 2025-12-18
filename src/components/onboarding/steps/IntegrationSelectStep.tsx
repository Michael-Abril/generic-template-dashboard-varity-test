'use client';

import { useState, useEffect } from 'react';
import { Link2, ArrowRight, ArrowLeft, Check, ExternalLink } from 'lucide-react';
import { IntegrationLogo } from '@/components/IntegrationLogo';

interface IntegrationSelectStepProps {
  industry: string;
  selectedIntegration: string | null;
  onSelect: (integration: string) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

// Industry to integration mapping
const INDUSTRY_INTEGRATIONS: Record<string, string[]> = {
  'Technology / Software': ['google', 'slack', 'github', 'jira'],
  'Finance / Accounting': ['quickbooks', 'xero', 'stripe', 'freshbooks'],
  'Healthcare / Medical': ['google', 'slack', 'zoom', 'dropbox'],
  'Retail / E-commerce': ['shopify', 'stripe', 'quickbooks', 'square'],
  'Professional Services': ['google', 'slack', 'salesforce', 'hubspot'],
  'Manufacturing': ['quickbooks', 'slack', 'monday', 'google'],
  'Construction': ['quickbooks', 'google', 'slack', 'dropbox'],
  'Real Estate': ['salesforce', 'google', 'docusign', 'slack'],
  'Food & Hospitality': ['square', 'quickbooks', 'slack', 'google'],
  'Transportation / Logistics': ['quickbooks', 'slack', 'google', 'zoom'],
  'Non-profit': ['quickbooks', 'google', 'slack', 'mailchimp'],
  'Other': ['quickbooks', 'google', 'slack', 'hubspot'],
};

// Integration metadata
const INTEGRATIONS: Record<string, { name: string; description: string; category: string }> = {
  quickbooks: { name: 'QuickBooks', description: 'Accounting & Finances', category: 'Accounting' },
  google: { name: 'Google Workspace', description: 'Email, Calendar, Drive', category: 'Productivity' },
  slack: { name: 'Slack', description: 'Team Communication', category: 'Communication' },
  salesforce: { name: 'Salesforce', description: 'CRM & Sales', category: 'CRM' },
  hubspot: { name: 'HubSpot', description: 'Marketing & CRM', category: 'Marketing' },
  shopify: { name: 'Shopify', description: 'E-commerce Platform', category: 'E-commerce' },
  stripe: { name: 'Stripe', description: 'Payments', category: 'Payments' },
  xero: { name: 'Xero', description: 'Accounting', category: 'Accounting' },
  freshbooks: { name: 'FreshBooks', description: 'Invoicing', category: 'Accounting' },
  zoom: { name: 'Zoom', description: 'Video Meetings', category: 'Communication' },
  dropbox: { name: 'Dropbox', description: 'File Storage', category: 'Storage' },
  square: { name: 'Square', description: 'Point of Sale', category: 'Payments' },
  monday: { name: 'Monday.com', description: 'Project Management', category: 'Productivity' },
  github: { name: 'GitHub', description: 'Code Repository', category: 'Development' },
  jira: { name: 'Jira', description: 'Issue Tracking', category: 'Development' },
  docusign: { name: 'DocuSign', description: 'E-Signatures', category: 'Documents' },
  mailchimp: { name: 'Mailchimp', description: 'Email Marketing', category: 'Marketing' },
  microsoft: { name: 'Microsoft 365', description: 'Office Suite', category: 'Productivity' },
};

export function IntegrationSelectStep({
  industry,
  selectedIntegration,
  onSelect,
  onNext,
  onBack,
  onSkip,
}: IntegrationSelectStepProps) {
  const [recommended, setRecommended] = useState<string[]>([]);

  useEffect(() => {
    // Get recommended integrations based on industry
    const recs = INDUSTRY_INTEGRATIONS[industry] || INDUSTRY_INTEGRATIONS['Other'];
    setRecommended(recs);
  }, [industry]);

  const handleContinue = () => {
    if (selectedIntegration) {
      onNext();
    }
  };

  return (
    <div className="p-8 sm:p-10">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="flex justify-center mb-5">
          <div className="relative">
            <div className="absolute inset-0 bg-purple-500/20 rounded-2xl blur-xl"></div>
            <div className="relative w-18 h-18 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl">
              <Link2 className="w-9 h-9 text-white" />
            </div>
          </div>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
          Connect your first tool
        </h2>
        <p className="text-gray-600 text-lg max-w-md mx-auto">
          {industry ? (
            <>Based on <span className="font-medium text-gray-800">{industry}</span>, we recommend these integrations:</>
          ) : (
            <>Select an integration to connect to your dashboard</>
          )}
        </p>
      </div>

      {/* Integration Grid */}
      <div className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto mb-8">
        {recommended.map((slug) => {
          const integration = INTEGRATIONS[slug];
          if (!integration) return null;

          const isSelected = selectedIntegration === slug;

          return (
            <button
              key={slug}
              onClick={() => onSelect(slug)}
              className={`group relative flex items-center gap-4 p-5 border-2 rounded-2xl transition-all text-left ${
                isSelected
                  ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-200 shadow-lg'
                  : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50 hover:shadow-md'
              }`}
            >
              {isSelected && (
                <div className="absolute top-3 right-3">
                  <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                </div>
              )}
              <div className="flex-shrink-0">
                <div className={`p-2 rounded-xl transition-all ${isSelected ? 'bg-white shadow-sm' : 'bg-gray-50 group-hover:bg-white'}`}>
                  <IntegrationLogo integration={slug} size="md" />
                </div>
              </div>
              <div className="flex-grow min-w-0">
                <span className={`font-semibold block ${isSelected ? 'text-purple-900' : 'text-gray-900'}`}>
                  {integration.name}
                </span>
                <p className={`text-sm truncate ${isSelected ? 'text-purple-600' : 'text-gray-500'}`}>
                  {integration.description}
                </p>
                <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${isSelected ? 'bg-purple-200 text-purple-700' : 'bg-gray-100 text-gray-500'}`}>
                  {integration.category}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* More integrations link */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 bg-gray-50 rounded-full px-4 py-2">
          <span className="text-sm text-gray-500">Looking for something else?</span>
          <a
            href="/marketplace"
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-600 hover:text-purple-700 font-medium text-sm inline-flex items-center gap-1"
          >
            Browse all 24+ integrations
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 max-w-2xl mx-auto">
        <button
          onClick={onBack}
          className="px-6 py-3.5 border-2 border-gray-200 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <button
          onClick={handleContinue}
          disabled={!selectedIntegration}
          className="group flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-3.5 rounded-xl font-bold hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg flex items-center justify-center gap-2"
        >
          Connect {selectedIntegration ? INTEGRATIONS[selectedIntegration]?.name : 'Integration'}
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </button>

        <button
          onClick={onSkip}
          className="px-6 py-3.5 text-gray-500 hover:text-gray-700 font-medium transition-colors text-center hover:bg-gray-50 rounded-xl"
        >
          Skip for now
        </button>
      </div>

      {/* Security Note */}
      <div className="mt-8 max-w-lg mx-auto">
        <div className="bg-gradient-to-br from-gray-50 to-purple-50 rounded-xl p-4 text-center border border-gray-100">
          <p className="text-xs text-gray-500">
            <span className="font-medium text-gray-600">🔒 Your data is encrypted</span> with your unique wallet key.
            Connect more integrations anytime from your dashboard.
          </p>
        </div>
      </div>
    </div>
  );
}
