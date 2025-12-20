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
    <div className="px-6 py-6 sm:px-8 sm:py-8">
      {/* Header */}
      <div className="text-center mb-5">
        <div className="flex justify-center mb-3">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
            <Link2 className="w-6 h-6 text-white" />
          </div>
        </div>
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">
          Connect your first tool
        </h2>
        <p className="text-gray-600 text-sm max-w-md mx-auto">
          {industry ? (
            <>Recommended for {industry.toLowerCase()}</>
          ) : (
            <>Select an integration to connect</>
          )}
        </p>
      </div>

      {/* Integration Grid */}
      <div className="grid sm:grid-cols-2 gap-3 max-w-xl mx-auto mb-6">
        {recommended.map((slug) => {
          const integration = INTEGRATIONS[slug];
          if (!integration) return null;

          const isSelected = selectedIntegration === slug;

          return (
            <button
              key={slug}
              onClick={() => onSelect(slug)}
              className={`relative flex items-center gap-3 p-4 border rounded-xl transition-colors text-left ${
                isSelected
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              {isSelected && (
                <div className="absolute top-2.5 right-2.5">
                  <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                </div>
              )}
              <div className="flex-shrink-0">
                <div className="p-1.5 bg-white border border-gray-100 rounded-lg">
                  <IntegrationLogo integration={slug} size="md" />
                </div>
              </div>
              <div className="flex-grow min-w-0 pr-6">
                <span className="font-medium text-gray-900 text-sm block">
                  {integration.name}
                </span>
                <p className="text-xs text-gray-500 truncate">
                  {integration.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* More integrations link */}
      <div className="text-center mb-8">
        <a
          href="/marketplace"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-700 font-medium text-sm inline-flex items-center gap-1"
        >
          Browse all integrations
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Navigation Buttons */}
      <div className="flex gap-3 max-w-xl mx-auto">
        <button
          onClick={onBack}
          className="px-5 py-2.5 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <button
          onClick={handleContinue}
          disabled={!selectedIntegration}
          className="flex-1 bg-blue-600 text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
        >
          Connect {selectedIntegration ? INTEGRATIONS[selectedIntegration]?.name : ''}
          <ArrowRight className="w-4 h-4" />
        </button>

        <button
          onClick={onSkip}
          className="px-5 py-2.5 text-gray-500 hover:text-gray-700 font-medium transition-colors text-sm"
        >
          Skip
        </button>
      </div>
    </div>
  );
}
