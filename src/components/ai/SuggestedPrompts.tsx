'use client';

import { useState, useEffect } from 'react';
import {
  Mail, Calendar, FileText, Users, DollarSign, Target,
  Building, Activity, MessageSquare, AlertCircle, Clock,
  BarChart3, CheckCircle, Sparkles, Loader2
} from 'lucide-react';
import { logger } from '@/lib/logger';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

interface SuggestedPrompt {
  text: string;
  category: string;
  integration: string;
  icon: string;
}

interface SuggestedPromptsProps {
  walletAddress: string;
  onPromptClick: (prompt: string) => void;
}

// Icon mapping
const getIcon = (iconName: string) => {
  switch (iconName) {
    case 'mail':
      return <Mail className="w-4 h-4" />;
    case 'calendar':
      return <Calendar className="w-4 h-4" />;
    case 'file':
      return <FileText className="w-4 h-4" />;
    case 'users':
      return <Users className="w-4 h-4" />;
    case 'dollar':
      return <DollarSign className="w-4 h-4" />;
    case 'target':
      return <Target className="w-4 h-4" />;
    case 'building':
      return <Building className="w-4 h-4" />;
    case 'activity':
      return <Activity className="w-4 h-4" />;
    case 'message':
      return <MessageSquare className="w-4 h-4" />;
    case 'alert':
      return <AlertCircle className="w-4 h-4" />;
    case 'clock':
      return <Clock className="w-4 h-4" />;
    case 'chart':
      return <BarChart3 className="w-4 h-4" />;
    case 'check':
      return <CheckCircle className="w-4 h-4" />;
    default:
      return <Sparkles className="w-4 h-4" />;
  }
};

// Integration color mapping
const getIntegrationStyle = (integration: string) => {
  switch (integration.toLowerCase()) {
    case 'google':
      return 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100';
    case 'quickbooks':
      return 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100';
    case 'salesforce':
      return 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100';
    case 'hubspot':
      return 'border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100';
    case 'microsoft':
      return 'border-cyan-200 bg-cyan-50 text-cyan-700 hover:bg-cyan-100';
    case 'slack':
      return 'border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100';
    default:
      return 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100';
  }
};

export function SuggestedPrompts({ walletAddress, onPromptClick }: SuggestedPromptsProps) {
  const [prompts, setPrompts] = useState<SuggestedPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [integrations, setIntegrations] = useState<string[]>([]);

  useEffect(() => {
    if (!walletAddress) {
      setLoading(false);
      return;
    }

    fetch(`${API_BASE_URL}/api/v1/ai/suggested-prompts?wallet_address=${encodeURIComponent(walletAddress)}&limit=6`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch suggested prompts');
        return res.json();
      })
      .then(data => {
        setPrompts(data.prompts || []);
        setIntegrations(data.integrations || []);
      })
      .catch(error => {
        logger.error('Failed to fetch suggested prompts:', error);
        setPrompts([]);
      })
      .finally(() => setLoading(false));
  }, [walletAddress]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    );
  }

  if (prompts.length === 0) {
    return null; // Don't show anything if no prompts
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Sparkles className="w-4 h-4" />
        <span>Suggested prompts based on your connected integrations</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {prompts.map((prompt, index) => (
          <button
            key={index}
            onClick={() => onPromptClick(prompt.text.replace('{topic}', ''))}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${getIntegrationStyle(prompt.integration)}`}
          >
            {getIcon(prompt.icon)}
            <span>{prompt.text.replace('{topic}', '...')}</span>
          </button>
        ))}
      </div>

      {integrations.length > 0 && (
        <p className="text-xs text-gray-400">
          Based on: {integrations.map(i => i.charAt(0).toUpperCase() + i.slice(1)).join(', ')}
        </p>
      )}
    </div>
  );
}

export default SuggestedPrompts;
