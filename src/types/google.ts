/**
 * Google Workspace Integration Types
 * Centralized type definitions for all Google integration components
 */

// ============================================================================
// Gmail Types
// ============================================================================

/** Email body content structure */
export interface EmailBody {
  data?: string;
  size?: number;
  attachmentId?: string;
}

/** Email part structure for multipart messages */
export interface EmailPart {
  partId?: string;
  mimeType?: string;
  filename?: string;
  headers?: Array<{ name: string; value: string }>;
  body?: EmailBody;
  parts?: EmailPart[];
}

/** Gmail message payload structure */
export interface EmailPayload {
  partId?: string;
  mimeType?: string;
  filename?: string;
  headers?: Array<{ name: string; value: string }>;
  body?: EmailBody;
  parts?: EmailPart[];
}

/** API response structure for Gmail messages */
export interface GmailApiMessage {
  id: string;
  threadId?: string;
  from?: string;
  to?: string;
  subject?: string;
  snippet?: string;
  body?: string;
  bodyHtml?: string;
  date?: string;
  starred?: boolean;
  unread?: boolean;
  hasAttachment?: boolean;
  labels?: string[];
  payload?: EmailPayload;
}

export interface GmailMessage {
  id: string;
  threadId: string;
  from: string;
  to: string;
  subject: string;
  snippet: string;
  body?: string;
  bodyHtml?: string;
  date: string;
  starred?: boolean;
  unread?: boolean;
  hasAttachment?: boolean;
  labels?: string[];
  payload?: EmailPayload;
}

export interface GmailData {
  messages?: GmailMessage[];
}

// ============================================================================
// Calendar Types
// ============================================================================

/** API response structure for calendar events */
export interface CalendarApiEvent {
  id?: string;
  summary?: string;
  description?: string;
  start?: string;
  end?: string;
  location?: string;
  attendees?: string[];
  status?: string;
  colorId?: string;
}

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: string;
  end: string;
  location?: string;
  attendees?: string[];
  status?: 'confirmed' | 'tentative' | 'cancelled';
  colorId?: string;
}

export interface CalendarData {
  events?: CalendarEvent[];
}

// ============================================================================
// Drive Types
// ============================================================================

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: string;
  modifiedTime: string;
  owners?: string[];
  webViewLink?: string;
  starred?: boolean;
}

export interface DriveData {
  files?: DriveFile[];
}

// ============================================================================
// Contacts Types
// ============================================================================

export interface Contact {
  resourceName: string;
  names?: Array<{
    givenName?: string;
    familyName?: string;
    displayName?: string;
  }>;
  emailAddresses?: Array<{
    value: string;
    type?: string;
  }>;
  phoneNumbers?: Array<{
    value: string;
    type?: string;
  }>;
  organizations?: Array<{
    name?: string;
    title?: string;
  }>;
}

export interface ContactsData {
  contacts?: Contact[];
}

// ============================================================================
// Tasks Types (Coming Soon)
// ============================================================================

export interface GoogleTask {
  id: string;
  title: string;
  notes?: string;
  status: 'needsAction' | 'completed';
  due?: string;
  completed?: string;
}

export interface TasksData {
  tasks?: GoogleTask[];
}

// ============================================================================
// Combined Google Workspace Data
// ============================================================================

export interface GoogleWorkspaceData {
  gmail?: GmailData;
  calendar?: CalendarData;
  drive?: DriveData;
  contacts?: ContactsData;
  tasks?: TasksData;
}
