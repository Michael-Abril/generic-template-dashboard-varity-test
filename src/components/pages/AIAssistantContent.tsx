'use client';

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

  // Redirect if not authenticated
  if (!authenticated) {
    router.push('/');
    return null;
  }

  return (
    <Layout>
      <div className="h-[calc(100vh-64px)] flex flex-col">
        {/* Breadcrumb Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-3 flex-shrink-0">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Link href="/dashboard" className="hover:text-gray-700">Dashboard</Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">AI Assistant</span>
          </div>
        </div>

        {/* AI Chat takes full remaining space */}
        <div className="flex-1 overflow-hidden">
          <AIChat />
        </div>
      </div>
    </Layout>
  );
}
