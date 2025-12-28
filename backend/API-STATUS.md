# Varity API Status Documentation

**Last Updated:** December 26, 2025
**Base URL:** https://generic-template-dashboard-production.up.railway.app
**API Documentation:** https://generic-template-dashboard-production.up.railway.app/docs

---

## Quick Status Overview

| Category | Working | Partial | Broken | Untested |
|----------|:-------:|:-------:|:------:|:--------:|
| **Core** | 3       | 0       | 0      | 0 |
| **AI**   | 5       | 2       | 0      | 0 |
| **OAuth** | 4      | 1       | 1      | 0 |
| **Integrations** | 2 |  2    | 1      | 2 |
| **Conversations** | 10 | 0   | 0      | 0 |
| **Dashboard** | 8 | 0        | 0      | 0 |
| **Settings/Export** | 10 | 0 | 0      | 0 |

---

## Status Definitions

| Status | Meaning |
|--------|---------|
| **WORKING** | Tested and functional in production |
| **PARTIAL** | Works but with limitations or incomplete features |
| **BROKEN** | Does not work - needs fix |
| **UNTESTED** | Code exists but never validated |
| **DEPRECATED** | Will be removed in future version |

---

## Core Endpoints

### Health Check
- **Endpoint:** `GET /health`
- **Status:** WORKING
- **Description:** Returns service health status including database, Redis, Qdrant, Pinata
- **Auth Required:** No
- **Response:**
  ```json
  {
    "status": "healthy",
    "services": {
      "database": "connected",
      "redis": "not configured",
      "qdrant": "connected",
      "pinata": "connected"
    },
    "timestamp": "2025-12-26T..."
  }
  ```

### Root
- **Endpoint:** `GET /`
- **Status:** WORKING
- **Description:** API info and version
- **Auth Required:** No

---

## AI Endpoints (`/api/v1/ai`)

### General Chat (Recommended)
- **Endpoint:** `POST /api/v1/ai/chat/general`
- **Status:** WORKING
- **Description:** Main AI chat with Qdrant RAG - uses semantic vector search
- **Request:**
  ```json
  {
    "message": "string",
    "wallet_address": "string",
    "conversation_id": "optional string",
    "temperature": 0.7,
    "max_tokens": 2000
  }
  ```
- **Response:**
  ```json
  {
    "response": "AI response text",
    "conversation_id": "conv-xxx",
    "sources": [...],
    "metadata": {...}
  }
  ```

### Legacy Chat (Fixed Dec 26, 2025)
- **Endpoint:** `POST /api/v1/ai/chat`
- **Status:** WORKING (was PARTIAL)
- **Description:** Legacy chat endpoint - now uses Qdrant instead of Pinata file listing
- **Note:** Updated to use `rag_service.query_business_rag()` for semantic search

### Combined Query
- **Endpoint:** `POST /api/v1/ai/query/combined`
- **Status:** WORKING
- **Description:** RAG + optional web search combined
- **Request:**
  ```json
  {
    "query": "string",
    "wallet_address": "string",
    "include_web_search": false
  }
  ```

### Deep Research
- **Endpoint:** `POST /api/v1/ai/research`
- **Status:** WORKING
- **Description:** Deep research mode for complex queries
- **Request:**
  ```json
  {
    "query": "string",
    "wallet_address": "string",
    "depth": "standard|deep|comprehensive"
  }
  ```

### Document Analysis
- **Endpoint:** `POST /api/v1/ai/analyze/document`
- **Status:** PARTIAL
- **Description:** Analyze uploaded documents
- **Note:** Backend works, but frontend file upload UI is incomplete

### AI Health
- **Endpoint:** `GET /api/v1/ai/health`
- **Status:** WORKING
- **Description:** Check AI service status (Together.ai connection)

### Available Models
- **Endpoint:** `GET /api/v1/ai/models`
- **Status:** WORKING
- **Description:** List available AI models

---

## OAuth Endpoints (`/api/v1/oauth`)

### Start OAuth Flow
- **Endpoint:** `POST /api/v1/oauth/start/{provider}`
- **Status:** WORKING
- **Providers:** google, microsoft, slack, quickbooks, salesforce, hubspot
- **Request:**
  ```json
  {
    "wallet_address": "0x..."
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "authorization_url": "https://...",
    "integration": "google"
  }
  ```

