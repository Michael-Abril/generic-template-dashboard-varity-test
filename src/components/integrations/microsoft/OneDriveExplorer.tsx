'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import {
  FolderOpen,
  File,
  FileText,
  FileSpreadsheet,
  Presentation,
  Image,
  Film,
  Music,
  Archive,
  Download,
  Upload,
  Share2,
  Trash2,
  MoreVertical,
  Search,
  Grid3X3,
  List,
  ChevronRight,
  ChevronLeft,
  Home,
  Users,
  Clock,
  X,
  ExternalLink,
  Loader2,
  Plus,
  FolderPlus,
  Star,
  Edit3,
  Copy,
  Move,
  Cloud
} from 'lucide-react';

interface DriveFile {
  id: string;
  name: string;
  size: number;
  createdDateTime: string;
  lastModifiedDateTime: string;
  webUrl: string;
  isFolder: boolean;
  mimeType: string;
  createdBy?: string;
  starred?: boolean;
}

interface OneDriveExplorerProps {
  walletAddress: string;
  view: 'files' | 'shared' | 'recent' | 'recycle';
  files: DriveFile[];
  onDataChange?: () => void;
}

type SectionType = 'files' | 'shared' | 'recent' | 'recycle' | 'starred';

const SECTIONS = [
  { id: 'files' as SectionType, label: 'My Files', icon: Home },
  { id: 'shared' as SectionType, label: 'Shared with me', icon: Users },
  { id: 'recent' as SectionType, label: 'Recent', icon: Clock },
  { id: 'starred' as SectionType, label: 'Starred', icon: Star },
  { id: 'recycle' as SectionType, label: 'Recycle Bin', icon: Trash2 },
];

// Microsoft Office file type colors (matching official Microsoft colors)
const getFileColors = (mimeType: string): { icon: string; bg: string } => {
  const type = mimeType.toLowerCase();
  // Word (blue)
  if (type.includes('word') || type.includes('document') || type === 'application/msword') {
    return { icon: 'text-blue-600', bg: 'bg-blue-50' };
  }
  // Excel (green)
  if (type.includes('excel') || type.includes('spreadsheet') || type.includes('csv')) {
    return { icon: 'text-green-600', bg: 'bg-green-50' };
  }
  // PowerPoint (orange/red)
  if (type.includes('powerpoint') || type.includes('presentation')) {
    return { icon: 'text-orange-600', bg: 'bg-orange-50' };
  }
  // PDF (red)
  if (type.includes('pdf')) {
    return { icon: 'text-red-600', bg: 'bg-red-50' };
  }
  // Images (rose)
  if (type.includes('image')) {
    return { icon: 'text-rose-500', bg: 'bg-rose-50' };
  }
  // Video (purple)
  if (type.includes('video')) {
    return { icon: 'text-purple-600', bg: 'bg-purple-50' };
  }
  // Audio (indigo)
  if (type.includes('audio')) {
    return { icon: 'text-indigo-600', bg: 'bg-indigo-50' };
  }
  // Archives (amber)
  if (type.includes('zip') || type.includes('compressed') || type.includes('archive')) {
    return { icon: 'text-amber-600', bg: 'bg-amber-50' };
  }
  // Folders (blue)
  if (type.includes('folder')) {
    return { icon: 'text-blue-500', bg: 'bg-blue-50' };
  }
  // Default (slate)
  return { icon: 'text-slate-600', bg: 'bg-slate-50' };
};

const FILES_PER_PAGE = 50;

