'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus, ChevronRight, ChevronDown, MessageSquare, Pin, Trash2,
  Edit2, MoreVertical, FolderOpen, Folder, Settings, Archive,
  Briefcase, BarChart3, Code, FileText, Globe, Lightbulb, Rocket, Star, Users
} from 'lucide-react';
import { Project, ProjectConversation } from '@/types/project';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Icon mapping
const ICON_MAP: Record<string, React.ReactNode> = {
  folder: <Folder className="w-4 h-4" />,
  briefcase: <Briefcase className="w-4 h-4" />,
  chart: <BarChart3 className="w-4 h-4" />,
  code: <Code className="w-4 h-4" />,
  document: <FileText className="w-4 h-4" />,
  globe: <Globe className="w-4 h-4" />,
  lightbulb: <Lightbulb className="w-4 h-4" />,
  rocket: <Rocket className="w-4 h-4" />,
  star: <Star className="w-4 h-4" />,
  users: <Users className="w-4 h-4" />,
};

interface ProjectSidebarProps {
  walletAddress: string;
  currentConversationId: number | null;
  currentProjectId: number | null;
  onSelectConversation: (conversationId: number | null, projectId: number | null) => void;
  onSelectProject: (projectId: number | null) => void;
  onNewChat: (projectId?: number | null) => void;
  onEditProject: (project: Project) => void;
  onNewProject: () => void;
  refreshTrigger?: number;
}