### OAuth Callback (POST)
- **Endpoint:** `POST /api/v1/oauth/callback`
- **Status:** WORKING
- **Description:** Handles OAuth callback with authorization code

### OAuth Callback (GET)
- **Endpoint:** `GET /api/v1/oauth/callback`
- **Status:** WORKING
- **Description:** Alternative GET callback handler

### Check Connection Status
- **Endpoint:** `GET /api/v1/oauth/status/{provider}`
- **Status:** WORKING
- **Description:** Check if user has active OAuth connection

### Integration-Specific Status

| Provider | OAuth | Status | Notes |
|----------|:-----:|:------:|-------|
| **Google** | ✅ | WORKING | Full read/write scopes |
| **Slack** | ✅ | WORKING | Fixed Dec 26 - uses access_token property |
| **Microsoft** | ✅ | WORKING (Fixed) | Dec 26: Added prompt=consent + write scopes |
| **QuickBooks** | ✅ | WORKING | Production credentials configured |
| **Salesforce** | ✅ | UNTESTED | Code complete, needs testing |
| **HubSpot** | ✅ | UNTESTED (Fixed) | Dec 26: Added hub_id extraction |

---

## Integrations Endpoints (`/api/v1/integrations`)

### List Installed Integrations
- **Endpoint:** `GET /api/v1/integrations/installed`
- **Status:** WORKING
- **Query Params:** `wallet_address`
- **Response:** List of connected integrations with status

### Get Integration Data
- **Endpoint:** `GET /api/v1/integrations/{provider}/data`
- **Status:** PARTIAL
- **Description:** Get synced data for an integration
- **Note:** Depends on successful sync

### Trigger Data Sync
- **Endpoint:** `POST /api/v1/integrations/{provider}/sync`
- **Status:** PARTIAL
- **Description:** Trigger data sync from provider
- **Request:**
  ```json
  {
    "wallet_address": "0x..."
  }
  ```
- **Notes by Provider:**
  - Google: WORKING
  - Slack: WORKING
  - Microsoft: UNTESTED
  - QuickBooks: WORKING (production credentials)
  - Salesforce: UNTESTED
  - HubSpot: UNTESTED

### Disconnect Integration
- **Endpoint:** `DELETE /api/v1/integrations/{provider}`
- **Status:** WORKING
- **Description:** Remove OAuth connection

---

## Google Workspace (`/api/v1/integrations/google`)

### Send Email
- **Endpoint:** `POST /api/v1/integrations/google/send-email`
- **Status:** WORKING
- **Request:**
  ```json
  {
    "wallet_address": "0x...",
    "to": ["email@example.com"],
    "subject": "Subject",
    "body": "Email body"
  }
  ```

### Gmail Messages
- **Endpoint:** `GET /api/v1/integrations/google/mail/messages`
- **Status:** WORKING
- **Query Params:** `wallet_address`, `folder`, `limit`

### Calendar Events
- **Endpoint:** `GET /api/v1/integrations/google/calendar/events`
- **Status:** WORKING
- **Query Params:** `wallet_address`

### Drive Files
- **Endpoint:** `GET /api/v1/integrations/google/drive/files`
- **Status:** WORKING
- **Query Params:** `wallet_address`, `folder_id`

### Upload to Drive
- **Endpoint:** `POST /api/v1/integrations/google/upload-file`
- **Status:** WORKING

### Create Contact
- **Endpoint:** `POST /api/v1/integrations/google/contacts`
- **Status:** PARTIAL
- **Note:** Form validation incomplete on frontend

### Create Calendar Event
- **Endpoint:** `POST /api/v1/integrations/google/events`
- **Status:** PARTIAL

---

## Microsoft 365 (`/api/v1/integrations/microsoft`)

**Status Update (Dec 26, 2025):** OAuth fixed with `prompt=consent` and write scopes added.

### Send Email
- **Endpoint:** `POST /api/v1/integrations/microsoft/mail/send`
- **Status:** WORKING (after OAuth fix)
- **Request:**
  ```json
  {
    "wallet_address": "0x...",
    "to": ["email@example.com"],
    "subject": "Subject",
    "body": "Email body"
  }
  ```

### Get Mail Messages
- **Endpoint:** `GET /api/v1/integrations/microsoft/mail/messages`
- **Status:** WORKING (after OAuth fix)

### Create Calendar Event
- **Endpoint:** `POST /api/v1/integrations/microsoft/calendar/events`
- **Status:** WORKING (after OAuth fix)

