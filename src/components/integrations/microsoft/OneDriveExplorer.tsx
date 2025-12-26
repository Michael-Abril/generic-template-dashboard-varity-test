'use client';

import { useState, useMemo } from 'react';
import {
  FolderOpen,
  File,
  FileText,
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
  Home,
  Users,
  Clock,
  X,
  ExternalLink,
  RefreshCw,
  Loader2
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
}

interface OneDriveExplorerProps {
  walletAddress: string;
  view: 'files' | 'shared' | 'recent' | 'recycle';
  files: DriveFile[];
  onDataChange?: () => void;
}

type SectionType = 'files' | 'shared' | 'recent' | 'recycle';

const SECTIONS = [
  { id: 'files' as SectionType, label: 'My Files', icon: Home },
  { id: 'shared' as SectionType, label: 'Shared', icon: Users },
  { id: 'recent' as SectionType, label: 'Recent', icon: Clock },
  { id: 'recycle' as SectionType, label: 'Recycle Bin', icon: Trash2 },
];

export default function OneDriveExplorer({
  walletAddress,
  view: initialView,
  files,
  onDataChange
}: OneDriveExplorerProps) {
  const [currentSection, setCurrentSection] = useState<SectionType>(initialView);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<Array<{ id: string; name: string }>>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'modified' | 'size'>('modified');
  const [showFilePreview, setShowFilePreview] = useState(false);
  const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const currentSectionConfig = SECTIONS.find(s => s.id === currentSection) || SECTIONS[0];

  const getFileIcon = (file: DriveFile) => {
    if (file.isFolder) return <FolderOpen className="h-8 w-8 text-blue-500" />;

    const mimeType = file.mimeType.toLowerCase();
    if (mimeType.includes('image')) return <Image className="h-8 w-8 text-green-500" />;
    if (mimeType.includes('video')) return <Film className="h-8 w-8 text-purple-500" />;
    if (mimeType.includes('audio')) return <Music className="h-8 w-8 text-pink-500" />;
    if (mimeType.includes('pdf')) return <FileText className="h-8 w-8 text-red-500" />;
    if (mimeType.includes('zip') || mimeType.includes('compressed'))
      return <Archive className="h-8 w-8 text-orange-500" />;

    return <File className="h-8 w-8 text-gray-400" />;
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
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const filteredAndSortedFiles = useMemo(() => {
    return files
      .filter((file) => {
        if (searchQuery) {
          return file.name.toLowerCase().includes(searchQuery.toLowerCase());
        }
        return true;
      })
      .sort((a, b) => {
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
  }, [files, searchQuery, sortBy]);

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
      // Navigate to root
      setCurrentFolder(null);
      setFolderPath([]);
    } else {
      // Navigate to specific folder in path
      setCurrentFolder(folderId);
      setFolderPath(prev => prev.slice(0, index + 1));
    }
  };

  const handleDownload = (fileId: string) => {
    const file = files.find(f => f.id === fileId);
    if (file?.webUrl) {
      // Open file in OneDrive for download
      window.open(file.webUrl, '_blank');
    } else {
      alert('File URL not available');
    }
  };

  const handleUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.onchange = async (e: Event) => {
      const target = e.target as HTMLInputElement;
      const selectedFiles = Array.from(target.files || []) as File[];

      if (selectedFiles.length === 0) return;

      setIsUploading(true);
      let successCount = 0;
      let failCount = 0;

      for (const file of selectedFiles) {
        try {
          // Read file as base64 to properly handle binary files
          const base64Content = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const result = reader.result as string;
              // Remove data URL prefix (e.g., "data:image/png;base64,")
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
          } else {
            failCount++;
            const error = await response.json();
            console.error(`Error uploading "${file.name}":`, error.detail || 'Failed');
          }
        } catch (error) {
          failCount++;
          console.error('Error uploading file:', error);
        }
      }

      setIsUploading(false);

      if (successCount > 0) {
        alert(`${successCount} file(s) uploaded successfully!${failCount > 0 ? ` ${failCount} failed.` : ''}`);
        onDataChange?.();
      } else if (failCount > 0) {
        alert(`Failed to upload ${failCount} file(s). Please try again.`);
      }
    };
    input.click();
  };

  const handleShare = (fileId: string) => {
    const file = files.find(f => f.id === fileId);
    if (file?.webUrl) {
      // Copy share link to clipboard
      navigator.clipboard.writeText(file.webUrl).then(() => {
        alert('Share link copied to clipboard!');
      }).catch(() => {
        // Fallback: open in new tab
        window.open(file.webUrl, '_blank');
      });
    } else {
      alert('File URL not available');
    }
  };

  const handleDelete = async (fileIds: string[]) => {
    if (!confirm(`Are you sure you want to delete ${fileIds.length} file(s)?`)) {
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (const fileId of fileIds) {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/integrations/microsoft/onedrive/files/${fileId}?wallet_address=${walletAddress}`,
          { method: 'DELETE' }
        );

        if (response.ok) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (error) {
        console.error('Error deleting file:', error);
        failCount++;
      }
    }

    if (successCount > 0) {
      alert(`${successCount} file(s) deleted successfully!${failCount > 0 ? ` ${failCount} failed.` : ''}`);
      setSelectedFiles(new Set());
      onDataChange?.();
    } else if (failCount > 0) {
      alert(`Failed to delete ${failCount} file(s). Please try again.`);
    }
  };

  const renderGridView = () => (
    <div className="grid grid-cols-2 gap-4 p-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {filteredAndSortedFiles.map((file) => (
        <div
          key={file.id}
          className={`group cursor-pointer rounded-lg border border-gray-200 bg-white p-4 transition-all hover:shadow-md ${
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
            <button
              onClick={(e) => {
                e.stopPropagation();
              }}
              className="opacity-0 transition-opacity group-hover:opacity-100"
            >
              <MoreVertical className="h-4 w-4 text-gray-400" />
            </button>
          </div>

          <div className="mb-3 flex justify-center">{getFileIcon(file)}</div>

          <p className="mb-1 truncate text-sm font-medium text-gray-900">{file.name}</p>
          <p className="text-xs text-gray-500">
            {file.isFolder ? 'Folder' : formatFileSize(file.size)}
          </p>
          <p className="text-xs text-gray-400">{formatDate(file.lastModifiedDateTime)}</p>
        </div>
      ))}
    </div>
  );

  const renderListView = () => (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="border-b border-gray-200 bg-gray-50">
          <tr>
            <th className="w-8 px-4 py-3 text-left">
              <input
                type="checkbox"
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedFiles(new Set(filteredAndSortedFiles.map((f) => f.id)));
                  } else {
                    setSelectedFiles(new Set());
                  }
                }}
                className="rounded border-gray-300"
              />
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Name</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Modified</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Size</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Owner</th>
            <th className="w-16 px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {filteredAndSortedFiles.map((file) => (
            <tr
              key={file.id}
              className={`cursor-pointer transition-colors hover:bg-gray-50 ${
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
                  {getFileIcon(file)}
                  <span className="font-medium text-gray-900">{file.name}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
                {formatDate(file.lastModifiedDateTime)}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
                {file.isFolder ? '-' : formatFileSize(file.size)}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">{file.createdBy || 'Me'}</td>
              <td className="px-4 py-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  className="rounded-lg p-1 hover:bg-gray-100"
                >
                  <MoreVertical className="h-4 w-4 text-gray-400" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-220px)] gap-4">
      {/* Section Sidebar */}
      <div className="w-56 flex-shrink-0 rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <button
            onClick={handleUpload}
            disabled={isUploading}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {isUploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
        <div className="py-2">
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            const isActive = currentSection === section.id;
            return (
              <button
                key={section.id}
                onClick={() => setCurrentSection(section.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-medium border-r-2 border-blue-600'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-blue-600' : 'text-gray-500'}`} />
                <span className="flex-1 text-left">{section.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="border-b border-gray-200 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">{currentSectionConfig.label}</h2>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg border border-gray-300 p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`rounded p-1.5 ${viewMode === 'list' ? 'bg-gray-100' : ''}`}
              >
                <List className="h-4 w-4 text-gray-600" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`rounded p-1.5 ${viewMode === 'grid' ? 'bg-gray-100' : ''}`}
              >
                <Grid3X3 className="h-4 w-4 text-gray-600" />
              </button>
            </div>
            <button
              onClick={handleUpload}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Upload className="h-4 w-4" />
              Upload
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none"
          >
            <option value="modified">Modified Date</option>
            <option value="name">Name</option>
            <option value="size">Size</option>
          </select>
        </div>

        {selectedFiles.size > 0 && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-sm text-gray-600">{selectedFiles.size} selected</span>
            <div className="flex gap-2">
              <button
                onClick={() => selectedFiles.forEach((id) => handleDownload(id))}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
              >
                <Download className="inline h-4 w-4 mr-1" />
                Download
              </button>
              <button
                onClick={() => handleShare(Array.from(selectedFiles)[0])}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
              >
                <Share2 className="inline h-4 w-4 mr-1" />
                Share
              </button>
              <button
                onClick={() => handleDelete(Array.from(selectedFiles))}
                className="rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
              >
                <Trash2 className="inline h-4 w-4 mr-1" />
                Delete
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Breadcrumb Navigation */}
      {folderPath.length > 0 && (
        <div className="px-4 py-2 border-b border-gray-100 flex items-center gap-1 text-sm bg-gray-50">
          <button
            onClick={() => navigateToFolder(null, -1)}
            className="text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
          >
            <Home className="h-4 w-4" />
            My Files
          </button>
          {folderPath.map((folder, index) => (
            <span key={folder.id} className="flex items-center gap-1">
              <ChevronRight className="h-4 w-4 text-gray-400" />
              {index === folderPath.length - 1 ? (
                <span className="text-gray-900 font-medium">{folder.name}</span>
              ) : (
                <button
                  onClick={() => navigateToFolder(folder.id, index)}
                  className="text-blue-600 hover:text-blue-700 hover:underline"
                >
                  {folder.name}
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* File List */}
      <div className="flex-1 overflow-y-auto">
        {filteredAndSortedFiles.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <FolderOpen className="mx-auto h-16 w-16 text-gray-300" />
              <p className="mt-4 text-gray-500">No files found</p>
            </div>
          </div>
        ) : viewMode === 'grid' ? (
          renderGridView()
        ) : (
          renderListView()
        )}
      </div>

      {/* File Preview Modal */}
      {showFilePreview && selectedFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-3xl rounded-lg bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between">
              <div className="flex items-center gap-3">
                {getFileIcon(selectedFile)}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{selectedFile.name}</h3>
                  <p className="text-sm text-gray-500">
                    {formatFileSize(selectedFile.size)} •{' '}
                    {formatDate(selectedFile.lastModifiedDateTime)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowFilePreview(false)}
                className="rounded-lg p-1 hover:bg-gray-100"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="mb-4 flex gap-2">
              <button
                onClick={() => handleDownload(selectedFile.id)}
                className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
              >
                <Download className="h-4 w-4" />
                Download
              </button>
              <button
                onClick={() => handleShare(selectedFile.id)}
                className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
              >
                <Share2 className="h-4 w-4" />
                Share
              </button>
              <a
                href={selectedFile.webUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
              >
                <ExternalLink className="h-4 w-4" />
                Open in OneDrive
              </a>
            </div>

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
              {selectedFile.mimeType.includes('image') ? (
                <img
                  src={selectedFile.webUrl}
                  alt={selectedFile.name}
                  className="mx-auto max-h-96 rounded-lg"
                />
              ) : (
                <div>
                  <File className="mx-auto h-24 w-24 text-gray-300" />
                  <p className="mt-4 text-gray-500">Preview not available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