export function ProjectSidebar({
  walletAddress,
  currentConversationId,
  currentProjectId,
  onSelectConversation,
  onSelectProject,
  onNewChat,
  onEditProject,
  onNewProject,
  refreshTrigger = 0,
}: ProjectSidebarProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [recentConversations, setRecentConversations] = useState<ProjectConversation[]>([]);
  const [expandedProjects, setExpandedProjects] = useState<Set<number>>(new Set());
  const [projectConversations, setProjectConversations] = useState<Record<number, ProjectConversation[]>>({});
  const [loading, setLoading] = useState(true);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  // Fetch projects
  const fetchProjects = useCallback(async () => {
    if (!walletAddress) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/projects/?wallet_address=${walletAddress}`,
        { method: 'GET' }
      );

      if (response.ok) {
        const data = await response.json();
        setProjects(data);

        // Auto-expand current project
        if (currentProjectId) {
          setExpandedProjects(prev => new Set([...prev, currentProjectId]));
        }
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
  }, [walletAddress, currentProjectId]);

  // Fetch recent conversations (not in any project)
  const fetchRecentConversations = useCallback(async () => {
    if (!walletAddress) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/conversations/?wallet_address=${walletAddress}&limit=20`,
        { method: 'GET' }
      );

      if (response.ok) {
        const data = await response.json();
        // Filter to only show conversations without a project
        const noProjectConvs = data.filter((c: ProjectConversation) => !c.project_id);
        setRecentConversations(noProjectConvs);
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  // Fetch conversations for a specific project
  const fetchProjectConversations = useCallback(async (projectId: number) => {
    if (!walletAddress) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/projects/${projectId}/conversations?wallet_address=${walletAddress}`,
        { method: 'GET' }
      );

      if (response.ok) {
        const data = await response.json();
        setProjectConversations(prev => ({ ...prev, [projectId]: data }));
      }
    } catch (error) {
      console.error(`Failed to fetch conversations for project ${projectId}:`, error);
    }
  }, [walletAddress]);

  // Toggle project expansion
  const toggleProject = useCallback((projectId: number) => {
    setExpandedProjects(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
        // Fetch conversations when expanding
        fetchProjectConversations(projectId);
      }
      return next;
    });
  }, [fetchProjectConversations]);

  // Initial fetch
  useEffect(() => {
    fetchProjects();
    fetchRecentConversations();
  }, [fetchProjects, fetchRecentConversations, refreshTrigger]);

  // Delete project
  const deleteProject = async (projectId: number) => {
    if (!confirm('Are you sure you want to delete this project?')) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/projects/${projectId}?wallet_address=${walletAddress}&permanent=true`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        setProjects(prev => prev.filter(p => p.id !== projectId));
        if (currentProjectId === projectId) {
          onSelectProject(null);
        }
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  };

  // Archive project
  const archiveProject = async (projectId: number) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/projects/${projectId}?wallet_address=${walletAddress}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_archived: true }),
        }
      );

      if (response.ok) {
        setProjects(prev => prev.filter(p => p.id !== projectId));
        if (currentProjectId === projectId) {
          onSelectProject(null);
        }
      }
    } catch (error) {
      console.error('Failed to archive project:', error);
    }
  };

  // Delete conversation
  const deleteConversation = async (conversationId: number) => {
    if (!confirm('Delete this conversation?')) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/conversations/${conversationId}?wallet_address=${walletAddress}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        // Update recent conversations
        setRecentConversations(prev => prev.filter(c => c.id !== conversationId));

        // Update project conversations
        setProjectConversations(prev => {
          const updated = { ...prev };
          for (const pid in updated) {
            updated[Number(pid)] = updated[Number(pid)].filter(c => c.id !== conversationId);
          }
          return updated;
        });

        if (currentConversationId === conversationId) {
          onSelectConversation(null, currentProjectId);
        }
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  };

  return (
    <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col h-full">
      {/* New Chat / Project Button */}
      <div className="p-3 border-b border-gray-200 space-y-2">
        <button
          onClick={() => onNewChat(currentProjectId)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          New Chat
        </button>
        <button
          onClick={onNewProject}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-all text-sm"
        >
          <FolderOpen className="w-4 h-4" />
          New Project
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-gray-500 text-sm">Loading...</div>
        ) : (
          <>
            {/* Projects Section */}
            {projects.length > 0 && (
              <div className="py-2">
                <div className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Projects
                </div>
                {projects.map(project => (
                  <div key={project.id} className="mb-1">
                    {/* Project Header */}
                    <div
                      className={`group mx-2 rounded-lg cursor-pointer transition-colors ${
                        currentProjectId === project.id && !currentConversationId
                          ? 'bg-blue-100 border border-blue-200'
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      <div className="p-2 flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleProject(project.id);
                          }}
                          className="p-0.5 hover:bg-gray-200 rounded"
                        >
                          {expandedProjects.has(project.id) ? (
                            <ChevronDown className="w-4 h-4 text-gray-500" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-500" />
                          )}
                        </button>

                        <div
                          onClick={() => onSelectProject(project.id)}
                          className="flex-1 flex items-center gap-2 min-w-0"
                        >
                          <div
                            className="w-6 h-6 rounded flex items-center justify-center text-white"
                            style={{ backgroundColor: project.color }}
                          >
                            {ICON_MAP[project.icon] || <Folder className="w-3 h-3" />}
                          </div>
                          <span className="text-sm font-medium text-gray-900 truncate">
                            {project.name}
                          </span>
                        </div>

                        {/* Project Menu */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setMenuOpenId(menuOpenId === `project-${project.id}` ? null : `project-${project.id}`);
                            }}
                            className="p-1 hover:bg-gray-200 rounded"
                          >
                            <MoreVertical className="w-4 h-4 text-gray-500" />
                          </button>

                          {menuOpenId === `project-${project.id}` && (
                            <div className="absolute right-4 mt-1 w-36 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEditProject(project);
                                  setMenuOpenId(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                <Settings className="w-4 h-4" /> Settings
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  archiveProject(project.id);
                                  setMenuOpenId(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                <Archive className="w-4 h-4" /> Archive
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteProject(project.id);
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
                    </div>

                    {/* Project Conversations (expanded) */}
                    {expandedProjects.has(project.id) && (
                      <div className="ml-6 pl-2 border-l border-gray-200">
                        {projectConversations[project.id]?.length === 0 ? (
                          <div className="py-2 px-2 text-xs text-gray-400">No chats yet</div>
                        ) : (
                          projectConversations[project.id]?.map(conv => (
                            <div
                              key={conv.id}
                              className={`group mx-1 my-0.5 rounded cursor-pointer transition-colors ${
                                currentConversationId === conv.id
                                  ? 'bg-blue-50 border border-blue-200'
                                  : 'hover:bg-gray-100'
                              }`}
                              onClick={() => onSelectConversation(conv.id, project.id)}
                            >
                              <div className="p-2 flex items-center gap-2">
                                <MessageSquare className="w-3 h-3 text-gray-400" />
                                <span className="text-xs text-gray-700 truncate flex-1">
                                  {conv.title}
                                </span>
                                {conv.is_pinned && <Pin className="w-3 h-3 text-blue-600" />}
                              </div>
                            </div>
                          ))
                        )}

                        {/* New chat in project button */}
                        <button
                          onClick={() => onNewChat(project.id)}
                          className="mx-1 my-1 px-2 py-1.5 flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded w-full"
                        >
                          <Plus className="w-3 h-3" />
                          New chat
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Recent Chats (not in projects) */}
            {recentConversations.length > 0 && (
              <div className="py-2 border-t border-gray-200">
                <div className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Recent Chats
                </div>
                {recentConversations.map(conv => (
                  <div
                    key={conv.id}
                    className={`group relative mx-2 mb-1 rounded-lg cursor-pointer transition-colors ${
                      currentConversationId === conv.id
                        ? 'bg-blue-100 border border-blue-200'
                        : 'hover:bg-gray-100'
                    }`}
                    onClick={() => onSelectConversation(conv.id, null)}
                  >
                    <div className="p-2.5 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-900 truncate flex-1">
                        {conv.title}
                      </span>
                      {conv.is_pinned && <Pin className="w-3 h-3 text-blue-600" />}
                    </div>

                    {/* Conversation Menu */}
                    <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpenId(menuOpenId === `conv-${conv.id}` ? null : `conv-${conv.id}`);
                        }}
                        className="p-1 hover:bg-gray-200 rounded"
                      >
                        <MoreVertical className="w-4 h-4 text-gray-500" />
                      </button>

                      {menuOpenId === `conv-${conv.id}` && (
                        <div className="absolute right-0 top-6 w-36 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
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

            {/* Empty State */}
            {projects.length === 0 && recentConversations.length === 0 && (
              <div className="p-4 text-center text-gray-500 text-sm">
                <FolderOpen className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p>No projects or chats yet</p>
                <p className="text-xs mt-1">Create a project to organize your work</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default ProjectSidebar;
