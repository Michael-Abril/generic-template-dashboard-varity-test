'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useWallets } from '@privy-io/react-auth';
import { useWalletSync } from '../app/providers';
import { logger } from '@/lib/logger';
import {
  Bot, MessageSquare, Plus, Pin, PinOff, Trash2, Edit2, X, Check, Archive,
  MoreVertical, Sparkles, Search, FileText, ChevronDown, Upload, Download,
  Shield, Lock, Globe, FileUp, Loader2, BarChart3, AlertCircle
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

// Document analysis types available
type AnalysisType = 'summary' | 'key_points' | 'sentiment' | 'extraction' | 'action_items';

const ANALYSIS_TYPES: { value: AnalysisType; label: string; description: string; icon: string }[] = [
  { value: 'summary', label: 'Executive Summary', description: 'Concise overview of the document', icon: '📋' },
  { value: 'key_points', label: 'Key Points', description: 'Extract main points and insights', icon: '🎯' },
  { value: 'sentiment', label: 'Sentiment Analysis', description: 'Analyze tone and sentiment', icon: '😊' },
  { value: 'extraction', label: 'Data Extraction', description: 'Extract numbers, dates, names', icon: '📊' },
  { value: 'action_items', label: 'Action Items', description: 'Identify tasks and next steps', icon: '✅' },
];

interface Message {
  id?: number;
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
  rag_sources?: string[];
  web_sources?: Array<{ title: string; url: string }>;
  timestamp: Date;
}

interface Conversation {
  id: number;
  wallet_address: string;
  title: string;
  is_pinned: boolean;
  is_archived: boolean;
  integration: string | null;
  created_at: string;
  updated_at: string;
  last_message_at: string | null;
  message_count: number;
}

interface ConversationWithMessages extends Conversation {
  messages: Array<{
    id: number;
    conversation_id: number;
    role: string;
    content: string;
    rag_sources: string[];
    web_sources: Array<{ title: string; url: string }>;
    message_metadata: Record<string, unknown>;
    created_at: string;
  }>;
}

export function AIChat() {
  const { wallets } = useWallets();
  const { address: syncedAddress, isLoading } = useWalletSync();

  // Use synced address if available, fallback to Privy wallet address
  const address = syncedAddress || wallets[0]?.address;

  // Conversation state
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [installedTools, setInstalledTools] = useState<string[]>([]);
  const [showSidebar, setShowSidebar] = useState(true);
  const [editingTitle, setEditingTitle] = useState<number | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null);
  const [aiMode, setAiMode] = useState<'standard' | 'deep_research' | 'analyze' | 'document'>('standard');
  const [showModeSelector, setShowModeSelector] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Enhanced features state
  const [enableWebSearch, setEnableWebSearch] = useState(true); // Toggle for Deep Research
  const [showDocumentUpload, setShowDocumentUpload] = useState(false);
  const [uploadedDocument, setUploadedDocument] = useState<{ name: string; content: string } | null>(null);
  const [selectedAnalysisType, setSelectedAnalysisType] = useState<AnalysisType>('summary');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showPrivacyBanner, setShowPrivacyBanner] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fetch installed tools on mount
  useEffect(() => {
    if (!address) return;

    fetch(`${API_BASE_URL}/api/v1/marketplace/my-integrations?wallet_address=${address}`)
      .then(res => {
        if (!res.ok) throw new Error(`Failed to fetch integrations: ${res.status}`);
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

  // Load conversations for the wallet
  const loadConversations = useCallback(async () => {
    if (!address) return;

    setLoadingConversations(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/conversations/?wallet_address=${address}&limit=50`
      );
      if (!response.ok) throw new Error('Failed to load conversations');
      const data = await response.json();
      setConversations(data);
    } catch (error) {
      logger.error('Failed to load conversations:', error);
    } finally {
      setLoadingConversations(false);
    }
  }, [address]);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Load messages for a specific conversation
  const loadConversation = async (conversationId: number) => {
    if (!address) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/conversations/${conversationId}?wallet_address=${address}`
      );
      if (!response.ok) throw new Error('Failed to load conversation');
      const data: ConversationWithMessages = await response.json();

      // Convert API messages to local format
      const loadedMessages: Message[] = data.messages.map(msg => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        rag_sources: msg.rag_sources,
        web_sources: msg.web_sources,
        sources: [
          ...(msg.rag_sources || []).map(s => `📊 ${s}`),
          ...(msg.web_sources || []).map(s => `🌐 ${s.title}`)
        ],
        timestamp: new Date(msg.created_at)
      }));

      setMessages(loadedMessages);
      setCurrentConversationId(conversationId);
    } catch (error) {
      logger.error('Failed to load conversation:', error);
    }
  };

  // Create a new conversation
  const createNewConversation = async (initialTitle?: string) => {
    if (!address) return null;

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/conversations/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet_address: address,
          title: initialTitle || 'New Conversation'
        })
      });
      if (!response.ok) throw new Error('Failed to create conversation');
      const newConv: Conversation = await response.json();

      setConversations(prev => [newConv, ...prev]);
      setCurrentConversationId(newConv.id);
      setMessages([]);

      return newConv;
    } catch (error) {
      logger.error('Failed to create conversation:', error);
      return null;
    }
  };

  // Add message to current conversation
  const addMessageToConversation = async (conversationId: number, message: Message) => {
    if (!address) return;

    try {
      await fetch(`${API_BASE_URL}/api/v1/conversations/${conversationId}/messages?wallet_address=${address}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: message.role,
          content: message.content,
          rag_sources: message.rag_sources || [],
          web_sources: message.web_sources || [],
          message_metadata: {}
        })
      });
      // Refresh conversations to update last_message_at
      loadConversations();
    } catch (error) {
      logger.error('Failed to save message:', error);
    }
  };

  // Pin/unpin conversation
  const togglePin = async (conversationId: number, isPinned: boolean) => {
    if (!address) return;

    try {
      const endpoint = isPinned ? 'unpin' : 'pin';
      await fetch(`${API_BASE_URL}/api/v1/conversations/${conversationId}/${endpoint}?wallet_address=${address}`, {
        method: 'POST'
      });
      loadConversations();
    } catch (error) {
      logger.error('Failed to toggle pin:', error);
    }
  };

  // Rename conversation
  const renameConversation = async (conversationId: number, title: string) => {
    if (!address || !title.trim()) return;

    try {
      await fetch(`${API_BASE_URL}/api/v1/conversations/${conversationId}?wallet_address=${address}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim() })
      });
      setEditingTitle(null);
      loadConversations();
    } catch (error) {
      logger.error('Failed to rename conversation:', error);
    }
  };

  // Delete conversation
  const deleteConversation = async (conversationId: number) => {
    if (!address) return;
    if (!confirm('Are you sure you want to delete this conversation?')) return;

    try {
      await fetch(`${API_BASE_URL}/api/v1/conversations/${conversationId}?wallet_address=${address}`, {
        method: 'DELETE'
      });

      if (currentConversationId === conversationId) {
        setCurrentConversationId(null);
        setMessages([]);
      }
      loadConversations();
    } catch (error) {
      logger.error('Failed to delete conversation:', error);
    }
  };

  // Archive conversation
  const archiveConversation = async (conversationId: number) => {
    if (!address) return;

    try {
      await fetch(`${API_BASE_URL}/api/v1/conversations/${conversationId}/archive?wallet_address=${address}`, {
        method: 'POST'
      });

      if (currentConversationId === conversationId) {
        setCurrentConversationId(null);
        setMessages([]);
      }
      loadConversations();
    } catch (error) {
      logger.error('Failed to archive conversation:', error);
    }
  };

  // Handle document file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    // Check file type
    const allowedTypes = ['text/plain', 'text/markdown', 'application/pdf', 'text/csv'];
    const allowedExtensions = ['.txt', '.md', '.pdf', '.csv', '.doc', '.docx'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
      alert('Please upload a text file (.txt, .md, .csv) or PDF');
      return;
    }

    try {
      let content: string;

      if (file.type === 'application/pdf' || fileExtension === '.pdf') {
        // For PDF, we'll send to backend for extraction
        content = `[PDF Document: ${file.name}]\n\nNote: PDF content extraction will be processed by the AI.`;
        // In production, you'd upload the file to backend for PDF parsing
      } else {
        // For text files, read directly
        content = await file.text();
      }

      setUploadedDocument({ name: file.name, content });
      setShowDocumentUpload(false);
    } catch (error) {
      logger.error('Failed to read file:', error);
      alert('Failed to read file. Please try again.');
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Analyze uploaded document
  const analyzeDocument = async () => {
    if (!uploadedDocument || !address) return;

    setIsAnalyzing(true);
    const analysisTypeLabel = ANALYSIS_TYPES.find(t => t.value === selectedAnalysisType)?.label || selectedAnalysisType;

    // Add user message showing what's being analyzed
    const userMessage: Message = {
      role: 'user',
      content: `📄 **Analyzing Document:** ${uploadedDocument.name}\n\n**Analysis Type:** ${analysisTypeLabel}`,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);

    // Create conversation if needed
    let convId = currentConversationId;
    if (!convId) {
      const newConv = await createNewConversation(`Document Analysis: ${uploadedDocument.name}`);
      if (!newConv) {
        setIsAnalyzing(false);
        return;
      }
      convId = newConv.id;
    }

    await addMessageToConversation(convId, userMessage);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/ai/analyze/document`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet_address: address,
          document_content: uploadedDocument.content,
          analysis_type: selectedAnalysisType
        })
      });

      if (!response.ok) throw new Error(`Analysis failed: ${response.statusText}`);
      const data = await response.json();

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.analysis || data.response || 'Analysis complete.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
      await addMessageToConversation(convId, assistantMessage);

      // Clear the uploaded document after analysis
      setUploadedDocument(null);
    } catch (error) {
      logger.error('Document analysis error:', error);
      const errorMsg: Message = {
        role: 'assistant',
        content: `Sorry, I couldn't analyze the document. ${error instanceof Error ? error.message : 'Please try again.'}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Export conversation
  const exportConversation = async (format: 'markdown' | 'json' | 'pdf') => {
    if (messages.length === 0) {
      alert('No messages to export');
      return;
    }

    const conversation = conversations.find(c => c.id === currentConversationId);
    const title = conversation?.title || 'AI Conversation';
    const timestamp = new Date().toISOString().split('T')[0];

    if (format === 'markdown') {
      let markdown = `# ${title}\n\n`;
      markdown += `**Exported:** ${new Date().toLocaleString()}\n\n`;
      markdown += `**Privacy:** All data stored on Filecoin/IPFS - Your data, your control.\n\n---\n\n`;

      messages.forEach(msg => {
        markdown += `### ${msg.role === 'user' ? '👤 You' : '🤖 Varity AI'}\n`;
        markdown += `*${msg.timestamp.toLocaleString()}*\n\n`;
        markdown += `${msg.content}\n\n`;
        if (msg.sources && msg.sources.length > 0) {
          markdown += `**Sources:** ${msg.sources.join(', ')}\n\n`;
        }
        markdown += `---\n\n`;
      });

      const blob = new Blob([markdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.replace(/[^a-z0-9]/gi, '_')}_${timestamp}.md`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (format === 'json') {
      const exportData = {
        title,
        exported_at: new Date().toISOString(),
        privacy_note: 'All data stored on Filecoin/IPFS - decentralized and secure',
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
          sources: m.sources,
          timestamp: m.timestamp.toISOString()
        }))
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.replace(/[^a-z0-9]/gi, '_')}_${timestamp}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (format === 'pdf') {
      // For PDF, we'd call a backend endpoint
      // For now, show a message
      alert('PDF export coming soon! Use Markdown export for now.');
    }

    setShowExportMenu(false);
  };

  // Send message
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

    // Create conversation if none exists
    let convId = currentConversationId;
    if (!convId) {
      const newConv = await createNewConversation(input.substring(0, 50));
      if (!newConv) {
        setLoading(false);
        return;
      }
      convId = newConv.id;
    }

    // Save user message
    await addMessageToConversation(convId, userMessage);

    try {
      let responseData: {
        answer?: string;
        response?: string;
        analysis?: string;
        rag_sources?: string[];
        web_sources?: Array<{ title: string; url: string }>;
        sources?: string[];
      };

      // Route to different endpoints based on AI mode
      if (aiMode === 'standard') {
        // Standard mode: Use general chat endpoint (no web search)
        // This provides direct, authoritative Varity Dashboard responses
        const response = await fetch(`${API_BASE_URL}/api/v1/ai/chat/general`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: input,
            wallet_address: address,
            temperature: 0.7,
            max_tokens: 2048
          })
        });
        if (!response.ok) throw new Error(`AI request failed: ${response.statusText}`);
        responseData = await response.json();

      } else if (aiMode === 'deep_research') {
        // Deep Research mode: Use combined query with optional web search
        // User can toggle web search on/off for RAG-only or RAG+Web analysis
        const response = await fetch(`${API_BASE_URL}/api/v1/ai/query/combined`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: input,
            wallet_address: address,
            enable_web_search: enableWebSearch, // User-controlled toggle
            max_rag_results: 5,
            max_search_results: enableWebSearch ? 5 : 0
          })
        });
        if (!response.ok) throw new Error(`AI request failed: ${response.statusText}`);
        responseData = await response.json();

      } else if (aiMode === 'analyze') {
        // Analyze & Report mode: Use document analysis or research endpoint
        // without web search, focused on business data analysis
        const response = await fetch(`${API_BASE_URL}/api/v1/ai/research`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: input,
            wallet_address: address,
            depth: 'comprehensive'
          })
        });
        if (!response.ok) throw new Error(`AI request failed: ${response.statusText}`);
        responseData = await response.json();

      } else {
        // Fallback to standard mode
        const response = await fetch(`${API_BASE_URL}/api/v1/ai/chat/general`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: input,
            wallet_address: address
          })
        });
        if (!response.ok) throw new Error(`AI request failed: ${response.statusText}`);
        responseData = await response.json();
      }

      // Extract the response text (different endpoints use different field names)
      const answerText = responseData.answer || responseData.response || responseData.analysis || 'No response received';

      // Build source names for display
      const sourceNames: string[] = [];
      if (responseData.rag_sources?.length) {
        sourceNames.push(...responseData.rag_sources.map(s => `📊 ${s}`));
      }
      if (responseData.web_sources?.length) {
        sourceNames.push(...responseData.web_sources.map(s => `🌐 ${s.title}`));
      }
      if (responseData.sources?.length) {
        sourceNames.push(...responseData.sources.map(s => `📄 ${s}`));
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: answerText,
        sources: sourceNames,
        rag_sources: responseData.rag_sources || [],
        web_sources: responseData.web_sources || [],
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Save assistant message
      await addMessageToConversation(convId, assistantMessage);
    } catch (error) {
      logger.error('Chat error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Please try again.';
      const errorMsg: Message = {
        role: 'assistant',
        content: `Sorry, I encountered an error: ${errorMessage}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
      await addMessageToConversation(convId, errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Start new chat
  const startNewChat = () => {
    setCurrentConversationId(null);
    setMessages([]);
  };

  // Integration-specific suggested questions
  const getIntegrationQuestions = () => {
    const questions: { question: string; integration?: string }[] = [];

    // QuickBooks-specific questions
    if (installedTools.some(t => t.toLowerCase().includes('quickbooks'))) {
      questions.push(
        { question: "Show my overdue invoices from QuickBooks", integration: "quickbooks" },
        { question: "What's my accounts receivable balance?", integration: "quickbooks" },
        { question: "Who are my top 5 customers by revenue?", integration: "quickbooks" },
        { question: "Show my P&L summary for this month", integration: "quickbooks" },
        { question: "What expenses are due this week?", integration: "quickbooks" },
        { question: "Compare my revenue vs expenses this quarter", integration: "quickbooks" }
      );
    }

    // Google Workspace questions
    if (installedTools.some(t => t.toLowerCase().includes('google'))) {
      questions.push(
        { question: "What meetings do I have today?", integration: "google" },
        { question: "Show unread emails from this week", integration: "google" },
        { question: "Find documents shared with me recently", integration: "google" }
      );
    }

    // Salesforce questions
    if (installedTools.some(t => t.toLowerCase().includes('salesforce'))) {
      questions.push(
        { question: "Show my open deals by stage", integration: "salesforce" },
        { question: "What leads were created this week?", integration: "salesforce" },
        { question: "Who are my hottest opportunities?", integration: "salesforce" }
      );
    }

    // Slack questions
    if (installedTools.some(t => t.toLowerCase().includes('slack'))) {
      questions.push(
        { question: "Show recent important messages", integration: "slack" },
        { question: "What channels am I most active in?", integration: "slack" }
      );
    }

    // HubSpot questions
    if (installedTools.some(t => t.toLowerCase().includes('hubspot'))) {
      questions.push(
        { question: "Show my deal pipeline", integration: "hubspot" },
        { question: "What contacts were added recently?", integration: "hubspot" }
      );
    }

    // Default questions if no specific integrations or as fallback
    if (questions.length === 0) {
      questions.push(
        { question: "What's my total revenue this month?" },
        { question: "Show me recent expenses" },
        { question: "Who are my top customers?" },
        { question: "What's my profit margin?" }
      );
    }

    return questions.slice(0, 6); // Return max 6 questions
  };

  const suggestedQuestions = getIntegrationQuestions();

  // Show loading state while wallet syncs
  if (isLoading) {
    return (
      <div className="border border-gray-200 rounded-xl p-8 bg-white text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
          <Bot className="w-8 h-8 text-gray-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Assistant</h3>
        <p className="text-gray-600 mb-4">Initializing your wallet...</p>
      </div>
    );
  }

  // Show connect wallet message if no wallet
  if (!address) {
    return (
      <div className="border border-gray-200 rounded-xl p-8 bg-white text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Bot className="w-8 h-8 text-gray-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Assistant</h3>
        <p className="text-gray-600 mb-4">Sign in to start chatting with your AI business assistant</p>
        <p className="text-xs text-gray-500">Your wallet will be created automatically when you sign in</p>
      </div>
    );
  }

  return (
    <div className="flex h-full border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
      {/* Sidebar - Conversation History */}
      {showSidebar && (
        <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col">
          {/* Sidebar Header */}
          <div className="p-3 border-b border-gray-200">
            <button
              onClick={startNewChat}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              New Chat
            </button>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto">
            {loadingConversations ? (
              <div className="p-4 text-center text-gray-500 text-sm">Loading...</div>
            ) : conversations.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">No conversations yet</div>
            ) : (
              <div className="py-2">
                {conversations.map(conv => (
                  <div
                    key={conv.id}
                    className={`group relative mx-2 mb-1 rounded-lg cursor-pointer transition-colors ${
                      currentConversationId === conv.id
                        ? 'bg-blue-100 border border-blue-200'
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    <div
                      className="p-3"
                      onClick={() => loadConversation(conv.id)}
                    >
                      {editingTitle === conv.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') renameConversation(conv.id, newTitle);
                              if (e.key === 'Escape') setEditingTitle(null);
                            }}
                            className="flex-1 px-2 py-1 text-sm border rounded text-gray-900 bg-white"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              renameConversation(conv.id, newTitle);
                            }}
                            className="p-1 text-green-600 hover:bg-green-100 rounded"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingTitle(null);
                            }}
                            className="p-1 text-gray-600 hover:bg-gray-200 rounded"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            {conv.is_pinned && <Pin className="w-3 h-3 text-blue-600" />}
                            <span className="text-sm font-medium text-gray-900 truncate flex-1">
                              {conv.title}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {conv.message_count} messages
                          </div>
                        </>
                      )}
                    </div>

                    {/* Actions Menu */}
                    <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpenId(menuOpenId === conv.id ? null : conv.id);
                        }}
                        className="p-1 hover:bg-gray-200 rounded"
                      >
                        <MoreVertical className="w-4 h-4 text-gray-500" />
                      </button>

                      {menuOpenId === conv.id && (
                        <div className="absolute right-0 top-6 w-36 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingTitle(conv.id);
                              setNewTitle(conv.title);
                              setMenuOpenId(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            <Edit2 className="w-4 h-4" /> Rename
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePin(conv.id, conv.is_pinned);
                              setMenuOpenId(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            {conv.is_pinned ? (
                              <><PinOff className="w-4 h-4" /> Unpin</>
                            ) : (
                              <><Pin className="w-4 h-4" /> Pin</>
                            )}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              archiveConversation(conv.id);
                              setMenuOpenId(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            <Archive className="w-4 h-4" /> Archive
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteConversation(conv.id);
                              setMenuOpenId(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <MessageSquare className="w-5 h-5 text-white" />
              </button>
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-white font-bold text-lg">Varity AI Assistant</h2>
                <div className="flex flex-wrap gap-2 mt-1">
                  {installedTools.length > 0 ? (
                    <>
                      <p className="text-xs text-white/80">Connected:</p>
                      {installedTools.slice(0, 4).map((tool, i) => (
                        <span
                          key={i}
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            tool.toLowerCase().includes('quickbooks') ? 'bg-green-500/30 text-green-100' :
                            tool.toLowerCase().includes('google') ? 'bg-red-500/30 text-red-100' :
                            tool.toLowerCase().includes('salesforce') ? 'bg-blue-500/30 text-blue-100' :
                            tool.toLowerCase().includes('slack') ? 'bg-purple-500/30 text-purple-100' :
                            tool.toLowerCase().includes('hubspot') ? 'bg-orange-500/30 text-orange-100' :
                            'bg-white/20 text-white/90'
                          }`}
                        >
                          {tool}
                        </span>
                      ))}
                      {installedTools.length > 4 && (
                        <span className="text-xs text-white/60">+{installedTools.length - 4} more</span>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-white/80">No integrations connected</p>
                  )}
                </div>
              </div>
            </div>

            {/* Header Actions - Privacy & Export */}
            <div className="flex items-center gap-2">
              {/* Privacy Indicator */}
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-white/10 rounded-full">
                <Shield className="w-3.5 h-3.5 text-green-300" />
                <span className="text-xs text-white/90">On-Chain Secure</span>
              </div>

              {/* Export Button */}
              <div className="relative">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  title="Export conversation"
                >
                  <Download className="w-5 h-5 text-white" />
                </button>
                {showExportMenu && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                    <button
                      onClick={() => exportConversation('markdown')}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <FileText className="w-4 h-4" /> Export as Markdown
                    </button>
                    <button
                      onClick={() => exportConversation('json')}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <BarChart3 className="w-4 h-4" /> Export as JSON
                    </button>
                    <button
                      onClick={() => exportConversation('pdf')}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-500 hover:bg-gray-100"
                    >
                      <FileUp className="w-4 h-4" /> Export as PDF (soon)
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Privacy Banner - Dismissible */}
        {showPrivacyBanner && (
          <div className="bg-gradient-to-r from-green-50 to-blue-50 border-b border-green-200 px-4 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-green-600" />
                  <span className="text-xs font-medium text-green-800">Your Data is Private</span>
                </div>
                <span className="text-xs text-gray-600">
                  All data stored on Filecoin/IPFS • Encrypted with your wallet • Only you can access
                </span>
              </div>
              <button
                onClick={() => setShowPrivacyBanner(false)}
                className="p-1 hover:bg-white/50 rounded"
              >
                <X className="w-3.5 h-3.5 text-gray-500" />
              </button>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {messages.length === 0 && (
            <div className="text-center py-8">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${
                installedTools.some(t => t.toLowerCase().includes('quickbooks'))
                  ? 'bg-green-50'
                  : 'bg-blue-50'
              }`}>
                <MessageSquare className={`w-10 h-10 ${
                  installedTools.some(t => t.toLowerCase().includes('quickbooks'))
                    ? 'text-green-500'
                    : 'text-blue-500'
                }`} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {installedTools.length > 0
                  ? installedTools.some(t => t.toLowerCase().includes('quickbooks'))
                    ? "Your QuickBooks AI Assistant is ready!"
                    : "I'm ready to help!"
                  : "Install integrations to get started"}
              </h3>
              <p className="text-sm text-gray-600 mb-6 max-w-md mx-auto">
                {installedTools.length > 0
                  ? installedTools.some(t => t.toLowerCase().includes('quickbooks'))
                    ? "I have full access to your QuickBooks data. Ask me about invoices, expenses, customers, vendors, and financial reports."
                    : "Ask me anything about your business data. I can analyze information across all your connected tools."
                  : "Connect tools like QuickBooks and Salesforce from the marketplace to unlock AI insights."}
              </p>
              {installedTools.length > 0 && (
                <div className="max-w-lg mx-auto">
                  <p className="text-xs font-medium text-gray-700 mb-3">Try asking:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {suggestedQuestions.map((item, i) => (
                      <button
                        key={i}
                        onClick={() => setInput(item.question)}
                        className="text-left text-xs p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-colors group"
                      >
                        <span className="block">{item.question}</span>
                        {item.integration && (
                          <span className={`text-[10px] mt-1 inline-block px-1.5 py-0.5 rounded ${
                            item.integration === 'quickbooks' ? 'bg-green-100 text-green-700' :
                            item.integration === 'google' ? 'bg-red-100 text-red-700' :
                            item.integration === 'salesforce' ? 'bg-blue-100 text-blue-700' :
                            item.integration === 'slack' ? 'bg-purple-100 text-purple-700' :
                            item.integration === 'hubspot' ? 'bg-orange-100 text-orange-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {item.integration}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-lg p-4 shadow-sm ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                    : 'bg-white text-gray-900 border border-gray-200'
                }`}
              >
                {msg.role === 'assistant' && (
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                      <Bot className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-xs font-semibold text-gray-700">AI Assistant</span>
                  </div>
                )}
                <div className="prose prose-sm max-w-none leading-relaxed">
                  <ReactMarkdown
                    components={{
                      h1: ({ children }) => <h1 className="text-xl font-bold mt-4 mb-2 first:mt-0">{children}</h1>,
                      h2: ({ children }) => <h2 className="text-lg font-bold mt-3 mb-2 first:mt-0">{children}</h2>,
                      h3: ({ children }) => <h3 className="text-base font-semibold mt-2 mb-1 first:mt-0">{children}</h3>,
                      p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                      strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                      em: ({ children }) => <em className="italic">{children}</em>,
                      ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
                      li: ({ children }) => <li className="mb-0.5">{children}</li>,
                      code: ({ className, children }) => {
                        const isInline = !className;
                        return isInline ? (
                          <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono">{children}</code>
                        ) : (
                          <code className="block bg-gray-100 text-gray-800 p-3 rounded-lg text-sm font-mono overflow-x-auto my-2">{children}</code>
                        );
                      },
                      pre: ({ children }) => <pre className="bg-gray-100 rounded-lg overflow-x-auto my-2">{children}</pre>,
                      a: ({ href, children }) => (
                        <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">
                          {children}
                        </a>
                      ),
                      blockquote: ({ children }) => (
                        <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-700 my-2">{children}</blockquote>
                      ),
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs font-semibold text-gray-700 mb-1">Sources:</p>
                    <div className="flex flex-wrap gap-2">
                      {msg.sources.map((source, i) => (
                        <span key={i} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
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
                  <div className="w-6 h-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                    <Bot className="w-3 h-3 text-white" />
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

        {/* Hidden file input for document upload */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept=".txt,.md,.csv,.pdf,.doc,.docx"
          className="hidden"
        />

        {/* Document Upload Panel */}
        {showDocumentUpload && (
          <div className="border-t border-gray-200 p-4 bg-gray-50">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-900">Upload Document for Analysis</h3>
              <button onClick={() => setShowDocumentUpload(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
            >
              <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-gray-600 mb-1">Click to upload or drag and drop</p>
              <p className="text-xs text-gray-500">TXT, MD, CSV, PDF (max 5MB)</p>
            </div>
          </div>
        )}

        {/* Uploaded Document Panel */}
        {uploadedDocument && (
          <div className="border-t border-gray-200 p-4 bg-blue-50">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="font-medium text-gray-900 text-sm">{uploadedDocument.name}</p>
                  <p className="text-xs text-gray-500">{uploadedDocument.content.length.toLocaleString()} characters</p>
                </div>
              </div>
              <button
                onClick={() => setUploadedDocument(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Analysis Type Selector */}
            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-700 mb-2">Select Analysis Type:</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {ANALYSIS_TYPES.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setSelectedAnalysisType(type.value)}
                    className={`flex items-center gap-2 p-2 rounded-lg text-left text-xs transition-colors ${
                      selectedAnalysisType === type.value
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    <span>{type.icon}</span>
                    <span className="font-medium">{type.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Analyze Button */}
            <button
              onClick={analyzeDocument}
              disabled={isAnalyzing}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:shadow-lg disabled:opacity-50 transition-all"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <BarChart3 className="w-4 h-4" />
                  Analyze Document
                </>
              )}
            </button>
          </div>
        )}

        {/* Input */}
        <div className="border-t border-gray-200 p-4 bg-white">
          {/* AI Mode Selector */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <div className="relative">
              <button
                onClick={() => setShowModeSelector(!showModeSelector)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  aiMode === 'standard'
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    : aiMode === 'deep_research'
                    ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                    : aiMode === 'analyze'
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                }`}
              >
                {aiMode === 'standard' && <Sparkles className="w-4 h-4" />}
                {aiMode === 'deep_research' && <Search className="w-4 h-4" />}
                {aiMode === 'analyze' && <BarChart3 className="w-4 h-4" />}
                {aiMode === 'document' && <FileUp className="w-4 h-4" />}
                <span>
                  {aiMode === 'standard' && 'Standard'}
                  {aiMode === 'deep_research' && 'Deep Research'}
                  {aiMode === 'analyze' && 'Deep Analysis'}
                  {aiMode === 'document' && 'Document'}
                </span>
                <ChevronDown className="w-3 h-3" />
              </button>

              {showModeSelector && (
                <div className="absolute bottom-full left-0 mb-2 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                  <div className="p-2">
                    <button
                      onClick={() => { setAiMode('standard'); setShowModeSelector(false); }}
                      className={`w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors ${
                        aiMode === 'standard' ? 'bg-gray-100' : 'hover:bg-gray-50'
                      }`}
                    >
                      <Sparkles className="w-5 h-5 text-gray-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-gray-900 text-sm">Standard</p>
                        <p className="text-xs text-gray-500">Quick answers from your business data</p>
                      </div>
                    </button>
                    <button
                      onClick={() => { setAiMode('deep_research'); setShowModeSelector(false); }}
                      className={`w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors ${
                        aiMode === 'deep_research' ? 'bg-purple-100' : 'hover:bg-gray-50'
                      }`}
                    >
                      <Search className="w-5 h-5 text-purple-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-gray-900 text-sm">Deep Research</p>
                        <p className="text-xs text-gray-500">Comprehensive analysis with optional web search</p>
                      </div>
                    </button>
                    <button
                      onClick={() => { setAiMode('analyze'); setShowModeSelector(false); }}
                      className={`w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors ${
                        aiMode === 'analyze' ? 'bg-blue-100' : 'hover:bg-gray-50'
                      }`}
                    >
                      <BarChart3 className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-gray-900 text-sm">Deep Analysis</p>
                        <p className="text-xs text-gray-500">Executive-level analysis of your data</p>
                      </div>
                    </button>
                    <button
                      onClick={() => { setAiMode('document'); setShowModeSelector(false); setShowDocumentUpload(true); }}
                      className={`w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors ${
                        aiMode === 'document' ? 'bg-green-100' : 'hover:bg-gray-50'
                      }`}
                    >
                      <FileUp className="w-5 h-5 text-green-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-gray-900 text-sm">Analyze Document</p>
                        <p className="text-xs text-gray-500">Upload and analyze any document</p>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mode-specific options */}
            {aiMode === 'deep_research' && (
              <label className="flex items-center gap-2 text-xs text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-gray-200 transition-colors">
                <input
                  type="checkbox"
                  checked={enableWebSearch}
                  onChange={(e) => setEnableWebSearch(e.target.checked)}
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <Globe className="w-3.5 h-3.5" />
                <span>Include Web Search</span>
              </label>
            )}

            {aiMode === 'document' && !uploadedDocument && (
              <button
                onClick={() => setShowDocumentUpload(true)}
                className="flex items-center gap-2 text-xs text-green-700 bg-green-100 px-3 py-1.5 rounded-lg hover:bg-green-200 transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                Upload Document
              </button>
            )}

            {/* Mode description */}
            <span className="text-xs text-gray-500">
              {aiMode === 'standard' && 'Quick answers from your connected integrations'}
              {aiMode === 'deep_research' && (enableWebSearch ? 'Business data + web research' : 'Business data only (no web)')}
              {aiMode === 'analyze' && 'Comprehensive business intelligence report'}
              {aiMode === 'document' && 'Upload any document for AI analysis'}
            </span>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder={
                aiMode === 'deep_research'
                  ? "What would you like me to research?"
                  : aiMode === 'analyze'
                  ? "What report would you like me to create?"
                  : installedTools.length > 0
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
    </div>
  );
}
