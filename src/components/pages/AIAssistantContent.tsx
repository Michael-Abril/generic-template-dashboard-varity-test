'use client';

import { useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Layout } from '@/components/Layout';
import { AIChat } from '@/components/AIChat';

/**
 * AI Assistant Page Content
 *
 * Full-screen AI chat interface that uses the AIChat component
 * which includes:
 * - Conversation history sidebar (from database)
 * - AI mode selector (standard, deep research, analyze)
 * - Export functionality
 * - Quick prompts/templates
 */

export default function AIAssistantContent() {
  const { authenticated } = usePrivy();
  const router = useRouter();

  // Redirect if not authenticated - use useEffect to avoid render-time side effects
  useEffect(() => {
    if (!authenticated) {
      router.push('/');
    }
  }, [authenticated, router]);

  // Show loading while checking authentication
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading AI Assistant...</p>
        </div>
      </div>
    );
  }

  return (
    <Layout>
      <div className="h-full flex flex-col">
        {/* Breadcrumb Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-3 flex-shrink-0">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Link href="/dashboard" className="hover:text-gray-700">Dashboard</Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">AI Assistant</span>
          </div>
        </div>

        {/* AI Chat takes full remaining space */}
        <div className="flex-1 min-h-0">
          <AIChat />
        </div>
      </div>
    </Layout>
  );
}
