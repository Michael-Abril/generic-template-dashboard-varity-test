# Native Software Integration Pages - Comprehensive Build Guide

**Last Updated:** December 17, 2025
**Status:** Reference Documentation for Claude Code Agents
**Goal:** 100% Feature Parity with Full API Actions
**Target Integrations:** QuickBooks, Salesforce, HubSpot, Google Workspace, Microsoft 365, Slack

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [QuickBooks Online - Complete Feature Specification](#2-quickbooks-online---complete-feature-specification)
3. [Salesforce CRM - Complete Feature Specification](#3-salesforce-crm---complete-feature-specification)
4. [HubSpot CRM - Complete Feature Specification](#4-hubspot-crm---complete-feature-specification)
5. [Google Workspace - Complete Feature Specification](#5-google-workspace---complete-feature-specification)
6. [Microsoft 365 - Complete Feature Specification](#6-microsoft-365---complete-feature-specification)
7. [Slack - Complete Feature Specification](#7-slack---complete-feature-specification)
8. [Implementation Guidelines](#8-implementation-guidelines)
9. [Backend API Reference](#9-backend-api-reference)
10. [Testing Checklist](#10-testing-checklist)

---

## 1. Architecture Overview

### Dynamic Route Structure

All integration pages use a single dynamic Next.js route:
```
src/app/dashboard/tools/[integration]/page.tsx
```

The `params.integration` value determines which native UI to render:
- `quickbooks` → QuickBooks Native UI
- `salesforce` → Salesforce Native UI
- `hubspot` → HubSpot Native UI
- `google` or `google_workspace` → Google Workspace Native UI
- `microsoft` or `microsoft365` → Microsoft 365 Native UI
- `slack` → Slack Native UI

### Data Flow

```
┌────────────────────────────────────────────────────────────────────────┐
│                        DATA FLOW ARCHITECTURE                           │
├────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. FRONTEND REQUEST                                                    │
│     Page loads → GET /api/v1/integrations/{provider}/data              │
│     User action → POST /api/v1/integrations/{provider}/action          │
│                                                                         │
│  2. BACKEND PROCESSING                                                  │
│     Check OAuth token → Call provider API → Transform data             │
│                                                                         │
│  3. DATA STORAGE (Filecoin/Pinata)                                     │
│     Sync: Encrypt → Upload → Store CID                                 │
│     Fetch: Retrieve CID → Download → Decrypt                           │
│                                                                         │
│  4. FRONTEND DISPLAY                                                    │
│     Receive JSON → Render native-like UI components                    │
│                                                                         │
└────────────────────────────────────────────────────────────────────────┘
```

### Component Architecture Pattern

Each integration page follows this structure:
```typescript
// 1. Integration-specific sidebar navigation
const SIDEBAR_ITEMS = [...];

// 2. Quick action menus
const CREATE_MENU_ITEMS = {...};

// 3. Main component with state management
function IntegrationPage({ walletAddress, data, ... }) {
  const [activeSection, setActiveSection] = useState('dashboard');

  // Section renderers
  const renderDashboard = () => {...};
  const renderSection = (type) => {...};

  return (
    <Layout>
      <Sidebar items={SIDEBAR_ITEMS} />
      <MainContent>
        <Header />
        {renderActiveSection()}
      </MainContent>
    </Layout>
  );
}
```

---

## 2. QuickBooks Online - Complete Feature Specification

### Overview
QuickBooks Online is small business accounting software. Our implementation must replicate the EXACT look and feel of the QuickBooks Online dashboard.

### Official Documentation
- API Docs: https://developer.intuit.com/app/developer/qbo/docs/learn/explore-the-quickbooks-online-api
- REST API Base: `https://quickbooks.api.intuit.com/v3/company/{realmId}/`

### Navigation Sidebar Structure

```typescript
const QB_SIDEBAR_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'bookmarks', label: 'Bookmarks', icon: Star },
  { id: 'banking', label: 'Banking', icon: Landmark },
  {
    id: 'sales',
    label: 'Sales',
    icon: DollarSign,
    submenu: [
      { id: 'overview', label: 'Overview' },
      { id: 'all-sales', label: 'All Sales' },
      { id: 'invoices', label: 'Invoices' },
      { id: 'payment-links', label: 'Payment Links' },
      { id: 'customers', label: 'Customers' },
      { id: 'products', label: 'Products & Services' },
    ]
  },
  {
    id: 'expenses',
    label: 'Expenses',
    icon: Receipt,
    submenu: [
      { id: 'expenses-list', label: 'Expenses' },
      { id: 'vendors', label: 'Vendors' },
      { id: 'bills', label: 'Bills' },
    ]
  },
  { id: 'projects', label: 'Projects', icon: Briefcase },
  {
    id: 'workers',
    label: 'Workers',
    icon: UsersRound,
    submenu: [
      { id: 'payroll', label: 'Payroll' },
      { id: 'contractors', label: 'Contractors' },
    ]
  },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'taxes', label: 'Taxes', icon: FileCheck },
  { id: 'mileage', label: 'Mileage', icon: Car },
  {
    id: 'accounting',
    label: 'Accounting',
    icon: BookOpen,
    submenu: [
      { id: 'chart-of-accounts', label: 'Chart of Accounts' },
      { id: 'reconcile', label: 'Reconcile' },
    ]
  },
  { id: 'my-accountant', label: 'My Accountant', icon: UserCheck },
  { id: 'apps', label: 'Apps', icon: Grid3X3 },
];
```

### Complete Feature List

#### 2.1 Dashboard (Home)
| Feature | API Endpoint | Implementation |
|---------|-------------|----------------|
| Shortcuts carousel | N/A | Quick actions (Invoice, Expense, Check, etc.) |
| Invoices widget | `GET /query?query=SELECT * FROM Invoice` | Paid/Open/Overdue breakdown |
| Expenses widget | `GET /query?query=SELECT * FROM Purchase` | Total expenses with breakdown |
| Profit & Loss widget | `GET /reports/ProfitAndLoss` | Income vs Expenses |
| Bank accounts | `GET /query?query=SELECT * FROM Account WHERE AccountType='Bank'` | Account balances |
| Business feed | AI-generated insights | Overdue alerts, sync status |
| Quick stats | Multiple queries | Customers, vendors, invoices, payments count |

#### 2.2 Banking
| Feature | API Endpoint | Implementation |
|---------|-------------|----------------|
| Bank accounts list | `GET /query?query=SELECT * FROM Account WHERE AccountType='Bank'` | Account cards with balances |
| Transaction feed | `GET /query?query=SELECT * FROM Purchase WHERE AccountRef='xxx'` | Categorized transactions |
| Bank rules | N/A (local) | Auto-categorization rules |
| Reconciliation | `POST /account/{id}/reconcile` | Match transactions |
| Connect bank | OAuth flow | Bank feed connection |

#### 2.3 Sales Module

##### 2.3.1 Invoices
| Feature | API Endpoint | Implementation |
|---------|-------------|----------------|
| List all invoices | `GET /query?query=SELECT * FROM Invoice` | Data table with filters |
| Create invoice | `POST /invoice` | Full invoice form |
| Edit invoice | `POST /invoice?operation=update` | Edit form |
| Delete invoice | `POST /invoice?operation=delete` | Soft delete |
| Send invoice | `POST /invoice/{id}/send` | Email to customer |
| Mark as paid | `POST /payment` | Record payment |
| Download PDF | `GET /invoice/{id}/pdf` | PDF generation |
| Duplicate invoice | `POST /invoice` (copy) | Clone invoice |
| Invoice status filters | Query params | Draft, Sent, Paid, Overdue |
| Batch actions | Multiple API calls | Send reminders, export |

**Invoice Form Fields:**
```typescript
interface InvoiceForm {
  customer_ref: string;           // Customer ID
  billing_address: Address;
  shipping_address?: Address;
  invoice_date: Date;
  due_date: Date;
  terms: string;                  // Net 30, Net 15, etc.
  line_items: LineItem[];
  discount_type?: 'percent' | 'amount';
  discount_value?: number;
  tax_rate?: number;
  notes?: string;
  attachments?: File[];
  send_method: 'email' | 'print' | 'none';
}

interface LineItem {
  item_ref?: string;              // Product/Service ID
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  tax_code_ref?: string;
}
```

##### 2.3.2 Sales Receipts
| Feature | API Endpoint | Implementation |
|---------|-------------|----------------|
| List sales receipts | `GET /query?query=SELECT * FROM SalesReceipt` | Data table |
| Create sales receipt | `POST /salesreceipt` | Form for immediate payment |
| Process payment | Integrated payment | Credit card, ACH |

##### 2.3.3 Estimates/Quotes
| Feature | API Endpoint | Implementation |
|---------|-------------|----------------|
| List estimates | `GET /query?query=SELECT * FROM Estimate` | Data table |
| Create estimate | `POST /estimate` | Quote form |
| Convert to invoice | `POST /invoice` (from estimate) | One-click conversion |
| Send estimate | `POST /estimate/{id}/send` | Email to customer |
| Accept/Reject status | Track status | Customer response |

##### 2.3.4 Customers
| Feature | API Endpoint | Implementation |
|---------|-------------|----------------|
| List customers | `GET /query?query=SELECT * FROM Customer` | Searchable list |
| Create customer | `POST /customer` | Customer form |
| Edit customer | `POST /customer?operation=update` | Edit form |
| Customer detail view | `GET /customer/{id}` | Full profile |
| Transaction history | Query by CustomerRef | All transactions |
| Outstanding balance | Calculated | Open invoices total |
| Contact info | Part of customer | Email, phone, address |
| Customer statements | Generated | Printable statement |

**Customer Form Fields:**
```typescript
interface CustomerForm {
  display_name: string;           // Required
  company_name?: string;
  given_name?: string;
  family_name?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  billing_address?: Address;
  shipping_address?: Address;
  payment_terms?: string;
  opening_balance?: number;
  opening_balance_date?: Date;
  tax_exempt?: boolean;
  notes?: string;
}
```

##### 2.3.5 Products & Services
| Feature | API Endpoint | Implementation |
|---------|-------------|----------------|
| List items | `GET /query?query=SELECT * FROM Item` | Product catalog |
| Create item | `POST /item` | Product form |
| Edit item | `POST /item?operation=update` | Edit form |
| Inventory tracking | Item with quantity | Stock levels |
| Categories | Custom field | Product organization |
| Pricing | Rate field | Default price |
| SKU management | SKU field | Product codes |

#### 2.4 Expenses Module

##### 2.4.1 Expenses
| Feature | API Endpoint | Implementation |
|---------|-------------|----------------|
| List expenses | `GET /query?query=SELECT * FROM Purchase WHERE PaymentType='Cash'` | Data table |
| Create expense | `POST /purchase` | Expense form |
| Edit expense | `POST /purchase?operation=update` | Edit form |
| Receipt upload | `POST /attachable` | Image upload |
| Categorization | AccountRef | Expense categories |
| Billable expenses | Billable field | Track billable items |
| Recurring expenses | RecurringTransaction | Auto-create |

**Expense Form Fields:**
```typescript
interface ExpenseForm {
  vendor_ref?: string;
  account_ref: string;            // Bank/Credit card account
  payment_type: 'Cash' | 'Check' | 'CreditCard';
  txn_date: Date;
  line_items: ExpenseLine[];
  memo?: string;
  ref_number?: string;
  attachments?: File[];
}

interface ExpenseLine {
  account_ref: string;            // Expense category
  description?: string;
  amount: number;
  billable?: boolean;
  customer_ref?: string;          // If billable
  class_ref?: string;             // For tracking
}
```

##### 2.4.2 Vendors
| Feature | API Endpoint | Implementation |
|---------|-------------|----------------|
| List vendors | `GET /query?query=SELECT * FROM Vendor` | Searchable list |
| Create vendor | `POST /vendor` | Vendor form |
| Edit vendor | `POST /vendor?operation=update` | Edit form |
| Vendor detail | `GET /vendor/{id}` | Full profile |
| 1099 tracking | `Print1099` field | Tax reporting |
| Payment history | Query by VendorRef | All payments |

##### 2.4.3 Bills
| Feature | API Endpoint | Implementation |
|---------|-------------|----------------|
| List bills | `GET /query?query=SELECT * FROM Bill` | Data table |
| Create bill | `POST /bill` | Bill form |
| Pay bill | `POST /billpayment` | Payment form |
| Schedule payment | Due date tracking | Payment queue |
| Recurring bills | RecurringTransaction | Auto-create |

#### 2.5 Reports Module
| Report | API Endpoint | Implementation |
|--------|-------------|----------------|
| Profit and Loss | `GET /reports/ProfitAndLoss` | Full P&L report |
| Balance Sheet | `GET /reports/BalanceSheet` | Assets/Liabilities |
| Cash Flow | `GET /reports/CashFlow` | Cash flow statement |
| A/R Aging | `GET /reports/AgedReceivables` | Outstanding receivables |
| A/P Aging | `GET /reports/AgedPayables` | Outstanding payables |
| Sales by Customer | `GET /reports/CustomerSales` | Customer breakdown |
| Sales by Product | `GET /reports/ItemSales` | Product breakdown |
| Expense by Vendor | `GET /reports/VendorExpenses` | Vendor breakdown |
| General Ledger | `GET /reports/GeneralLedger` | All transactions |
| Trial Balance | `GET /reports/TrialBalance` | Debit/Credit balance |
| Tax Summary | `GET /reports/TaxSummary` | Tax collected |

**Report Features:**
- Date range selection
- Comparison periods (vs last year, vs budget)
- Export to PDF, Excel, CSV
- Print functionality
- Custom columns
- Saved report templates
- Scheduled reports

#### 2.6 Accounting Module

##### 2.6.1 Chart of Accounts
| Feature | API Endpoint | Implementation |
|---------|-------------|----------------|
| List accounts | `GET /query?query=SELECT * FROM Account` | Hierarchical list |
| Create account | `POST /account` | Account form |
| Edit account | `POST /account?operation=update` | Edit form |
| Account types | AccountType enum | Asset, Liability, etc. |
| Sub-accounts | ParentRef | Account hierarchy |
| Account numbers | AcctNum | Optional numbering |

**Account Types:**
- Bank, Accounts Receivable, Other Current Asset
- Fixed Asset, Other Asset
- Accounts Payable, Credit Card, Other Current Liability
- Long Term Liability, Equity
- Income, Cost of Goods Sold, Expense, Other Income, Other Expense

##### 2.6.2 Journal Entries
| Feature | API Endpoint | Implementation |
|---------|-------------|----------------|
| List journal entries | `GET /query?query=SELECT * FROM JournalEntry` | Data table |
| Create journal entry | `POST /journalentry` | Debit/Credit form |
| Recurring entries | RecurringTransaction | Auto-post |

##### 2.6.3 Reconciliation
| Feature | API Endpoint | Implementation |
|---------|-------------|----------------|
| Start reconciliation | Select account | Match transactions |
| Match transactions | Manual matching | Bank feed vs QB |
| Record adjustments | `POST /journalentry` | Adjustment entries |
| Finish reconciliation | Update status | Close period |

#### 2.7 Workers Module

##### 2.7.1 Payroll (if enabled)
| Feature | API Endpoint | Implementation |
|---------|-------------|----------------|
| Employee list | `GET /query?query=SELECT * FROM Employee` | Employee directory |
| Run payroll | Payroll API | Pay employees |
| Payroll history | Query by date | Past payrolls |
| Tax filings | Reports | Payroll tax reports |

##### 2.7.2 Contractors
| Feature | API Endpoint | Implementation |
|---------|-------------|----------------|
| Contractor list | Vendor with `Vendor1099=true` | 1099 contractors |
| Payments | Purchase to vendor | Track payments |
| 1099 forms | Reports | Year-end forms |

#### 2.8 Settings (Gear Menu)

```typescript
const GEAR_MENU_ITEMS = {
  yourCompany: [
    { id: 'account-settings', label: 'Account and Settings' },
    { id: 'manage-users', label: 'Manage Users' },
    { id: 'custom-form-styles', label: 'Custom Form Styles' },
    { id: 'feedback', label: 'Feedback' },
  ],
  lists: [
    { id: 'all-lists', label: 'All Lists' },
    { id: 'products-services', label: 'Products and Services' },
    { id: 'recurring-transactions', label: 'Recurring Transactions' },
    { id: 'attachments', label: 'Attachments' },
    { id: 'chart-of-accounts', label: 'Chart of Accounts' },
    { id: 'payroll-items', label: 'Payroll Items' },
    { id: 'tags', label: 'Tags' },
  ],
  tools: [
    { id: 'import-data', label: 'Import Data' },
    { id: 'export-data', label: 'Export Data' },
    { id: 'reconcile', label: 'Reconcile' },
    { id: 'budgeting', label: 'Budgeting' },
    { id: 'audit-log', label: 'Audit Log' },
  ],
  profile: [
    { id: 'user-profile', label: 'User Profile' },
    { id: 'sign-out', label: 'Sign Out' },
  ]
};
```

#### 2.9 Quick Create Menu (+)

```typescript
const createMenuItems = {
  customers: [
    { label: 'Invoice', action: createInvoice },
    { label: 'Sales Receipt', action: createSalesReceipt },
    { label: 'Estimate', action: createEstimate },
    { label: 'Receive Payment', action: receivePayment },
    { label: 'Credit Memo', action: createCreditMemo },
  ],
  vendors: [
    { label: 'Expense', action: createExpense },
    { label: 'Check', action: writeCheck },
    { label: 'Bill', action: createBill },
    { label: 'Purchase Order', action: createPO },
    { label: 'Vendor Credit', action: createVendorCredit },
  ],
  other: [
    { label: 'Bank Deposit', action: createDeposit },
    { label: 'Transfer', action: createTransfer },
    { label: 'Journal Entry', action: createJournalEntry },
  ]
};
```

### QuickBooks UI Components Required

1. **Invoice Form Modal** - Full WYSIWYG invoice editor
2. **Customer Form Modal** - Customer creation/edit
3. **Expense Form Modal** - Expense entry with receipt upload
4. **Bill Payment Modal** - Pay bills interface
5. **Report Viewer** - Full-screen report with filters
6. **Bank Feed** - Transaction matching interface
7. **Reconciliation Wizard** - Step-by-step reconciliation
8. **Data Tables** - Sortable, filterable, searchable tables
9. **Chart Components** - P&L charts, cash flow visualizations

---

## 3. Salesforce CRM - Complete Feature Specification

### Overview
Salesforce is the world's leading CRM platform. Our implementation must replicate the Sales Cloud experience.

### Official Documentation
- API Docs: https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_list.htm
- REST API Base: `https://{instance}.salesforce.com/services/data/v{version}/`
- SOQL Guide: Use for complex queries

### Navigation Sidebar Structure

```typescript
const SF_SIDEBAR_ITEMS = [
  { id: 'home', label: 'Home', icon: Home },
  {
    id: 'sales',
    label: 'Sales',
    icon: TrendingUp,
    submenu: [
      { id: 'leads', label: 'Leads' },
      { id: 'accounts', label: 'Accounts' },
      { id: 'contacts', label: 'Contacts' },
      { id: 'opportunities', label: 'Opportunities' },
      { id: 'forecasts', label: 'Forecasts' },
    ]
  },
  {
    id: 'service',
    label: 'Service',
    icon: Headphones,
    submenu: [
      { id: 'cases', label: 'Cases' },
      { id: 'knowledge', label: 'Knowledge' },
    ]
  },
  {
    id: 'marketing',
    label: 'Marketing',
    icon: Megaphone,
    submenu: [
      { id: 'campaigns', label: 'Campaigns' },
      { id: 'campaign-members', label: 'Campaign Members' },
    ]
  },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'dashboards', label: 'Dashboards', icon: LayoutDashboard },
  { id: 'chatter', label: 'Chatter', icon: MessageSquare },
  { id: 'files', label: 'Files', icon: FolderOpen },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'quotes', label: 'Quotes', icon: FileText },
  { id: 'tasks', label: 'Tasks', icon: CheckCircle },
  { id: 'events', label: 'Events', icon: Calendar },
];
```

### Complete Feature List

#### 3.1 Home Dashboard
| Feature | API Endpoint | Implementation |
|---------|-------------|----------------|
| Key metrics | SOQL aggregate queries | Opportunities, pipeline value |
| Recent records | `GET /sobjects/RecentlyViewed` | Recently accessed items |
| Tasks due today | `GET /query?q=SELECT...FROM Task WHERE ActivityDate=TODAY` | Task list |
| Events today | `GET /query?q=SELECT...FROM Event WHERE StartDateTime=TODAY` | Calendar events |
| Assistant (AI) | Einstein Analytics | Insights and recommendations |

#### 3.2 Leads Module
| Feature | API Endpoint | Implementation |
|---------|-------------|----------------|
| List leads | `GET /query?q=SELECT * FROM Lead` | List/Kanban view |
| Create lead | `POST /sobjects/Lead` | Lead form |
| Edit lead | `PATCH /sobjects/Lead/{id}` | Edit form |
| Convert lead | `POST /sobjects/Lead/{id}/convert` | Convert to Account/Contact/Opportunity |
| Lead scoring | Einstein Lead Scoring | AI-powered scoring |
| Lead assignment | Assignment rules | Auto-assign to reps |
| Import leads | Bulk API | CSV import |
| Web-to-Lead | Web form | Capture from website |

**Lead Form Fields:**
```typescript
interface LeadForm {
  salutation?: string;
  first_name?: string;
  last_name: string;               // Required
  company: string;                 // Required
  title?: string;
  email?: string;
  phone?: string;
  mobile_phone?: string;
  website?: string;
  lead_source?: string;            // Web, Phone, Referral, etc.
  industry?: string;
  annual_revenue?: number;
  number_of_employees?: number;
  status: string;                  // New, Working, Qualified, etc.
  rating?: string;                 // Hot, Warm, Cold
  street?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  description?: string;
  owner_id?: string;
}
```

**Lead Status Pipeline:**
- New
- Open - Not Contacted
- Working - Contacted
- Closed - Converted
- Closed - Not Converted

#### 3.3 Accounts Module
| Feature | API Endpoint | Implementation |
|---------|-------------|----------------|
| List accounts | `GET /query?q=SELECT * FROM Account` | Data table |
| Create account | `POST /sobjects/Account` | Account form |
| Edit account | `PATCH /sobjects/Account/{id}` | Edit form |
| Account hierarchy | ParentId field | Parent/child accounts |
| Related contacts | `GET /query?q=SELECT * FROM Contact WHERE AccountId='xxx'` | Contact list |
| Related opportunities | `GET /query?q=SELECT * FROM Opportunity WHERE AccountId='xxx'` | Opportunity list |
| Activity timeline | Tasks + Events | Full history |
| Account teams | AccountTeamMember | Sales team |

**Account Form Fields:**
```typescript
interface AccountForm {
  name: string;                    // Required
  parent_id?: string;
  account_number?: string;
  type?: string;                   // Customer, Partner, Prospect
  industry?: string;
  annual_revenue?: number;
  rating?: string;
  phone?: string;
  fax?: string;
  website?: string;
  ownership?: string;              // Public, Private, Subsidiary
  number_of_employees?: number;
  sic_code?: string;
  billing_address?: Address;
  shipping_address?: Address;
  description?: string;
  owner_id?: string;
}
```

#### 3.4 Contacts Module
| Feature | API Endpoint | Implementation |
|---------|-------------|----------------|
| List contacts | `GET /query?q=SELECT * FROM Contact` | Data table |
| Create contact | `POST /sobjects/Contact` | Contact form |
| Edit contact | `PATCH /sobjects/Contact/{id}` | Edit form |
| Contact roles | OpportunityContactRole | Role on opportunities |
| Email integration | EmailMessage | Send/log emails |
| Activity history | Tasks + Events | Full timeline |
| Duplicate detection | Matching rules | Find duplicates |

**Contact Form Fields:**
```typescript
interface ContactForm {
  salutation?: string;
  first_name?: string;
  last_name: string;               // Required
  account_id?: string;
  title?: string;
  department?: string;
  email?: string;
  phone?: string;
  mobile_phone?: string;
  home_phone?: string;
  other_phone?: string;
  fax?: string;
  mailing_address?: Address;
  other_address?: Address;
  reports_to_id?: string;          // Manager contact
  lead_source?: string;
  birthdate?: Date;
  description?: string;
  owner_id?: string;
}
```

#### 3.5 Opportunities Module
| Feature | API Endpoint | Implementation |
|---------|-------------|----------------|
| List opportunities | `GET /query?q=SELECT * FROM Opportunity` | List/Kanban view |
| Create opportunity | `POST /sobjects/Opportunity` | Opportunity form |
| Edit opportunity | `PATCH /sobjects/Opportunity/{id}` | Edit form |
| Stage progression | StageName field | Pipeline stages |
| Probability | Probability field | Win likelihood |
| Products/Line items | OpportunityLineItem | Products on opportunity |
| Competitors | Competitor object | Track competition |
| Contact roles | OpportunityContactRole | Decision makers |
| Path guidance | Sales process | Stage guidance |

**Opportunity Form Fields:**
```typescript
interface OpportunityForm {
  name: string;                    // Required
  account_id?: string;
  close_date: Date;                // Required
  stage_name: string;              // Required
  amount?: number;
  probability?: number;
  type?: string;                   // New Business, Existing Business
  lead_source?: string;
  next_step?: string;
  description?: string;
  campaign_id?: string;
  pricebook_id?: string;
  owner_id?: string;
}
```

**Default Sales Pipeline Stages:**
1. Prospecting (10%)
2. Qualification (20%)
3. Needs Analysis (30%)
4. Value Proposition (50%)
5. Id. Decision Makers (60%)
6. Perception Analysis (70%)
7. Proposal/Price Quote (75%)
8. Negotiation/Review (80%)
9. Closed Won (100%)
10. Closed Lost (0%)

#### 3.6 Cases Module (Service)
| Feature | API Endpoint | Implementation |
|---------|-------------|----------------|
| List cases | `GET /query?q=SELECT * FROM Case` | Data table |
| Create case | `POST /sobjects/Case` | Case form |
| Edit case | `PATCH /sobjects/Case/{id}` | Edit form |
| Case assignment | Assignment rules | Auto-assign |
| Escalation rules | Escalation rules | Auto-escalate |
| Case comments | CaseComment | Internal/External comments |
| Email-to-Case | Email routing | Create from email |
| Knowledge base | KnowledgeArticle | Related articles |

**Case Form Fields:**
```typescript
interface CaseForm {
  contact_id?: string;
  account_id?: string;
  subject?: string;
  description?: string;
  status: string;                  // New, Working, Escalated, Closed
  priority: string;                // Low, Medium, High, Critical
  origin: string;                  // Phone, Email, Web
  type?: string;                   // Problem, Feature Request, Question
  reason?: string;
  owner_id?: string;
}
```

#### 3.7 Campaigns Module (Marketing)
| Feature | API Endpoint | Implementation |
|---------|-------------|----------------|
| List campaigns | `GET /query?q=SELECT * FROM Campaign` | Data table |
| Create campaign | `POST /sobjects/Campaign` | Campaign form |
| Campaign members | CampaignMember | Add leads/contacts |
| Campaign hierarchy | ParentId | Parent/child campaigns |
| ROI tracking | Calculated fields | Cost vs revenue |
| Campaign influence | CampaignInfluence | Multi-touch attribution |

#### 3.8 Reports & Dashboards
| Feature | API Endpoint | Implementation |
|---------|-------------|----------------|
| List reports | `GET /query?q=SELECT * FROM Report` | Report library |
| Run report | `GET /analytics/reports/{id}` | Execute report |
| Create report | Report Builder | Visual builder |
| List dashboards | `GET /query?q=SELECT * FROM Dashboard` | Dashboard library |
| View dashboard | `GET /analytics/dashboards/{id}` | Dashboard viewer |
| Dashboard components | Charts, gauges, tables | Visualizations |

**Report Types:**
- Tabular Reports
- Summary Reports
- Matrix Reports
- Joined Reports

**Dashboard Components:**
- Charts (Bar, Line, Pie, Donut, Funnel)
- Gauges
- Metrics (single number)
- Tables
- Visualforce Components

#### 3.9 Tasks & Activities
| Feature | API Endpoint | Implementation |
|---------|-------------|----------------|
| List tasks | `GET /query?q=SELECT * FROM Task` | Task list |
| Create task | `POST /sobjects/Task` | Task form |
| Complete task | `PATCH /sobjects/Task/{id}` | Update status |
| List events | `GET /query?q=SELECT * FROM Event` | Calendar view |
| Create event | `POST /sobjects/Event` | Event form |
| Log a call | `POST /sobjects/Task` with CallType | Call logging |
| Email logging | EmailMessage | Log emails |

#### 3.10 Global Search
| Feature | API Endpoint | Implementation |
|---------|-------------|----------------|
| Search all | `GET /search?q=FIND {term}` | SOSL search |
| Search object | `GET /query?q=SELECT...LIKE '%term%'` | SOQL search |
| Recent items | `GET /sobjects/RecentlyViewed` | Recent list |
| Favorites | Custom | Pinned records |

### Salesforce UI Components Required

1. **Kanban Board** - Pipeline view for Leads/Opportunities
2. **Record Detail Page** - Standard Salesforce layout
3. **Related Lists** - Child records on parent detail
4. **Activity Timeline** - Tasks, events, emails
5. **Path Component** - Stage progression guidance
6. **Report Builder** - Visual report creation
7. **Dashboard Builder** - Drag-and-drop dashboard
8. **Global Search** - Universal search bar
9. **Chatter Feed** - Social collaboration

---

## 4. HubSpot CRM - Complete Feature Specification

### Overview
HubSpot is an all-in-one CRM with marketing, sales, and service hubs. Our implementation focuses on the CRM and Sales Hub features.

### Official Documentation
- API Docs: https://developers.hubspot.com/docs/api/crm
- REST API Base: `https://api.hubapi.com/`

### Navigation Sidebar Structure

```typescript
const HS_SIDEBAR_ITEMS = [
  { id: 'home', label: 'Home', icon: Home },
  {
    id: 'contacts',
    label: 'Contacts',
    icon: Users,
    submenu: [
      { id: 'contacts-list', label: 'Contacts' },
      { id: 'companies', label: 'Companies' },
    ]
  },
  {
    id: 'sales',
    label: 'Sales',
    icon: DollarSign,
    submenu: [
      { id: 'deals', label: 'Deals' },
      { id: 'tasks', label: 'Tasks' },
      { id: 'documents', label: 'Documents' },
      { id: 'meetings', label: 'Meetings' },
      { id: 'quotes', label: 'Quotes' },
      { id: 'playbooks', label: 'Playbooks' },
      { id: 'sequences', label: 'Sequences' },
    ]
  },
  {
    id: 'marketing',
    label: 'Marketing',
    icon: Megaphone,
    submenu: [
      { id: 'campaigns', label: 'Campaigns' },
      { id: 'email', label: 'Email' },
      { id: 'forms', label: 'Forms' },
      { id: 'landing-pages', label: 'Landing Pages' },
    ]
  },
  {
    id: 'service',
    label: 'Service',
    icon: Headphones,
    submenu: [
      { id: 'tickets', label: 'Tickets' },
      { id: 'knowledge-base', label: 'Knowledge Base' },
      { id: 'feedback', label: 'Feedback Surveys' },
    ]
  },
  {
    id: 'automation',
    label: 'Automation',
    icon: Zap,
    submenu: [
      { id: 'workflows', label: 'Workflows' },
      { id: 'sequences', label: 'Sequences' },
    ]
  },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'conversations', label: 'Conversations', icon: MessageSquare },
];
```

### Complete Feature List

#### 4.1 Contacts
| Feature | API Endpoint | Implementation |
|---------|-------------|----------------|
| List contacts | `GET /crm/v3/objects/contacts` | Data table with infinite scroll |
| Create contact | `POST /crm/v3/objects/contacts` | Contact form |
| Edit contact | `PATCH /crm/v3/objects/contacts/{id}` | Edit form |
| Search contacts | `POST /crm/v3/objects/contacts/search` | Advanced search |
| Contact timeline | Activities API | Full activity history |
| Lists/segments | Lists API | Static and dynamic lists |
| Import contacts | Imports API | CSV upload |
| Merge duplicates | Merge API | Combine records |
| Contact scoring | Lead scoring | AI-powered |

**Contact Properties:**
```typescript
interface HubSpotContact {
  email: string;                   // Primary identifier
  firstname?: string;
  lastname?: string;
  phone?: string;
  mobilephone?: string;
  company?: string;
  jobtitle?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  lifecyclestage?: string;         // subscriber, lead, MQL, SQL, opportunity, customer
  hs_lead_status?: string;
  hubspot_owner_id?: string;
  createdate?: Date;
  lastmodifieddate?: Date;
  // Custom properties...
}
```

#### 4.2 Companies
| Feature | API Endpoint | Implementation |
|---------|-------------|----------------|
| List companies | `GET /crm/v3/objects/companies` | Data table |
| Create company | `POST /crm/v3/objects/companies` | Company form |
| Edit company | `PATCH /crm/v3/objects/companies/{id}` | Edit form |
| Associated contacts | Associations API | Linked contacts |
| Company insights | Company Insights | Auto-enrichment |
| Target accounts | Lists | ABM targeting |

**Company Properties:**
```typescript
interface HubSpotCompany {
  name: string;                    // Required
  domain?: string;
  phone?: string;
  industry?: string;
  numberofemployees?: number;
  annualrevenue?: number;
  type?: string;                   // Prospect, Partner, Reseller, Vendor, Customer
  description?: string;
  city?: string;
  state?: string;
  country?: string;
  hubspot_owner_id?: string;
}
```

#### 4.3 Deals (Sales Pipeline)
| Feature | API Endpoint | Implementation |
|---------|-------------|----------------|
| List deals | `GET /crm/v3/objects/deals` | Kanban board |
| Create deal | `POST /crm/v3/objects/deals` | Deal form |
| Edit deal | `PATCH /crm/v3/objects/deals/{id}` | Edit form |
| Pipeline management | Pipelines API | Multiple pipelines |
| Stage progression | Update dealstage | Drag and drop |
| Deal forecasting | Forecasting API | Pipeline forecasts |
| Associated records | Associations API | Contacts, companies |
| Products on deal | Line items API | Add products |

**Deal Properties:**
```typescript
interface HubSpotDeal {
  dealname: string;                // Required
  dealstage: string;               // Pipeline stage ID
  pipeline: string;                // Pipeline ID
  amount?: number;
  closedate?: Date;
  hubspot_owner_id?: string;
  deal_currency_code?: string;
  description?: string;
  hs_priority?: string;
  hs_deal_stage_probability?: number;
}
```

**Default Sales Pipeline:**
1. Appointment Scheduled (20%)
2. Qualified to Buy (40%)
3. Presentation Scheduled (60%)
4. Decision Maker Bought-In (80%)
5. Contract Sent (90%)
6. Closed Won (100%)
7. Closed Lost (0%)

#### 4.4 Tickets (Service)
| Feature | API Endpoint | Implementation |
|---------|-------------|----------------|
| List tickets | `GET /crm/v3/objects/tickets` | Ticket board |
| Create ticket | `POST /crm/v3/objects/tickets` | Ticket form |
| Edit ticket | `PATCH /crm/v3/objects/tickets/{id}` | Edit form |
| Ticket pipeline | Pipelines API | Support pipeline |
| SLA tracking | Properties | Time to resolution |
| Conversations | Conversations API | Email/chat threads |

**Ticket Properties:**
```typescript
interface HubSpotTicket {
  subject: string;                 // Required
  content?: string;
  hs_pipeline: string;
  hs_pipeline_stage: string;
  hs_ticket_priority?: string;     // LOW, MEDIUM, HIGH
  hs_ticket_category?: string;
  hubspot_owner_id?: string;
  source_type?: string;            // EMAIL, CHAT, PHONE, FORM
}
```

#### 4.5 Tasks
| Feature | API Endpoint | Implementation |
|---------|-------------|----------------|
| List tasks | `GET /crm/v3/objects/tasks` | Task list |
| Create task | `POST /crm/v3/objects/tasks` | Task form |
| Complete task | `PATCH /crm/v3/objects/tasks/{id}` | Update status |
| Task queues | Views | Filtered lists |
| Task types | hs_task_type | Call, Email, To-do |

#### 4.6 Meetings
| Feature | API Endpoint | Implementation |
|---------|-------------|----------------|
| List meetings | `GET /crm/v3/objects/meetings` | Meeting list |
| Create meeting | `POST /crm/v3/objects/meetings` | Meeting form |
| Meeting links | Scheduling API | Shareable links |
| Calendar sync | Calendar API | Google/Outlook sync |

#### 4.7 Workflows (Automation)
| Feature | API Endpoint | Implementation |
|---------|-------------|----------------|
| List workflows | `GET /automation/v4/flows` | Workflow list |
| Workflow builder | Visual builder | Drag-and-drop |
| Triggers | Contact, deal, ticket triggers | Start conditions |
| Actions | Email, task, property updates | Automated actions |
| Enrollment | Manual/automatic | Add to workflow |

#### 4.8 Email & Sequences
| Feature | API Endpoint | Implementation |
|---------|-------------|----------------|
| Email templates | Templates API | Reusable templates |
| Send email | Transactional Email API | Manual send |
| Sequences | Sequences API | Automated outreach |
| Tracking | Engagement events | Opens, clicks |

#### 4.9 Reports & Analytics
| Feature | API Endpoint | Implementation |
|---------|-------------|----------------|
| Dashboard | Analytics API | KPI dashboard |
| Custom reports | Reports API | Report builder |
| Deal forecasts | Forecasting API | Pipeline projections |
| Attribution | Attribution API | Multi-touch |

### HubSpot UI Components Required

1. **Kanban Pipeline** - Deals/Tickets board
2. **Contact Record** - Full profile with timeline
3. **Company Record** - Company profile with associated contacts
4. **Deal Record** - Deal detail with products
5. **Workflow Builder** - Visual automation builder
6. **Email Composer** - Template-based email
7. **Meeting Scheduler** - Calendar integration
8. **Reports Dashboard** - KPI widgets
9. **Search & Filters** - Advanced filtering

---

## 5. Google Workspace - Complete Feature Specification

### Overview
Google Workspace includes Gmail, Calendar, Drive, and other productivity tools. Our implementation provides unified access to all services.

### Official Documentation
- Gmail API: https://developers.google.com/gmail/api
- Calendar API: https://developers.google.com/calendar/api
- Drive API: https://developers.google.com/drive/api
- REST API Base: `https://www.googleapis.com/`

### Navigation Sidebar Structure

```typescript
const GOOGLE_SIDEBAR_ITEMS = [
  { id: 'home', label: 'Home', icon: Home },
  {
    id: 'gmail',
    label: 'Gmail',
    icon: Mail,
    submenu: [
      { id: 'inbox', label: 'Inbox' },
      { id: 'sent', label: 'Sent' },
      { id: 'drafts', label: 'Drafts' },
      { id: 'starred', label: 'Starred' },
      { id: 'spam', label: 'Spam' },
      { id: 'trash', label: 'Trash' },
      { id: 'labels', label: 'Labels' },
    ]
  },
  {
    id: 'calendar',
    label: 'Calendar',
    icon: Calendar,
    submenu: [
      { id: 'day', label: 'Day' },
      { id: 'week', label: 'Week' },
      { id: 'month', label: 'Month' },
      { id: 'schedule', label: 'Schedule' },
    ]
  },
  {
    id: 'drive',
    label: 'Drive',
    icon: FolderOpen,
    submenu: [
      { id: 'my-drive', label: 'My Drive' },
      { id: 'shared', label: 'Shared with me' },
      { id: 'recent', label: 'Recent' },
      { id: 'starred-files', label: 'Starred' },
      { id: 'trash-files', label: 'Trash' },
    ]
  },
  { id: 'contacts', label: 'Contacts', icon: Users },
  { id: 'tasks', label: 'Tasks', icon: CheckCircle },
  { id: 'keep', label: 'Notes', icon: StickyNote },
];
```

### Complete Feature List

#### 5.1 Gmail Module
| Feature | API Endpoint | Implementation |
|---------|-------------|----------------|
| List messages | `GET /gmail/v1/users/me/messages` | Email list |
| Get message | `GET /gmail/v1/users/me/messages/{id}` | Email detail |
| Send email | `POST /gmail/v1/users/me/messages/send` | Compose email |
| Reply | `POST /gmail/v1/users/me/messages/send` | Reply to thread |
| Forward | `POST /gmail/v1/users/me/messages/send` | Forward message |
| Delete | `DELETE /gmail/v1/users/me/messages/{id}` | Move to trash |
| Archive | `POST /gmail/v1/users/me/messages/{id}/modify` | Remove from inbox |
| Star/Unstar | `POST /gmail/v1/users/me/messages/{id}/modify` | Add STARRED label |
| Labels | `GET /gmail/v1/users/me/labels` | Label management |
| Apply label | `POST /gmail/v1/users/me/messages/{id}/modify` | Add label |
| Search | `GET /gmail/v1/users/me/messages?q=` | Gmail search syntax |
| Attachments | `GET /gmail/v1/users/me/messages/{id}/attachments/{attachmentId}` | Download files |
| Drafts | `GET /gmail/v1/users/me/drafts` | Draft management |
| Threads | `GET /gmail/v1/users/me/threads` | Conversation view |

**Email Compose Form:**
```typescript
interface ComposeEmail {
  to: string[];                    // Recipient emails
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;                    // HTML or plain text
  attachments?: File[];
  thread_id?: string;              // For replies
  in_reply_to?: string;
  signature?: boolean;
  schedule_send?: Date;
}
```

**Gmail Labels (System + Custom):**
- INBOX, SENT, DRAFT, TRASH, SPAM
- STARRED, IMPORTANT, UNREAD
- CATEGORY_PERSONAL, CATEGORY_SOCIAL, CATEGORY_UPDATES, CATEGORY_FORUMS, CATEGORY_PROMOTIONS
- Custom user labels

#### 5.2 Calendar Module
| Feature | API Endpoint | Implementation |
|---------|-------------|----------------|
| List calendars | `GET /calendar/v3/users/me/calendarList` | Calendar list |
| List events | `GET /calendar/v3/calendars/{calendarId}/events` | Event list |
| Get event | `GET /calendar/v3/calendars/{calendarId}/events/{eventId}` | Event detail |
| Create event | `POST /calendar/v3/calendars/{calendarId}/events` | Event form |
| Update event | `PUT /calendar/v3/calendars/{calendarId}/events/{eventId}` | Edit event |
| Delete event | `DELETE /calendar/v3/calendars/{calendarId}/events/{eventId}` | Remove event |
| Quick add | `POST /calendar/v3/calendars/{calendarId}/events/quickAdd` | Natural language |
| Free/busy | `POST /calendar/v3/freeBusy` | Availability check |
| Watch events | `POST /calendar/v3/calendars/{calendarId}/events/watch` | Notifications |
| Recurring events | RRule in event | Repeat patterns |
| Meeting rooms | Resources API | Room booking |

**Event Form:**
```typescript
interface CalendarEvent {
  summary: string;                 // Event title
  description?: string;
  location?: string;
  start: {
    dateTime?: string;             // ISO datetime
    date?: string;                 // All-day event
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  attendees?: Array<{
    email: string;
    optional?: boolean;
    responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted';
  }>;
  recurrence?: string[];           // RRULE format
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{
      method: 'email' | 'popup';
      minutes: number;
    }>;
  };
  conferenceData?: {               // Google Meet
    createRequest?: {
      requestId: string;
    };
  };
  visibility?: 'default' | 'public' | 'private' | 'confidential';
  colorId?: string;
}
```

**Calendar Views:**
- Day view - hourly timeline
- Week view - 7-day grid
- Month view - monthly grid
- Schedule view - list of upcoming events

#### 5.3 Drive Module
| Feature | API Endpoint | Implementation |
|---------|-------------|----------------|
| List files | `GET /drive/v3/files` | File browser |
| Get file | `GET /drive/v3/files/{fileId}` | File metadata |
| Download file | `GET /drive/v3/files/{fileId}?alt=media` | File download |
| Upload file | `POST /upload/drive/v3/files` | File upload |
| Create folder | `POST /drive/v3/files` (with folder mime) | New folder |
| Move file | `PATCH /drive/v3/files/{fileId}` | Change parent |
| Rename file | `PATCH /drive/v3/files/{fileId}` | Update name |
| Delete file | `DELETE /drive/v3/files/{fileId}` | Move to trash |
| Share file | `POST /drive/v3/files/{fileId}/permissions` | Set permissions |
| Search files | `GET /drive/v3/files?q=` | Drive query syntax |
| Revisions | `GET /drive/v3/files/{fileId}/revisions` | Version history |
| Comments | `GET /drive/v3/files/{fileId}/comments` | File comments |
| Starred | `PATCH /drive/v3/files/{fileId}` | Star/unstar |
| Shortcuts | Shortcut file type | Links to files |

**File Upload:**
```typescript
interface FileUpload {
  name: string;
  mimeType: string;
  parents?: string[];              // Parent folder IDs
  content: Blob | File;
  description?: string;
}
```

**Drive Query Examples:**
- `name contains 'report'` - Search by name
- `mimeType = 'application/pdf'` - Filter by type
- `'folder_id' in parents` - Files in folder
- `modifiedTime > '2025-01-01'` - Recent files
- `sharedWithMe` - Shared files
- `starred` - Starred files

#### 5.4 Contacts Module
| Feature | API Endpoint | Implementation |
|---------|-------------|----------------|
| List contacts | `GET /v1/people/me/connections` | Contact list |
| Get contact | `GET /v1/people/{resourceName}` | Contact detail |
| Create contact | `POST /v1/people:createContact` | Contact form |
| Update contact | `PATCH /v1/people/{resourceName}:updateContact` | Edit contact |
| Delete contact | `DELETE /v1/people/{resourceName}:deleteContact` | Remove contact |
| Search | `GET /v1/people:searchContacts` | Search contacts |
| Contact groups | `GET /v1/contactGroups` | Label management |
| Merge contacts | `POST /v1/people/{resourceName}:merge` | Combine duplicates |

**Contact Form:**
```typescript
interface GoogleContact {
  names?: Array<{
    givenName?: string;
    familyName?: string;
    displayName?: string;
  }>;
  emailAddresses?: Array<{
    value: string;
    type?: 'home' | 'work' | 'other';
  }>;
  phoneNumbers?: Array<{
    value: string;
    type?: 'home' | 'work' | 'mobile' | 'other';
  }>;
  addresses?: Array<{
    streetAddress?: string;
    city?: string;
    region?: string;
    postalCode?: string;
    country?: string;
    type?: 'home' | 'work' | 'other';
  }>;
  organizations?: Array<{
    name?: string;
    title?: string;
    department?: string;
  }>;
  birthdays?: Array<{
    date: {
      year?: number;
      month: number;
      day: number;
    };
  }>;
  urls?: Array<{
    value: string;
    type?: 'work' | 'home' | 'blog' | 'profile';
  }>;
  notes?: Array<{
    value: string;
  }>;
}
```

#### 5.5 Tasks Module
| Feature | API Endpoint | Implementation |
|---------|-------------|----------------|
| List task lists | `GET /tasks/v1/users/@me/lists` | Task list sidebar |
| Get tasks | `GET /tasks/v1/lists/{taskListId}/tasks` | Task list |
| Create task | `POST /tasks/v1/lists/{taskListId}/tasks` | Task form |
| Update task | `PATCH /tasks/v1/lists/{taskListId}/tasks/{taskId}` | Edit task |
| Complete task | `PATCH /tasks/v1/lists/{taskListId}/tasks/{taskId}` | Mark done |
| Delete task | `DELETE /tasks/v1/lists/{taskListId}/tasks/{taskId}` | Remove task |
| Move task | `POST /tasks/v1/lists/{taskListId}/tasks/{taskId}/move` | Reorder |
| Subtasks | `parent` field | Nested tasks |

### Google Workspace UI Components Required

1. **Email List View** - Gmail-style inbox with threads
2. **Email Composer** - Rich text editor with attachments
3. **Email Reader** - Message view with actions
4. **Calendar Grid** - Day/Week/Month views
5. **Event Form** - Meeting creation with attendees
6. **File Browser** - Drive folder/file navigation
7. **File Preview** - Document/image preview
8. **Contact List** - Searchable contact directory
9. **Task List** - Checklist with due dates

---

## 6. Microsoft 365 - Complete Feature Specification

### Overview
Microsoft 365 includes Outlook, OneDrive, Calendar, Teams, and SharePoint. We use Microsoft Graph API for unified access.

### Official Documentation
- Graph API: https://learn.microsoft.com/en-us/graph/overview
- REST API Base: `https://graph.microsoft.com/v1.0/`

### Navigation Sidebar Structure

```typescript
const M365_SIDEBAR_ITEMS = [
  { id: 'home', label: 'Home', icon: Home },
  {
    id: 'outlook',
    label: 'Outlook',
    icon: Mail,
    submenu: [
      { id: 'inbox', label: 'Inbox' },
      { id: 'sent', label: 'Sent Items' },
      { id: 'drafts', label: 'Drafts' },
      { id: 'junk', label: 'Junk Email' },
      { id: 'deleted', label: 'Deleted Items' },
      { id: 'archive', label: 'Archive' },
    ]
  },
  {
    id: 'calendar',
    label: 'Calendar',
    icon: Calendar,
    submenu: [
      { id: 'day-view', label: 'Day' },
      { id: 'week-view', label: 'Week' },
      { id: 'month-view', label: 'Month' },
    ]
  },
  {
    id: 'onedrive',
    label: 'OneDrive',
    icon: Cloud,
    submenu: [
      { id: 'files', label: 'My files' },
      { id: 'shared', label: 'Shared' },
      { id: 'recent', label: 'Recent' },
      { id: 'recycle', label: 'Recycle bin' },
    ]
  },
  { id: 'contacts', label: 'Contacts', icon: Users },
  { id: 'tasks', label: 'To Do', icon: CheckCircle },
  { id: 'teams', label: 'Teams', icon: MessageSquare },
  { id: 'sharepoint', label: 'SharePoint', icon: Globe },
  { id: 'onenote', label: 'OneNote', icon: BookOpen },
];
```

### Complete Feature List

#### 6.1 Outlook Mail
| Feature | API Endpoint | Implementation |
|---------|-------------|----------------|
| List messages | `GET /me/mailFolders/{folderId}/messages` | Email list |
| Get message | `GET /me/messages/{id}` | Email detail |
| Send mail | `POST /me/sendMail` | Compose & send |
| Reply | `POST /me/messages/{id}/reply` | Reply to sender |
| Reply all | `POST /me/messages/{id}/replyAll` | Reply to all |
| Forward | `POST /me/messages/{id}/forward` | Forward message |
| Delete | `DELETE /me/messages/{id}` | Delete email |
| Move | `POST /me/messages/{id}/move` | Move to folder |
| Copy | `POST /me/messages/{id}/copy` | Copy to folder |
| Flag | `PATCH /me/messages/{id}` | Set flag |
| Categories | `PATCH /me/messages/{id}` | Set categories |
| Attachments | `GET /me/messages/{id}/attachments` | Download files |
| Create draft | `POST /me/messages` | Save draft |
| Search | `GET /me/messages?$search=` | Search syntax |
| Mail folders | `GET /me/mailFolders` | Folder management |
| Rules | `GET /me/mailFolders/inbox/messageRules` | Inbox rules |
| Focused Inbox | `inferenceClassification` | Important vs Other |

**Mail Compose:**
```typescript
interface OutlookMessage {
  subject: string;
  body: {
    contentType: 'text' | 'html';
    content: string;
  };
  toRecipients: Array<{
    emailAddress: {
      name?: string;
      address: string;
    };
  }>;
  ccRecipients?: Array<{emailAddress: {...}}>;
  bccRecipients?: Array<{emailAddress: {...}}>;
  attachments?: Array<{
    '@odata.type': '#microsoft.graph.fileAttachment';
    name: string;
    contentBytes: string;          // Base64
    contentType: string;
  }>;
  importance?: 'low' | 'normal' | 'high';
  isDeliveryReceiptRequested?: boolean;
  isReadReceiptRequested?: boolean;
}
```

#### 6.2 Calendar
| Feature | API Endpoint | Implementation |
|---------|-------------|----------------|
| List calendars | `GET /me/calendars` | Calendar list |
| List events | `GET /me/calendar/events` | Event list |
| Get event | `GET /me/events/{id}` | Event detail |
| Create event | `POST /me/calendar/events` | Event form |
| Update event | `PATCH /me/events/{id}` | Edit event |
| Delete event | `DELETE /me/events/{id}` | Remove event |
| Accept event | `POST /me/events/{id}/accept` | Accept invite |
| Decline event | `POST /me/events/{id}/decline` | Decline invite |
| Tentative | `POST /me/events/{id}/tentativelyAccept` | Maybe |
| Free/busy | `POST /me/calendar/getSchedule` | Availability |
| Find meeting times | `POST /me/findMeetingTimes` | Suggest times |
| Calendar groups | `GET /me/calendarGroups` | Group calendars |
| Room lists | `GET /places/microsoft.graph.roomList` | Meeting rooms |

**Event Form:**
```typescript
interface OutlookEvent {
  subject: string;
  body?: {
    contentType: 'text' | 'html';
    content: string;
  };
  start: {
    dateTime: string;              // ISO format
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  location?: {
    displayName: string;
    address?: {...};
  };
  attendees?: Array<{
    emailAddress: {
      address: string;
      name?: string;
    };
    type: 'required' | 'optional' | 'resource';
  }>;
  isOnlineMeeting?: boolean;
  onlineMeetingProvider?: 'teamsForBusiness';
  recurrence?: {
    pattern: {
      type: 'daily' | 'weekly' | 'absoluteMonthly' | 'relativeMonthly' | 'absoluteYearly' | 'relativeYearly';
      interval: number;
      daysOfWeek?: string[];
      dayOfMonth?: number;
    };
    range: {
      type: 'endDate' | 'noEnd' | 'numbered';
      startDate: string;
      endDate?: string;
      numberOfOccurrences?: number;
    };
  };
  reminderMinutesBeforeStart?: number;
  showAs?: 'free' | 'tentative' | 'busy' | 'oof' | 'workingElsewhere';
  sensitivity?: 'normal' | 'personal' | 'private' | 'confidential';
  categories?: string[];
}
```

#### 6.3 OneDrive
| Feature | API Endpoint | Implementation |
|---------|-------------|----------------|
| List items | `GET /me/drive/root/children` | File browser |
| Get item | `GET /me/drive/items/{id}` | File metadata |
| Download | `GET /me/drive/items/{id}/content` | Download file |
| Upload small | `PUT /me/drive/root:/{path}:/content` | < 4MB |
| Upload large | `POST /me/drive/items/{id}/createUploadSession` | > 4MB |
| Create folder | `POST /me/drive/root/children` | New folder |
| Copy | `POST /me/drive/items/{id}/copy` | Copy item |
| Move | `PATCH /me/drive/items/{id}` | Move item |
| Delete | `DELETE /me/drive/items/{id}` | Delete item |
| Share | `POST /me/drive/items/{id}/createLink` | Share link |
| Permissions | `GET /me/drive/items/{id}/permissions` | View sharing |
| Search | `GET /me/drive/root/search(q='{query}')` | Search files |
| Recent | `GET /me/drive/recent` | Recent files |
| Shared with me | `GET /me/drive/sharedWithMe` | Shared files |
| Thumbnails | `GET /me/drive/items/{id}/thumbnails` | Preview images |

#### 6.4 Contacts (People)
| Feature | API Endpoint | Implementation |
|---------|-------------|----------------|
| List contacts | `GET /me/contacts` | Contact list |
| Get contact | `GET /me/contacts/{id}` | Contact detail |
| Create | `POST /me/contacts` | New contact |
| Update | `PATCH /me/contacts/{id}` | Edit contact |
| Delete | `DELETE /me/contacts/{id}` | Remove contact |
| Photo | `GET /me/contacts/{id}/photo` | Contact photo |
| Contact folders | `GET /me/contactFolders` | Folder list |
| Search people | `GET /me/people` | People search |

#### 6.5 To Do (Tasks)
| Feature | API Endpoint | Implementation |
|---------|-------------|----------------|
| List lists | `GET /me/todo/lists` | Task lists |
| Get tasks | `GET /me/todo/lists/{listId}/tasks` | Task list |
| Create task | `POST /me/todo/lists/{listId}/tasks` | New task |
| Update task | `PATCH /me/todo/lists/{listId}/tasks/{taskId}` | Edit task |
| Complete task | `PATCH /me/todo/lists/{listId}/tasks/{taskId}` | Mark done |
| Delete task | `DELETE /me/todo/lists/{listId}/tasks/{taskId}` | Remove task |
| Linked resources | Task linkedResources | Links to files/emails |

#### 6.6 Teams (Overview)
| Feature | API Endpoint | Implementation |
|---------|-------------|----------------|
| List teams | `GET /me/joinedTeams` | Teams list |
| List channels | `GET /teams/{teamId}/channels` | Channel list |
| Get messages | `GET /teams/{teamId}/channels/{channelId}/messages` | Channel messages |
| Send message | `POST /teams/{teamId}/channels/{channelId}/messages` | Post message |
| Chat | `GET /me/chats` | Direct messages |

### Microsoft 365 UI Components Required

1. **Outlook Inbox** - Email list with preview pane
2. **Email Composer** - Rich editor with formatting
3. **Calendar Grid** - Outlook-style calendar
4. **Event Form** - Meeting with Teams integration
5. **OneDrive Browser** - File/folder navigation
6. **File Preview** - Office document preview
7. **Contact Cards** - Detailed contact view
8. **To Do List** - Task management
9. **Teams Chat** - Basic messaging

---

## 7. Slack - Complete Feature Specification

### Overview
Slack is a business communication platform with channels, messaging, and integrations.

### Official Documentation
- API Docs: https://docs.slack.dev/
- Web API: https://api.slack.com/methods
- API Base: `https://slack.com/api/`

### Navigation Sidebar Structure

```typescript
const SLACK_SIDEBAR_ITEMS = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'dms', label: 'Direct Messages', icon: MessageSquare },
  { id: 'activity', label: 'Activity', icon: Bell },
  { id: 'later', label: 'Later', icon: Bookmark },
  { id: 'more', label: 'More', icon: MoreHorizontal },
  { id: 'divider', label: '', type: 'divider' },
  {
    id: 'channels',
    label: 'Channels',
    icon: Hash,
    expandable: true,
    items: 'dynamic'                // Populated from API
  },
  {
    id: 'direct-messages',
    label: 'Direct messages',
    icon: Users,
    expandable: true,
    items: 'dynamic'
  },
  {
    id: 'apps',
    label: 'Apps',
    icon: Grid3X3,
    expandable: true,
    items: 'dynamic'
  },
];
```

### Complete Feature List

#### 7.1 Channels
| Feature | API Endpoint | Implementation |
|---------|-------------|----------------|
| List channels | `conversations.list` | Channel sidebar |
| Get channel info | `conversations.info` | Channel header |
| Create channel | `conversations.create` | New channel form |
| Archive channel | `conversations.archive` | Archive channel |
| Rename channel | `conversations.rename` | Edit name |
| Set topic | `conversations.setTopic` | Set topic |
| Set purpose | `conversations.setPurpose` | Set description |
| Join channel | `conversations.join` | Join public channel |
| Leave channel | `conversations.leave` | Leave channel |
| Invite users | `conversations.invite` | Add members |
| Kick user | `conversations.kick` | Remove member |
| List members | `conversations.members` | Member list |

**Channel Types:**
- Public channels (`is_channel: true, is_private: false`)
- Private channels (`is_channel: true, is_private: true`)
- Direct messages (`is_im: true`)
- Group DMs (`is_mpim: true`)

#### 7.2 Messaging
| Feature | API Endpoint | Implementation |
|---------|-------------|----------------|
| Get history | `conversations.history` | Message list |
| Send message | `chat.postMessage` | Compose message |
| Update message | `chat.update` | Edit message |
| Delete message | `chat.delete` | Delete message |
| Reply in thread | `chat.postMessage` with `thread_ts` | Thread reply |
| Get replies | `conversations.replies` | Thread view |
| React to message | `reactions.add` | Add emoji reaction |
| Remove reaction | `reactions.remove` | Remove reaction |
| Pin message | `pins.add` | Pin to channel |
| Unpin message | `pins.remove` | Unpin |
| Star message | `stars.add` | Star message |
| Schedule message | `chat.scheduleMessage` | Send later |
| Search messages | `search.messages` | Search |
| Share message | `chat.share` | Share to channel |
| Bookmark message | `bookmarks.add` | Add to Later |

**Message Format:**
```typescript
interface SlackMessage {
  channel: string;                 // Channel ID
  text?: string;                   // Plain text (fallback)
  blocks?: Block[];                // Block Kit blocks
  attachments?: Attachment[];      // Legacy attachments
  thread_ts?: string;              // Thread parent timestamp
  reply_broadcast?: boolean;       // Also send to channel
  unfurl_links?: boolean;          // Preview links
  unfurl_media?: boolean;          // Preview media
  mrkdwn?: boolean;                // Enable markdown
}

// Block Kit examples
interface Block {
  type: 'section' | 'divider' | 'image' | 'actions' | 'context' | 'header' | 'input';
  // ... block-specific properties
}
```

**Message Markdown:**
- Bold: `*text*`
- Italic: `_text_`
- Strikethrough: `~text~`
- Code: `` `code` ``
- Code block: ` ```code``` `
- Quote: `> text`
- Link: `<url|text>`
- User mention: `<@USER_ID>`
- Channel mention: `<#CHANNEL_ID>`
- Emoji: `:emoji_name:`

#### 7.3 Users
| Feature | API Endpoint | Implementation |
|---------|-------------|----------------|
| List users | `users.list` | User directory |
| Get user info | `users.info` | User profile |
| Get profile | `users.profile.get` | Detailed profile |
| Set status | `users.profile.set` | Update status |
| Get presence | `users.getPresence` | Online/away status |
| Set presence | `users.setPresence` | Set active/away |
| User groups | `usergroups.list` | @group mentions |
| Lookup by email | `users.lookupByEmail` | Find user |

**User Status:**
```typescript
interface UserStatus {
  status_text: string;             // "In a meeting"
  status_emoji: string;            // ":calendar:"
  status_expiration?: number;      // Unix timestamp
}
```

#### 7.4 Files
| Feature | API Endpoint | Implementation |
|---------|-------------|----------------|
| List files | `files.list` | File browser |
| Upload file | `files.upload` | File upload |
| Get file info | `files.info` | File details |
| Share file | `files.share` | Share to channel |
| Delete file | `files.delete` | Remove file |
| Get comments | `files.comments.list` | File comments |
| Remote files | `files.remote.add` | External files |

**File Upload:**
```typescript
interface FileUpload {
  channels?: string;               // Channel ID(s) to share
  content?: string;                // File contents (text)
  file?: Blob;                     // Binary file
  filename?: string;
  filetype?: string;               // Override file type
  initial_comment?: string;        // Message with file
  thread_ts?: string;              // Share in thread
  title?: string;                  // File title
}
```

#### 7.5 Workflows
| Feature | API Endpoint | Implementation |
|---------|-------------|----------------|
| List workflows | `workflows.list` | Workflow list |
| Trigger workflow | `workflows.triggers.create` | Start workflow |
| Workflow steps | `workflows.stepCompleted` | Complete step |

#### 7.6 Search
| Feature | API Endpoint | Implementation |
|---------|-------------|----------------|
| Search messages | `search.messages` | Message search |
| Search files | `search.files` | File search |
| Search all | `search.all` | Combined search |

**Search Modifiers:**
- `from:@user` - From user
- `in:#channel` - In channel
- `after:2025-01-01` - After date
- `before:2025-12-31` - Before date
- `has:link` - Has link
- `has:reaction` - Has reactions
- `is:starred` - Starred items

#### 7.7 Emoji & Reactions
| Feature | API Endpoint | Implementation |
|---------|-------------|----------------|
| List emoji | `emoji.list` | Custom emoji |
| Add reaction | `reactions.add` | React to message |
| Remove reaction | `reactions.remove` | Remove reaction |
| Get reactions | `reactions.get` | Message reactions |

#### 7.8 Apps & Integrations
| Feature | API Endpoint | Implementation |
|---------|-------------|----------------|
| List apps | `apps.list` | Installed apps |
| App events | Events API | Incoming webhooks |
| Slash commands | `commands` | Custom commands |

### Slack UI Components Required

1. **Channel List** - Sidebar with channels/DMs
2. **Message List** - Scrollable message history
3. **Message Composer** - Input with formatting toolbar
4. **Thread Panel** - Side panel for threads
5. **User Profile** - Profile card/modal
6. **File Viewer** - File preview/download
7. **Search Results** - Message/file search
8. **Emoji Picker** - Emoji selection
9. **Channel Header** - Topic, members, settings

---

## 8. Implementation Guidelines

### 8.1 File Structure

For each integration, create these files:

```
src/
├── app/
│   └── dashboard/
│       └── tools/
│           └── [integration]/
│               └── page.tsx           # Main page (switch by integration)
├── components/
│   └── integrations/
│       ├── quickbooks/
│       │   ├── QuickBooksPage.tsx
│       │   ├── InvoiceForm.tsx
│       │   ├── CustomerForm.tsx
│       │   ├── ExpenseForm.tsx
│       │   ├── ReportViewer.tsx
│       │   └── index.ts
│       ├── salesforce/
│       │   ├── SalesforcePage.tsx
│       │   ├── LeadForm.tsx
│       │   ├── OpportunityForm.tsx
│       │   ├── KanbanBoard.tsx
│       │   └── index.ts
│       ├── hubspot/
│       │   ├── HubSpotPage.tsx
│       │   ├── ContactForm.tsx
│       │   ├── DealForm.tsx
│       │   ├── PipelineBoard.tsx
│       │   └── index.ts
│       ├── google/
│       │   ├── GoogleWorkspacePage.tsx
│       │   ├── GmailInbox.tsx
│       │   ├── CalendarView.tsx
│       │   ├── DriveExplorer.tsx
│       │   └── index.ts
│       ├── microsoft/
│       │   ├── Microsoft365Page.tsx
│       │   ├── OutlookInbox.tsx
│       │   ├── CalendarView.tsx
│       │   ├── OneDriveExplorer.tsx
│       │   └── index.ts
│       └── slack/
│           ├── SlackPage.tsx
│           ├── ChannelView.tsx
│           ├── MessageComposer.tsx
│           ├── ThreadPanel.tsx
│           └── index.ts
```

### 8.2 Shared Components

Create reusable components:

```
src/components/shared/
├── DataTable.tsx               # Sortable, filterable table
├── KanbanBoard.tsx             # Drag-and-drop pipeline
├── CalendarGrid.tsx            # Day/Week/Month views
├── FileExplorer.tsx            # File browser component
├── EmailList.tsx               # Email inbox list
├── EmailComposer.tsx           # Rich text email editor
├── FormModal.tsx               # Modal with form
├── ConfirmDialog.tsx           # Confirmation modal
├── StatusBadge.tsx             # Status indicators
├── SearchBar.tsx               # Search with filters
├── Pagination.tsx              # Page navigation
└── EmptyState.tsx              # No data state
```

### 8.3 API Client Pattern

```typescript
// src/services/integrations/quickbooks.ts
import { apiClient } from '../apiClient';

export const quickbooksApi = {
  // Invoices
  getInvoices: (walletAddress: string) =>
    apiClient.get('/api/v1/integrations/quickbooks/invoices', { wallet_address: walletAddress }),

  createInvoice: (walletAddress: string, invoice: InvoiceForm) =>
    apiClient.post('/api/v1/integrations/quickbooks/invoices', { wallet_address: walletAddress, ...invoice }),

  updateInvoice: (walletAddress: string, id: string, invoice: Partial<InvoiceForm>) =>
    apiClient.patch(`/api/v1/integrations/quickbooks/invoices/${id}`, { wallet_address: walletAddress, ...invoice }),

  deleteInvoice: (walletAddress: string, id: string) =>
    apiClient.delete(`/api/v1/integrations/quickbooks/invoices/${id}`, { wallet_address: walletAddress }),

  sendInvoice: (walletAddress: string, id: string, email: string) =>
    apiClient.post(`/api/v1/integrations/quickbooks/invoices/${id}/send`, { wallet_address: walletAddress, email }),

  // Customers
  getCustomers: (walletAddress: string) =>
    apiClient.get('/api/v1/integrations/quickbooks/customers', { wallet_address: walletAddress }),

  // ... similar for other endpoints
};
```

### 8.4 State Management

Use React Query for server state:

```typescript
// src/hooks/useQuickBooks.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { quickbooksApi } from '@/services/integrations/quickbooks';

export function useInvoices(walletAddress: string) {
  return useQuery({
    queryKey: ['quickbooks', 'invoices', walletAddress],
    queryFn: () => quickbooksApi.getInvoices(walletAddress),
    enabled: !!walletAddress,
  });
}

export function useCreateInvoice(walletAddress: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (invoice: InvoiceForm) => quickbooksApi.createInvoice(walletAddress, invoice),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quickbooks', 'invoices'] });
    },
  });
}
```

### 8.5 Form Validation

Use Zod for form validation:

```typescript
// src/schemas/quickbooks.ts
import { z } from 'zod';

export const invoiceSchema = z.object({
  customer_ref: z.string().min(1, 'Customer is required'),
  invoice_date: z.date(),
  due_date: z.date(),
  line_items: z.array(z.object({
    description: z.string().min(1),
    quantity: z.number().positive(),
    rate: z.number().nonnegative(),
  })).min(1, 'At least one line item is required'),
  notes: z.string().optional(),
});

export type InvoiceFormData = z.infer<typeof invoiceSchema>;
```

### 8.6 Error Handling

```typescript
// Wrap API calls with error handling
try {
  const result = await quickbooksApi.createInvoice(walletAddress, invoice);
  toast.success('Invoice created successfully');
  return result;
} catch (error) {
  if (error instanceof ApiError) {
    toast.error(error.message);
  } else {
    toast.error('An unexpected error occurred');
    console.error(error);
  }
  throw error;
}
```

### 8.7 Loading States

```typescript
// Use skeletons for loading states
{loading ? (
  <div className="space-y-4">
    {[...Array(5)].map((_, i) => (
      <Skeleton key={i} className="h-16 w-full" />
    ))}
  </div>
) : (
  <DataTable data={invoices} columns={columns} />
)}
```

---

## 9. Backend API Reference

### 9.1 Required Endpoints

For each integration, implement these endpoint patterns:

```python
# backend/app/api/v1/integrations/{provider}.py

@router.get("/{provider}/data")
async def get_integration_data(
    provider: str,
    wallet_address: str,
    data_type: Optional[str] = None
):
    """Get all data or specific data type for integration"""
    pass

@router.post("/{provider}/sync")
async def sync_integration(
    provider: str,
    wallet_address: str,
    force: bool = False
):
    """Trigger data sync from provider"""
    pass

# CRUD endpoints for each data type
@router.get("/{provider}/invoices")
@router.post("/{provider}/invoices")
@router.patch("/{provider}/invoices/{id}")
@router.delete("/{provider}/invoices/{id}")

@router.get("/{provider}/customers")
@router.post("/{provider}/customers")
# ... etc
```

### 9.2 Adapter Methods

Each adapter should implement:

```python
class BaseAdapter:
    async def get_data_types(self) -> List[str]:
        """Return available data types"""
        raise NotImplementedError

    async def fetch_all(self) -> Dict[str, List[Dict]]:
        """Fetch all data types"""
        raise NotImplementedError

    async def fetch_data(self, data_type: str, **filters) -> List[Dict]:
        """Fetch specific data type with filters"""
        raise NotImplementedError

    async def create_record(self, data_type: str, data: Dict) -> Dict:
        """Create new record"""
        raise NotImplementedError

    async def update_record(self, data_type: str, id: str, data: Dict) -> Dict:
        """Update existing record"""
        raise NotImplementedError

    async def delete_record(self, data_type: str, id: str) -> bool:
        """Delete record"""
        raise NotImplementedError
```

---

## 10. Testing Checklist

### 10.1 QuickBooks
- [ ] Dashboard renders with real data
- [ ] Can create/edit/delete invoices
- [ ] Can create/edit/delete customers
- [ ] Can create/edit/delete expenses
- [ ] Can create/edit/delete vendors
- [ ] Reports generate correctly
- [ ] Search and filters work
- [ ] PDF download works
- [ ] Email send works

### 10.2 Salesforce
- [ ] Home dashboard shows metrics
- [ ] Leads CRUD operations
- [ ] Lead conversion works
- [ ] Accounts CRUD operations
- [ ] Contacts CRUD operations
- [ ] Opportunities CRUD operations
- [ ] Pipeline Kanban drag-and-drop
- [ ] Cases CRUD operations
- [ ] Reports and dashboards
- [ ] Global search works

### 10.3 HubSpot
- [ ] Contacts CRUD operations
- [ ] Companies CRUD operations
- [ ] Deals CRUD operations
- [ ] Pipeline Kanban works
- [ ] Tickets CRUD operations
- [ ] Tasks CRUD operations
- [ ] Workflows display
- [ ] Reports dashboard

### 10.4 Google Workspace
- [ ] Gmail inbox loads
- [ ] Can send/receive emails
- [ ] Calendar events display
- [ ] Can create/edit events
- [ ] Drive files display
- [ ] Can upload/download files
- [ ] Contacts list works
- [ ] Tasks work

### 10.5 Microsoft 365
- [ ] Outlook inbox loads
- [ ] Can send/receive emails
- [ ] Calendar events display
- [ ] Can create/edit events
- [ ] OneDrive files display
- [ ] Can upload/download files
- [ ] Contacts list works
- [ ] To Do tasks work

### 10.6 Slack
- [ ] Channels list loads
- [ ] Messages display correctly
- [ ] Can send messages
- [ ] Thread replies work
- [ ] File upload works
- [ ] Search works
- [ ] Reactions work
- [ ] User profiles display

---

## Sources & References

### Official API Documentation
- [QuickBooks Online API](https://developer.intuit.com/app/developer/qbo/docs/learn/explore-the-quickbooks-online-api)
- [Salesforce REST API](https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_list.htm)
- [HubSpot CRM API](https://developers.hubspot.com/docs/api/crm)
- [Google Workspace APIs](https://developers.google.com/workspace/products)
- [Microsoft Graph API](https://learn.microsoft.com/en-us/graph/overview)
- [Slack API](https://docs.slack.dev/)

### 2025 Updates
- [QuickBooks 2025 Features](https://quickbooks.intuit.com/r/product-update/whats-new-quickbooks-online-december-2025/)
- [Salesforce Winter '26](https://resources.docs.salesforce.com/latest/latest/en-us/sfdc/pdf/api_rest.pdf)
- [HubSpot CRM 2025](https://makewebbetter.com/blog/hubspot-crm-2025/)
- [Google Workspace Updates 2025](https://workspaceupdates.googleblog.com/2025)
- [Microsoft 365 Roadmap](https://msftnewsnow.com/microsoft-365-roadmap-16-powerful-new-features/)
- [Slack Updates 2025](https://slack.com/help/articles/115004846068-Slack-updates-and-changes)