### Upload to OneDrive
- **Endpoint:** `POST /api/v1/integrations/microsoft/onedrive/upload`
- **Status:** WORKING (after OAuth fix)

### Note for Existing Users
Users connected before Dec 26, 2025 need to disconnect and reconnect to get new write permissions.

---

## Conversations (`/api/v1/conversations`)

### List Conversations
- **Endpoint:** `GET /api/v1/conversations/`
- **Status:** WORKING
- **Query Params:** `wallet_address`, `include_archived`

### Create Conversation
- **Endpoint:** `POST /api/v1/conversations/`
- **Status:** WORKING
- **Request:**
  ```json
  {
    "wallet_address": "0x...",
    "title": "New Conversation"
  }
  ```

### Get Conversation with Messages
- **Endpoint:** `GET /api/v1/conversations/{id}`
- **Status:** WORKING

### Update Conversation
- **Endpoint:** `PATCH /api/v1/conversations/{id}`
- **Status:** WORKING
- **Request:**
  ```json
  {
    "title": "New Title"
  }
  ```

### Delete Conversation
- **Endpoint:** `DELETE /api/v1/conversations/{id}`
- **Status:** WORKING

### Add Message
- **Endpoint:** `POST /api/v1/conversations/{id}/messages`
- **Status:** WORKING

### Pin/Unpin/Archive
- **Endpoints:**
  - `POST /api/v1/conversations/{id}/pin`
  - `POST /api/v1/conversations/{id}/unpin`
  - `POST /api/v1/conversations/{id}/archive`
- **Status:** WORKING

---

## Dashboard (`/api/v1/dashboard`)

### Get KPIs
- **Endpoint:** `GET /api/v1/dashboard/kpis`
- **Status:** WORKING
- **Query Params:** `wallet_address`
- **Response:** Business KPI metrics

### Recent Activity
- **Endpoint:** `GET /api/v1/dashboard/recent-activity`
- **Status:** WORKING

### Quick Actions
- **Endpoint:** `GET /api/v1/dashboard/quick-actions`
- **Status:** WORKING

### Integration Summary
- **Endpoint:** `GET /api/v1/dashboard/integrations`
- **Status:** WORKING

---

## Settings (`/api/v1`)

### Get Settings
- **Endpoint:** `GET /api/v1/settings`
- **Status:** WORKING
- **Query Params:** `wallet_address`

### Update Settings
- **Endpoint:** `PUT /api/v1/settings`
- **Status:** WORKING
- **Request:** Company profile, preferences, contact info

---

## Export (`/api/v1/export`)

### Export Data
- **Endpoint:** `POST /api/v1/export/data`
- **Status:** WORKING
- **Formats:** JSON, CSV, Excel
- **Request:**
  ```json
  {
    "wallet_address": "0x...",
    "integration": "google",
    "data_types": ["emails", "contacts"],
    "format": "csv"
  }
  ```

---

## Team Management (`/api/v1/team`)

### List Team Members
- **Endpoint:** `GET /api/v1/team/members`
- **Status:** WORKING

### Invite Member
- **Endpoint:** `POST /api/v1/team/invite`
- **Status:** WORKING

### Remove Member
- **Endpoint:** `DELETE /api/v1/team/members/{id}`
- **Status:** WORKING

### Update Member Role
- **Endpoint:** `PATCH /api/v1/team/members/{id}`
- **Status:** WORKING

---

## Onboarding (`/api/v1`)

### Get Onboarding Status
- **Endpoint:** `GET /api/v1/onboarding/status`
- **Status:** WORKING

### Update Step
- **Endpoint:** `PUT /api/v1/onboarding/step`
- **Status:** WORKING

### Complete Onboarding
- **Endpoint:** `POST /api/v1/onboarding/complete`
- **Status:** WORKING

### Get Trial Tier
- **Endpoint:** `GET /api/v1/onboarding/trial-tier`
- **Status:** WORKING

---

## CRM Integrations

### Salesforce (`/api/v1/salesforce`)
- **Status:** UNTESTED
- **Endpoints Available:**
  - `GET /leads` - List leads
  - `POST /leads` - Create lead
  - `PATCH /leads/{id}` - Update lead
  - `DELETE /leads/{id}` - Delete lead
  - `GET /opportunities` - List opportunities
  - `POST /opportunities` - Create opportunity
  - `GET /accounts` - List accounts
  - `POST /accounts` - Create account
  - `POST /leads/{id}/convert` - Convert lead to opportunity
