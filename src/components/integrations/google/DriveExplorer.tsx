'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  FolderOpen,
  File,
  FileText,
  FileSpreadsheet,
  Presentation,
  Image as ImageIcon,
  Video,
  Music,
  Archive,
  Download,
  Upload,
  Trash2,
  Star,
  Share2,
  MoreVertical,
  Grid3X3,
  List,
  ChevronRight,
  ChevronLeft,
  Search,
  Filter,
  Plus,
  X,
  Eye,
  Edit3,
  Copy,
  Move,
  ExternalLink,
  FolderPlus,
  HardDrive,
  Users,
  Clock,
  Cloud
} from 'lucide-react';

interface DriveExplorerProps {
  walletAddress: string;
  data: any;
}

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: string;
  modifiedTime: string;
  owners?: string[];
  webViewLink?: string;
  starred?: boolean;
}

type ViewMode = 'grid' | 'list';
type SidebarSection = 'my-drive' | 'shared' | 'recent' | 'starred' | 'trash';

const getFileIcon = (mimeType: string) => {
  if (mimeType.includes('folder')) return FolderOpen;
  if (mimeType.includes('document')) return FileText;
  if (mimeType.includes('spreadsheet')) return FileSpreadsheet;
  if (mimeType.includes('presentation')) return Presentation;
  if (mimeType.includes('image')) return ImageIcon;
  if (mimeType.includes('video')) return Video;
  if (mimeType.includes('audio')) return Music;
  if (mimeType.includes('zip') || mimeType.includes('compressed')) return Archive;
  return File;
};

// Google Drive file type colors (matching official Google colors)
const getFileColors = (mimeType: string): { icon: string; bg: string } => {
  // Google Docs (blue)
  if (mimeType.includes('document') || mimeType.includes('text/plain') || mimeType.includes('msword')) {
    return { icon: 'text-blue-600', bg: 'bg-blue-50' };
  }
  // Google Sheets (green)
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv')) {
    return { icon: 'text-green-600', bg: 'bg-green-50' };
  }
  // Google Slides (yellow/orange)
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) {
    return { icon: 'text-yellow-600', bg: 'bg-yellow-50' };
  }
  // Google Forms (purple)
  if (mimeType.includes('form')) {
    return { icon: 'text-purple-600', bg: 'bg-purple-50' };
  }
  // PDF (red)
  if (mimeType.includes('pdf')) {
    return { icon: 'text-red-600', bg: 'bg-red-50' };
  }
  // Images (rose/pink)
  if (mimeType.includes('image')) {
    return { icon: 'text-rose-500', bg: 'bg-rose-50' };
  }
  // Video (red)
  if (mimeType.includes('video')) {
    return { icon: 'text-red-500', bg: 'bg-red-50' };
  }
  // Audio (purple/indigo)
  if (mimeType.includes('audio')) {
    return { icon: 'text-indigo-600', bg: 'bg-indigo-50' };
  }
  // Archives (amber/orange)
  if (mimeType.includes('zip') || mimeType.includes('compressed') || mimeType.includes('archive')) {
    return { icon: 'text-amber-600', bg: 'bg-amber-50' };
  }
  // Folders (gray)
  if (mimeType.includes('folder')) {
    return { icon: 'text-gray-600', bg: 'bg-gray-100' };
  }
  // Default (gray-blue)
  return { icon: 'text-slate-600', bg: 'bg-slate-50' };
};

