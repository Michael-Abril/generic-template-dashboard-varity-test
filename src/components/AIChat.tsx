'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useWallets } from '@privy-io/react-auth';
import { useWalletSync } from '../app/providers';
import { logger } from '@/lib/logger';
import {
  Bot, MessageSquare, Plus, Pin, PinOff, Trash2, Edit2, X, Check, Archive,
  MoreVertical, Sparkles, Search, FileText, ChevronDown, Upload, Download,
  Shield, Lock, Globe, FileUp, Loader2, BarChart3, AlertCircle, Filter, Database,
  Mail, Send, FilePlus, Zap, Calendar, Users, Copy, ThumbsUp, ThumbsDown,
  RefreshCw, Square, RotateCcw, Pencil
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { ContextPicker } from './ai/ContextPicker';
import { SuggestedPrompts } from './ai/SuggestedPrompts';
import { CodeBlock } from './ai/CodeBlock';
import { ProjectSidebar } from './ai/ProjectSidebar';
import { ProjectEditor } from './ai/ProjectEditor';
import { ProjectHeader } from './ai/ProjectHeader';
import { Project, ProjectFile } from '@/types/project';

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

// Action types for AI-driven actions
type ActionType = 'email' | 'document' | 'event';
type ActionProvider = 'google' | 'microsoft';

interface EmailAction {
  type: 'email';
  provider: ActionProvider;
  to: string[];
  cc?: string[];
  subject: string;
  body: string;
}

interface DocumentAction {
  type: 'document';
  provider: ActionProvider;
  title: string;
  content: string;
  folder?: string;
}

interface ActionConfirmation {
  action: EmailAction | DocumentAction;
  status: 'pending' | 'executing' | 'success' | 'error';
  error?: string;
}

interface Message {
  id?: number;
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
  rag_sources?: string[];
  web_sources?: Array<{ title: string; url: string }>;
  context_used?: boolean;  // Whether business data was used in this response
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
  const [isDragging, setIsDragging] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showPrivacyBanner, setShowPrivacyBanner] = useState(true);
  const [selectedIntegration, setSelectedIntegration] = useState<string>('all'); // Integration filter
  const [showIntegrationFilter, setShowIntegrationFilter] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // RAG status state - shows if business data is available
  const [ragStatus, setRagStatus] = useState<{
    dataAvailable: boolean;
    documentCount: number;
    integrations: string[];
    loading: boolean;
  }>({
    dataAvailable: false,
    documentCount: 0,
    integrations: [],
    loading: true
  });

  // Action panel state (for sending emails, creating documents)
  const [showActionPanel, setShowActionPanel] = useState(false);
  const [actionType, setActionType] = useState<ActionType>('email');
  const [actionProvider, setActionProvider] = useState<ActionProvider>('google');
  const [emailTo, setEmailTo] = useState('');
  const [emailCc, setEmailCc] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [docTitle, setDocTitle] = useState('');
  const [docContent, setDocContent] = useState('');
  const [actionConfirmation, setActionConfirmation] = useState<ActionConfirmation | null>(null);
  const [isExecutingAction, setIsExecutingAction] = useState(false);

  // Message actions state
  const [copiedMessageId, setCopiedMessageId] = useState<number | null>(null);
  const [feedbackGiven, setFeedbackGiven] = useState<Record<number, 'up' | 'down'>>({});
  const [editingMessageIdx, setEditingMessageIdx] = useState<number | null>(null);
  const [editedContent, setEditedContent] = useState('');
  const [hoveredMessageIdx, setHoveredMessageIdx] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Context picker state (like Cursor AI - select specific files/emails for context)
  const [showContextPicker, setShowContextPicker] = useState(false);
  const [selectedContextIds, setSelectedContextIds] = useState<string[]>([]);

  // Project state (like Claude Projects - organize conversations with custom instructions)
  const [currentProjectId, setCurrentProjectId] = useState<number | null>(null);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([]);
  const [showProjectEditor, setShowProjectEditor] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectSidebarRefresh, setProjectSidebarRefresh] = useState(0);

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

  // Fetch RAG/pipeline status to show data availability
  useEffect(() => {
    if (!address) {
      setRagStatus(prev => ({ ...prev, loading: false }));
      return;
    }

    fetch(`${API_BASE_URL}/api/v1/ai/debug/pipeline?wallet_address=${encodeURIComponent(address)}`)
      .then(res => {
        if (!res.ok) throw new Error(`Failed to fetch pipeline status: ${res.status}`);
        return res.json();
      })
      .then(data => {
        setRagStatus({
          dataAvailable: data.summary?.data_available || false,
          documentCount: data.qdrant?.document_count || 0,
          integrations: data.pinata?.integrations || [],
          loading: false
        });
      })
      .catch(error => {
        logger.error('Failed to fetch RAG status:', error);
        setRagStatus(prev => ({ ...prev, loading: false }));
      });
  }, [address]);

  // Fetch project details when currentProjectId changes
  useEffect(() => {
    if (!currentProjectId || !address) {
      setCurrentProject(null);
      setProjectFiles([]);
      return;
    }

    const fetchProject = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/v1/projects/${currentProjectId}?wallet_address=${address}`
        );
        if (response.ok) {
          const data = await response.json();
          setCurrentProject(data);
          setProjectFiles(data.files || []);
        }
      } catch (error) {
        logger.error('Failed to fetch project:', error);
      }
    };

    fetchProject();
  }, [currentProjectId, address]);

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
  const createNewConversation = async (initialTitle?: string, projectId?: number | null) => {
    if (!address) return null;

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/conversations/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet_address: address,
          title: initialTitle || 'New Conversation',
          project_id: projectId || currentProjectId || null
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

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    // Check file type
    const allowedTypes = ['text/plain', 'text/markdown', 'application/pdf', 'text/csv', 'application/json', 'text/xml', 'text/html'];
    const allowedExtensions = ['.txt', '.md', '.pdf', '.csv', '.doc', '.docx', '.json', '.xml', '.html'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
      alert('Please upload a supported file type: PDF, Word, text, markdown, CSV, JSON, or XML');
      return;
    }

    try {
      let content: string;
      const isPdfOrDocx = file.type === 'application/pdf' ||
                          fileExtension === '.pdf' ||
                          fileExtension === '.docx' ||
                          file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

      if (isPdfOrDocx) {
        // Upload to backend for extraction
        if (!address) {
          alert('Wallet not connected. Please connect your wallet first.');
          return;
        }

        const formData = new FormData();
        formData.append('file', file);

        const uploadResponse = await fetch(
          `${API_BASE_URL}/api/v1/ai/upload/document?wallet_address=${encodeURIComponent(address)}`,
          {
            method: 'POST',
            body: formData
          }
        );

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json().catch(() => ({ detail: 'Upload failed' }));
          throw new Error(errorData.detail || 'Failed to upload document');
        }

        const uploadData = await uploadResponse.json();
        content = uploadData.content;
        logger.info(`Document extracted: ${uploadData.extraction_method}, ${uploadData.metadata?.char_count} chars`);
      } else {
        // For text files, read directly
        content = await file.text();
      }

      setUploadedDocument({ name: file.name, content });
      setShowDocumentUpload(false);
    } catch (error) {
      logger.error('Failed to process file:', error);
      alert(error instanceof Error ? error.message : 'Failed to process file. Please try again.');
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

  // Prepare action for confirmation
  const prepareAction = () => {
    if (actionType === 'email') {
      if (!emailTo.trim() || !emailSubject.trim()) {
        alert('Please fill in recipient and subject');
        return;
      }
      const action: EmailAction = {
        type: 'email',
        provider: actionProvider,
        to: emailTo.split(',').map(e => e.trim()).filter(e => e),
        cc: emailCc ? emailCc.split(',').map(e => e.trim()).filter(e => e) : undefined,
        subject: emailSubject,
        body: emailBody
      };
      setActionConfirmation({ action, status: 'pending' });
    } else if (actionType === 'document') {
      if (!docTitle.trim()) {
        alert('Please enter a document title');
        return;
      }
      const action: DocumentAction = {
        type: 'document',
        provider: actionProvider,
        title: docTitle,
        content: docContent
      };
      setActionConfirmation({ action, status: 'pending' });
    }
  };

  // Execute the confirmed action
  const executeAction = async () => {
    if (!actionConfirmation || !address) return;

    setIsExecutingAction(true);
    setActionConfirmation(prev => prev ? { ...prev, status: 'executing' } : null);

    try {
      const { action } = actionConfirmation;

      if (action.type === 'email') {
        const endpoint = action.provider === 'google'
          ? `${API_BASE_URL}/api/v1/integrations/google/send-email`
          : `${API_BASE_URL}/api/v1/integrations/microsoft/mail/send`;

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            wallet_address: address,
            to: action.to,
            cc: action.cc,
            subject: action.subject,
            body: action.body
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.detail || `Failed to send email: ${response.statusText}`);
        }

        setActionConfirmation(prev => prev ? { ...prev, status: 'success' } : null);

        // Add success message to chat
        const successMsg: Message = {
          role: 'assistant',
          content: `✅ **Email sent successfully!**\n\n**To:** ${action.to.join(', ')}\n**Subject:** ${action.subject}\n\n*Sent via ${action.provider === 'google' ? 'Gmail' : 'Outlook'}*`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, successMsg]);

        // Clear form
        setTimeout(() => {
          resetActionForm();
        }, 2000);

      } else if (action.type === 'document') {
        const endpoint = action.provider === 'google'
          ? `${API_BASE_URL}/api/v1/integrations/google/upload-file`
          : `${API_BASE_URL}/api/v1/integrations/microsoft/onedrive/upload`;

        // Convert content to base64 for Google, or send directly for Microsoft
        const fileContent = btoa(unescape(encodeURIComponent(action.content)));

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            wallet_address: address,
            file_name: `${action.title}.txt`,
            file_content: fileContent,
            mime_type: 'text/plain',
            name: action.title,
            content: action.content
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.detail || `Failed to create document: ${response.statusText}`);
        }

        setActionConfirmation(prev => prev ? { ...prev, status: 'success' } : null);

        // Add success message to chat
        const successMsg: Message = {
          role: 'assistant',
          content: `✅ **Document created successfully!**\n\n**Title:** ${action.title}\n\n*Saved to ${action.provider === 'google' ? 'Google Drive' : 'OneDrive'}*`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, successMsg]);

        // Clear form
        setTimeout(() => {
          resetActionForm();
        }, 2000);
      }

    } catch (error) {
      logger.error('Action execution error:', error);
      setActionConfirmation(prev => prev ? {
        ...prev,
        status: 'error',
        error: error instanceof Error ? error.message : 'Action failed'
      } : null);
    } finally {
      setIsExecutingAction(false);
    }
  };

  // Reset action form
  const resetActionForm = () => {
    setShowActionPanel(false);
    setActionConfirmation(null);
    setEmailTo('');
    setEmailCc('');
    setEmailSubject('');
    setEmailBody('');
    setDocTitle('');
    setDocContent('');
  };

  // Check if provider is connected
  const isProviderConnected = (provider: string) => {
    return installedTools.some(t => t.toLowerCase().includes(provider.toLowerCase()));
  };

  // Copy message content to clipboard
  const copyMessage = async (content: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(idx);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (error) {
      logger.error('Failed to copy message:', error);
    }
  };

  // Submit feedback for a message
  const submitFeedback = async (idx: number, type: 'up' | 'down') => {
    setFeedbackGiven(prev => ({ ...prev, [idx]: type }));
    // In production, you'd send this to the backend for analytics
    logger.info(`Feedback submitted: message ${idx} - ${type}`);
  };

  // Regenerate the last assistant response
  const regenerateResponse = async () => {
    if (messages.length < 2 || loading) return;

    // Find the last user message
    const lastUserMsgIdx = messages.findLastIndex(m => m.role === 'user');
    if (lastUserMsgIdx === -1) return;

    // Get the message content before modifying state
    const messageToResend = messages[lastUserMsgIdx].content;

    // Remove all messages from the last user message onwards (including both user and assistant)
    setMessages(prev => prev.slice(0, lastUserMsgIdx));

    // Re-send the last user message automatically
    await sendMessage(messageToResend);
  };

  // Edit and resend a user message
  const editAndResend = async (idx: number) => {
    if (loading) return;

    const newContent = editedContent.trim();
    if (!newContent) {
      setEditingMessageIdx(null);
      return;
    }

    // Remove all messages from this point onwards
    setMessages(prev => prev.slice(0, idx));

    // Clear editing state
    setEditingMessageIdx(null);
    setEditedContent('');

    // Re-send with the edited content
    await sendMessage(newContent);
  };

  // Auto-resize textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // Auto-resize
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  // Handle keyboard shortcuts in textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Abort controller for stopping generation
  const abortControllerRef = useRef<AbortController | null>(null);

  // Stop generating response
  const stopGenerating = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setLoading(false);
    }
  };

  // Send message - accepts optional override message for regeneration
  const sendMessage = async (overrideMessage?: string) => {
    const messageContent = (overrideMessage || input).trim();
    if (!messageContent || !address) return;

    // Clear input only if not using override (regeneration case)
    if (!overrideMessage) {
      setInput('');
    }

    const userMessage: Message = {
      role: 'user',
      content: messageContent,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setLoading(true);

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();

    // Create conversation if none exists
    let convId = currentConversationId;
    if (!convId) {
      const newConv = await createNewConversation(messageContent.substring(0, 50));
      if (!newConv) {
        setLoading(false);
        return;
      }
      convId = newConv.id;
    }

    // Request timeout (2 minutes for LLM responses)
    const timeoutId = setTimeout(() => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    }, 120000);

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
        context_used?: boolean;
      };

      // Prepare integration filter (only include if not 'all')
      const integrationFilter = selectedIntegration !== 'all' ? selectedIntegration : undefined;

      // Route to different endpoints based on AI mode
      if (aiMode === 'standard') {
        // Standard mode: Use general chat endpoint (no web search)
        // This provides direct, authoritative Varity Dashboard responses
        const response = await fetch(`${API_BASE_URL}/api/v1/ai/chat/general`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: messageContent,
            wallet_address: address,
            integration: integrationFilter, // Filter to specific integration
            selected_context_ids: selectedContextIds.length > 0 ? selectedContextIds : undefined, // Selected context items
            project_id: currentProjectId || undefined, // Include project context
            temperature: 0.7,
            max_tokens: 2048
          }),
          signal: abortControllerRef.current?.signal
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
            query: messageContent,
            wallet_address: address,
            integration: integrationFilter, // Filter to specific integration
            enable_web_search: enableWebSearch, // User-controlled toggle
            max_rag_results: 5,
            max_search_results: enableWebSearch ? 5 : 0
          }),
          signal: abortControllerRef.current?.signal
        });
        if (!response.ok) throw new Error(`AI request failed: ${response.statusText}`);
        responseData = await response.json();

      } else if (aiMode === 'analyze') {
        // Deep Analysis mode: Use research endpoint for comprehensive analysis
        // without web search, focused on business data analysis
        const response = await fetch(`${API_BASE_URL}/api/v1/ai/research`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: messageContent,
            wallet_address: address,
            integration: integrationFilter, // Filter to specific integration
            depth: 'comprehensive'
          }),
          signal: abortControllerRef.current?.signal
        });
        if (!response.ok) throw new Error(`AI request failed: ${response.statusText}`);
        responseData = await response.json();

      } else {
        // Fallback to standard mode
        const response = await fetch(`${API_BASE_URL}/api/v1/ai/chat/general`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: messageContent,
            wallet_address: address,
            integration: integrationFilter
          }),
          signal: abortControllerRef.current?.signal
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
        context_used: responseData.context_used || ((responseData.rag_sources?.length ?? 0) > 0),
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Save assistant message
      await addMessageToConversation(convId, assistantMessage);
    } catch (error) {
      // Handle abort/cancellation gracefully
      if (error instanceof Error && error.name === 'AbortError') {
        const abortMsg: Message = {
          role: 'assistant',
          content: '*Response generation was stopped.*',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, abortMsg]);
        return;
      }

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
      clearTimeout(timeoutId);
      abortControllerRef.current = null;
      setLoading(false);
    }
  };

  // Start new chat
  const startNewChat = (projectId?: number | null) => {
    setCurrentConversationId(null);
    setMessages([]);
    // If projectId is explicitly passed, use it; otherwise keep current project
    if (projectId !== undefined) {
      setCurrentProjectId(projectId);
    }
  };

  // Project handlers
  const handleSelectProject = (projectId: number | null) => {
    setCurrentProjectId(projectId);
    setCurrentConversationId(null);
    setMessages([]);
  };

  const handleSelectConversation = (conversationId: number | null, projectId: number | null) => {
    setCurrentProjectId(projectId);
    if (conversationId) {
      loadConversation(conversationId);
    } else {
      setCurrentConversationId(null);
      setMessages([]);
    }
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setShowProjectEditor(true);
  };

  const handleNewProject = () => {
    setEditingProject(null);
    setShowProjectEditor(true);
  };

  const handleProjectSaved = (project: Project) => {
    setProjectSidebarRefresh(prev => prev + 1);
    if (editingProject) {
      // If editing current project, update it
      if (currentProjectId === project.id) {
        setCurrentProject(project);
      }
    } else {
      // New project - select it
      setCurrentProjectId(project.id);
      setCurrentProject(project);
    }
  };

  const handleCloseProject = () => {
    setCurrentProjectId(null);
    setCurrentProject(null);
    setProjectFiles([]);
    setCurrentConversationId(null);
    setMessages([]);
  };

  // Integration-specific suggested questions - mode aware
  const getIntegrationQuestions = () => {
    const questions: { question: string; integration?: string; category?: string; icon?: string }[] = [];

    // Mode-specific base templates
    if (aiMode === 'deep_research') {
      questions.push(
        { question: "Research industry trends affecting my business", category: "research", icon: "🔍" },
        { question: "What are best practices for improving cash flow?", category: "research", icon: "📚" }
      );
    } else if (aiMode === 'analyze') {
      questions.push(
        { question: "Create a comprehensive business health report", category: "analysis", icon: "📊" },
        { question: "Analyze my revenue trends and forecast next quarter", category: "analysis", icon: "📈" }
      );
    }

    // QuickBooks-specific questions
    if (installedTools.some(t => t.toLowerCase().includes('quickbooks'))) {
      if (aiMode === 'standard') {
        questions.push(
          { question: "Show my overdue invoices", integration: "quickbooks", icon: "📄" },
          { question: "What's my accounts receivable balance?", integration: "quickbooks", icon: "💰" },
          { question: "Who are my top 5 customers by revenue?", integration: "quickbooks", icon: "🏆" },
          { question: "What expenses are due this week?", integration: "quickbooks", icon: "📅" }
        );
      } else if (aiMode === 'analyze') {
        questions.push(
          { question: "Create a P&L analysis with insights", integration: "quickbooks", icon: "📊" },
          { question: "Analyze my cash flow patterns and predict shortfalls", integration: "quickbooks", icon: "💹" },
          { question: "Generate an expense optimization report", integration: "quickbooks", icon: "✂️" }
        );
      } else if (aiMode === 'deep_research') {
        questions.push(
          { question: "Research tax strategies for my business type", integration: "quickbooks", icon: "🔍" },
          { question: "How does my profit margin compare to industry average?", integration: "quickbooks", icon: "📊" }
        );
      }
    }

    // Google Workspace questions
    if (installedTools.some(t => t.toLowerCase().includes('google'))) {
      questions.push(
        { question: "What meetings do I have today?", integration: "google", icon: "📆" },
        { question: "Show unread emails from this week", integration: "google", icon: "📧" },
        { question: "Find documents shared with me recently", integration: "google", icon: "📁" }
      );
    }

    // Microsoft 365 questions
    if (installedTools.some(t => t.toLowerCase().includes('microsoft'))) {
      questions.push(
        { question: "Show my calendar for this week", integration: "microsoft", icon: "📅" },
        { question: "What Teams messages need my attention?", integration: "microsoft", icon: "💬" },
        { question: "List my recent OneDrive documents", integration: "microsoft", icon: "📂" }
      );
    }

    // Salesforce questions
    if (installedTools.some(t => t.toLowerCase().includes('salesforce'))) {
      if (aiMode === 'standard') {
        questions.push(
          { question: "Show my open deals by stage", integration: "salesforce", icon: "🎯" },
          { question: "What leads were created this week?", integration: "salesforce", icon: "👤" },
          { question: "Who are my hottest opportunities?", integration: "salesforce", icon: "🔥" }
        );
      } else if (aiMode === 'analyze') {
        questions.push(
          { question: "Analyze my sales pipeline health", integration: "salesforce", icon: "📊" },
          { question: "Forecast my quota attainment this quarter", integration: "salesforce", icon: "📈" }
        );
      }
    }

    // Slack questions
    if (installedTools.some(t => t.toLowerCase().includes('slack'))) {
      questions.push(
        { question: "Show recent important messages", integration: "slack", icon: "💬" },
        { question: "What channels am I most active in?", integration: "slack", icon: "📊" },
        { question: "Summarize key discussions from today", integration: "slack", icon: "📝" }
      );
    }

    // HubSpot questions
    if (installedTools.some(t => t.toLowerCase().includes('hubspot'))) {
      if (aiMode === 'standard') {
        questions.push(
          { question: "Show my deal pipeline", integration: "hubspot", icon: "🎯" },
          { question: "What contacts were added recently?", integration: "hubspot", icon: "👥" }
        );
      } else if (aiMode === 'analyze') {
        questions.push(
          { question: "Analyze my marketing campaign performance", integration: "hubspot", icon: "📊" },
          { question: "Create a lead quality report", integration: "hubspot", icon: "📋" }
        );
      }
    }

    // Default questions if no specific integrations
    if (questions.length === 0) {
      if (aiMode === 'deep_research') {
        questions.push(
          { question: "Research strategies to improve my business efficiency", icon: "🔍" },
          { question: "What industry trends should I be aware of?", icon: "📈" }
        );
      } else if (aiMode === 'analyze') {
        questions.push(
          { question: "What metrics should I track for business growth?", icon: "📊" },
          { question: "Analyze common business performance indicators", icon: "📋" }
        );
      } else {
        questions.push(
          { question: "What can you help me with?", icon: "💡" },
          { question: "How do I connect my business tools?", icon: "🔗" }
        );
      }
    }

    // Shuffle and return max 6 questions, prioritizing mode-relevant ones
    return questions.slice(0, 6);
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
      {/* Project Editor Modal */}
      <ProjectEditor
        isOpen={showProjectEditor}
        onClose={() => {
          setShowProjectEditor(false);
          setEditingProject(null);
        }}
        walletAddress={address}
        project={editingProject}
        onSave={handleProjectSaved}
      />

      {/* Sidebar - Projects + Conversations */}
      {showSidebar && (
        <ProjectSidebar
          walletAddress={address}
          currentConversationId={currentConversationId}
          currentProjectId={currentProjectId}
          onSelectConversation={handleSelectConversation}
          onSelectProject={handleSelectProject}
          onNewChat={startNewChat}
          onEditProject={handleEditProject}
          onNewProject={handleNewProject}
          refreshTrigger={projectSidebarRefresh}
        />
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header - Brand Colors */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
              >
                <MessageSquare className="w-4 h-4 text-white/70" />
              </button>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-white font-semibold text-sm">AI Assistant</h2>
                  {installedTools.length > 0 && (
                    <div className="flex items-center gap-1 mt-0.5">
                      {installedTools.slice(0, 4).map((tool, i) => (
                        <div
                          key={i}
                          className="w-4 h-4 rounded bg-white/10 flex items-center justify-center"
                          title={tool}
                        >
                          <span className="text-[8px] font-bold text-white/80">{tool.charAt(0).toUpperCase()}</span>
                        </div>
                      ))}
                      {installedTools.length > 4 && (
                        <span className="text-[10px] text-white/50">+{installedTools.length - 4}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Header Actions - Compact Icons */}
            <div className="flex items-center gap-1">
              {/* Privacy Indicator - Icon only with tooltip */}
              <div className="relative group">
                <div className="p-1.5 rounded-md bg-white/5">
                  <Shield className="w-3.5 h-3.5 text-green-400" />
                </div>
                <div className="absolute bottom-full right-0 mb-1.5 px-2 py-1 bg-gray-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
                  On-Chain Secure
                </div>
              </div>

              {/* Data Status - Icon only with tooltip */}
              {!ragStatus.loading && (
                <div className="relative group">
                  <div className={`p-1.5 rounded-md ${ragStatus.dataAvailable ? 'bg-green-500/10' : 'bg-yellow-500/10'}`}>
                    <Database className={`w-3.5 h-3.5 ${ragStatus.dataAvailable ? 'text-green-400' : 'text-yellow-400'}`} />
                  </div>
                  <div className="absolute bottom-full right-0 mb-1.5 px-2 py-1 bg-gray-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
                    {ragStatus.dataAvailable ? `${ragStatus.documentCount} docs indexed` : 'No data synced'}
                  </div>
                </div>
              )}

              {/* Actions Button - Icon only */}
              {(isProviderConnected('google') || isProviderConnected('microsoft')) && (
                <div className="relative group">
                  <button
                    onClick={() => setShowActionPanel(!showActionPanel)}
                    className={`p-1.5 rounded-md transition-colors ${
                      showActionPanel ? 'bg-orange-500/20 text-orange-400' : 'bg-white/5 text-white/70 hover:bg-white/10'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5" />
                  </button>
                  <div className="absolute bottom-full right-0 mb-1.5 px-2 py-1 bg-gray-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
                    Actions
                  </div>
                </div>
              )}

              {/* Export Button - Icon only */}
              <div className="relative group">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="p-1.5 hover:bg-white/10 rounded-md transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-white/70" />
                </button>
                <div className="absolute bottom-full right-0 mb-1.5 px-2 py-1 bg-gray-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
                  Export
                </div>
                {showExportMenu && (
                  <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-30">
                    <button
                      onClick={() => exportConversation('markdown')}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                    >
                      <FileText className="w-3.5 h-3.5" /> Markdown
                    </button>
                    <button
                      onClick={() => exportConversation('json')}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                    >
                      <BarChart3 className="w-3.5 h-3.5" /> JSON
                    </button>
                    <button
                      onClick={() => exportConversation('pdf')}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-400 cursor-not-allowed"
                    >
                      <FileUp className="w-3.5 h-3.5" /> PDF
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Privacy Banner - Subtle */}
        {showPrivacyBanner && (
          <div className="bg-gray-50 border-b border-gray-100 px-4 py-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-3 h-3 text-green-600" />
                <span className="text-[10px] text-gray-500">
                  Your data is encrypted and stored on Filecoin/IPFS
                </span>
              </div>
              <button
                onClick={() => setShowPrivacyBanner(false)}
                className="p-0.5 hover:bg-gray-200 rounded"
              >
                <X className="w-3 h-3 text-gray-400" />
              </button>
            </div>
          </div>
        )}

        {/* Project Header - Shows when a project is selected */}
        {currentProject && (
          <ProjectHeader
            project={currentProject}
            files={projectFiles}
            onEdit={() => handleEditProject(currentProject)}
            onClose={handleCloseProject}
          />
        )}

        {/* Action Panel - Compose Email or Create Document */}
        {showActionPanel && (
          <div className="bg-white border-b border-gray-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-orange-500" />
                  AI Actions
                </h3>
                {/* Action Type Tabs */}
                <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                  <button
                    onClick={() => setActionType('email')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      actionType === 'email' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Mail className="w-3.5 h-3.5" /> Send Email
                  </button>
                  <button
                    onClick={() => setActionType('document')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      actionType === 'document' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <FilePlus className="w-3.5 h-3.5" /> Create Document
                  </button>
                </div>
              </div>
              <button onClick={() => setShowActionPanel(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {/* Provider Selection */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs text-gray-600">Send via:</span>
              {isProviderConnected('google') && (
                <button
                  onClick={() => setActionProvider('google')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    actionProvider === 'google' ? 'bg-red-100 text-red-700 ring-1 ring-red-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {actionType === 'email' ? 'Gmail' : 'Google Drive'}
                </button>
              )}
              {isProviderConnected('microsoft') && (
                <button
                  onClick={() => setActionProvider('microsoft')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    actionProvider === 'microsoft' ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {actionType === 'email' ? 'Outlook' : 'OneDrive'}
                </button>
              )}
            </div>

            {/* Email Form */}
            {actionType === 'email' && (
              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-700 mb-1">To *</label>
                    <input
                      type="text"
                      value={emailTo}
                      onChange={(e) => setEmailTo(e.target.value)}
                      placeholder="email@example.com (comma-separated for multiple)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="w-48">
                    <label className="block text-xs font-medium text-gray-700 mb-1">CC</label>
                    <input
                      type="text"
                      value={emailCc}
                      onChange={(e) => setEmailCc(e.target.value)}
                      placeholder="cc@example.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Subject *</label>
                  <input
                    type="text"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    placeholder="Email subject"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Body</label>
                  <textarea
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    placeholder="Write your email content here... You can also ask the AI to draft this for you!"
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  />
                </div>
              </div>
            )}

            {/* Document Form */}
            {actionType === 'document' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Document Title *</label>
                  <input
                    type="text"
                    value={docTitle}
                    onChange={(e) => setDocTitle(e.target.value)}
                    placeholder="My Document"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Content</label>
                  <textarea
                    value={docContent}
                    onChange={(e) => setDocContent(e.target.value)}
                    placeholder="Document content... You can also ask the AI to generate this for you!"
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  />
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                {actionType === 'email' ? 'Email will be sent from your connected account' : 'Document will be saved to your cloud drive'}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={resetActionForm}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={prepareAction}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all"
                >
                  <Send className="w-4 h-4" />
                  {actionType === 'email' ? 'Preview & Send' : 'Preview & Save'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Action Confirmation Modal */}
        {actionConfirmation && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  {actionConfirmation.action.type === 'email' ? (
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <Mail className="w-5 h-5 text-blue-600" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                      <FilePlus className="w-5 h-5 text-green-600" />
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {actionConfirmation.status === 'success' ? 'Success!' :
                       actionConfirmation.status === 'error' ? 'Action Failed' :
                       actionConfirmation.status === 'executing' ? 'Executing...' :
                       `Confirm ${actionConfirmation.action.type === 'email' ? 'Email' : 'Document'}`}
                    </h3>
                    <p className="text-sm text-gray-500">
                      via {actionConfirmation.action.provider === 'google' ?
                        (actionConfirmation.action.type === 'email' ? 'Gmail' : 'Google Drive') :
                        (actionConfirmation.action.type === 'email' ? 'Outlook' : 'OneDrive')}
                    </p>
                  </div>
                </div>

                {/* Preview Content */}
                {actionConfirmation.status === 'pending' && (
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    {actionConfirmation.action.type === 'email' && (
                      <div className="space-y-2 text-sm">
                        <div><span className="font-medium text-gray-700">To:</span> <span className="text-gray-600">{actionConfirmation.action.to.join(', ')}</span></div>
                        {actionConfirmation.action.cc && actionConfirmation.action.cc.length > 0 && (
                          <div><span className="font-medium text-gray-700">CC:</span> <span className="text-gray-600">{actionConfirmation.action.cc.join(', ')}</span></div>
                        )}
                        <div><span className="font-medium text-gray-700">Subject:</span> <span className="text-gray-600">{actionConfirmation.action.subject}</span></div>
                        <div className="pt-2 border-t border-gray-200 mt-2">
                          <span className="font-medium text-gray-700">Body:</span>
                          <p className="text-gray-600 mt-1 whitespace-pre-wrap">{actionConfirmation.action.body || '(No content)'}</p>
                        </div>
                      </div>
                    )}
                    {actionConfirmation.action.type === 'document' && (
                      <div className="space-y-2 text-sm">
                        <div><span className="font-medium text-gray-700">Title:</span> <span className="text-gray-600">{actionConfirmation.action.title}</span></div>
                        <div className="pt-2 border-t border-gray-200 mt-2">
                          <span className="font-medium text-gray-700">Content:</span>
                          <p className="text-gray-600 mt-1 whitespace-pre-wrap max-h-40 overflow-y-auto">{actionConfirmation.action.content || '(Empty document)'}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Status Messages */}
                {actionConfirmation.status === 'executing' && (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <span className="ml-3 text-gray-600">Executing action...</span>
                  </div>
                )}

                {actionConfirmation.status === 'success' && (
                  <div className="flex items-center gap-3 py-4 text-green-700 bg-green-50 rounded-lg px-4">
                    <Check className="w-5 h-5" />
                    <span>{actionConfirmation.action.type === 'email' ? 'Email sent successfully!' : 'Document created successfully!'}</span>
                  </div>
                )}

                {actionConfirmation.status === 'error' && (
                  <div className="flex items-start gap-3 py-4 text-red-700 bg-red-50 rounded-lg px-4">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <span>{actionConfirmation.error || 'An error occurred'}</span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                  {actionConfirmation.status === 'pending' && (
                    <>
                      <button
                        onClick={() => setActionConfirmation(null)}
                        className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={executeAction}
                        disabled={isExecutingAction}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all disabled:opacity-50"
                      >
                        <Send className="w-4 h-4" />
                        {actionConfirmation.action.type === 'email' ? 'Send Email' : 'Create Document'}
                      </button>
                    </>
                  )}
                  {(actionConfirmation.status === 'success' || actionConfirmation.status === 'error') && (
                    <button
                      onClick={() => {
                        if (actionConfirmation.status === 'success') {
                          resetActionForm();
                        } else {
                          setActionConfirmation(prev => prev ? { ...prev, status: 'pending' } : null);
                        }
                      }}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                    >
                      {actionConfirmation.status === 'success' ? 'Done' : 'Try Again'}
                    </button>
                  )}
                </div>
              </div>
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
                  {/* For standard mode, use backend-driven suggested prompts */}
                  {aiMode === 'standard' && address ? (
                    <SuggestedPrompts
                      walletAddress={address}
                      onPromptClick={(prompt) => setInput(prompt)}
                    />
                  ) : (
                    <>
                      <p className="text-xs font-medium text-gray-700 mb-3">
                        {aiMode === 'deep_research' ? 'Research prompts:' :
                         aiMode === 'analyze' ? 'Analysis prompts:' :
                         aiMode === 'document' ? 'Document prompts:' :
                         'Try asking:'}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {suggestedQuestions.map((item, i) => (
                          <button
                            key={i}
                            onClick={() => setInput(item.question)}
                            className="text-left text-xs p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-colors group flex items-start gap-2"
                          >
                            {item.icon && <span className="text-base flex-shrink-0">{item.icon}</span>}
                            <div className="flex-1">
                              <span className="block leading-snug">{item.question}</span>
                              {item.integration && (
                                <span className={`text-[10px] mt-1 inline-block px-1.5 py-0.5 rounded ${
                                  item.integration === 'quickbooks' ? 'bg-green-100 text-green-700' :
                                  item.integration === 'google' ? 'bg-red-100 text-red-700' :
                                  item.integration === 'microsoft' ? 'bg-blue-100 text-blue-700' :
                                  item.integration === 'salesforce' ? 'bg-sky-100 text-sky-700' :
                                  item.integration === 'slack' ? 'bg-purple-100 text-purple-700' :
                                  item.integration === 'hubspot' ? 'bg-orange-100 text-orange-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {item.integration}
                                </span>
                              )}
                              {item.category && !item.integration && (
                                <span className={`text-[10px] mt-1 inline-block px-1.5 py-0.5 rounded ${
                                  item.category === 'research' ? 'bg-purple-100 text-purple-700' :
                                  item.category === 'analysis' ? 'bg-blue-100 text-blue-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {item.category}
                                </span>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`group flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              onMouseEnter={() => setHoveredMessageIdx(idx)}
              onMouseLeave={() => setHoveredMessageIdx(null)}
            >
              <div className={`relative max-w-[85%] ${msg.role === 'user' ? 'flex flex-col items-end' : ''}`}>
                {/* User message with edit mode */}
                {msg.role === 'user' && editingMessageIdx === idx ? (
                  <div className="w-full">
                    <textarea
                      value={editedContent}
                      onChange={(e) => setEditedContent(e.target.value)}
                      className="w-full p-4 rounded-lg bg-white border-2 border-blue-500 text-gray-900 resize-none focus:outline-none"
                      rows={3}
                      autoFocus
                    />
                    <div className="flex justify-end gap-2 mt-2">
                      <button
                        onClick={() => setEditingMessageIdx(null)}
                        className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => editAndResend(idx)}
                        className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Save & Resend
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    className={`rounded-xl p-3 transition-all ${
                      msg.role === 'user'
                        ? 'bg-slate-800 text-white'
                        : 'bg-gray-50 text-gray-900'
                    }`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-500 rounded-md flex items-center justify-center">
                          <Bot className="w-3.5 h-3.5 text-white" />
                        </div>
                        <span className="text-sm font-medium text-gray-700">Assistant</span>
                        {msg.context_used && (
                          <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded flex items-center gap-1">
                            <Database className="w-3 h-3" />
                            Using data
                          </span>
                        )}
                      </div>
                    )}
                    <div className={`prose prose-base max-w-none leading-relaxed ${msg.role === 'user' ? 'prose-invert' : ''}`}>
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
                              <code className={`px-1.5 py-0.5 rounded text-sm font-mono ${msg.role === 'user' ? 'bg-white/15 text-white' : 'bg-gray-200/60 text-gray-700'}`}>{children}</code>
                            ) : (
                              <code className="block bg-gray-100 text-gray-700 p-3 rounded-lg text-sm font-mono overflow-x-auto my-2">{children}</code>
                            );
                          },
                          pre: ({ children, className }) => (
                            <CodeBlock className={className}>
                              {children}
                            </CodeBlock>
                          ),
                          a: ({ href, children }) => (
                            <a href={href} target="_blank" rel="noopener noreferrer" className={`underline ${msg.role === 'user' ? 'text-white hover:text-white/80' : 'text-blue-600 hover:text-blue-800'}`}>
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
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs text-gray-500">Sources:</span>
                          {msg.sources.map((source, i) => (
                            <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                              {source}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Message action buttons */}
                {editingMessageIdx !== idx && (
                  <div
                    className={`flex items-center gap-1 mt-1.5 transition-opacity duration-200 ${
                      hoveredMessageIdx === idx ? 'opacity-100' : 'opacity-0'
                    } ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {/* Copy button */}
                    <button
                      onClick={() => copyMessage(msg.content, idx)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        copiedMessageId === idx
                          ? 'bg-green-100 text-green-600'
                          : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'
                      }`}
                      title={copiedMessageId === idx ? 'Copied!' : 'Copy message'}
                    >
                      {copiedMessageId === idx ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>

                    {/* Edit button for user messages */}
                    {msg.role === 'user' && (
                      <button
                        onClick={() => {
                          setEditingMessageIdx(idx);
                          setEditedContent(msg.content);
                        }}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                        title="Edit message"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Feedback buttons for assistant messages */}
                    {msg.role === 'assistant' && (
                      <>
                        <button
                          onClick={() => submitFeedback(idx, 'up')}
                          className={`p-1.5 rounded-lg transition-colors ${
                            feedbackGiven[idx] === 'up'
                              ? 'bg-green-100 text-green-600'
                              : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'
                          }`}
                          title="Good response"
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => submitFeedback(idx, 'down')}
                          className={`p-1.5 rounded-lg transition-colors ${
                            feedbackGiven[idx] === 'down'
                              ? 'bg-red-100 text-red-600'
                              : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'
                          }`}
                          title="Poor response"
                        >
                          <ThumbsDown className="w-3.5 h-3.5" />
                        </button>

                        {/* Regenerate button (only on last assistant message) */}
                        {idx === messages.length - 1 && (
                          <button
                            onClick={regenerateResponse}
                            disabled={loading}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                            title="Regenerate response"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Quick Actions - Send as Email */}
                        {(isProviderConnected('google') || isProviderConnected('microsoft')) && (
                          <button
                            onClick={() => {
                              setActionType('email');
                              setEmailBody(msg.content);
                              setEmailSubject('AI Assistant Response');
                              setShowActionPanel(true);
                            }}
                            className="p-1.5 rounded-lg hover:bg-blue-100 text-gray-400 hover:text-blue-600 transition-colors"
                            title="Send as email"
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Quick Actions - Save as Document */}
                        {(isProviderConnected('google') || isProviderConnected('microsoft')) && (
                          <button
                            onClick={() => {
                              setActionType('document');
                              setDocContent(msg.content);
                              setDocTitle(`AI Response - ${new Date().toLocaleDateString()}`);
                              setShowActionPanel(true);
                            }}
                            className="p-1.5 rounded-lg hover:bg-green-100 text-gray-400 hover:text-green-600 transition-colors"
                            title="Save as document"
                          >
                            <FilePlus className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </>
                    )}

                    {/* Timestamp */}
                    <span className="text-[10px] text-gray-400 ml-1">
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center shadow-sm">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex space-x-1.5">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                    </div>
                    <span className="text-sm text-gray-500">Thinking...</span>
                  </div>
                </div>
                {/* Stop button */}
                <button
                  onClick={stopGenerating}
                  className="mt-3 flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors w-full justify-center"
                >
                  <Square className="w-3.5 h-3.5" fill="currentColor" />
                  Stop generating
                </button>
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
          accept=".txt,.md,.csv,.pdf,.doc,.docx,.json,.xml,.html"
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
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(false);
                const file = e.dataTransfer.files[0];
                if (file) {
                  // Create a synthetic event to pass to handleFileUpload
                  const syntheticEvent = {
                    target: { files: [file] }
                  } as unknown as React.ChangeEvent<HTMLInputElement>;
                  handleFileUpload(syntheticEvent);
                }
              }}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragging
                  ? 'border-blue-500 bg-blue-100'
                  : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
              }`}
            >
              <Upload className={`w-10 h-10 mx-auto mb-3 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`} />
              <p className="text-sm text-gray-600 mb-1">
                {isDragging ? 'Drop file here' : 'Click to upload or drag and drop'}
              </p>
              <p className="text-xs text-gray-500">TXT, MD, CSV, PDF, DOCX (max 10MB)</p>
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
        <div className="border-t border-gray-200 p-4 pb-8 bg-white">
          {/* AI Mode Selector - Minimal Icon-based */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <div className="relative group">
              <button
                onClick={() => setShowModeSelector(!showModeSelector)}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                  aiMode === 'standard'
                    ? 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    : aiMode === 'deep_research'
                    ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                    : aiMode === 'analyze'
                    ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                    : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                }`}
              >
                {aiMode === 'standard' && <Sparkles className="w-3.5 h-3.5" />}
                {aiMode === 'deep_research' && <Search className="w-3.5 h-3.5" />}
                {aiMode === 'analyze' && <BarChart3 className="w-3.5 h-3.5" />}
                {aiMode === 'document' && <FileUp className="w-3.5 h-3.5" />}
                <ChevronDown className="w-3 h-3 opacity-50" />
              </button>
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
                {aiMode === 'standard' && 'Standard Mode'}
                {aiMode === 'deep_research' && 'Deep Research'}
                {aiMode === 'analyze' && 'Deep Analysis'}
                {aiMode === 'document' && 'Document Mode'}
              </div>

              {showModeSelector && (
                <div className="absolute bottom-full left-0 mb-2 w-56 bg-white border border-gray-200 rounded-lg shadow-xl z-30">
                  <div className="p-1.5">
                    <button
                      onClick={() => { setAiMode('standard'); setShowModeSelector(false); }}
                      className={`w-full flex items-start gap-2.5 px-3 py-2.5 rounded-md text-left transition-colors ${
                        aiMode === 'standard' ? 'bg-gray-100' : 'hover:bg-gray-50'
                      }`}
                    >
                      <Sparkles className="w-4 h-4 text-gray-500 mt-0.5" />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-700">Standard</span>
                        <p className="text-xs text-gray-400">Quick answers from your data</p>
                      </div>
                      {aiMode === 'standard' && <Check className="w-4 h-4 text-gray-500 mt-0.5" />}
                    </button>
                    <button
                      onClick={() => { setAiMode('deep_research'); setShowModeSelector(false); }}
                      className={`w-full flex items-start gap-2.5 px-3 py-2.5 rounded-md text-left transition-colors ${
                        aiMode === 'deep_research' ? 'bg-purple-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <Search className="w-4 h-4 text-purple-500 mt-0.5" />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-700">Deep Research</span>
                        <p className="text-xs text-gray-400">Your data + web search</p>
                      </div>
                      {aiMode === 'deep_research' && <Check className="w-4 h-4 text-purple-500 mt-0.5" />}
                    </button>
                    <button
                      onClick={() => { setAiMode('analyze'); setShowModeSelector(false); }}
                      className={`w-full flex items-start gap-2.5 px-3 py-2.5 rounded-md text-left transition-colors ${
                        aiMode === 'analyze' ? 'bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <BarChart3 className="w-4 h-4 text-blue-500 mt-0.5" />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-700">Deep Analysis</span>
                        <p className="text-xs text-gray-400">Create reports & summaries</p>
                      </div>
                      {aiMode === 'analyze' && <Check className="w-4 h-4 text-blue-500 mt-0.5" />}
                    </button>
                    <button
                      onClick={() => { setAiMode('document'); setShowModeSelector(false); setShowDocumentUpload(true); }}
                      className={`w-full flex items-start gap-2.5 px-3 py-2.5 rounded-md text-left transition-colors ${
                        aiMode === 'document' ? 'bg-green-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <FileUp className="w-4 h-4 text-green-500 mt-0.5" />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-700">Document</span>
                        <p className="text-xs text-gray-400">Upload & analyze files</p>
                      </div>
                      {aiMode === 'document' && <Check className="w-4 h-4 text-green-500 mt-0.5" />}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mode-specific options */}
            {aiMode === 'deep_research' && (
              <label className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 border border-gray-200 px-2.5 py-1.5 rounded-md cursor-pointer hover:bg-gray-100 transition-colors">
                <input
                  type="checkbox"
                  checked={enableWebSearch}
                  onChange={(e) => setEnableWebSearch(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <Globe className="w-3.5 h-3.5" />
                <span>Web Search</span>
              </label>
            )}

            {aiMode === 'document' && !uploadedDocument && (
              <button
                onClick={() => setShowDocumentUpload(true)}
                className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 border border-green-200 px-2.5 py-1.5 rounded-md hover:bg-green-100 transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                Upload
              </button>
            )}

            {/* Integration Filter */}
            {aiMode !== 'document' && installedTools.length > 0 && (
              <div className="relative group">
                <button
                  onClick={() => setShowIntegrationFilter(!showIntegrationFilter)}
                  className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md transition-colors border ${
                    selectedIntegration !== 'all'
                      ? 'bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100'
                      : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <Filter className="w-3.5 h-3.5" />
                  {selectedIntegration !== 'all' && <span className="capitalize">{selectedIntegration}</span>}
                  <ChevronDown className="w-3 h-3 opacity-50" />
                </button>
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
                  {selectedIntegration === 'all' ? 'All Integrations' : `${selectedIntegration} only`}
                </div>

                {showIntegrationFilter && (
                  <div className="absolute bottom-full left-0 mb-2 w-44 bg-white border border-gray-200 rounded-lg shadow-xl z-30">
                    <div className="p-1.5">
                      <button
                        onClick={() => { setSelectedIntegration('all'); setShowIntegrationFilter(false); }}
                        className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-left transition-colors ${
                          selectedIntegration === 'all' ? 'bg-gray-100' : 'hover:bg-gray-50'
                        }`}
                      >
                        <Database className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-700">All Data</span>
                        {selectedIntegration === 'all' && <Check className="w-3.5 h-3.5 text-gray-500 ml-auto" />}
                      </button>
                      {installedTools.map((tool) => (
                        <button
                          key={tool}
                          onClick={() => { setSelectedIntegration(tool); setShowIntegrationFilter(false); }}
                          className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-left transition-colors ${
                            selectedIntegration === tool ? 'bg-orange-50' : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className="w-4 h-4 rounded bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                            <span className="text-[8px] font-bold text-white">{tool.charAt(0).toUpperCase()}</span>
                          </div>
                          <span className="text-sm text-gray-700 capitalize">{tool}</span>
                          {selectedIntegration === tool && <Check className="w-3.5 h-3.5 text-orange-500 ml-auto" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Context Picker Toggle */}
            {aiMode !== 'document' && ragStatus.dataAvailable && (
              <div className="relative group">
                <button
                  onClick={() => setShowContextPicker(!showContextPicker)}
                  className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md transition-colors border ${
                    selectedContextIds.length > 0
                      ? 'bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-100'
                      : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <Database className="w-3.5 h-3.5" />
                  {selectedContextIds.length > 0 && <span>{selectedContextIds.length}</span>}
                </button>
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
                  {selectedContextIds.length > 0 ? `${selectedContextIds.length} items selected` : 'Select Context'}
                </div>
              </div>
            )}

            {/* Mode description */}
            <span className="text-xs text-gray-400 hidden sm:inline ml-auto">
              {aiMode === 'standard' && (
                selectedContextIds.length > 0
                  ? `Using ${selectedContextIds.length} selected item${selectedContextIds.length > 1 ? 's' : ''}`
                  : selectedIntegration !== 'all'
                  ? `Querying ${selectedIntegration} data only`
                  : 'Quick answers from your connected integrations'
              )}
              {aiMode === 'deep_research' && (
                selectedIntegration !== 'all'
                  ? `${selectedIntegration} data ${enableWebSearch ? '+ web research' : 'only'}`
                  : enableWebSearch ? 'Business data + web research' : 'Business data only (no web)'
              )}
              {aiMode === 'analyze' && (
                selectedIntegration !== 'all'
                  ? `Deep analysis of ${selectedIntegration} data`
                  : 'Comprehensive business intelligence report'
              )}
              {aiMode === 'document' && 'Upload any document for AI analysis'}
            </span>
          </div>

          {/* Context Picker Modal */}
          {showContextPicker && address && (
            <div className="mb-4">
              <ContextPicker
                walletAddress={address}
                selectedIds={selectedContextIds}
                onSelectionChange={setSelectedContextIds}
                onClose={() => setShowContextPicker(false)}
                maxSelections={10}
              />
            </div>
          )}

          {/* Minimal input area */}
          <div className="relative bg-gray-50 border border-gray-200 rounded-xl focus-within:ring-1 focus-within:ring-gray-300 focus-within:border-gray-300 transition-all">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder={
                aiMode === 'deep_research'
                  ? "What would you like to research?"
                  : aiMode === 'analyze'
                  ? "What report would you like?"
                  : installedTools.length > 0
                  ? "Ask anything..."
                  : "Ask a question..."
              }
              disabled={loading}
              rows={1}
              className="w-full resize-none bg-transparent text-gray-800 placeholder-gray-400 px-3 py-3 pr-16 text-sm focus:outline-none disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed rounded-xl"
              style={{ minHeight: '44px', maxHeight: '200px' }}
            />
            <div className="absolute right-2 bottom-2 flex items-center gap-1">
              {/* Character count - only near limit */}
              {input.length > 3000 && (
                <span className={`text-[10px] ${input.length > 4000 ? 'text-red-500' : 'text-gray-400'}`}>
                  {input.length.toLocaleString()}
                </span>
              )}
              {/* Send button */}
              <button
                onClick={() => sendMessage()}
                disabled={loading || !input.trim()}
                className={`p-1.5 rounded-lg transition-all ${
                  input.trim() && !loading
                    ? 'bg-slate-800 text-white hover:bg-slate-700'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
                title={loading ? 'Generating...' : 'Send (Enter)'}
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
