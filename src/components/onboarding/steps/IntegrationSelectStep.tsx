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
    <div className="p-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-purple-100 rounded-xl flex items-center justify-center">
            <Link2 className="w-8 h-8 text-purple-600" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Connect your first tool
        </h2>
        <p className="text-gray-600">
          {industry ? (
            <>Based on your industry, we recommend these integrations:</>
          ) : (
            <>Select an integration to connect</>
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
              className={`flex items-center gap-4 p-4 border-2 rounded-xl transition-all text-left ${
                isSelected
                  ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex-shrink-0">
                <IntegrationLogo integration={slug} size="md" />
              </div>
              <div className="flex-grow min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">
                    {integration.name}
                  </span>
                  {isSelected && (
                    <Check className="w-5 h-5 text-blue-600" />
                  )}
                </div>
                <p className="text-sm text-gray-500 truncate">
                  {integration.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* More integrations link */}
      <div className="text-center mb-8">
        <p className="text-sm text-gray-500">
          Looking for something else?{' '}
          <a
            href="/marketplace"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
          >
            Browse all 24 integrations
            <ExternalLink className="w-3 h-3" />
          </a>
        </p>
      </div>

      {/* Navigation Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 max-w-2xl mx-auto">
        <button
          onClick={onBack}
          className="px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <button
          onClick={handleContinue}
          disabled={!selectedIntegration}
          className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          Connect {selectedIntegration ? INTEGRATIONS[selectedIntegration]?.name : 'Integration'}
          <ArrowRight className="w-4 h-4" />
        </button>

        <button
          onClick={onSkip}
          className="px-6 py-3 text-gray-500 hover:text-gray-700 font-medium transition-colors text-center"
        >
          Skip for now
        </button>
      </div>

      {/* Note */}
      <p className="text-center text-xs text-gray-400 mt-6 max-w-lg mx-auto">
        You can connect more integrations later from your dashboard.
        Your data is always encrypted with your unique key.
      </p>
    </div>
  );
}
