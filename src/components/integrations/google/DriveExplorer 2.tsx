'use client';

import { useState, useEffect } from 'react';
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
  Search,
  Filter,
  Plus,
  X,
  Eye,
  Edit3,
  Copy,
  Move
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

  useEffect(() => {
    loadFiles();
  }, [walletAddress]);

  const loadFiles = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/integrations/google/files?wallet_address=${walletAddress}`
      );
      const result = await response.json();
      if (result.success && result.files) {
        setFiles(result.files);
      }
    } catch (error) {
      console.error('Failed to load files:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileClick = (file: DriveFile) => {
    if (file.mimeType.includes('folder')) {
      setCurrentPath([...currentPath, file.name]);
    } else {
      setSelectedFile(file);
    }
  };

  const handleDownload = async (file: DriveFile) => {
    console.log('Download file:', file);
    // API call to download file
  };

  const handleDelete = async (file: DriveFile) => {
    if (!confirm(`Are you sure you want to delete "${file.name}"?`)) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/integrations/google/files/${file.id}?wallet_address=${walletAddress}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        setFiles(files.filter(f => f.id !== file.id));
        setSelectedFile(null);
      }
    } catch (error) {
      console.error('Failed to delete file:', error);
      alert('Failed to delete file');
    }
  };

  const renderGridView = () => (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 p-6">
      {files.map((file) => {
        const Icon = getFileIcon(file.mimeType);
        return (
          <div
            key={file.id}
            className="group bg-white border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => handleFileClick(file)}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Icon className="h-8 w-8 text-blue-600" />
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedFile(file);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-100 rounded"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </div>
            <p className="font-medium text-sm text-gray-900 truncate mb-1">{file.name}</p>
            <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
          </div>
        );
      })}
    </div>
  );

  const renderListView = () => (
    <div className="overflow-auto">
      <table className="w-full">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Name</th>
            <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Owner</th>
            <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Modified</th>
            <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Size</th>
            <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {files.map((file) => {
            const Icon = getFileIcon(file.mimeType);
            return (
              <tr
                key={file.id}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => handleFileClick(file)}
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 text-gray-400" />
                    <span className="font-medium text-gray-900">{file.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {file.owners?.[0] || 'N/A'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {new Date(file.modifiedTime).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {formatFileSize(file.size)}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(file);
                      }}
                      className="p-2 hover:bg-gray-100 rounded"
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(file);
                      }}
                      className="p-2 hover:bg-gray-100 rounded"
                      title="More"
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
    <div className="bg-white rounded-lg border flex flex-col h-[calc(100vh-200px)]">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2">
            {currentPath.map((path, index) => (
              <div key={index} className="flex items-center gap-2">
                {index > 0 && <ChevronRight className="h-4 w-4 text-gray-400" />}
                <button
                  onClick={() => setCurrentPath(currentPath.slice(0, index + 1))}
                  className={`font-medium ${
                    index === currentPath.length - 1
                      ? 'text-gray-900'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {path}
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Upload className="h-4 w-4" />
              Upload
            </button>
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
        <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-4 py-2">
          <Search className="h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search in Drive"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none text-sm w-full"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {viewMode === 'grid' ? renderGridView() : renderListView()}
      </div>

      {/* File Detail Modal */}
      {selectedFile && !selectedFile.mimeType.includes('folder') && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {(() => {
                    const Icon = getFileIcon(selectedFile.mimeType);
                    return <Icon className="h-8 w-8 text-blue-600" />;
                  })()}
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">{selectedFile.name}</h2>
                    <p className="text-sm text-gray-500">{formatFileSize(selectedFile.size)}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedFile(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-3 mb-6">
                <div>
                  <p className="text-sm text-gray-500">Type</p>
                  <p className="text-sm font-medium">{selectedFile.mimeType}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Modified</p>
                  <p className="text-sm font-medium">
                    {new Date(selectedFile.modifiedTime).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Owner</p>
                  <p className="text-sm font-medium">{selectedFile.owners?.[0] || 'N/A'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button className="flex items-center justify-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
                  <Eye className="h-4 w-4" />
                  Preview
                </button>
                <button
                  onClick={() => handleDownload(selectedFile)}
                  className="flex items-center justify-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  <Download className="h-4 w-4" />
                  Download
                </button>
                <button className="flex items-center justify-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
                  <Share2 className="h-4 w-4" />
                  Share
                </button>
                <button className="flex items-center justify-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
                  <Star className="h-4 w-4" />
                  Star
                </button>
                <button className="flex items-center justify-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
                  <Edit3 className="h-4 w-4" />
                  Rename
                </button>
                <button className="flex items-center justify-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
                  <Move className="h-4 w-4" />
                  Move
                </button>
                <button className="flex items-center justify-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
                  <Copy className="h-4 w-4" />
                  Make a copy
                </button>
                <button
                  onClick={() => handleDelete(selectedFile)}
                  className="flex items-center justify-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Upload Files</h2>
              <button onClick={() => setShowUploadModal(false)}>
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">Drag and drop files here</p>
              <p className="text-sm text-gray-500 mb-4">or</p>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Select Files
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
