'use client';

import { useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Layout } from '@/components/Layout';
import { AIChat } from '@/components/AIChat';
import { Download, Trash2, Bot, BarChart3, Users, DollarSign, TrendingUp, Mail, Target, Lightbulb } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

/**
 * AI Assistant Page Content
 *
 * Full-screen AI chat interface with:
 * - Conversation history sidebar
 * - Data source selector
 * - Export chat transcript
 * - Quick prompts/templates
 * - Clear conversation option
 */

interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
}

// Helper function to format timestamps
function formatTimestamp(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString();
}

export default function AIAssistantContent() {
  const { authenticated } = usePrivy();
  const router = useRouter();
  const toast = useToast();
  const [showSidebar, setShowSidebar] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([
    {
      id: '1',
      title: 'Revenue Analysis Q4',
      lastMessage: 'What was my total revenue in Q4?',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
    },
    {
      id: '2',
      title: 'Customer Growth',
      lastMessage: 'How many new customers did I get last month?',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
    },
    {
      id: '3',
      title: 'Expense Breakdown',
      lastMessage: 'Show me my top expenses',
      timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 1 week ago
    },
  ]);

  const quickPrompts = [
    'Show me my revenue this month',
    'How many new customers this week?',
    'What are my top expenses?',
    'Compare sales vs last month',
    'Summarize my recent emails',
    'Show my sales pipeline',
  ];

  // Redirect if not authenticated
  if (!authenticated) {
    router.push('/');
    return null;
  }

  const handleNewConversation = () => {
    setSelectedConversation(null);
    // Clear current chat messages
  };

  const handleExportChat = () => {
    const dataStr = JSON.stringify(conversations, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ai-chat-history-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  const handleClearChat = () => {
    // Clear messages logic
    setConversations([]);
    toast.success('Conversation cleared', 'Your chat history has been cleared.');
  };

  return (
    <Layout>
      <div className="h-screen flex flex-col bg-gray-50">

        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between max-w-full">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className="lg:hidden text-gray-600 hover:text-gray-900"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Link href="/dashboard" className="hover:text-gray-700">Dashboard</Link>
                <span>/</span>
                <span className="text-gray-900 font-medium">AI Assistant</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleExportChat}
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100 transition-all text-sm font-medium"
              >
                <Download className="w-4 h-4 inline mr-1" /> Export
              </button>
              <button
                onClick={handleClearChat}
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100 transition-all text-sm font-medium"
              >
                <Trash2 className="w-4 h-4 inline mr-1" /> Clear
              </button>
              <button
                onClick={handleNewConversation}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all text-sm font-semibold"
              >
                + New Chat
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">

          {/* Sidebar - Conversation History */}
          {showSidebar && (
            <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
              <div className="p-4 border-b border-gray-200">
                <h2 className="font-bold text-gray-900 mb-2">Conversation History</h2>
                <p className="text-xs text-gray-600">Previous chats with your AI assistant</p>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv.id)}
                    className={`w-full text-left p-3 rounded-lg transition-all ${
                      selectedConversation === conv.id
                        ? 'bg-blue-50 border-2 border-blue-200'
                        : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                    }`}
                  >
                    <p className="font-semibold text-gray-900 text-sm mb-1 truncate">
                      {conv.title}
                    </p>
                    <p className="text-xs text-gray-600 truncate mb-2">
                      {conv.lastMessage}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatTimestamp(conv.timestamp)}
                    </p>
                  </button>
                ))}
              </div>

              {/* Data Source Selector */}
              <div className="p-4 border-t border-gray-200 bg-gray-50">
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  Data Sources
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                  <option>All Integrations</option>
                  <option>QuickBooks Only</option>
                  <option>Salesforce Only</option>
                  <option>Shopify Only</option>
                  <option>Email (Google/Microsoft)</option>
                </select>
              </div>
            </div>
          )}

          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col bg-gradient-to-br from-gray-50 to-blue-50">

            {/* Welcome / Empty State */}
            {!selectedConversation && conversations.length === 0 && (
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="max-w-2xl text-center">
                  <div className="flex justify-center mb-6">
                    <Bot className="w-16 h-16 text-blue-600" />
                  </div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-4">
                    AI Assistant
                  </h1>
                  <p className="text-gray-600 mb-8">
                    Ask questions about your business data across all your integrations.
                    Get instant insights powered by AI.
                  </p>

                  {/* Quick Prompts */}
                  <div className="grid grid-cols-2 gap-3 mb-8">
                    {quickPrompts.map((prompt, i) => (
                      <button
                        key={i}
                        className="bg-white border-2 border-gray-200 rounded-xl p-4 text-left hover:border-blue-400 hover:shadow-md transition-all group"
                      >
                        <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600">
                          {prompt}
                        </p>
                      </button>
                    ))}
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-900">
                    <p className="font-semibold mb-2 flex items-center gap-2">
                      <Lightbulb className="w-4 h-4" />
                      Tips for better results:
                    </p>
                    <ul className="text-left space-y-1 text-blue-800">
                      <li>• Be specific about time periods (this month, last quarter, etc.)</li>
                      <li>• Ask for comparisons to see trends</li>
                      <li>• Reference specific integrations if needed</li>
                      <li>• Ask follow-up questions to dive deeper</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* AI Chat Component */}
            <div className="flex-1 flex flex-col">
              <AIChat />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