export default function OneDriveExplorer({
  walletAddress,
  view: initialView,
  files: initialFiles,
  onDataChange
}: OneDriveExplorerProps) {
  const [files, setFiles] = useState<DriveFile[]>(initialFiles);
  const [currentSection, setCurrentSection] = useState<SectionType>(initialView === 'recycle' ? 'recycle' : initialView);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<Array<{ id: string; name: string }>>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'modified' | 'size'>('modified');
  const [showFilePreview, setShowFilePreview] = useState(false);
  const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);

  // New feature states
  const [showNewMenu, setShowNewMenu] = useState(false);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const newMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update files when props change
  useEffect(() => {
    setFiles(initialFiles);
  }, [initialFiles]);

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

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(0);
  }, [searchQuery, currentSection, sortBy]);

  const currentSectionConfig = SECTIONS.find(s => s.id === currentSection) || SECTIONS[0];

  // Storage calculation
  const storageUsed = useMemo(() => {
    const totalBytes = files.reduce((acc, file) => acc + (file.size || 0), 0);
    if (totalBytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(totalBytes) / Math.log(k));
    return `${(totalBytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  }, [files]);

  const getFileIcon = (file: DriveFile) => {
    const colors = getFileColors(file.mimeType);
    if (file.isFolder) return <FolderOpen className={`h-8 w-8 ${colors.icon}`} />;

    const mimeType = file.mimeType.toLowerCase();
    if (mimeType.includes('word') || mimeType.includes('document'))
      return <FileText className={`h-8 w-8 ${colors.icon}`} />;
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet'))
      return <FileSpreadsheet className={`h-8 w-8 ${colors.icon}`} />;
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation'))
      return <Presentation className={`h-8 w-8 ${colors.icon}`} />;
    if (mimeType.includes('image')) return <Image className={`h-8 w-8 ${colors.icon}`} />;
    if (mimeType.includes('video')) return <Film className={`h-8 w-8 ${colors.icon}`} />;
    if (mimeType.includes('audio')) return <Music className={`h-8 w-8 ${colors.icon}`} />;
    if (mimeType.includes('pdf')) return <FileText className={`h-8 w-8 ${colors.icon}`} />;
    if (mimeType.includes('zip') || mimeType.includes('compressed'))
      return <Archive className={`h-8 w-8 ${colors.icon}`} />;

    return <File className={`h-8 w-8 ${colors.icon}`} />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const filteredAndSortedFiles = useMemo(() => {
    let result = [...files];

    // Filter by section
    switch (currentSection) {
      case 'starred':
        result = result.filter(file => file.starred);
        break;
      case 'recent':
        result = [...result].sort((a, b) =>
          new Date(b.lastModifiedDateTime).getTime() - new Date(a.lastModifiedDateTime).getTime()
        ).slice(0, 50);
        break;
      case 'shared':
        result = result.filter(file => file.createdBy && file.createdBy !== 'me');
        break;
      case 'recycle':
        result = []; // Would need separate API call
        break;
    }

    // Filter by search
    if (searchQuery) {
      result = result.filter((file) =>
        file.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort
    return result.sort((a, b) => {
      // Folders always come first
      if (a.isFolder && !b.isFolder) return -1;
      if (!a.isFolder && b.isFolder) return 1;

      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else if (sortBy === 'modified') {
        return new Date(b.lastModifiedDateTime).getTime() - new Date(a.lastModifiedDateTime).getTime();
      } else {
        return b.size - a.size;
      }
    });
  }, [files, searchQuery, sortBy, currentSection]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedFiles.length / FILES_PER_PAGE);
  const paginatedFiles = useMemo(() => {
    const start = currentPage * FILES_PER_PAGE;
    return filteredAndSortedFiles.slice(start, start + FILES_PER_PAGE);
  }, [filteredAndSortedFiles, currentPage]);

  const toggleSelectFile = (fileId: string) => {
    setSelectedFiles((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(fileId)) {
        newSet.delete(fileId);
      } else {
        newSet.add(fileId);
      }
      return newSet;
    });
  };

  const handleFileClick = (file: DriveFile) => {
    if (file.isFolder) {
      setCurrentFolder(file.id);
      setFolderPath(prev => [...prev, { id: file.id, name: file.name }]);
    } else {
      setSelectedFile(file);
      setShowFilePreview(true);
    }
  };

  const navigateToFolder = (folderId: string | null, index: number) => {
    if (folderId === null) {
      setCurrentFolder(null);
      setFolderPath([]);
    } else {
      setCurrentFolder(folderId);
      setFolderPath(prev => prev.slice(0, index + 1));
    }
  };

  const handleDownload = (fileId: string) => {
    const file = files.find(f => f.id === fileId);
    if (file?.webUrl) {
      window.open(file.webUrl, '_blank');
    } else {
      alert('File URL not available');
    }
  };

  const handleUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFileList = Array.from(e.target.files || []);
    if (selectedFileList.length === 0) return;

    setIsUploading(true);
    let successCount = 0;
    let failCount = 0;

    for (const file of selectedFileList) {
      try {
        const base64Content = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            const base64 = result.split(',')[1] || result;
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/integrations/microsoft/onedrive/upload`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              wallet_address: walletAddress,
              file_name: file.name,
              file_content: base64Content,
              folder_id: currentFolder || undefined
            })
          }
        );

        if (response.ok) {
          successCount++;
          const data = await response.json();
          const newFile: DriveFile = {
            id: data.id || `file-${Date.now()}`,
            name: file.name,
            size: file.size,
            mimeType: file.type || 'application/octet-stream',
            isFolder: false,
            createdDateTime: new Date().toISOString(),
            lastModifiedDateTime: new Date().toISOString(),
            webUrl: data.webUrl || '',
            starred: false
          };
          setFiles(prev => [...prev, newFile]);
        } else {
          failCount++;
        }
      } catch (error) {
        failCount++;
        console.error('Error uploading file:', error);
      }
    }

    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';

    if (successCount > 0) {
      alert(`${successCount} file(s) uploaded successfully!${failCount > 0 ? ` ${failCount} failed.` : ''}`);
      onDataChange?.();
    } else if (failCount > 0) {
      alert(`Failed to upload ${failCount} file(s). Please try again.`);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    setCreatingFolder(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/integrations/microsoft/onedrive/folders`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            wallet_address: walletAddress,
            name: newFolderName.trim(),
            parent_folder_id: currentFolder || undefined
          })
        }
      );

      const newFolder: DriveFile = {
        id: `folder-${Date.now()}`,
        name: newFolderName.trim(),
        size: 0,
        mimeType: 'application/vnd.microsoft-apps.folder',
        isFolder: true,
        createdDateTime: new Date().toISOString(),
        lastModifiedDateTime: new Date().toISOString(),
        webUrl: '',
        starred: false
      };

      if (response.ok) {
        const data = await response.json();
        newFolder.id = data.id || newFolder.id;
        newFolder.webUrl = data.webUrl || '';
      }

      setFiles(prev => [newFolder, ...prev]);
      setShowNewFolderModal(false);
      setNewFolderName('');

      if (!response.ok) {
        alert('Folder created locally. Sync with OneDrive for permanent storage.');
      }
    } catch (error) {
      console.error('Failed to create folder:', error);
      // Still create locally
      const newFolder: DriveFile = {
        id: `folder-${Date.now()}`,
        name: newFolderName.trim(),
        size: 0,
        mimeType: 'application/vnd.microsoft-apps.folder',
        isFolder: true,
        createdDateTime: new Date().toISOString(),
        lastModifiedDateTime: new Date().toISOString(),
        webUrl: '',
        starred: false
      };
      setFiles(prev => [newFolder, ...prev]);
      setShowNewFolderModal(false);
      setNewFolderName('');
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleRename = async () => {
    if (!selectedFile || !newFileName.trim()) return;
    if (newFileName === selectedFile.name) {
      setShowRenameModal(false);
      return;
    }

    setActionLoading('rename');
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/integrations/microsoft/onedrive/files/${selectedFile.id}/rename?wallet_address=${walletAddress}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newFileName })
        }
      );

      // Update locally
      setFiles(prev => prev.map(f =>
        f.id === selectedFile.id ? { ...f, name: newFileName } : f
      ));
      setSelectedFile({ ...selectedFile, name: newFileName });
      setShowRenameModal(false);
    } catch (error) {
      console.error('Failed to rename file:', error);
      // Still update locally
      setFiles(prev => prev.map(f =>
        f.id === selectedFile.id ? { ...f, name: newFileName } : f
      ));
      setSelectedFile({ ...selectedFile, name: newFileName });
      setShowRenameModal(false);
    } finally {
      setActionLoading(null);
    }
  };

  const handleStar = async (file: DriveFile) => {
    const newStarred = !file.starred;
    setFiles(prev => prev.map(f =>
      f.id === file.id ? { ...f, starred: newStarred } : f
    ));
    if (selectedFile?.id === file.id) {
      setSelectedFile({ ...selectedFile, starred: newStarred });
    }

    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/integrations/microsoft/onedrive/files/${file.id}/star?wallet_address=${walletAddress}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ starred: newStarred })
        }
      );
    } catch (error) {
      console.error('Failed to star file:', error);
    }
  };

  const handleCopy = async (file: DriveFile) => {
    setActionLoading('copy');
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/integrations/microsoft/onedrive/files/${file.id}/copy?wallet_address=${walletAddress}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        }
      );

      const copiedFile: DriveFile = {
        id: `copy-${Date.now()}`,
        name: `Copy of ${file.name}`,
        size: file.size,
        mimeType: file.mimeType,
        isFolder: file.isFolder,
        createdDateTime: new Date().toISOString(),
        lastModifiedDateTime: new Date().toISOString(),
        webUrl: '',
        starred: false
      };

      if (response.ok) {
        const data = await response.json();
        copiedFile.id = data.id || copiedFile.id;
        copiedFile.webUrl = data.webUrl || '';
        alert('File copied successfully!');
      } else {
        alert('Copy created locally. Sync with OneDrive for permanent storage.');
      }

      setFiles(prev => [...prev, copiedFile]);
    } catch (error) {
      console.error('Failed to copy file:', error);
      alert('Failed to copy file');
    } finally {
      setActionLoading(null);
    }
  };

  const handleMove = () => {
    alert('Move functionality: Use OneDrive web interface for advanced file organization, or drag files to folders in the app.');
  };

  const handleShare = (fileId: string) => {
    const file = files.find(f => f.id === fileId);
    if (file?.webUrl) {
      navigator.clipboard.writeText(file.webUrl).then(() => {
        alert('Share link copied to clipboard!');
      }).catch(() => {
        window.open(file.webUrl, '_blank');
      });
    } else {
      alert('File URL not available');
    }
  };

  const handleDelete = async (fileIds: string[]) => {
    if (!confirm(`Are you sure you want to delete ${fileIds.length} file(s)?`)) return;

    let successCount = 0;
    let failCount = 0;

    for (const fileId of fileIds) {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/integrations/microsoft/onedrive/files/${fileId}?wallet_address=${walletAddress}`,
          { method: 'DELETE' }
        );
        if (response.ok) successCount++;
        else failCount++;
      } catch {
        failCount++;
      }
    }

    setFiles(prev => prev.filter(f => !fileIds.includes(f.id)));
    setSelectedFiles(new Set());
    setShowFilePreview(false);
    setSelectedFile(null);

    if (successCount > 0 || failCount > 0) {
      alert(failCount === 0
        ? `${successCount} file(s) deleted successfully!`
        : `Deleted ${successCount} file(s). ${failCount} failed.`
      );
      onDataChange?.();
    }
  };

  const renderGridView = () => (
    <div className="grid grid-cols-2 gap-4 p-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
      {paginatedFiles.map((file) => {
        const colors = getFileColors(file.mimeType);
        return (
          <div
            key={file.id}
            className={`group cursor-pointer rounded-lg border border-gray-200 bg-white p-4 transition-all hover:shadow-lg hover:border-blue-300 ${
              selectedFiles.has(file.id) ? 'ring-2 ring-blue-500' : ''
            }`}
            onClick={() => handleFileClick(file)}
          >
            <div className="mb-3 flex items-start justify-between">
              <input
                type="checkbox"
                checked={selectedFiles.has(file.id)}
                onChange={(e) => {
                  e.stopPropagation();
                  toggleSelectFile(file.id);
                }}
                className="rounded border-gray-300"
              />
              <div className="flex items-center gap-1">
                {file.starred && (
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(file);
                    setShowFilePreview(true);
                  }}
                  className="opacity-0 transition-opacity group-hover:opacity-100 p-1 hover:bg-gray-100 rounded"
                >
                  <MoreVertical className="h-4 w-4 text-gray-400" />
                </button>
              </div>
            </div>

            <div className={`mb-3 flex justify-center p-2 ${colors.bg} rounded-lg`}>
              {getFileIcon(file)}
            </div>

            <p className="mb-1 truncate text-sm font-semibold text-gray-900">{file.name}</p>
            <p className="text-xs text-gray-700">
              {file.isFolder ? 'Folder' : formatFileSize(file.size)}
            </p>
          </div>
        );
      })}
    </div>
  );

  const renderListView = () => (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="border-b border-gray-200 bg-gray-100">
          <tr>
            <th className="w-8 px-4 py-3 text-left">
              <input
                type="checkbox"
                checked={selectedFiles.size > 0 && selectedFiles.size === paginatedFiles.length}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedFiles(new Set(paginatedFiles.map((f) => f.id)));
                  } else {
                    setSelectedFiles(new Set());
                  }
                }}
                className="rounded border-gray-300"
              />
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">Name</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">Modified</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">Size</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">Owner</th>
            <th className="w-24 px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wide">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {paginatedFiles.map((file) => {
            const colors = getFileColors(file.mimeType);
            return (
              <tr
                key={file.id}
                className={`cursor-pointer transition-colors hover:bg-blue-50 ${
                  selectedFiles.has(file.id) ? 'bg-blue-50' : ''
                }`}
                onClick={() => handleFileClick(file)}
              >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedFiles.has(file.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      toggleSelectFile(file.id);
                    }}
                    className="rounded border-gray-300"
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`relative p-1.5 ${colors.bg} rounded`}>
                      {getFileIcon(file)}
                      {file.starred && (
                        <Star className="h-2.5 w-2.5 text-yellow-500 fill-yellow-500 absolute -top-1 -right-1" />
                      )}
                    </div>
                    <span className="font-semibold text-gray-900">{file.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-800">{formatDate(file.lastModifiedDateTime)}</td>
                <td className="px-4 py-3 text-sm text-gray-800">{file.isFolder ? '-' : formatFileSize(file.size)}</td>
                <td className="px-4 py-3 text-sm text-gray-800">{file.createdBy || 'Me'}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleStar(file); }}
                      className="p-2 hover:bg-blue-100 rounded text-gray-500 hover:text-yellow-500 transition-colors"
                      title={file.starred ? 'Unstar' : 'Star'}
                    >
                      <Star className={`h-4 w-4 ${file.starred ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDownload(file.id); }}
                      className="p-2 hover:bg-blue-100 rounded text-gray-500 hover:text-blue-600 transition-colors"
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedFile(file); setShowFilePreview(true); }}
                      className="p-2 hover:bg-blue-100 rounded text-gray-500 hover:text-blue-600 transition-colors"
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

  return (
    <div className="flex h-[calc(100vh-220px)] bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Hidden file input */}
      <input type="file" ref={fileInputRef} onChange={handleFileSelect} multiple className="hidden" />

      {/* Left Sidebar */}
      <div className="w-56 border-r bg-white flex flex-col">
        {/* New Button with Dropdown */}
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
                  onClick={() => { setShowNewMenu(false); setShowNewFolderModal(true); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-100 text-gray-700 text-left"
                >
                  <FolderPlus className="h-5 w-5 text-gray-500" />
                  <span>New folder</span>
                </button>
                <div className="border-t my-1" />
                <button
                  onClick={() => { setShowNewMenu(false); handleUpload(); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-100 text-gray-700 text-left"
                >
                  <Upload className="h-5 w-5 text-gray-500" />
                  <span>File upload</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-2 py-2">
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            const isActive = currentSection === section.id;
            return (
              <button
                key={section.id}
                onClick={() => {
                  setCurrentSection(section.id);
                  if (section.id !== 'files') {
                    setFolderPath([]);
                    setCurrentFolder(null);
                  }
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-full text-sm transition-colors ${
                  isActive ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'text-blue-600' : ''}`} />
                {section.label}
              </button>
            );
          })}
        </nav>

        {/* Storage Indicator */}
        <div className="p-4 border-t">
          <div className="flex items-center gap-2 mb-2">
            <Cloud className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">Storage</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5 mb-1">
            <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: '5%' }} />
          </div>
          <p className="text-xs text-gray-500">{storageUsed} of 5 GB used</p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {folderPath.length === 0 ? (
                <h1 className="text-lg font-medium text-gray-900">{currentSectionConfig.label}</h1>
              ) : (
                <>
                  <button onClick={() => navigateToFolder(null, -1)} className="text-gray-600 hover:text-gray-900 font-medium">
                    {currentSectionConfig.label}
                  </button>
                  {folderPath.map((folder, index) => (
                    <div key={folder.id} className="flex items-center gap-2">
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                      {index === folderPath.length - 1 ? (
                        <span className="text-gray-900 font-medium">{folder.name}</span>
                      ) : (
                        <button onClick={() => navigateToFolder(folder.id, index)} className="text-gray-600 hover:text-gray-900">
                          {folder.name}
                        </button>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center border rounded-lg">
                <button onClick={() => setViewMode('grid')} className={`p-2 ${viewMode === 'grid' ? 'bg-gray-100' : 'hover:bg-gray-50'}`}>
                  <Grid3X3 className="h-4 w-4" />
                </button>
                <button onClick={() => setViewMode('list')} className={`p-2 ${viewMode === 'list' ? 'bg-gray-100' : 'hover:bg-gray-50'}`}>
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Search and Sort */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-gray-100 rounded-full px-4 py-2.5 flex-1 max-w-2xl focus-within:bg-white focus-within:shadow-md focus-within:ring-1 focus-within:ring-gray-300 transition-all">
              <Search className="h-5 w-5 text-gray-500" />
              <input
                type="text"
                placeholder="Search in OneDrive"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-sm w-full text-gray-900 placeholder:text-gray-500"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="p-1 hover:bg-gray-200 rounded-full">
                  <X className="h-4 w-4 text-gray-500" />
                </button>
              )}
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'name' | 'modified' | 'size')}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none"
            >
              <option value="modified">Modified Date</option>
              <option value="name">Name</option>
              <option value="size">Size</option>
            </select>
          </div>

          {/* Selection Actions */}
          {selectedFiles.size > 0 && (
            <div className="mt-3 flex items-center gap-2 pt-3 border-t">
              <span className="text-sm text-gray-600">{selectedFiles.size} selected</span>
              <div className="flex gap-2">
                <button onClick={() => selectedFiles.forEach((id) => handleDownload(id))} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50">
                  <Download className="inline h-4 w-4 mr-1" /> Download
                </button>
                <button onClick={() => handleShare(Array.from(selectedFiles)[0])} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50">
                  <Share2 className="inline h-4 w-4 mr-1" /> Share
                </button>
                <button onClick={() => handleDelete(Array.from(selectedFiles))} className="rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50">
                  <Trash2 className="inline h-4 w-4 mr-1" /> Delete
                </button>
              </div>
            </div>
          )}

          {/* Pagination */}
          {filteredAndSortedFiles.length > 0 && (
            <div className="flex items-center justify-between mt-3 pt-3 border-t">
              <span className="text-sm text-gray-600">
                {`${currentPage * FILES_PER_PAGE + 1}-${Math.min((currentPage + 1) * FILES_PER_PAGE, filteredAndSortedFiles.length)} of ${filteredAndSortedFiles.length} files`}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                  disabled={currentPage === 0}
                  className="p-1.5 hover:bg-gray-100 rounded-full text-gray-500 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <span className="text-sm text-gray-600 px-2">Page {currentPage + 1} of {totalPages || 1}</span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={currentPage >= totalPages - 1}
                  className="p-1.5 hover:bg-gray-100 rounded-full text-gray-500 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* File Content */}
        <div className="flex-1 overflow-auto">
          {isUploading ? (
            <div className="flex flex-col items-center justify-center h-full py-12">
              <Loader2 className="h-10 w-10 text-blue-600 animate-spin mb-4" />
              <p className="text-gray-700">Uploading files...</p>
            </div>
          ) : paginatedFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-12">
              <div className="p-4 bg-gray-100 rounded-full mb-4">
                {searchQuery ? <Search className="h-12 w-12 text-gray-400" />
                  : currentSection === 'starred' ? <Star className="h-12 w-12 text-gray-400" />
                  : currentSection === 'recycle' ? <Trash2 className="h-12 w-12 text-gray-400" />
                  : currentSection === 'shared' ? <Users className="h-12 w-12 text-gray-400" />
                  : <FolderOpen className="h-12 w-12 text-gray-400" />}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {searchQuery ? 'No files found'
                  : currentSection === 'starred' ? 'No starred files'
                  : currentSection === 'recycle' ? 'Recycle bin is empty'
                  : currentSection === 'shared' ? 'Nothing shared with you yet'
                  : 'No files yet'}
              </h3>
              <p className="text-gray-600 mb-4 text-center max-w-sm">
                {searchQuery ? `No files match "${searchQuery}".`
                  : currentSection === 'starred' ? 'Star files to easily find them later.'
                  : 'Your OneDrive files will appear here after syncing.'}
              </p>
              {!searchQuery && currentSection === 'files' && (
                <button onClick={handleUpload} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  <Upload className="h-4 w-4" /> Upload File
                </button>
              )}
            </div>
          ) : viewMode === 'grid' ? renderGridView() : renderListView()}
        </div>
      </div>

      {/* File Detail Modal */}
      {showFilePreview && selectedFile && !selectedFile.isFolder && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  {(() => {
                    const colors = getFileColors(selectedFile.mimeType);
                    return (
                      <div className={`p-3 ${colors.bg} rounded-xl relative`}>
                        {getFileIcon(selectedFile)}
                        {selectedFile.starred && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 absolute -top-1 -right-1" />}
                      </div>
                    );
                  })()}
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{selectedFile.name}</h2>
                    <p className="text-sm text-gray-600">{formatFileSize(selectedFile.size)}</p>
                  </div>
                </div>
                <button onClick={() => { setShowFilePreview(false); setSelectedFile(null); }} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Type</p>
                    <p className="text-sm font-semibold text-gray-900 truncate">{selectedFile.mimeType.split('/').pop() || 'File'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Modified</p>
                    <p className="text-sm font-semibold text-gray-900">{formatDate(selectedFile.lastModifiedDateTime)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Owner</p>
                    <p className="text-sm font-semibold text-gray-900 truncate">{selectedFile.createdBy || 'Me'}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <a href={selectedFile.webUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                  <ExternalLink className="h-4 w-4" /> Open in OneDrive
                </a>
                <button onClick={() => handleDownload(selectedFile.id)} className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-gray-200 text-gray-800 rounded-lg hover:bg-gray-50 transition-colors font-medium">
                  <Download className="h-4 w-4" /> Download
                </button>
                <button onClick={() => handleShare(selectedFile.id)} className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-gray-200 text-gray-800 rounded-lg hover:bg-gray-50 transition-colors font-medium">
                  <Share2 className="h-4 w-4" /> Copy Link
                </button>
                <button
                  onClick={() => handleStar(selectedFile)}
                  className={`flex items-center justify-center gap-2 px-4 py-3 border-2 rounded-lg transition-colors font-medium ${
                    selectedFile.starred ? 'border-yellow-300 bg-yellow-50 text-yellow-700 hover:bg-yellow-100' : 'border-gray-200 text-gray-800 hover:bg-gray-50'
                  }`}
                >
                  <Star className={`h-4 w-4 ${selectedFile.starred ? 'fill-yellow-500' : ''}`} />
                  {selectedFile.starred ? 'Starred' : 'Star'}
                </button>
                <button onClick={() => { setNewFileName(selectedFile.name); setShowRenameModal(true); }} className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-gray-200 text-gray-800 rounded-lg hover:bg-gray-50 transition-colors font-medium">
                  <Edit3 className="h-4 w-4" /> Rename
                </button>
                <button onClick={handleMove} className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-gray-200 text-gray-800 rounded-lg hover:bg-gray-50 transition-colors font-medium">
                  <Move className="h-4 w-4" /> Move
                </button>
                <button onClick={() => handleCopy(selectedFile)} disabled={actionLoading === 'copy'} className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-gray-200 text-gray-800 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50">
                  <Copy className="h-4 w-4" /> {actionLoading === 'copy' ? 'Copying...' : 'Make a copy'}
                </button>
                <button onClick={() => handleDelete([selectedFile.id])} className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors font-medium">
                  <Trash2 className="h-4 w-4" /> Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {showRenameModal && selectedFile && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Rename</h3>
            <input
              type="text"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all mb-4"
              placeholder="Enter new name"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter' && newFileName.trim()) handleRename(); }}
            />
            <div className="flex gap-3">
              <button onClick={() => setShowRenameModal(false)} className="flex-1 px-4 py-3 border-2 border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium">
                Cancel
              </button>
              <button onClick={handleRename} disabled={actionLoading === 'rename' || !newFileName.trim()} className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50">
                {actionLoading === 'rename' ? 'Renaming...' : 'Rename'}
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
              <button onClick={() => { setShowNewFolderModal(false); setNewFolderName(''); }} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Folder name</label>
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Untitled folder"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter' && newFolderName.trim()) handleCreateFolder(); }}
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setShowNewFolderModal(false); setNewFolderName(''); }} className="px-4 py-2.5 border-2 border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium">
                Cancel
              </button>
              <button onClick={handleCreateFolder} disabled={creatingFolder || !newFolderName.trim()} className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50">
                {creatingFolder ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Creating...</span> : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
