# Software Integration Pages - Comprehensive Guide

**Last Updated:** December 23, 2025
**Status:** MVP Launch Preparation
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

**Status:** Needs Simplification
**File:** `/microsoft/Microsoft365Page.tsx`

| Tab | MVP Features | Data Source | Future Features |
|-----|--------------|-------------|-----------------|
| **Overview** | Quick stats | Aggregated | - |
| **Outlook** | Inbox list, read emails | `data.emails` | Compose, reply |
| **Calendar** | Event list | `data.events` | Create events |
| **OneDrive** | File browser | `data.files` | Upload, share |
| **Contacts** | Contact list | `data.contacts` | Add/edit |

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

**Goal:** Read-only data display with clean UI

- [ ] Simplify QuickBooks to 3-tab layout
- [ ] Simplify Microsoft 365 to 4-tab layout
- [ ] Simplify Slack to 3-tab layout
- [ ] Simplify Salesforce to 4-tab layout
- [ ] Simplify HubSpot to 4-tab layout
- [ ] Google Workspace already MVP-ready

**Acceptance Criteria:**
- No forms or modals
- No CRUD operations
- Simple tab navigation (no sidebars)
- Clean search/filter on tables
- Proper empty states
- Dark mode support

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
│   └── Microsoft365Page.tsx     # Main page (needs simplification)
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
