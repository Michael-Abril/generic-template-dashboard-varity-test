/**
 * Slack Integration Type Definitions
 * Comprehensive TypeScript interfaces for Slack API data and UI components
 */

// Base User Type
export interface SlackUser {
  id: string;
  name: string;
  real_name?: string;
  status_text?: string;
  image_48?: string;
  online?: boolean;
}

// Channel Types
export interface SlackChannel {
  id: string;
  name: string;
  type: 'channel' | 'dm';
  is_private?: boolean;
  is_member?: boolean;
  topic?: string;
  purpose?: string;
  unread?: number;
  member_count?: number;
  created?: number;
  // DM-specific properties (populated from SlackUser when creating DM list)
  online?: boolean;
  status_text?: string;
  image_48?: string;
}

// Message Types
export interface SlackReaction {
  emoji: string;
  count: number;
  users: string[];
}

export interface SlackAttachment {
  id?: string;
  name?: string;
  mimetype?: string;
  url_private?: string;
  url_private_download?: string;
  size?: number;
  thumb_360?: string;
  thumb_480?: string;
  title?: string;
  fallback?: string;
  pretext?: string;
  text?: string;
  color?: string;
  footer?: string;
  footer_icon?: string;
  ts?: string;
}

export interface SlackMessage {
  id: string;
  user: string;
  text: string;
  timestamp: string;
  thread_ts?: string;
  reply_count?: number;
  reply_users_count?: number;
  latest_reply?: string;
  attachments?: SlackAttachment[];
  reactions?: SlackReaction[];
  edited?: {
    user: string;
    ts: string;
  };
  is_starred?: boolean;
  pinned_to?: string[];
}

// Thread Types
export interface SlackThreadMessage extends SlackMessage {
  parent_user_id?: string;
}

// File Types
export interface SlackFile {
  id: string;
  name: string;
  title?: string;
  mimetype: string;
  filetype?: string;
  pretty_type?: string;
  user: string;
  size: number;
  url_private?: string;
  url_private_download?: string;
  thumb_360?: string;
  thumb_480?: string;
  thumb_720?: string;
  created: number;
  timestamp: number;
  is_external?: boolean;
  external_type?: string;
  is_public?: boolean;
  shares?: {
    [channelId: string]: {
      ts: string;
    }[];
  };
}

// Workspace Types
export interface SlackWorkspace {
  id: string;
  name: string;
  domain?: string;
  icon?: {
    image_34?: string;
    image_44?: string;
    image_68?: string;
    image_88?: string;
    image_102?: string;
    image_132?: string;
  };
}

// API Response Types
export interface SlackChannelsResponse {
  success: boolean;
  channels: SlackChannel[];
}

export interface SlackUsersResponse {
  success: boolean;
  users: SlackUser[];
}

export interface SlackMessagesResponse {
  success: boolean;
  messages: SlackMessage[];
}

export interface SlackThreadResponse {
  success: boolean;
  data: SlackThreadMessage[];
}

export interface SlackFileUploadResponse {
  success: boolean;
  file: SlackFile;
}

export interface SlackSendMessageResponse {
  success: boolean;
  message: {
    ts: string;
    channel: string;
  };
}

export interface SlackReactionResponse {
  success: boolean;
}

// Component Prop Types
export interface SlackPageProps {
  walletAddress: string;
  data?: SlackWorkspaceData;
}

export interface SlackWorkspaceData {
  workspace?: SlackWorkspace;
  channels?: SlackChannel[];
  users?: SlackUser[];
  messages?: SlackMessage[];
}

export interface ChannelListProps {
  channels: SlackChannel[];
  dms: SlackChannel[];
  selectedChannel: SlackChannel | null;
  onSelectChannel: (channel: SlackChannel) => void;
}

export interface MessageListProps {
  messages: SlackMessage[];
  onThreadClick: (message: SlackMessage) => void;
  onReaction: (messageTs: string, emoji: string) => void;
}

export interface MessageComposerProps {
  onSend: (text: string, files?: File[]) => void;
  placeholder?: string;
  initialValue?: string;
}

export interface ThreadPanelProps {
  thread: SlackMessage;
  channelId: string;
  walletAddress: string;
  onSendReply: (text: string, files?: File[]) => void;
  onReaction: (messageTs: string, emoji: string) => void;
}

// Error Types
export interface SlackError {
  error: string;
  detail?: string;
  ok: false;
}

// Search/Filter Types
export interface SlackSearchParams {
  query: string;
  channel?: string;
  user?: string;
  after?: number;
  before?: number;
  count?: number;
}
