# Software Integration Pages - Comprehensive Guide

**Last Updated:** December 26, 2025
**Status:** MVP Launch - Priority Focus on Google, Microsoft, Slack
**Live Site:** https://app.varity.so

This folder contains the frontend UI components for each software integration in the Generic Template Dashboard. Each integration page displays data synced from external software (QuickBooks, Salesforce, HubSpot, Google Workspace, Microsoft 365, Slack) in a clean, professional interface.

---

## Table of Contents

1. [MVP Launch Philosophy](#mvp-launch-philosophy)
2. [Architecture Overview](#architecture-overview)
3. [Integration Status & Features](#integration-status--features)
4. [Component Specifications](#component-specifications)
5. [Data Flow & Backend Endpoints](#data-flow--backend-endpoints)
6. [UI Design Patterns](#ui-design-patterns)
7. [Development Roadmap](#development-roadmap)
8. [File Structure](#file-structure)

---

## MVP Launch Philosophy

### Core Principles

For the MVP launch, each integration page focuses on **core read-only features** that small businesses use daily. Complex features are deferred to future updates.

| Principle | MVP Approach | Future Approach |
|-----------|--------------|-----------------|
| **Data Display** | Read-only view of synced data | Full CRUD operations |
| **Navigation** | Simple tab-based UI | Full sidebar with submenus |
| **Actions** | View/Search only | Create, Edit, Delete, Send |
| **Analytics** | Basic KPIs on Overview tab | Custom dashboards (Analytics page) |
| **Forms** | None | Full modal forms for creation |

### Research-Backed Decisions (December 2025)

Based on comprehensive research from 30+ sources:

> "MVPs with just 2-4 well-developed features see better user engagement compared to those that try to pack in 8-10 features at once." - [RocketMVP](https://www.rocketmvp.io/blog/7-critical-features-every-saas-mvp-must-include-in-2025)

> "While basic analytics are essential, complex dashboards with multiple data visualizations, custom report builders, and advanced filtering options can wait." - [IPH Technologies](https://iphtechnologies.com/mvp-features-startup-app-must-have/)

### Why Read-Only for MVP?

1. **Faster Launch** - No complex form validation or error handling
2. **Lower Risk** - Can't accidentally modify user's production data
3. **Simpler Testing** - Only need to verify data display, not mutations
4. **User Trust** - Users can explore safely before committing to actions
5. **Focus** - Complex analytics handled on dedicated Analytics page

---

## Architecture Overview

### Dynamic Route Structure

All integration pages use a single dynamic Next.js route:

```
src/app/dashboard/tools/[integration]/page.tsx
```

The `params.integration` value determines which native UI to render:

| URL Parameter | Integration Page |
|---------------|------------------|
| `quickbooks`  | QuickBooks Online|
| `salesforce`  | Salesforce CRM   |
| `hubspot`     | HubSpot CRM |
| `google` or `google_workspace` | Google Workspace |
| `microsoft` or `microsoft365` | Microsoft 365 |
| `slack`       | Slack |

### Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                        DATA FLOW ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. USER CONNECTS (Marketplace)                                      │
│     OAuth flow → Backend stores encrypted tokens                     │
│                                                                      │
│  2. DATA SYNC (Automatic or Manual)                                  │
│     Backend fetches from provider API → Encrypts → Stores to Pinata  │
│                                                                      │
│  3. FRONTEND DISPLAY (Integration Page)                              │
│     GET /api/v1/integrations/{provider}/data                         │
│     → Backend retrieves from Pinata → Decrypts → Returns JSON        │
│     → Frontend renders in native-like UI                             │
│                                                                      │
│  4. AI ASSISTANT (Optional)                                          │
│     Data indexed in Qdrant → AI can query via RAG                    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Data Pipeline Architecture

### Universal Base Adapter Pattern

All integration adapters inherit from `BaseDataAdapter` (`backend/app/adapters/base_adapter.py`) which provides the **COMPLETE** data pipeline:

1. **Wallet Normalization** - Consistent wallet address format for storage/retrieval
2. **Pagination** - Generic pagination handling for different API styles (cursor, offset, page)
3. **Chunking** - Date-based grouping (monthly/quarterly/yearly) for efficient storage
4. **Encryption** - AES-256-GCM with wallet-derived key
5. **Pinata Upload** - Automatic upload to Filecoin/IPFS
6. **RAG Configuration** - `RAG_ENABLED_TYPES` defines what gets indexed in Qdrant

Each adapter only needs to implement:
- `INTEGRATION_NAME` - The integration identifier (e.g., "slack")
- `RAG_ENABLED_TYPES` - Data types to index in Qdrant
- `get_data_types()` - Available data types
- `fetch_data(data_type)` - Fetch from external API
- `transform_data(data_type, raw_data)` - Transform to common schema

```python
# Example: Slack Adapter (backend/app/adapters/slack/sync.py)
class SlackSync(BaseDataAdapter):
    INTEGRATION_NAME = "slack"
    RAG_ENABLED_TYPES = ["files"]  # Only files go to Qdrant

    def get_data_types(self) -> List[str]:
        return ["channels", "messages", "users", "files"]

    async def fetch_data(self, data_type: str, **kwargs) -> Dict[str, Any]:
        # Call Slack API...

    def transform_data(self, data_type: str, raw_data: Dict) -> List[Dict]:
        # Transform to common schema...
```

### Hybrid Data Model (RAG Storage vs Live API)

**CRITICAL:** Not all data is stored in Pinata/RAG. Some data types are fetched via live API calls.

| Integration | RAG Storage (Pinata + Qdrant) | Live API Calls | Status |
|-------------|------------------------------|----------------|--------|
| **Google Workspace** | Drive files, Contacts | Gmail, Calendar | PRIORITY |
| **Microsoft 365** | OneDrive files, Contacts | Mail, Calendar | PRIORITY |
| **Slack** | Files | Channels, Messages, Users | PRIORITY |
| **QuickBooks** | TBD - needs research | TBD | Later |
| **Salesforce** | TBD - needs research | TBD | Later |
| **HubSpot** | TBD - needs research | TBD | Later |

### Why This Hybrid Approach?

**RAG Storage (Pinata + Qdrant) is best for:**
- Documents that need full-text search
- Data that AI should "remember" and answer questions about
- Files that don't change frequently
- Data small enough to embed (<10K records per sync)

**Live API Calls are best for:**
- Frequently changing data (emails, calendar events)
- Large volumes (thousands of emails)
- Time-sensitive data (real-time inbox)
- Metadata-heavy data with low RAG value

### Data Flow Diagram (Detailed)

```
┌────────────────────────────────────────────────────────────────────────────┐
│                            DATA PIPELINE                                   │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  RAG STORAGE PATH (Drive, Contacts, OneDrive, Files)                       │
│  ════════════════════════════════════════════════════                      │
│                                                                            │
│  1. Sync Trigger → 2. Fetch from API → 3. Transform → 4. Chunk by Date    │
│                                           │                                │
│                                           ▼                                │
│  5. Encrypt (AES-256-GCM) → 6. Upload to Pinata → 7. Index in Qdrant      │
│                                           │               │                │
│                                           │               ▼                │
│  8. Frontend calls GET /integrations/{provider}/data                       │
│                     ↓                                                      │
│  9. Backend retrieves from Pinata → 10. Decrypt → 11. Return JSON          │
│                                                                            │
│                                                                            │
│  LIVE API PATH (Gmail, Calendar, Outlook Mail, Slack Messages)             │
│  ══════════════════════════════════════════════════════════════            │
│                                                                            │
│  1. Frontend calls GET /integrations/google/emails (or /events)            │
│                     ↓                                                      │
│  2. Backend retrieves OAuth token from DB                                  │
│                     ↓                                                      │
│  3. Backend calls Gmail/Calendar/Outlook API directly                      │
│                     ↓                                                      │
│  4. Returns JSON (NOT stored in Pinata, NOT indexed in RAG)                │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

### Backend Endpoints by Data Path

**RAG Storage Path:**
```
POST /api/v1/integrations/{provider}/sync    → Triggers full sync to Pinata
GET  /api/v1/integrations/{provider}/data    → Retrieves decrypted data from Pinata
```

**Live API Path (Google):**
```
GET  /api/v1/integrations/google/emails      → Live Gmail API call
GET  /api/v1/integrations/google/events      → Live Calendar API call
```

**Live API Path (Microsoft):**
```
GET  /api/v1/integrations/microsoft/mail     → Live Outlook API call
GET  /api/v1/integrations/microsoft/calendar → Live Calendar API call
```

**Live API Path (Slack):**
```
GET  /api/v1/slack/channels                  → Live Slack API call
GET  /api/v1/slack/messages                  → Live Slack API call
```

### Frontend Implementation Pattern

**For RAG-stored data (Drive, Contacts, OneDrive):**
```tsx
// Data comes from parent via props (fetched from Pinata)
function DriveExplorer({ walletAddress, data }) {
  // data?.files contains files from Pinata sync
  const files = data?.files || [];
  // Render files...
}
```

**For Live API data (Gmail, Calendar, Outlook Mail):**
```tsx
// Data fetched directly via API call
function GmailInbox({ walletAddress }) {
  const [emails, setEmails] = useState([]);

  useEffect(() => {
    const fetchEmails = async () => {
      const res = await fetch(
        `${API_URL}/api/v1/integrations/google/emails?wallet_address=${walletAddress}&max_results=100`
      );
      const data = await res.json();
      setEmails(data.emails || []);
    };
    fetchEmails();
  }, [walletAddress]);

  // Render emails...
}
```

### Adapter RAG Configuration Reference

Each adapter inherits from `BaseDataAdapter` and defines which data types get indexed in Qdrant via `RAG_ENABLED_TYPES`:

```python
# All adapters inherit from BaseDataAdapter for consistent data pipeline
from app.adapters.base_adapter import BaseDataAdapter

# backend/app/adapters/google/sync.py
class GoogleWorkspaceSync(BaseDataAdapter):
    INTEGRATION_NAME = "google"
    RAG_ENABLED_TYPES = ["drive", "contacts"]

# backend/app/adapters/microsoft/sync.py
class MicrosoftSync(BaseDataAdapter):
    INTEGRATION_NAME = "microsoft"
    RAG_ENABLED_TYPES = ["onedrive", "contacts"]

# backend/app/adapters/slack/sync.py
class SlackSync(BaseDataAdapter):
    INTEGRATION_NAME = "slack"
    RAG_ENABLED_TYPES = ["files"]

# backend/app/adapters/quickbooks/sync.py
class QuickBooksSync(BaseDataAdapter):
    INTEGRATION_NAME = "quickbooks"
    RAG_ENABLED_TYPES = ["invoices", "expenses", "customers", "vendors", "payments"]

# backend/app/adapters/salesforce/sync.py
class SalesforceSync(BaseDataAdapter):
    INTEGRATION_NAME = "salesforce"
    RAG_ENABLED_TYPES = ["contacts", "opportunities", "accounts", "leads", "tasks"]

# backend/app/adapters/hubspot/sync.py
class HubSpotSync(BaseDataAdapter):
    INTEGRATION_NAME = "hubspot"
    RAG_ENABLED_TYPES = ["contacts", "deals", "companies", "emails", "tickets"]
```

### Key Files Reference

| File | Purpose |
|------|---------|
| `backend/app/adapters/base_adapter.py` | Universal base class with pagination/chunking |
| `backend/app/adapters/google/sync.py` | Google Workspace sync (reference implementation) |
| `backend/app/api/v1/integrations.py` | Sync orchestration + RAG indexing logic |
| `backend/app/api/v1/google.py` | Live API endpoints for Gmail/Calendar |
| `backend/app/services/filecoin_service.py` | Pinata storage operations |
| `backend/app/services/rag_service.py` | Qdrant vector indexing |
| `backend/app/services/encryption_service.py` | AES-256-GCM encryption |

---

### Component Architecture Pattern (MVP)

Each integration page follows this simplified structure:

```typescript
interface IntegrationPageProps {
  walletAddress: string;
  data: any;              // Synced data from backend
  onRefresh?: () => void; // Trigger re-sync
}

function IntegrationPage({ walletAddress, data, onRefresh }: IntegrationPageProps) {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="h-full bg-white dark:bg-gray-900">
      {/* Header with integration name and sync button */}
      <Header onSync={onRefresh} />

      {/* Simple tab navigation */}
      <TabNav
        tabs={['Overview', 'Tab2', 'Tab3']}
        active={activeTab}
        onChange={setActiveTab}
      />

      {/* Tab content - read-only data display */}
      <TabContent tab={activeTab} data={data} />
    </div>
  );
}
```

---

## Integration Status & Features

### 1. Google Workspace

**Status:** MVP Ready
**File:** `/google/GoogleWorkspacePage.tsx`

| Tab | MVP Features | Data Source | Future Features |
|-----|--------------|-------------|-----------------|
| **Home** | Quick stats, recent activity | Aggregated | Action shortcuts |
| **Gmail** | Inbox list, read emails, search | `data.emails` | Compose, reply, labels |
| **Calendar** | Event list, day/week view | `data.events` | Create events, RSVP |
| **Drive** | File/folder browser, search | `data.files` | Upload, share, edit |
| **Contacts** | Contact list, search | `data.contacts` | Add/edit contacts |
| **Tasks** | Coming Soon badge | - | Task management |

**Key Files:**
- `GoogleWorkspacePage.tsx` - Main page with tab navigation
- `GmailInbox.tsx` - Email list and viewer
- `CalendarView.tsx` - Calendar display
- `DriveExplorer.tsx` - File browser
- `ContactsList.tsx` - Contacts list

---

### 2. QuickBooks Online

**Status:** Needs Simplification (currently has complex sidebar)
**File:** `/quickbooks/QuickBooksPage.tsx`

| Tab | MVP Features | Data Source | Future Features |
|-----|--------------|-------------|-----------------|
| **Overview** | KPIs: Income, Expenses, Profit, Cash | Calculated from data | Bank accounts, trends |
| **Invoices** | List with status badges (paid/open/overdue) | `data.invoices` | Create, edit, send |
| **Expenses** | List by category, search | `data.expenses` | Create, receipts |

**Remove for MVP:**
- Complex sidebar navigation with submenus
- Create menu with 13+ action options
- Form modals (InvoiceForm, CustomerForm, ExpenseForm)
- Vendors tab, Reports tab
- Coming Soon sections (Banking, Taxes, Payroll)

**Key Files to Simplify:**
- `QuickBooksPage.tsx` - Rewrite with tab navigation (currently 449 lines)
- `QuickBooksDashboard.tsx` - Keep KPIs only (currently 387 lines)
- `InvoicesList.tsx` - Remove CRUD, keep read-only table (currently 436 lines)
- `ExpensesList.tsx` - Remove CRUD, keep read-only table (currently 201 lines)

**Files to Delete (post-MVP):**
- `CustomerForm.tsx`, `InvoiceForm.tsx`, `ExpenseForm.tsx`
- `CustomersList.tsx`, `VendorsList.tsx`, `ReportViewer.tsx`

---

### 3. Microsoft 365

**Status:** ✅ Fully Enhanced (December 26, 2025)
**Files:** `/microsoft/Microsoft365Page.tsx`, `OutlookInbox.tsx`, `CalendarView.tsx`, `OneDriveExplorer.tsx`

| Tab | Features | Data Source | Status |
|-----|----------|-------------|--------|
| **Overview** | Quick stats, recent activity | Aggregated | ✅ Working |
| **Outlook** | Full inbox, compose, keyboard shortcuts, flag/archive/delete | Live API | ✅ Working |
| **Calendar** | Day/week/month views, create/edit/delete events, Teams meetings | Live API | ✅ Working |
| **OneDrive** | File browser, upload, create folder, rename, copy, star | Live API | ✅ Working |
| **Contacts** | Contact list, search | Live API | ✅ Working |
| **Tasks** | To-Do list | Coming Soon | 🔜 Coming |

**Key Files:**
- `Microsoft365Page.tsx` - Main page with tab navigation (505 lines)
- `OutlookInbox.tsx` - Full email client (920 lines)
- `CalendarView.tsx` - Calendar with event editing (1,205 lines)
- `OneDriveExplorer.tsx` - File manager (1,116 lines)
- `ContactsList.tsx` - Contact management (186 lines)

#### OutlookInbox.tsx Features (920 lines)

| Feature | Description |
|---------|-------------|
| **Keyboard Shortcuts** | Gmail-style: c (compose), j/k (navigate), e (archive), # (delete), s (flag), r (reply), a (reply all), f (forward), / (search), Esc (close) |
| **Shortcuts Help** | Shift+? opens help modal |
| **Email Actions** | Read, reply, reply all, forward, archive, delete, flag/unflag, mark read/unread |
| **Compose** | Full compose modal with to/cc/bcc, rich text body |
| **Hover Actions** | Quick action buttons appear on email row hover |
| **API Error Banner** | Shows reconnection prompt on 401 token expiration |
| **Optimistic Updates** | Instant UI feedback before API confirmation |
| **Search** | Real-time search filtering |
| **Folder Navigation** | Inbox, Sent, Drafts, Junk, Deleted, Archive |

#### CalendarView.tsx Features (1,205 lines)

| Feature | Description |
|---------|-------------|
| **Views** | Day, Week, Month with smooth navigation |
| **Create Events** | Full form with title, date/time, location, attendees, Teams meeting option |
| **Edit Events** | Update existing events with same form |
| **Delete Events** | With confirmation dialog |
| **Quick Create** | Click on empty time slot to create event at that time |
| **Teams Integration** | Create Teams meetings, clickable join buttons |
| **Category Colors** | Events colored by category (Blue, Green, Purple, Red, Yellow, Orange) |
| **Mini Stats** | Shows upcoming event count and Teams meeting count |
| **API Error Banner** | Token expiration notification |

#### OneDriveExplorer.tsx Features (1,116 lines)

| Feature | Description |
|---------|-------------|
| **File Browser** | List/grid views with folder navigation |
| **Create Folder** | New folder modal with backend integration |
| **Upload Files** | File upload with progress indicator |
| **Rename** | Rename files and folders |
| **Copy** | Duplicate files |
| **Star/Favorite** | Star files for quick access |
| **Delete** | Delete files with confirmation |
| **Office Colors** | Word (blue), Excel (green), PowerPoint (orange), PDF (red) icons |
| **Storage Info** | Shows used/total storage with progress bar |
| **Pagination** | 50 files per page with navigation |
| **"New" Menu** | Dropdown with New Folder, File Upload options |
| **Starred Section** | Quick access to starred files in sidebar |

#### Backend Endpoints (microsoft.py - 989 lines)

**Outlook Mail:**
```
GET  /mail/messages                    → List emails from folder
POST /mail/send                        → Send email
POST /mail/drafts                      → Save draft
PATCH /mail/messages/{id}/read         → Mark read/unread
DELETE /mail/messages/{id}             → Delete email
POST /mail/messages/{id}/archive       → Archive email
PATCH /mail/messages/{id}/flag         → Flag/unflag email
```

**Calendar:**
```
GET  /calendar/events                  → List events
POST /calendar/events                  → Create event
PATCH /calendar/events/{id}            → Update event (NEW)
DELETE /calendar/events/{id}           → Delete event
```

**OneDrive:**
```
GET  /onedrive/files                   → List files
POST /onedrive/upload                  → Upload file
DELETE /onedrive/files/{id}            → Delete file
POST /onedrive/folders                 → Create folder (NEW)
PATCH /onedrive/files/{id}/rename      → Rename file (NEW)
POST /onedrive/files/{id}/copy         → Copy file (NEW)
GET  /onedrive/storage                 → Get storage info (NEW)
```

**Contacts:**
```
GET  /contacts                         → List contacts
POST /contacts                         → Create contact
DELETE /contacts/{id}                  → Delete contact
```

**Tasks (To-Do):**
```
GET  /tasks                            → List tasks
POST /tasks                            → Create task
PATCH /tasks/{id}                      → Update task
DELETE /tasks/{id}                     → Delete task
```

---

### 4. Slack

**Status:** Needs Simplification
**File:** `/slack/SlackPage.tsx`

| Tab | MVP Features | Data Source | Future Features |
|-----|--------------|-------------|-----------------|
| **Overview** | Workspace stats, recent activity | Aggregated | - |
| **Channels** | Channel list with member counts | `data.channels` | Create channels |
| **Messages** | Recent messages per channel | `data.messages` | Send, threads, reactions |
| **Search** | Search across messages | All messages | Advanced filters |

---

### 5. Salesforce CRM

**Status:** Needs Simplification
**File:** `/salesforce/SalesforcePage.tsx`

| Tab | MVP Features | Data Source | Future Features |
|-----|--------------|-------------|-----------------|
| **Overview** | Pipeline stats, recent activity | Aggregated | - |
| **Contacts** | Contact list with search | `data.contacts` | Add/edit, detail view |
| **Leads** | Lead list with status | `data.leads` | Create, convert |
| **Opportunities** | Deals list or simple pipeline | `data.opportunities` | Kanban, stages |

---

### 6. HubSpot CRM

**Status:** Needs Simplification
**File:** `/hubspot/HubSpotPage.tsx`

| Tab | MVP Features | Data Source | Future Features |
|-----|--------------|-------------|-----------------|
| **Overview** | Pipeline stats, recent activity | Aggregated | - |
| **Contacts** | Contact list with search | `data.contacts` | Add/edit, timeline |
| **Deals** | Deals list or simple pipeline | `data.deals` | Kanban board |
| **Companies** | Company list | `data.companies` | Add/edit, associations |

---

## Component Specifications

### Standard Tab Navigation Component

All integration pages should use this consistent tab pattern:

```typescript
interface Tab {
  id: string;
  label: string;
  icon?: LucideIcon;
  badge?: string | number;
}

function TabNavigation({ tabs, activeTab, onTabChange }: {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}) {
  return (
    <div className="border-b border-gray-200 dark:border-gray-700">
      <nav className="flex space-x-8 px-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.icon && <tab.icon className="w-4 h-4 mr-2 inline" />}
            {tab.label}
            {tab.badge && (
              <span className="ml-2 bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}
```

### Standard KPI Card Component

```typescript
function KPICard({ title, value, change, icon: Icon, color }: {
  title: string;
  value: string | number;
  change?: { value: number; positive: boolean };
  icon?: LucideIcon;
  color?: 'green' | 'blue' | 'red' | 'gray';
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {change && (
              <p className={`text-xs mt-1 ${change.positive ? 'text-green-600' : 'text-red-600'}`}>
                {change.positive ? '+' : ''}{change.value}%
              </p>
            )}
          </div>
          {Icon && (
            <div className={`p-3 rounded-full bg-${color}-100`}>
              <Icon className={`w-6 h-6 text-${color}-600`} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

### Standard Data Table Component

```typescript
function DataTable({ columns, data, searchable, emptyMessage }: {
  columns: { key: string; header: string; render?: (value: any, row: any) => ReactNode }[];
  data: any[];
  searchable?: boolean;
  emptyMessage?: string;
}) {
  const [search, setSearch] = useState('');

  const filtered = searchable && search
    ? data.filter(row =>
        columns.some(col =>
          String(row[col.key]).toLowerCase().includes(search.toLowerCase())
        )
      )
    : data;

  return (
    <Card>
      {searchable && (
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
      )}
      <CardContent>
        <table className="w-full">
          <thead>
            <tr className="border-b">
              {columns.map(col => (
                <th key={col.key} className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, i) => (
              <tr key={i} className="border-b hover:bg-gray-50">
                {columns.map(col => (
                  <td key={col.key} className="py-3 px-4 text-sm">
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="text-center py-8 text-gray-500">
            {emptyMessage || 'No data available'}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
```

---

## Data Flow & Backend Endpoints

### Primary Data Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/integrations/{provider}/data` | GET | Retrieve all synced data for integration |
| `/api/v1/integrations/{provider}/sync` | POST | Trigger data sync from provider |
| `/api/v1/oauth/status/{provider}` | GET | Check OAuth connection status |

### Provider-Specific Endpoints

**QuickBooks:**
```
GET  /api/v1/quickbooks/company      → Company info
GET  /api/v1/quickbooks/invoices     → List invoices
GET  /api/v1/quickbooks/expenses     → List expenses
GET  /api/v1/quickbooks/customers    → List customers
```

**Google Workspace:**
```
GET  /api/v1/integrations/google/data?types=emails,events,files,contacts
POST /api/v1/integrations/google/sync
```

**Microsoft 365:**
```
GET  /api/v1/microsoft/mail          → Emails
GET  /api/v1/microsoft/calendar      → Events
GET  /api/v1/microsoft/onedrive      → Files
```

**Slack:**
```
GET  /api/v1/slack/channels          → Channel list
GET  /api/v1/slack/messages          → Messages
```

**Salesforce:**
```
GET  /api/v1/salesforce/contacts     → Contacts
GET  /api/v1/salesforce/leads        → Leads
GET  /api/v1/salesforce/opportunities → Opportunities
```

**HubSpot:**
```
GET  /api/v1/hubspot/contacts        → Contacts
GET  /api/v1/hubspot/deals           → Deals
GET  /api/v1/hubspot/companies       → Companies
```

---

## UI Design Patterns

### Standard Page Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  [Icon] Integration Name                    [Sync] [Last: 5m]  │
├─────────────────────────────────────────────────────────────────┤
│  [Overview] [Tab 2] [Tab 3] [Tab 4]                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐              │
│  │  KPI 1  │ │  KPI 2  │ │  KPI 3  │ │  KPI 4  │              │
│  │  $12.5K │ │  $8.2K  │ │  $4.3K  │ │   47    │              │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘              │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ [Search...]                                               │  │
│  ├───────────────────────────────────────────────────────────┤  │
│  │ Column 1    │ Column 2    │ Column 3    │ Status         │  │
│  ├─────────────┼─────────────┼─────────────┼────────────────┤  │
│  │ Row data    │ Row data    │ Row data    │ [Badge]        │  │
│  │ Row data    │ Row data    │ Row data    │ [Badge]        │  │
│  │ Row data    │ Row data    │ Row data    │ [Badge]        │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Color Coding

| Status | Color | Tailwind Class |
|--------|-------|----------------|
| Success/Paid/Active | Green | `text-green-600`, `bg-green-100` |
| Pending/Open | Blue | `text-blue-600`, `bg-blue-100` |
| Warning/Overdue | Red | `text-red-600`, `bg-red-100` |
| Draft/Inactive | Gray | `text-gray-600`, `bg-gray-100` |

### Empty States

Every data view should handle empty states gracefully:

```typescript
{data.length === 0 ? (
  <div className="text-center py-12">
    <Icon className="w-12 h-12 mx-auto text-gray-300 mb-4" />
    <h3 className="text-lg font-medium text-gray-900">No data yet</h3>
    <p className="text-sm text-gray-500 mt-1">
      Sync your {integrationName} data to see it here.
    </p>
    <Button onClick={onSync} className="mt-4">
      Sync Now
    </Button>
  </div>
) : (
  <DataTable data={data} />
)}
```

---

## Development Roadmap

### Phase 1: MVP Launch (Current)

**Goal:** Full-featured integration pages with native-like functionality

- [ ] Simplify QuickBooks to 3-tab layout
- [x] **Microsoft 365 - COMPLETE** (December 26, 2025) - Full Outlook, Calendar, OneDrive with CRUD
- [ ] Simplify Slack to 3-tab layout
- [ ] Simplify Salesforce to 4-tab layout
- [ ] Simplify HubSpot to 4-tab layout
- [x] **Google Workspace** - MVP-ready (reference implementation)

**Acceptance Criteria:**
- ✅ Tab-based navigation (Google, Microsoft complete)
- ✅ Full CRUD operations where applicable (Microsoft has full email/calendar/drive CRUD)
- ✅ Keyboard shortcuts (Microsoft Outlook matches Gmail)
- ✅ Clean search/filter on tables
- ✅ Proper empty states
- ✅ API error handling with reconnect prompts
- ✅ Optimistic UI updates
- Dark mode support (partial)

### Phase 2: Actions (Post-Launch)

**Goal:** Add ability to create and modify records

- Create forms for each record type
- Edit functionality with modals
- Delete with confirmation
- Send/Export actions where applicable
- Real-time validation

### Phase 3: Full Feature Parity

**Goal:** Match native software functionality

- Full sidebar navigation
- All action menus
- Keyboard shortcuts
- Drag-and-drop (Kanban boards)
- Rich text editors
- File uploads
- Real-time updates

---

## File Structure

```
/src/components/integrations/
├── README.md                    # This file
│
├── google/
│   ├── GoogleWorkspacePage.tsx  # Main page (MVP ready)
│   ├── GmailInbox.tsx           # Email list/viewer
│   ├── CalendarView.tsx         # Calendar display
│   ├── DriveExplorer.tsx        # File browser
│   ├── ContactsList.tsx         # Contacts list
│   ├── EmailComposer.tsx        # (Future: compose emails)
│   ├── EventForm.tsx            # (Future: create events)
│   └── index.ts
│
├── quickbooks/
│   ├── QuickBooksPage.tsx       # Main page (needs simplification)
│   ├── QuickBooksDashboard.tsx  # KPI overview
│   ├── InvoicesList.tsx         # Invoice table
│   ├── ExpensesList.tsx         # Expense table
│   ├── CustomersList.tsx        # (Remove for MVP)
│   ├── VendorsList.tsx          # (Remove for MVP)
│   ├── ReportViewer.tsx         # (Remove for MVP)
│   ├── InvoiceForm.tsx          # (Remove for MVP)
│   ├── CustomerForm.tsx         # (Remove for MVP)
│   ├── ExpenseForm.tsx          # (Remove for MVP)
│   └── index.ts
│
├── microsoft/
│   ├── Microsoft365Page.tsx     # Main page with tab navigation (505 lines)
│   ├── OutlookInbox.tsx         # Full email client with keyboard shortcuts (920 lines)
│   ├── CalendarView.tsx         # Calendar with event CRUD + Teams (1,205 lines)
│   ├── OneDriveExplorer.tsx     # File manager with folder/rename/copy (1,116 lines)
│   ├── ContactsList.tsx         # Contact list (186 lines)
│   ├── TaskList.tsx             # To-Do tasks (Coming Soon)
│   └── index.ts
│
├── slack/
│   └── SlackPage.tsx            # Main page (needs simplification)
│
├── salesforce/
│   └── SalesforcePage.tsx       # Main page (needs simplification)
│
└── hubspot/
    └── HubSpotPage.tsx          # Main page (needs simplification)
```

---

---

# AI ASSISTANT DOCUMENTATION

**Last Updated:** December 26, 2025
**Location:** `src/components/AIChat.tsx` + `src/components/ai/`
**Status:** Fully Implemented (awaiting database migration for Projects)

---

## AI Assistant Overview

The AI Assistant is a **Claude Projects-like interface** for business intelligence. It provides:
- Multi-mode AI chat (Standard, Deep Research, Deep Analysis, Document)
- Project organization with custom AI instructions
- Cursor-style context picker (3-level hierarchy)
- Email and document creation actions
- Full conversation history with persistence

---

## Architecture

```
AI Assistant Page (/ai-assistant)
│
├── ProjectSidebar (left panel)
│   ├── New Chat / New Project buttons
│   ├── Projects list (expandable with conversations)
│   └── Recent Chats (not in any project)
│
└── Main Chat Area
    ├── Header (title, integrations badges, actions menu)
    ├── ProjectHeader (when project selected - shows context)
    ├── Action Panel (email/document creation forms)
    ├── Messages Area (chat history with sources)
    ├── Context Picker (3-level hierarchical selection)
    └── Input Area (mode selector, integration filter, textarea)
```

---

## Component Files

| Component | File | Lines | Purpose |
|-----------|------|-------|---------|
| **AIChat** | `src/components/AIChat.tsx` | 2,400+ | Main chat interface |
| **ProjectSidebar** | `src/components/ai/ProjectSidebar.tsx` | ~400 | Project/conversation navigation |
| **ProjectEditor** | `src/components/ai/ProjectEditor.tsx` | ~350 | Create/edit project modal |
| **ProjectHeader** | `src/components/ai/ProjectHeader.tsx` | ~200 | Display selected project info |
| **ContextPicker** | `src/components/ai/ContextPicker.tsx` | ~500 | 3-level context selection |
| **SuggestedPrompts** | `src/components/ai/SuggestedPrompts.tsx` | ~200 | Integration-aware suggestions |
| **CodeBlock** | `src/components/ai/CodeBlock.tsx` | ~50 | Code with copy button |

---

## AI Modes

| Mode | Endpoint | Temperature | Purpose |
|------|----------|-------------|---------|
| **Standard** | `/api/v1/ai/chat/general` | 0.7 | Quick answers from business data |
| **Deep Research** | `/api/v1/ai/query/combined` | 0.7 | RAG + optional web search |
| **Deep Analysis** | `/api/v1/ai/research` | 0.3 | Executive-level reports |
| **Document** | `/api/v1/ai/analyze/document` | 0.7 | Upload & analyze files |

### Mode Selection Flow
```
User clicks mode dropdown
    ↓
Standard → Quick answers, no web search
Deep Research → Toggle web search available
Deep Analysis → Comprehensive analysis
Document → File upload UI appears
```

---

## Projects Feature (Claude-like)

### What Projects Do
- **Organize conversations** into logical groups
- **Custom AI instructions** applied to all chats in project
- **Pin files** as permanent context
- **Color and icon** customization (10 colors, 10 icons)

### Project User Flow
```
1. Click "New Project" → ProjectEditor modal opens
2. Fill: name, description, color, icon, custom instructions
3. Click "Create Project" → POST /api/v1/projects/
4. Project appears in sidebar
5. Click project → ProjectHeader shows at top
6. Start chatting → Project instructions guide AI responses
```

### Project Data Model
```typescript
interface Project {
  id: number;
  wallet_address: string;
  name: string;
  description: string | null;
  color: string;           // Hex color (#3B82F6)
  icon: string;            // Icon name (folder, briefcase, etc.)
  custom_instructions: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  file_count: number;
  conversation_count: number;
}
```

### Available Colors
`#3B82F6` (blue), `#8B5CF6` (purple), `#EC4899` (pink), `#EF4444` (red), `#F97316` (orange), `#EAB308` (yellow), `#22C55E` (green), `#06B6D4` (cyan), `#6366F1` (indigo), `#64748B` (slate)

### Available Icons
`folder`, `briefcase`, `chart`, `code`, `document`, `globe`, `lightbulb`, `rocket`, `star`, `users`

---

## Context Picker (Cursor-style)

### 3-Level Navigation
```
Level 1: Integrations
├── Google Workspace (12 items)
├── Microsoft 365 (8 items)
├── QuickBooks (25 items)
└── ...
    ↓ Click
Level 2: Categories
├── Gmail (5 emails)
├── Drive (4 files)
├── Calendar (3 events)
└── ...
    ↓ Click
Level 3: Items
├── ☐ Email: "Q4 Report..."
├── ☐ Email: "Meeting invite..."
├── ☐ File: "budget.xlsx"
└── [Search box] [Done button]
```

### Context Picker Features
- **Breadcrumb navigation** (All > Google > Gmail)
- **Back button** to previous level
- **Search** only at items level (real-time filtering)
- **Multi-select** with max limit (default 10 items)
- **Selection badge** shows count
- **Source indicator** (Indexed vs Live)

### Integration Colors
| Integration | Background | Text |
|-------------|------------|------|
| Google | `bg-red-50` | `text-red-600` |
| Microsoft | `bg-blue-50` | `text-blue-600` |
| QuickBooks | `bg-green-50` | `text-green-600` |
| Salesforce | `bg-sky-50` | `text-sky-600` |
| HubSpot | `bg-orange-50` | `text-orange-600` |
| Slack | `bg-purple-50` | `text-purple-600` |

---

## Action Panel (Email/Document)

### Email Action
```
Provider: Gmail or Outlook
Fields: To, CC, Subject, Body
Endpoints:
  - Gmail: POST /api/v1/integrations/google/send-email
  - Outlook: POST /api/v1/integrations/microsoft/mail/send
```

### Document Action
```
Provider: Google Drive or OneDrive
Fields: Title, Content
Endpoints:
  - Google Drive: POST /api/v1/integrations/google/upload-file
  - OneDrive: POST /api/v1/integrations/microsoft/onedrive/upload
```

### Action Flow
```
1. User clicks "Actions" button
2. Select action type (Email or Document)
3. Select provider (Gmail/Outlook or Drive/OneDrive)
4. Fill form fields
5. Click "Preview & Send" or "Preview & Save"
6. Confirmation modal shows preview
7. Click "Confirm" → Action executes
8. Success/Error feedback shown
```

---

## Message Features

| Feature | Description | Implementation |
|---------|-------------|----------------|
| **Copy** | Copy message to clipboard | `navigator.clipboard.writeText()` |
| **Edit & Resend** | Modify user message, regenerate | Removes messages from edit point, resends |
| **Feedback** | Thumbs up/down | Stored in `feedbackGiven` state |
| **Regenerate** | Regenerate last response | Removes last assistant message, resends |
| **Send as Email** | Quick email action | Opens action panel with content |
| **Save as Document** | Quick save action | Opens action panel with content |
| **Sources** | RAG (📊) and Web (🌐) | Displayed below assistant messages |

---

## Backend API Endpoints

### AI Chat
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/ai/chat/general` | POST | Standard mode chat |
| `/api/v1/ai/query/combined` | POST | Deep research with optional web search |
| `/api/v1/ai/research` | POST | Deep analysis mode |
| `/api/v1/ai/analyze/document` | POST | Document analysis |
| `/api/v1/ai/upload/document` | POST | Upload PDF/DOCX for text extraction |
| `/api/v1/ai/health` | GET | Service health check |
| `/api/v1/ai/models` | GET | List available LLM models |
| `/api/v1/ai/context/items` | GET | Fetch available context for picker |
| `/api/v1/ai/suggested-prompts` | GET | Fetch integration-aware suggestions |

### Conversations
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/conversations/` | GET | List conversations (wallet-scoped) |
| `/api/v1/conversations/` | POST | Create conversation |
| `/api/v1/conversations/{id}` | GET | Get with all messages |
| `/api/v1/conversations/{id}` | PATCH | Update (rename, pin, project) |
| `/api/v1/conversations/{id}` | DELETE | Delete conversation |
| `/api/v1/conversations/{id}/messages` | POST | Add message |
| `/api/v1/conversations/{id}/pin` | POST | Pin conversation |
| `/api/v1/conversations/{id}/unpin` | POST | Unpin conversation |
| `/api/v1/conversations/{id}/archive` | POST | Archive conversation |

### Projects
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/projects/` | GET | List projects (wallet-scoped) |
| `/api/v1/projects/` | POST | Create project |
| `/api/v1/projects/{id}` | GET | Get project with files |
| `/api/v1/projects/{id}` | PATCH | Update project |
| `/api/v1/projects/{id}` | DELETE | Delete/archive project |
| `/api/v1/projects/{id}/files` | POST | Add file to project |
| `/api/v1/projects/{id}/files` | GET | List project files |
| `/api/v1/projects/{id}/files/{fid}` | DELETE | Remove file |
| `/api/v1/projects/{id}/conversations` | GET | List project conversations |

---

## State Management (Key Variables)

| State | Type | Purpose |
|-------|------|---------|
| `currentProjectId` | `number \| null` | Selected project ID |
| `currentProject` | `Project \| null` | Full project with instructions |
| `currentConversationId` | `number \| null` | Selected conversation ID |
| `messages` | `Message[]` | Chat messages array |
| `aiMode` | `string` | Current AI mode |
| `selectedContextIds` | `string[]` | Context picker selections |
| `showProjectEditor` | `boolean` | Editor modal visibility |
| `showContextPicker` | `boolean` | Context picker visibility |
| `showActionPanel` | `boolean` | Action panel visibility |
| `actionType` | `'email' \| 'document'` | Current action type |
| `actionProvider` | `'google' \| 'microsoft'` | Action provider |
| `installedTools` | `string[]` | Connected integrations |
| `ragStatus` | `object` | RAG data availability status |

---

## LLM Configuration

| Setting | Value |
|---------|-------|
| **Provider** | Together.ai (primary), Ollama (fallback) |
| **Model** | `meta-llama/Llama-3.3-70B-Instruct-Turbo` |
| **Temperature** | 0.7 (standard), 0.3 (research/analysis) |
| **Max Tokens** | 2048-4096 |
| **Timeout** | 2 minutes |
| **API URL** | `https://api.together.xyz/v1` |

---

## RAG System

| Setting | Value |
|---------|-------|
| **Vector DB** | Qdrant |
| **Embeddings** | Together.ai or Ollama (768 dimensions) |
| **Collection** | `business_{wallet_clean}` (per-wallet isolation) |
| **Context Limit** | 5-30KB total |
| **Entry Limit** | 3000 chars per entry (~750 tokens) |
| **Similarity** | Cosine |

---

## Security (4-Layer Multi-Tenant)

| Layer | Implementation |
|-------|----------------|
| **1. Authentication** | Privy → Embedded Wallet |
| **2. Database** | All queries filtered by `wallet_address` |
| **3. RAG** | Isolated Qdrant collection per wallet |
| **4. Storage** | AES-256-GCM encryption with wallet-derived key |

**Guarantee:** Cross-business data access is mathematically impossible.

---

## Export Options

| Format | Status | Description |
|--------|--------|-------------|
| **Markdown** | ✅ Working | Full conversation with metadata |
| **JSON** | ✅ Working | Structured data export |
| **PDF** | 🔜 Coming | PDF generation |

---

## Database Tables Required

| Table | Purpose | Status |
|-------|---------|--------|
| `conversations` | Chat history | ✅ Exists |
| `messages` | Individual messages | ✅ Exists |
| `projects` | Project metadata | ⚠️ Needs migration |
| `project_files` | Files linked to projects | ⚠️ Needs migration |

**Migration Command:**
```bash
# From Railway dashboard shell:
cd /app && alembic upgrade head
```

---

## Research Sources (December 2025)

MVP feature priorities based on:

- [Top 10 QuickBooks Online Features 2025](https://fitsmallbusiness.com/quickbooks-online-features/)
- [QuickBooks for Small Business Owners 2025](https://thefinopartners.com/blogs/quickbooks-for-small-business-owners-2025-tips-tricks-and-best-practices)
- [QuickBooks Online New Interface](https://quickbooks.intuit.com/global/resources/product-update/early-access-quickbooks-new-interface/)
- [Salesforce Small Business CRM 2025](https://www.businessnewsdaily.com/7840-best-crm-software-small-business.html)
- [HubSpot CRM Features Guide 2025](https://routine-automation.com/blog/hubspot-crm-features-benefits-guide)
- [Slack Business Communication 2025](https://davidtries.com/slack-business-communication-hub/)
- [Microsoft 365 Updates 2025](https://www.geeky-gadgets.com/microsoft-365-updates-2025/)
- [7 Critical SaaS MVP Features 2025](https://www.rocketmvp.io/blog/7-critical-features-every-saas-mvp-must-include-in-2025)
- [MVP Features Guide 2025](https://iphtechnologies.com/mvp-features-startup-app-must-have/)
- [Business Dashboard Features 2025](https://www.laxbytecoders.com/blog/top-10-features-every-business-dashboard-should-have-in-2025)
