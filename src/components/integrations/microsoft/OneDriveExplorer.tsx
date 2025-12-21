'use client';

import { useState } from 'react';
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
  Star,
  MoreVertical,
  Search,
  Grid3X3,
  List,
  ChevronRight,
  Home,
  Users,
  Clock,
  X,
  Eye,
  Edit3,
  Copy,
  Move,
  Link,
  ExternalLink,
  Filter,
  SortAsc
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
}

export default function OneDriveExplorer({
  walletAddress,
  view,
  files
}: OneDriveExplorerProps) {
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'modified' | 'size'>('modified');
  const [showFilePreview, setShowFilePreview] = useState(false);
  const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null);

  const viewTitles: Record<string, string> = {
    files: 'My Files',
    shared: 'Shared with me',
    recent: 'Recent',
    recycle: 'Recycle bin'
  };

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

  const filteredAndSortedFiles = files
    .filter((file) => {
      if (searchQuery) {
        return file.name.toLowerCase().includes(searchQuery.toLowerCase());
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else if (sortBy === 'modified') {
        return new Date(b.lastModifiedDateTime).getTime() - new Date(a.lastModifiedDateTime).getTime();
      } else {
        return b.size - a.size;
      }
    });

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
    } else {
      setSelectedFile(file);
      setShowFilePreview(true);
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
    input.onchange = async (e: any) => {
      const files = Array.from(e.target.files) as File[];

      for (const file of files) {
        try {
          const reader = new FileReader();
          reader.onload = async (event) => {
            const fileContent = event.target?.result as string;

            const response = await fetch(
              `${process.env.NEXT_PUBLIC_API_URL}/api/v1/integrations/microsoft/onedrive/upload`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  wallet_address: walletAddress,
                  file_name: file.name,
                  file_content: fileContent,
                  folder_id: currentFolder || undefined
                })
              }
            );

            if (response.ok) {
              alert(`File "${file.name}" uploaded successfully!`);
              window.location.reload();
            } else {
              const error = await response.json();
              alert(`Error uploading "${file.name}": ${error.detail || 'Failed'}`);
            }
          };
          reader.readAsText(file);
        } catch (error) {
          console.error('Error uploading file:', error);
          alert(`Failed to upload "${file.name}"`);
        }
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

  const handleDelete = (fileIds: string[]) => {
    try {
      // TODO: Implement delete files API endpoint in backend
      console.log('Deleting files:', fileIds);
      alert('Delete functionality coming soon');
    } catch (error) {
      console.error('Error deleting files:', error);
      alert('Failed to delete files');
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
    <div className="flex h-full flex-col rounded-lg border border-gray-200 bg-white shadow-sm">
      {/* Toolbar */}
      <div className="border-b border-gray-200 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">{viewTitles[view]}</h2>
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
  );
}