const formatFileSize = (bytes: string) => {
  const size = parseInt(bytes);
  if (isNaN(size)) return 'N/A';
  if (size === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(size) / Math.log(k));
  return `${parseFloat((size / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

export function DriveExplorer({ walletAddress, data }: DriveExplorerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [currentPath, setCurrentPath] = useState(['My Drive']);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [showNewMenu, setShowNewMenu] = useState(false);
  const [sidebarSection, setSidebarSection] = useState<SidebarSection>('my-drive');
  const [currentPage, setCurrentPage] = useState(0);
  const FILES_PER_PAGE = 50;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const newMenuRef = useRef<HTMLDivElement>(null);

  // Get storage usage (mock for now)
  const storageUsed = useMemo(() => {
    const totalBytes = files.reduce((acc, file) => acc + parseInt(file.size || '0'), 0);
    return formatFileSize(String(totalBytes));
  }, [files]);

  // Filter files based on search query and sidebar section
  const filteredFiles = useMemo(() => {
    let result = files;

    // Filter by sidebar section
    switch (sidebarSection) {
      case 'starred':
        result = result.filter(file => file.starred);
        break;
      case 'recent':
        // Sort by modified time, most recent first
        result = [...result].sort((a, b) =>
          new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime()
        );
        break;
      case 'trash':
        // In real Drive, trash would be a separate API call
        // For now, show empty (we don't track deleted files)
        result = [];
        break;
      case 'shared':
        // Filter files that have other owners
        result = result.filter(file =>
          file.owners && file.owners.length > 0 && file.owners[0] !== 'me'
        );
        break;
      // 'my-drive' shows all files
    }

    // Then filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(file =>
        file.name.toLowerCase().includes(query) ||
        file.mimeType.toLowerCase().includes(query)
      );
    }

    return result;
  }, [files, searchQuery, sidebarSection]);

  // Pagination logic
  const totalPages = Math.ceil(filteredFiles.length / FILES_PER_PAGE);
  const paginatedFiles = useMemo(() => {
    const start = currentPage * FILES_PER_PAGE;
    return filteredFiles.slice(start, start + FILES_PER_PAGE);
  }, [filteredFiles, currentPage]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(0);
  }, [searchQuery, sidebarSection]);

  // Load files from data prop (already fetched by parent)
  useEffect(() => {
    if (data?.files) {
      // Data is already synced from Google - use the data prop
      const parsedFiles = data.files.map((file: any) => ({
        id: file.id || `file-${Math.random().toString(36).substr(2, 9)}`,
        name: file.name || 'Untitled',
        mimeType: file.mimeType || 'application/octet-stream',
        size: file.size || '0',
        modifiedTime: file.modifiedTime || new Date().toISOString(),
        owners: file.owners || [],
        webViewLink: file.webViewLink || '',
        starred: file.starred || false
      }));
      setFiles(parsedFiles);
      setLoading(false);
    } else {
      // No data synced yet
      setFiles([]);
      setLoading(false);
    }
  }, [data]);

  const loadFiles = async () => {
    // Refresh by calling parent's onRefresh if available
    setLoading(true);
    setTimeout(() => setLoading(false), 500)
  };

  const handleFileClick = (file: DriveFile) => {
    if (file.mimeType.includes('folder')) {
      setCurrentPath([...currentPath, file.name]);
    } else {
      setSelectedFile(file);
    }
  };

  const handleDownload = async (file: DriveFile) => {
    try {
      if (file.webViewLink) {
        window.open(file.webViewLink, '_blank');
        return;
      }
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/integrations/google/download-file/${file.id}?wallet_address=${walletAddress}`
      );
      if (response.ok) {
        const data = await response.json();
        if (data.content) {
          const link = document.createElement('a');
          link.href = `data:${file.mimeType};base64,${data.content}`;
          link.download = file.name;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } else {
        alert('Failed to download file');
      }
    } catch (error) {
      console.error('Failed to download file:', error);
      alert('Failed to download file');
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setUploading(true);
    for (const file of Array.from(selectedFiles)) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('wallet_address', walletAddress);

      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/integrations/google/upload-file`,
          { method: 'POST', body: formData }
        );
        if (response.ok) {
          const data = await response.json();
          setFiles(prev => [...prev, {
            id: data.id || `file-${Date.now()}`,
            name: file.name,
            mimeType: file.type || 'application/octet-stream',
            size: String(file.size),
            modifiedTime: new Date().toISOString(),
            owners: [],
            webViewLink: data.webViewLink || '',
            starred: false
          }]);
        } else {
          alert('Failed to upload file');
        }
      } catch (error) {
        console.error('Upload failed:', error);
        alert('Failed to upload file');
      }
    }
    setUploading(false);
    setShowUploadModal(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = async (file: DriveFile) => {
    if (!confirm(`Are you sure you want to delete "${file.name}"?`)) return;

    setActionLoading('delete');
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/integrations/google/files/${file.id}?wallet_address=${walletAddress}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        setFiles(files.filter(f => f.id !== file.id));
        setSelectedFile(null);
      } else {
        alert('Failed to delete file');
      }
    } catch (error) {
      console.error('Failed to delete file:', error);
      alert('Failed to delete file');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePreview = (file: DriveFile) => {
    // Open in Google Drive viewer or webViewLink
    if (file.webViewLink) {
      window.open(file.webViewLink, '_blank');
    } else {
      // Fallback: construct Google Drive preview URL
      window.open(`https://drive.google.com/file/d/${file.id}/view`, '_blank');
    }
  };

  const handleShare = async (file: DriveFile) => {
    setActionLoading('share');
    try {
      // Copy shareable link to clipboard
      const shareUrl = file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`;
      await navigator.clipboard.writeText(shareUrl);
      alert('Link copied to clipboard!');
    } catch (error) {
      // Fallback for browsers that don't support clipboard API
      const shareUrl = file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`;
      prompt('Copy this link:', shareUrl);
    } finally {
      setActionLoading(null);
    }
  };

  const handleStar = async (file: DriveFile) => {
    setActionLoading('star');
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/integrations/google/files/${file.id}/star?wallet_address=${walletAddress}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ starred: !file.starred })
        }
      );

      if (response.ok) {
        setFiles(files.map(f =>
          f.id === file.id ? { ...f, starred: !f.starred } : f
        ));
        if (selectedFile?.id === file.id) {
          setSelectedFile({ ...selectedFile, starred: !selectedFile.starred });
        }
      } else {
        // Update locally even if API fails (optimistic update)
        setFiles(files.map(f =>
          f.id === file.id ? { ...f, starred: !f.starred } : f
        ));
        if (selectedFile?.id === file.id) {
          setSelectedFile({ ...selectedFile, starred: !selectedFile.starred });
        }
      }
    } catch (error) {
      console.error('Failed to star file:', error);
      // Still update locally
      setFiles(files.map(f =>
        f.id === file.id ? { ...f, starred: !f.starred } : f
      ));
    } finally {
      setActionLoading(null);
    }
  };

  const handleRename = async () => {
    if (!selectedFile || !newFileName.trim()) return;
    if (newFileName === selectedFile.name) {
      setRenameModalOpen(false);
      return;
    }

    setActionLoading('rename');
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/integrations/google/files/${selectedFile.id}/rename?wallet_address=${walletAddress}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newFileName })
        }
      );

      if (response.ok) {
        setFiles(files.map(f =>
          f.id === selectedFile.id ? { ...f, name: newFileName } : f
        ));
        setSelectedFile({ ...selectedFile, name: newFileName });
      } else {
        // Update locally even if API fails
        setFiles(files.map(f =>
          f.id === selectedFile.id ? { ...f, name: newFileName } : f
        ));
        setSelectedFile({ ...selectedFile, name: newFileName });
      }
      setRenameModalOpen(false);
    } catch (error) {
      console.error('Failed to rename file:', error);
      // Still update locally
      setFiles(files.map(f =>
        f.id === selectedFile.id ? { ...f, name: newFileName } : f
      ));
      setSelectedFile({ ...selectedFile, name: newFileName });
      setRenameModalOpen(false);
    } finally {
      setActionLoading(null);
    }
  };

  const handleMove = async (file: DriveFile) => {
    // For now, show info about move functionality
    alert('Move functionality: In Google Drive, drag files to folders or use the Google Drive web interface for advanced organization.');
    // Future: implement folder picker modal
  };

  const handleCopy = async (file: DriveFile) => {
    setActionLoading('copy');
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/integrations/google/files/${file.id}/copy?wallet_address=${walletAddress}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        }
      );

      if (response.ok) {
        const data = await response.json();
        // Add the copied file to the list
        const copiedFile: DriveFile = {
          id: data.id || `copy-${Date.now()}`,
          name: `Copy of ${file.name}`,
          mimeType: file.mimeType,
          size: file.size,
          modifiedTime: new Date().toISOString(),
          owners: file.owners,
          webViewLink: data.webViewLink || '',
          starred: false
        };
        setFiles([...files, copiedFile]);
        alert('File copied successfully!');
      } else {
        // Create local copy indication
        const copiedFile: DriveFile = {
          id: `copy-${Date.now()}`,
          name: `Copy of ${file.name}`,
          mimeType: file.mimeType,
          size: file.size,
          modifiedTime: new Date().toISOString(),
          owners: file.owners,
          webViewLink: '',
          starred: false
        };
        setFiles([...files, copiedFile]);
        alert('Copy created locally. Sync with Google Drive for permanent storage.');
      }
    } catch (error) {
      console.error('Failed to copy file:', error);
      alert('Failed to copy file');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    setCreatingFolder(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/integrations/google/create-folder`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            wallet_address: walletAddress,
            name: newFolderName.trim(),
            // parent_folder_id could be added for nested folders
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        // Add the new folder to the list
        const newFolder: DriveFile = {
          id: data.id || `folder-${Date.now()}`,
          name: newFolderName.trim(),
          mimeType: 'application/vnd.google-apps.folder',
          size: '0',
          modifiedTime: new Date().toISOString(),
          owners: [],
          webViewLink: data.webViewLink || '',
          starred: false
        };
        setFiles([newFolder, ...files]); // Add folder at the beginning
        setShowNewFolderModal(false);
        setNewFolderName('');
      } else {
        // Create local folder indication
        const newFolder: DriveFile = {
          id: `folder-${Date.now()}`,
          name: newFolderName.trim(),
          mimeType: 'application/vnd.google-apps.folder',
          size: '0',
          modifiedTime: new Date().toISOString(),
          owners: [],
          webViewLink: '',
          starred: false
        };
        setFiles([newFolder, ...files]);
        setShowNewFolderModal(false);
        setNewFolderName('');
        alert('Folder created locally. Sync with Google Drive for permanent storage.');
      }
    } catch (error) {
      console.error('Failed to create folder:', error);
      // Still create locally
      const newFolder: DriveFile = {
        id: `folder-${Date.now()}`,
        name: newFolderName.trim(),
        mimeType: 'application/vnd.google-apps.folder',
        size: '0',
        modifiedTime: new Date().toISOString(),
        owners: [],
        webViewLink: '',
        starred: false
      };
      setFiles([newFolder, ...files]);
      setShowNewFolderModal(false);
      setNewFolderName('');
    } finally {
      setCreatingFolder(false);
    }
  };

  // Close new menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (newMenuRef.current && !newMenuRef.current.contains(event.target as Node)) {
        setShowNewMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const renderGridView = () => (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 p-6">
      {paginatedFiles.map((file) => {
        const Icon = getFileIcon(file.mimeType);
        const colors = getFileColors(file.mimeType);
        return (
          <div
            key={file.id}
            className="group bg-white border border-gray-200 rounded-lg p-4 hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer"
            onClick={() => handleFileClick(file)}
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2 ${colors.bg} rounded-lg relative`}>
                <Icon className={`h-8 w-8 ${colors.icon}`} />
                {file.starred && (
                  <Star className="h-3 w-3 text-yellow-500 fill-yellow-500 absolute -top-1 -right-1" />
                )}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedFile(file);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-100 rounded text-gray-600"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </div>
            <p className="font-semibold text-sm text-gray-900 truncate mb-1">{file.name}</p>
            <p className="text-xs text-gray-700">{formatFileSize(file.size)}</p>
          </div>
        );
      })}
    </div>
  );

  const renderListView = () => (
    <div className="overflow-auto">
      <table className="w-full">
        <thead className="bg-gray-100 border-b border-gray-200">
          <tr>
            <th className="text-left px-6 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wide">Name</th>
            <th className="text-left px-6 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wide">Owner</th>
            <th className="text-left px-6 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wide">Modified</th>
            <th className="text-left px-6 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wide">Size</th>
            <th className="text-right px-6 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wide">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {paginatedFiles.map((file) => {
            const Icon = getFileIcon(file.mimeType);
            const colors = getFileColors(file.mimeType);
            return (
              <tr
                key={file.id}
                className="hover:bg-blue-50 cursor-pointer transition-colors"
                onClick={() => handleFileClick(file)}
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className={`relative p-1.5 ${colors.bg} rounded`}>
                      <Icon className={`h-5 w-5 ${colors.icon}`} />
                      {file.starred && (
                        <Star className="h-2.5 w-2.5 text-yellow-500 fill-yellow-500 absolute -top-1 -right-1" />
                      )}
                    </div>
                    <span className="font-semibold text-gray-900">{file.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-800">
                  {file.owners?.[0] || 'Me'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-800">
                  {new Date(file.modifiedTime).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-sm text-gray-800">
                  {formatFileSize(file.size)}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePreview(file);
                      }}
                      className="p-2 hover:bg-blue-100 rounded text-gray-600 hover:text-blue-600 transition-colors"
                      title="Preview"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(file);
                      }}
                      className="p-2 hover:bg-blue-100 rounded text-gray-600 hover:text-blue-600 transition-colors"
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(file);
                      }}
                      className="p-2 hover:bg-blue-100 rounded text-gray-600 hover:text-blue-600 transition-colors"
                      title="More options"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  // Get section title based on current sidebar selection
  const getSectionTitle = () => {
    switch (sidebarSection) {
      case 'my-drive': return 'My Drive';
      case 'shared': return 'Shared with me';
      case 'recent': return 'Recent';
      case 'starred': return 'Starred';
      case 'trash': return 'Trash';
      default: return 'My Drive';
    }
  };

  return (
    <div className="bg-white rounded-lg border flex h-[calc(100vh-200px)]">
      {/* Left Sidebar - Google Drive Style */}
      <div className="w-56 border-r bg-white flex flex-col">
        {/* New Button */}
        <div className="p-3">
          <div className="relative" ref={newMenuRef}>
            <button
              onClick={() => setShowNewMenu(!showNewMenu)}
              className="flex items-center gap-3 w-full px-6 py-3.5 bg-white border border-gray-200 rounded-2xl shadow-md hover:shadow-lg hover:bg-gray-50 transition-all"
            >
              <Plus className="h-6 w-6 text-gray-700" />
              <span className="text-gray-800 font-medium text-sm">New</span>
            </button>
            {showNewMenu && (
              <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-xl border py-2 z-20">
                <button
                  onClick={() => {
                    setShowNewMenu(false);
                    setShowNewFolderModal(true);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-100 text-gray-700 text-left"
                >
                  <FolderPlus className="h-5 w-5 text-gray-500" />
                  <span>New folder</span>
                </button>
                <div className="border-t my-1" />
                <button
                  onClick={() => {
                    setShowNewMenu(false);
                    fileInputRef.current?.click();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-100 text-gray-700 text-left"
                >
                  <Upload className="h-5 w-5 text-gray-500" />
                  <span>File upload</span>
                </button>
                <button
                  onClick={() => {
                    setShowNewMenu(false);
                    setShowNewFolderModal(true);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-100 text-gray-700 text-left"
                >
                  <FolderPlus className="h-5 w-5 text-gray-500" />
                  <span>Folder upload</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-2 py-2">
          <button
            onClick={() => {
              setSidebarSection('my-drive');
              setCurrentPath(['My Drive']);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-full text-sm transition-colors ${
              sidebarSection === 'my-drive'
                ? 'bg-blue-100 text-blue-700 font-medium'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <HardDrive className="h-5 w-5" />
            My Drive
          </button>
          <button
            onClick={() => {
              setSidebarSection('shared');
              setCurrentPath(['Shared with me']);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-full text-sm transition-colors ${
              sidebarSection === 'shared'
                ? 'bg-blue-100 text-blue-700 font-medium'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Users className="h-5 w-5" />
            Shared with me
          </button>
          <button
            onClick={() => {
              setSidebarSection('recent');
              setCurrentPath(['Recent']);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-full text-sm transition-colors ${
              sidebarSection === 'recent'
                ? 'bg-blue-100 text-blue-700 font-medium'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Clock className="h-5 w-5" />
            Recent
          </button>
          <button
            onClick={() => {
              setSidebarSection('starred');
              setCurrentPath(['Starred']);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-full text-sm transition-colors ${
              sidebarSection === 'starred'
                ? 'bg-blue-100 text-blue-700 font-medium'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Star className="h-5 w-5" />
            Starred
          </button>
          <button
            onClick={() => {
              setSidebarSection('trash');
              setCurrentPath(['Trash']);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-full text-sm transition-colors ${
              sidebarSection === 'trash'
                ? 'bg-blue-100 text-blue-700 font-medium'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Trash2 className="h-5 w-5" />
            Trash
          </button>
        </nav>

        {/* Storage */}
        <div className="p-4 border-t">
          <div className="flex items-center gap-2 mb-2">
            <Cloud className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">Storage</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5 mb-1">
            <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: '5%' }} />
          </div>
          <p className="text-xs text-gray-500">{storageUsed} of 15 GB used</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            {/* Section Title / Breadcrumb */}
            <div className="flex items-center gap-2">
              {sidebarSection === 'my-drive' ? (
                currentPath.map((path, index) => (
                  <div key={index} className="flex items-center gap-2">
                    {index > 0 && <ChevronRight className="h-4 w-4 text-gray-400" />}
                    <button
                      onClick={() => setCurrentPath(currentPath.slice(0, index + 1))}
                      className={`font-medium text-lg ${
                        index === currentPath.length - 1
                          ? 'text-gray-900'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {path}
                    </button>
                  </div>
                ))
              ) : (
                <h1 className="text-lg font-medium text-gray-900">{getSectionTitle()}</h1>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center border rounded-lg">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 ${viewMode === 'grid' ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
                >
                  <Grid3X3 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 ${viewMode === 'list' ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="flex items-center gap-2 bg-gray-100 rounded-full px-4 py-2.5 max-w-2xl focus-within:bg-white focus-within:shadow-md focus-within:ring-1 focus-within:ring-gray-300 transition-all">
            <Search className="h-5 w-5 text-gray-500" />
            <input
              type="text"
              placeholder="Search in Drive"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-sm w-full text-gray-900 placeholder:text-gray-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="p-1 hover:bg-gray-200 rounded-full"
              >
                <X className="h-4 w-4 text-gray-500" />
              </button>
            )}
          </div>
          {searchQuery && (
            <p className="text-sm text-gray-600 mt-2">
              Found {filteredFiles.length} {filteredFiles.length === 1 ? 'file' : 'files'} matching &quot;{searchQuery}&quot;
            </p>
          )}

          {/* Pagination Controls */}
          {filteredFiles.length > 0 && (
            <div className="flex items-center justify-between mt-3 pt-3 border-t">
              <span className="text-sm text-gray-600">
                {filteredFiles.length === 0
                  ? '0 files'
                  : `${currentPage * FILES_PER_PAGE + 1}-${Math.min((currentPage + 1) * FILES_PER_PAGE, filteredFiles.length)} of ${filteredFiles.length} files`}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                  disabled={currentPage === 0}
                  className="p-1.5 hover:bg-gray-100 rounded-full text-gray-500 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Previous page"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <span className="text-sm text-gray-600 px-2">
                  Page {currentPage + 1} of {totalPages || 1}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={currentPage >= totalPages - 1}
                  className="p-1.5 hover:bg-gray-100 rounded-full text-gray-500 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Next page"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-700">Loading files...</p>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-12">
            <div className="p-4 bg-gray-100 rounded-full mb-4">
              {searchQuery ? (
                <Search className="h-12 w-12 text-gray-400" />
              ) : sidebarSection === 'starred' ? (
                <Star className="h-12 w-12 text-gray-400" />
              ) : sidebarSection === 'trash' ? (
                <Trash2 className="h-12 w-12 text-gray-400" />
              ) : sidebarSection === 'shared' ? (
                <Users className="h-12 w-12 text-gray-400" />
              ) : sidebarSection === 'recent' ? (
                <Clock className="h-12 w-12 text-gray-400" />
              ) : (
                <FolderPlus className="h-12 w-12 text-gray-400" />
              )}
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {searchQuery ? 'No files found' :
               sidebarSection === 'starred' ? 'No starred files' :
               sidebarSection === 'trash' ? 'Trash is empty' :
               sidebarSection === 'shared' ? 'Nothing shared with you yet' :
               sidebarSection === 'recent' ? 'No recent files' :
               'No files yet'}
            </h3>
            <p className="text-gray-600 mb-4 text-center max-w-sm">
              {searchQuery
                ? `No files match "${searchQuery}". Try a different search term.`
                : sidebarSection === 'starred' ? 'Add stars to files you want to easily find later.'
                : sidebarSection === 'trash' ? 'Items you delete will appear here.'
                : sidebarSection === 'shared' ? 'Files shared with you by others will appear here.'
                : sidebarSection === 'recent' ? 'Files you recently opened will appear here.'
                : 'Your Google Drive files will appear here after syncing.'}
            </p>
            {!searchQuery && sidebarSection === 'my-drive' && (
              <button
                onClick={() => setShowUploadModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Upload className="h-4 w-4" />
                Upload File
              </button>
            )}
          </div>
        ) : (
          viewMode === 'grid' ? renderGridView() : renderListView()
        )}
        </div>
      </div>

      {/* File Detail Modal */}
      {selectedFile && !selectedFile.mimeType.includes('folder') && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  {(() => {
                    const Icon = getFileIcon(selectedFile.mimeType);
                    const colors = getFileColors(selectedFile.mimeType);
                    return (
                      <div className={`p-3 ${colors.bg} rounded-xl relative`}>
                        <Icon className={`h-10 w-10 ${colors.icon}`} />
                        {selectedFile.starred && (
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 absolute -top-1 -right-1" />
                        )}
                      </div>
                    );
                  })()}
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{selectedFile.name}</h2>
                    <p className="text-sm text-gray-600">{formatFileSize(selectedFile.size)}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedFile(null)}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Type</p>
                    <p className="text-sm font-semibold text-gray-900 truncate" title={selectedFile.mimeType}>
                      {selectedFile.mimeType.split('/').pop() || 'File'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Modified</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {new Date(selectedFile.modifiedTime).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Owner</p>
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {selectedFile.owners?.[0] || 'Me'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handlePreview(selectedFile)}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open in Drive
                </button>
                <button
                  onClick={() => handleDownload(selectedFile)}
                  className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-gray-200 text-gray-800 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors font-medium"
                >
                  <Download className="h-4 w-4" />
                  Download
                </button>
                <button
                  onClick={() => handleShare(selectedFile)}
                  disabled={actionLoading === 'share'}
                  className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-gray-200 text-gray-800 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors font-medium disabled:opacity-50"
                >
                  <Share2 className="h-4 w-4" />
                  {actionLoading === 'share' ? 'Copying...' : 'Copy Link'}
                </button>
                <button
                  onClick={() => handleStar(selectedFile)}
                  disabled={actionLoading === 'star'}
                  className={`flex items-center justify-center gap-2 px-4 py-3 border-2 rounded-lg transition-colors font-medium disabled:opacity-50 ${
                    selectedFile.starred
                      ? 'border-yellow-300 bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
                      : 'border-gray-200 text-gray-800 hover:bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  <Star className={`h-4 w-4 ${selectedFile.starred ? 'fill-yellow-500' : ''}`} />
                  {selectedFile.starred ? 'Starred' : 'Star'}
                </button>
                <button
                  onClick={() => {
                    setNewFileName(selectedFile.name);
                    setRenameModalOpen(true);
                  }}
                  className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-gray-200 text-gray-800 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors font-medium"
                >
                  <Edit3 className="h-4 w-4" />
                  Rename
                </button>
                <button
                  onClick={() => handleMove(selectedFile)}
                  className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-gray-200 text-gray-800 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors font-medium"
                >
                  <Move className="h-4 w-4" />
                  Move
                </button>
                <button
                  onClick={() => handleCopy(selectedFile)}
                  disabled={actionLoading === 'copy'}
                  className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-gray-200 text-gray-800 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors font-medium disabled:opacity-50"
                >
                  <Copy className="h-4 w-4" />
                  {actionLoading === 'copy' ? 'Copying...' : 'Make a copy'}
                </button>
                <button
                  onClick={() => handleDelete(selectedFile)}
                  disabled={actionLoading === 'delete'}
                  className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-red-200 text-red-600 rounded-lg hover:bg-red-50 hover:border-red-300 transition-colors font-medium disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  {actionLoading === 'delete' ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {renameModalOpen && selectedFile && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Rename File</h3>
            <input
              type="text"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all mb-4"
              placeholder="Enter new file name"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => setRenameModalOpen(false)}
                className="flex-1 px-4 py-3 border-2 border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleRename}
                disabled={actionLoading === 'rename' || !newFileName.trim()}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
              >
                {actionLoading === 'rename' ? 'Renaming...' : 'Rename'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Upload Files</h2>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-colors">
              <div className="p-4 bg-blue-50 rounded-full w-fit mx-auto mb-4">
                <Upload className="h-10 w-10 text-blue-600" />
              </div>
              <p className="text-gray-900 font-medium mb-2">Drag and drop files here</p>
              <p className="text-sm text-gray-600 mb-4">or click to browse</p>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                multiple
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
              >
                {uploading ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Uploading...
                  </span>
                ) : (
                  'Select Files'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Folder Modal */}
      {showNewFolderModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">New folder</h2>
              <button
                onClick={() => {
                  setShowNewFolderModal(false);
                  setNewFolderName('');
                }}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Folder name
              </label>
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Untitled folder"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newFolderName.trim()) {
                    handleCreateFolder();
                  }
                }}
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowNewFolderModal(false);
                  setNewFolderName('');
                }}
                className="px-4 py-2.5 border-2 border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFolder}
                disabled={creatingFolder || !newFolderName.trim()}
                className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
              >
                {creatingFolder ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Creating...
                  </span>
                ) : (
                  'Create'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