- **Note:** Code complete, needs testing with Salesforce developer account

### HubSpot (`/api/v1/hubspot`)
- **Status:** UNTESTED
- **Endpoints Available:**
  - `GET /contacts` - List contacts
  - `POST /contacts` - Create contact
  - `PATCH /contacts/{id}` - Update contact
  - `DELETE /contacts/{id}` - Delete contact
  - `GET /deals` - List deals
  - `POST /deals` - Create deal
  - `GET /companies` - List companies
  - `POST /companies` - Create company
  - `GET /tickets` - List tickets
  - `POST /tickets` - Create ticket
- **Note:** Code complete (Dec 26 fix: hub_id extraction), needs testing

### QuickBooks (`/api/v1/quickbooks`)
- **Status:** BLOCKED
- **Issue:** API returns 403 - needs Intuit production approval
- **Endpoints Available:**
  - `GET /invoices`
  - `POST /invoices`
  - `GET /customers`
  - `POST /customers`
  - `GET /expenses`
  - `POST /expenses`

---

## Projects (`/api/v1/projects`)

### List Projects
- **Endpoint:** `GET /api/v1/projects/`
- **Status:** WORKING

### Create Project
- **Endpoint:** `POST /api/v1/projects/`
- **Status:** WORKING

### Get Project
- **Endpoint:** `GET /api/v1/projects/{id}`
- **Status:** WORKING

### Update Project
- **Endpoint:** `PATCH /api/v1/projects/{id}`
- **Status:** WORKING

### Delete Project
- **Endpoint:** `DELETE /api/v1/projects/{id}`
- **Status:** WORKING

### Project Files
- **Endpoints:**
  - `POST /api/v1/projects/{id}/files` - Add file
  - `DELETE /api/v1/projects/{id}/files/{file_id}` - Remove file
- **Status:** WORKING

---

## Admin (`/api/v1/admin`)

### System Stats
- **Endpoint:** `GET /api/v1/admin/stats`
- **Status:** WORKING
- **Auth:** Admin only

### User Management
- **Endpoints:**
  - `GET /api/v1/admin/users`
  - `PATCH /api/v1/admin/users/{id}`
- **Status:** WORKING

### Integration Stats
- **Endpoint:** `GET /api/v1/admin/integrations`
- **Status:** WORKING

---

## Marketplace (`/api/v1/marketplace`)

### List Products
- **Endpoint:** `GET /api/v1/marketplace/products`
- **Status:** WORKING

### Get Product
- **Endpoint:** `GET /api/v1/marketplace/products/{id}`
- **Status:** WORKING

### Connect Integration (OAuth-only)
- **Endpoint:** `POST /api/v1/marketplace/connect`
- **Status:** WORKING
- **Note:** USDC purchases removed for MVP, OAuth-only connections

---

## Recent Fixes (December 26, 2025)

### Backend Team Fixes

1. **AI Chat Qdrant Fix**
   - File: `backend/app/api/v1/ai.py`
   - Changed: `_build_rag_context()` now uses Qdrant vector search instead of Pinata file listing
   - Impact: Query time reduced from 6+ minutes to <5 seconds

2. **Microsoft OAuth Fix**
   - File: `backend/app/api/v1/oauth.py`
   - Added: `prompt=consent` for refresh token support
   - Added: Write scopes (Mail.Send, Mail.ReadWrite, Calendars.ReadWrite, etc.)
   - Impact: Microsoft CRUD operations now work

3. **HubSpot hub_id Extraction**
   - File: `backend/app/api/v1/oauth.py`
   - Added: `hub_id`, `user_id`, `user` extraction from token response
   - Impact: HubSpot API calls now have proper portal context

---

## Testing Endpoints

### Health Check
```bash
curl https://generic-template-dashboard-production.up.railway.app/health
```

### AI Chat Test
```bash
curl -X POST "https://generic-template-dashboard-production.up.railway.app/api/v1/ai/chat/general" \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello", "wallet_address": "0x..."}'
```

### List Integrations
```bash
curl "https://generic-template-dashboard-production.up.railway.app/api/v1/integrations/installed?wallet_address=0x..."
```

---

## Swagger Documentation

Full interactive API documentation available at:
- **Swagger UI:** https://generic-template-dashboard-production.up.railway.app/docs
- **ReDoc:** https://generic-template-dashboard-production.up.railway.app/redoc
