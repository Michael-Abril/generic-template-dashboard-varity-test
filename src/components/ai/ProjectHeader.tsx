'use client';

import { useState } from 'react';
import {
  ChevronDown, ChevronUp, Settings, FileText, X,
  Folder, Briefcase, BarChart3, Code, Globe, Lightbulb, Rocket, Star, Users
} from 'lucide-react';
import { Project, ProjectFile } from '@/types/project';

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

interface ProjectHeaderProps {
  project: Project;
  files?: ProjectFile[];
  onEdit: () => void;
  onClose: () => void;
}

export function ProjectHeader({ project, files = [], onEdit, onClose }: ProjectHeaderProps) {
  const [expanded, setExpanded] = useState(false);

  const IconComponent = ICON_COMPONENTS[project.icon] || Folder;

  return (
    <div className="bg-white border-b border-gray-200">
      {/* Collapsed Header */}
      <div className="flex items-center gap-3 px-4 py-2">
        {/* Project Icon & Name */}
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0"
          style={{ backgroundColor: project.color }}
        >
          <IconComponent className="w-4 h-4" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-900 truncate">
            {project.name}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1">
          {/* Expand/Collapse */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
            title={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {/* Edit Project */}
          <button
            onClick={onEdit}
            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
            title="Project Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Close Project */}
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
            title="Exit Project"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="px-4 pb-3 space-y-3">
          {/* Description */}
          {project.description && (
            <div className="text-sm text-gray-600">
              {project.description}
            </div>
          )}

          {/* Custom Instructions Preview */}
          {project.custom_instructions && (
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
              <div className="text-xs font-medium text-blue-700 mb-1">
                Custom Instructions
              </div>
              <div className="text-xs text-blue-600 line-clamp-3">
                {project.custom_instructions}
              </div>
            </div>
          )}

          {/* Pinned Files */}
          {files.length > 0 && (
            <div>
              <div className="text-xs font-medium text-gray-500 mb-2">
                Pinned Files ({files.length})
              </div>
              <div className="flex flex-wrap gap-1.5">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-1.5 px-2 py-1 bg-gray-100 rounded text-xs text-gray-700"
                    title={file.file_name}
                  >
                    <FileText className="w-3 h-3 text-gray-400" />
                    <span className="max-w-[120px] truncate">{file.file_name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center gap-4 text-xs text-gray-500 pt-2 border-t border-gray-100">
            <span>{project.file_count} files</span>
            <span>{project.conversation_count} conversations</span>
            <span>Created {new Date(project.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProjectHeader;
