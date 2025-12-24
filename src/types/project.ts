/**
 * Project Types
 *
 * TypeScript interfaces for the Projects feature
 * Similar to Claude Projects - organize conversations with custom instructions and pinned files
 */

export interface ProjectFile {
  id: number;
  project_id: number;
  file_name: string;
  file_type: string | null;
  source_type: 'upload' | 'integration';
  cid: string | null;
  integration_ref: {
    provider: string;
    item_id: string;
    category: string;
    cid?: string;
    file_name?: string;
  } | null;
  content_preview: string | null;
  file_size: number | null;
  created_at: string;
}

export interface Project {
  id: number;
  wallet_address: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  custom_instructions: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  file_count: number;
  conversation_count: number;
}

export interface ProjectWithFiles extends Project {
  files: ProjectFile[];
}

export interface ProjectConversation {
  id: number;
  wallet_address: string;
  title: string;
  is_pinned: boolean;
  is_archived: boolean;
  integration: string | null;
  project_id: number | null;
  created_at: string;
  updated_at: string;
  last_message_at: string | null;
  message_count: number;
}

// Form types for create/update operations
export interface ProjectCreateForm {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  custom_instructions?: string;
}

export interface ProjectUpdateForm {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  custom_instructions?: string;
  is_archived?: boolean;
}

// Color and icon options for project customization
export const PROJECT_COLORS = [
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#EF4444', // Red
  '#F97316', // Orange
  '#EAB308', // Yellow
  '#22C55E', // Green
  '#06B6D4', // Cyan
  '#6366F1', // Indigo
  '#64748B', // Slate
];

export const PROJECT_ICONS = [
  { value: 'folder', label: 'Folder' },
  { value: 'briefcase', label: 'Briefcase' },
  { value: 'chart', label: 'Chart' },
  { value: 'code', label: 'Code' },
  { value: 'document', label: 'Document' },
  { value: 'globe', label: 'Globe' },
  { value: 'lightbulb', label: 'Lightbulb' },
  { value: 'rocket', label: 'Rocket' },
  { value: 'star', label: 'Star' },
  { value: 'users', label: 'Users' },
];
