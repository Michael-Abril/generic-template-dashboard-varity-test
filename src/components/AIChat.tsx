'use client';

import { useState, useEffect, useRef } from 'react';
import { useWallets } from '@privy-io/react-auth';
import { useWalletSync } from '../app/providers';
import { logger } from '@/lib/logger';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
  timestamp: Date;
}

export function AIChat() {
  const { wallets } = useWallets();
  const { address: syncedAddress, isLoading, isSynced } = useWalletSync();

  // Use synced address if available, fallback to Privy wallet address
  const address = syncedAddress || wallets[0]?.address;
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [installedTools, setInstalledTools] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fetch installed tools on mount
  useEffect(() => {
    if (!address) return;

    // Fetch user's installed integrations from backend (real purchases)
    fetch(`${API_BASE_URL}/api/v1/marketplace/my-integrations?wallet_address=${address}`)
      .then(res => {
        if (!res.ok) {
          throw new Error(`Failed to fetch integrations: ${res.status}`);
        }
        return res.json();
      })
      .then((data: Array<{ product_name: string; is_purchased: boolean }>) => {
        const toolNames = data
          .filter((integration) => integration.is_purchased)
          .map((integration) => integration.product_name);
        setInstalledTools(toolNames);
      })
      .catch(error => {
        logger.error('Failed to fetch installed tools:', error);
        setInstalledTools([]);
      });
  }, [address]);

  const sendMessage = async () => {
    if (!input.trim() || !address) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Call the real AI backend endpoint
      const response = await fetch(`${API_BASE_URL}/api/v1/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          wallet_address: address,
          use_rag: true
        })
      });

      if (!response.ok) {
        throw new Error(`AI request failed: ${response.statusText}`);
      }

      const data = await response.json() as {
        response: string;
        sources?: Array<{ tool: string; data_type: string }>;
      };

      // Extract source names from the sources array
      const sourceNames = data.sources?.map((s) =>
        `${s.tool} - ${s.data_type}`
      ) || [];

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response,
        sources: sourceNames,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      logger.error('Chat error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Please try again.';
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Sorry, I encountered an error: ${errorMessage}`,
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const suggestedQuestions = [
    "What's my total revenue this month?",
    "Show me recent expenses",
    "Who are my top customers?",
    "What's my profit margin?",
  ];

  // Show loading state while wallet syncs
  if (isLoading) {
    return (
      <div className="border border-gray-200 rounded-xl p-8 bg-white text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-4 animate-pulse">
          🤖
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          AI Assistant
        </h3>
        <p className="text-gray-600 mb-4">
          Initializing your wallet...
        </p>
      </div>
    );
  }

  // Show connect wallet message if no wallet
  if (!address) {
    return (
      <div className="border border-gray-200 rounded-xl p-8 bg-white text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
          🤖
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          AI Assistant
        </h3>
        <p className="text-gray-600 mb-4">
          Sign in to start chatting with your AI business assistant
        </p>
        <p className="text-xs text-gray-500">
          Your wallet will be created automatically when you sign in
        </p>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center text-2xl">
            🤖
          </div>
          <div>
            <h2 className="text-white font-bold text-lg">AI Business Assistant</h2>
            <div className="flex gap-2 mt-1">
              {installedTools.length > 0 ? (
                <p className="text-xs text-white/80">
                  Connected to {installedTools.join(', ')}
                </p>
              ) : (
                <p className="text-xs text-white/80">
                  No integrations connected
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="h-[500px] overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center text-4xl mx-auto mb-4">
              💬
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {installedTools.length > 0
                ? "I'm ready to help!"
                : "Install integrations to get started"}
            </h3>
            <p className="text-sm text-gray-600 mb-6 max-w-md mx-auto">
              {installedTools.length > 0
                ? "Ask me anything about your business data. I can analyze information across all your connected tools."
                : "Connect tools like QuickBooks and Salesforce from the marketplace to unlock AI insights."}
            </p>
            {installedTools.length > 0 && (
              <div className="max-w-md mx-auto">
                <p className="text-xs font-medium text-gray-700 mb-3">Try asking:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {suggestedQuestions.map((question, i) => (
                    <button
                      key={i}
                      onClick={() => setInput(question)}
                      className="text-left text-xs p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-colors"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg p-4 shadow-sm ${
                msg.role === 'user'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                  : 'bg-white text-gray-900 border border-gray-200'
              }`}
            >
              {msg.role === 'assistant' && (
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-xs">
                    🤖
                  </div>
                  <span className="text-xs font-semibold text-gray-700">AI Assistant</span>
                </div>
              )}
              <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs font-semibold text-gray-700 mb-1">Sources:</p>
                  <div className="flex flex-wrap gap-2">
                    {msg.sources.map((source, i) => (
                      <span
                        key={i}
                        className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded"
                      >
                        {source}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <p className={`text-xs mt-2 ${msg.role === 'user' ? 'text-white/70' : 'text-gray-500'}`}>
                {msg.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-xs">
                  🤖
                </div>
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 p-4 bg-white">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder={
              installedTools.length > 0
                ? "Ask me anything about your business..."
                : "Ask questions about your business. Connect tools for deeper insights."
            }
            disabled={loading}
            className="flex-1 border border-gray-300 bg-white text-gray-900 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}