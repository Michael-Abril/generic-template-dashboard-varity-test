'use client';

import { useState, useEffect, useRef } from 'react';
import {
  X, Upload, FileText, Trash2, Folder, Briefcase, BarChart3, Code, Globe,
  Lightbulb, Rocket, Star, Users, Check, Loader2, Link as LinkIcon
} from 'lucide-react';
import { Project, ProjectFile, PROJECT_COLORS, PROJECT_ICONS } from '@/types/project';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Icon component map
const ICON_COMPONENTS: Record<string, React.ComponentType<{ className?: string }>> = {
  folder: Folder,
  briefcase: Briefcase,
  chart: BarChart3,
  code: Code,
  document: FileText,
  globe: Globe,
  lightbulb: Lightbulb,
  rocket: Rocket,
  star: Star,
  users: Users,
};

interface ProjectEditorProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress: string;
  project?: Project | null; // null for create, Project for edit
  onSave: (project: Project) => void;
}

export function ProjectEditor({
  isOpen,
  onClose,
  walletAddress,
  project,
  onSave,
}: ProjectEditorProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(PROJECT_COLORS[0]);
  const [icon, setIcon] = useState('folder');
  const [customInstructions, setCustomInstructions] = useState('');
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [activeTab, setActiveTab] = useState<'details' | 'instructions' | 'files'>('details');
  const [saving, setSaving] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditing = !!project;

  // Initialize form with project data
  useEffect(() => {
    if (project) {
      setName(project.name);
      setDescription(project.description || '');
      setColor(project.color);
      setIcon(project.icon);
      setCustomInstructions(project.custom_instructions || '');
      // Fetch files for existing project
      fetchProjectFiles(project.id);
    } else {
      // Reset for new project
      setName('');
      setDescription('');
      setColor(PROJECT_COLORS[0]);
      setIcon('folder');
      setCustomInstructions('');
      setFiles([]);
    }
  }, [project, isOpen]);

  // Fetch project files
  const fetchProjectFiles = async (projectId: number) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/projects/${projectId}/files?wallet_address=${walletAddress}`
      );
      if (response.ok) {
        const data = await response.json();
        setFiles(data);
      }
    } catch (error) {
      console.error('Failed to fetch project files:', error);
    }
  };

  // Create or update project
  const handleSave = async () => {
    if (!name.trim()) {
      alert('Please enter a project name');
      return;
    }

    setSaving(true);
    try {
      const url = isEditing
        ? `${API_BASE_URL}/api/v1/projects/${project.id}?wallet_address=${walletAddress}`
        : `${API_BASE_URL}/api/v1/projects/`;

      const method = isEditing ? 'PATCH' : 'POST';
      const body = isEditing
        ? { name, description, color, icon, custom_instructions: customInstructions }
        : { wallet_address: walletAddress, name, description, color, icon, custom_instructions: customInstructions };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const savedProject = await response.json();
        onSave(savedProject);
        onClose();
      } else {
        const error = await response.json();
        alert(error.detail || 'Failed to save project');
      }
    } catch (error) {
      console.error('Failed to save project:', error);
      alert('Failed to save project');
    } finally {
      setSaving(false);
    }
  };

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !project) return;

    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('source_type', 'upload');
      formData.append('file_name', file.name);

      // Determine file type
      const ext = file.name.split('.').pop()?.toLowerCase();
      const typeMap: Record<string, string> = {
        pdf: 'pdf',
        doc: 'docx',
        docx: 'docx',
        xls: 'xlsx',
        xlsx: 'xlsx',
        txt: 'txt',
        md: 'txt',
        csv: 'csv',
        png: 'image',
        jpg: 'image',
        jpeg: 'image',
      };
      if (ext && typeMap[ext]) {
        formData.append('file_type', typeMap[ext]);
      }

      const response = await fetch(
        `${API_BASE_URL}/api/v1/projects/${project.id}/files?wallet_address=${walletAddress}`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (response.ok) {
        const newFile = await response.json();
        setFiles(prev => [...prev, newFile]);
      } else {
        const error = await response.json();
        alert(error.detail || 'Failed to upload file');
      }
    } catch (error) {
      console.error('Failed to upload file:', error);
      alert('Failed to upload file');
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Remove file from project
  const handleRemoveFile = async (fileId: number) => {
    if (!project || !confirm('Remove this file from the project?')) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/projects/${project.id}/files/${fileId}?wallet_address=${walletAddress}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        setFiles(prev => prev.filter(f => f.id !== fileId));
      }
    } catch (error) {
      console.error('Failed to remove file:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEditing ? 'Edit Project' : 'New Project'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('details')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'details'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Details
          </button>
          <button
            onClick={() => setActiveTab('instructions')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'instructions'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Custom Instructions
          </button>
          {isEditing && (
            <button
              onClick={() => setActiveTab('files')}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'files'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Files ({files.length})
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'details' && (
            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Q4 Financial Review"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of this project..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Color */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Color
                </label>
                <div className="flex flex-wrap gap-2">
                  {PROJECT_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className={`w-8 h-8 rounded-lg transition-transform ${
                        color === c ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' : ''
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Icon */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Icon
                </label>
                <div className="flex flex-wrap gap-2">
                  {PROJECT_ICONS.map((i) => {
                    const IconComponent = ICON_COMPONENTS[i.value];
                    return (
                      <button
                        key={i.value}
                        onClick={() => setIcon(i.value)}
                        title={i.label}
                        className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                          icon === i.value
                            ? 'bg-blue-100 text-blue-600 ring-2 ring-blue-500'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        <IconComponent className="w-5 h-5" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Preview */}
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-500 mb-2">Preview</div>
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
                    style={{ backgroundColor: color }}
                  >
                    {(() => {
                      const IconComponent = ICON_COMPONENTS[icon];
                      return <IconComponent className="w-5 h-5" />;
                    })()}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{name || 'Project Name'}</div>
                    <div className="text-sm text-gray-500">{description || 'No description'}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'instructions' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Custom Instructions
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Instructions the AI will follow for all conversations in this project.
                  Similar to Claude's &quot;Project Knowledge&quot;.
                </p>
                <textarea
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder={`Examples:
• Focus on QuickBooks data for financial analysis
• Always reference invoice numbers when discussing transactions
• Format responses as executive summaries
• Use formal business language`}
                  rows={10}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono text-sm"
                />
              </div>
            </div>
          )}

          {activeTab === 'files' && isEditing && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Pinned Files</h3>
                  <p className="text-xs text-gray-500">
                    Files are used as context for all conversations in this project
                  </p>
                </div>
                <div className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileUpload}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.md,.csv,.png,.jpg,.jpeg"
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingFile}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 disabled:opacity-50"
                  >
                    {uploadingFile ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    Upload
                  </button>
                </div>
              </div>

              {/* File List */}
              {files.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No files pinned to this project</p>
                  <p className="text-xs mt-1">Upload files to include them as context</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg group"
                    >
                      <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center">
                        {file.source_type === 'integration' ? (
                          <LinkIcon className="w-4 h-4 text-gray-500" />
                        ) : (
                          <FileText className="w-4 h-4 text-gray-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {file.file_name}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-2">
                          <span>{file.file_type || 'Unknown'}</span>
                          {file.file_size && (
                            <span>• {(file.file_size / 1024).toFixed(1)} KB</span>
                          )}
                          <span>• {file.source_type}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveFile(file.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-4 border-t text-xs text-gray-500">
                Supported formats: PDF, Word, Excel, Text, Markdown, CSV, Images
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                {isEditing ? 'Save Changes' : 'Create Project'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProjectEditor;
