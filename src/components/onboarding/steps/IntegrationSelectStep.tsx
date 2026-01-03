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

// The 6 active integrations (others coming soon)
const ACTIVE_INTEGRATIONS = ['quickbooks', 'google', 'microsoft', 'slack', 'salesforce', 'hubspot'];

// Industry to integration mapping - only active integrations
const INDUSTRY_INTEGRATIONS: Record<string, string[]> = {
  'Technology / Software': ['google', 'slack', 'microsoft', 'hubspot'],
  'Finance / Accounting': ['quickbooks', 'google', 'microsoft', 'hubspot'],
  'Healthcare / Medical': ['google', 'slack', 'microsoft', 'salesforce'],
  'Retail / E-commerce': ['quickbooks', 'google', 'hubspot', 'salesforce'],
  'Professional Services': ['google', 'slack', 'salesforce', 'hubspot'],
  'Manufacturing': ['quickbooks', 'slack', 'google', 'microsoft'],
  'Construction': ['quickbooks', 'google', 'slack', 'microsoft'],
  'Real Estate': ['salesforce', 'google', 'hubspot', 'slack'],
  'Food & Hospitality': ['quickbooks', 'slack', 'google', 'hubspot'],
  'Transportation / Logistics': ['quickbooks', 'slack', 'google', 'microsoft'],
  'Non-profit': ['quickbooks', 'google', 'slack', 'hubspot'],
  'Other': ['quickbooks', 'google', 'slack', 'hubspot'],
};

// Integration metadata - only the 6 active integrations
const INTEGRATIONS: Record<string, { name: string; description: string; category: string }> = {
  quickbooks: { name: 'QuickBooks', description: 'Accounting & Finances', category: 'Accounting' },
  google: { name: 'Google Workspace', description: 'Email, Calendar, Drive', category: 'Productivity' },
  microsoft: { name: 'Microsoft 365', description: 'Office Suite', category: 'Productivity' },
  slack: { name: 'Slack', description: 'Team Communication', category: 'Communication' },
  salesforce: { name: 'Salesforce', description: 'CRM & Sales', category: 'CRM' },
  hubspot: { name: 'HubSpot', description: 'Marketing & CRM', category: 'Marketing' },
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
    <div className="px-6 py-10 sm:px-12 sm:py-12">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
            <Link2 className="w-7 h-7 text-white" />
          </div>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          Connect your first tool
        </h2>
        <p className="text-gray-600 text-base max-w-xl mx-auto">
          {industry ? (
            <>Recommended for {industry.toLowerCase()}</>
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
              className={`relative flex items-center gap-4 p-5 border-2 rounded-xl transition-all text-left shadow-sm hover:shadow-md ${
                isSelected
                  ? 'border-blue-500 bg-blue-50/50 shadow-lg shadow-blue-100'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              {isSelected && (
                <div className="absolute top-3 right-3">
                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center shadow-md">
                    <Check className="w-3.5 h-3.5 text-white" />
                  </div>
                </div>
              )}
              <div className="flex-shrink-0">
                <div className="p-2 bg-white border border-gray-200 rounded-lg shadow-sm">
                  <IntegrationLogo integration={slug} size="md" />
                </div>
              </div>
              <div className="flex-grow min-w-0 pr-8">
                <span className="font-semibold text-gray-900 text-base block mb-0.5">
                  {integration.name}
                </span>
                <p className="text-sm text-gray-600">
                  {integration.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* More integrations link */}
      <div className="text-center mb-10">
        <a
          href="/marketplace"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-700 font-semibold text-base inline-flex items-center gap-1.5 transition-colors"
        >
          Browse all integrations
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      {/* Navigation Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 max-w-2xl mx-auto">
        <button
          onClick={handleContinue}
          disabled={!selectedIntegration}
          className="order-1 sm:order-2 flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3.5 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:from-gray-400 disabled:to-gray-400 flex items-center justify-center gap-2 text-base shadow-lg shadow-blue-200/50 hover:shadow-xl hover:shadow-blue-200/60"
        >
          {selectedIntegration ? `Connect ${INTEGRATIONS[selectedIntegration]?.name}` : 'Select a tool'}
          <ArrowRight className="w-5 h-5" />
        </button>

        <div className="order-2 sm:order-1 flex gap-3">
          <button
            onClick={onBack}
            className="flex-1 sm:flex-none px-6 py-3.5 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-all flex items-center justify-center gap-2 text-base shadow-sm hover:shadow-md"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <button
            onClick={onSkip}
            className="flex-1 sm:flex-none px-6 py-3.5 text-gray-700 hover:text-gray-900 hover:bg-gray-50 border border-gray-300 rounded-xl font-medium transition-all text-base shadow-sm hover:shadow-md"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}
