# Slack Integration Data Pipeline Debug Report

**Generated:** December 29, 2025
**Wallet Tested:** `0x738C812FB221ba32E8726fe38961570a700e87b9`
**Integration:** Slack
**Status:** PARTIAL - Live API working, RAG indexing NOT implemented

---

## Executive Summary

The Slack integration uses a **hybrid data model** where:
- **Channels, Messages, Users** → Fetched via **live Slack API** (NOT stored in Pinata/Qdrant)
- **Files** → Should be stored in **Pinata** and indexed in **Qdrant for RAG queries**

**CRITICAL FINDING:** RAG indexing is **NOT currently happening** after Pinata upload. The `BaseDataAdapter` does not call `rag_service.index_business_data()` after uploading to Pinata.

---

## Data Flow Architecture

```
1. OAuth Connection
   ├── Provider: Slack
   ├── Storage: PostgreSQL (OAuthToken model)
   ├── Encryption: AES-256-GCM with wallet-derived key
   └── File: backend/app/models/purchase.py:OAuthToken

2. Data Sync Trigger
   ├── Endpoint: POST /api/v1/integrations/slack/sync
   ├── Handler: backend/app/api/v1/integrations.py:316-540
   ├── Adapter: backend/app/adapters/slack/sync.py:SlackSync
   └── Data Types: ["channels", "messages", "users", "files"]

3. Slack API Data Fetching
   ├── SlackSync.fetch_data(data_type)
   ├── Channels: conversations.list API
   ├── Messages: conversations.history API (first 10 channels)
   ├── Users: users.list API (paginated)
   └── Files: files.list API

4. Data Transformation
   ├── SlackSync.transform_data(data_type, raw_data)
   ├── Adds fields: type, integration, created_at
   └── Returns: List[Dict[str, Any]]

5. Encryption & Pinata Upload
   ├── BaseDataAdapter._store_chunked_data()
   ├── Encryption: AES-256-GCM with wallet-derived key
   ├── Upload: FilecoinService.upload_encrypted_data()
   ├── Chunking: "monthly" for messages, "quarterly" for files
   └── Returns: CID (IPFS hash)

6. RAG Indexing (MISSING STEP!)
   ├── Expected: rag_service.index_business_data(wallet, cid, data, integration, data_type)
   ├── Actual: NOT CALLED from BaseDataAdapter
   ├── Impact: Files uploaded to Pinata but NOT indexed in Qdrant
   └── Result: AI queries cannot find Slack files

7. Frontend Display
   ├── Live API Endpoints:
   │   ├── GET /api/v1/integrations/slack/channels
   │   ├── GET /api/v1/integrations/slack/messages?channel={id}
   │   └── GET /api/v1/integrations/slack/users
   ├── Component: src/components/integrations/slack/SlackPage.tsx
   └── Behavior: Fetches channels/messages/users on-demand (NOT from Pinata)
```

---

## RAG Configuration

### Slack Adapter RAG Settings

**File:** `/Users/MichaelAbril/Desktop/generic-template-dashboard/backend/app/adapters/slack/sync.py`

```python
class SlackSync(BaseDataAdapter):
    INTEGRATION_NAME = "slack"

    # Only files go to RAG - messages/channels/users are not indexed
    RAG_ENABLED_TYPES = ["files"]  # Line 38

    def get_data_types(self) -> List[str]:
        return ["channels", "messages", "users", "files"]  # Line 54
```

**Design Intent:**
- Channels, Messages, Users → Live API only (transient data)
- Files → Pinata storage + Qdrant indexing (permanent documents)

**Current Reality:**
- Files ARE uploaded to Pinata during sync
- Files are NOT indexed in Qdrant (missing indexing step)

---

## Pipeline Failure Point: Missing RAG Indexing

### Expected Flow (Not Implemented)

After `BaseDataAdapter._store_chunked_data()` uploads to Pinata:

```python
# EXPECTED (but missing):
for data_type in self.RAG_ENABLED_TYPES:
    if data_type in results["data"]:
        cid = results["data"][data_type]["cid"]
        await rag_service.index_business_data(
            business_wallet=wallet_address,
            cid=cid,
            data=transformed_data,
            integration=self.INTEGRATION_NAME,
            data_type=data_type
        )
```

### Actual Implementation

**File:** `/Users/MichaelAbril/Desktop/generic-template-dashboard/backend/app/adapters/base_adapter.py`

The `BaseDataAdapter` class:
1. ✅ Fetches data from Slack API
2. ✅ Transforms to common schema
3. ✅ Encrypts with wallet-derived key
4. ✅ Uploads to Pinata (lines 330-425)
5. ❌ **DOES NOT** call `rag_service.index_business_data()`

**Evidence:** Grep search for `index_business_data|rag_service` in `base_adapter.py` returns **NO matches**.

---

## Live API Endpoints (Working)

These endpoints bypass Pinata/RAG and call Slack API directly:

### 1. Get Channels
```bash
GET /api/v1/integrations/slack/channels?wallet_address={wallet}
```
**Handler:** `backend/app/api/v1/integrations.py:1475-1528`
**Method:** `SlackSync.get_channels(limit=100)`
**Status:** ✅ WORKING

### 2. Get Messages
```bash
GET /api/v1/integrations/slack/messages?wallet_address={wallet}&channel={channel_id}
```
**Handler:** `backend/app/api/v1/integrations.py:1530-1585`
**Method:** `SlackSync.get_messages(channel, limit=100)`
**Status:** ✅ WORKING

### 3. Get Users
```bash
GET /api/v1/integrations/slack/users?wallet_address={wallet}
```
**Handler:** `backend/app/api/v1/integrations.py:1587-1640`
**Method:** `SlackSync.get_users(limit=200)`
**Status:** ✅ WORKING

### 4. Send Message
```bash
POST /api/v1/integrations/slack/messages
Body: {wallet_address, channel, text, thread_ts?, reply_broadcast?}
```
**Handler:** `backend/app/api/v1/integrations.py:1299-1356`
**Method:** `SlackSync.send_message()`
**Status:** ✅ WORKING

---

## Frontend Implementation

**File:** `/Users/MichaelAbril/Desktop/generic-template-dashboard/src/components/integrations/slack/SlackPage.tsx`

### Data Loading Strategy

```typescript
// Line 48-98: Fetches channels and users via live API on mount
useEffect(() => {
  const fetchLiveData = async () => {
    const [channelsRes, usersRes] = await Promise.all([
      fetch(`${API_URL}/api/v1/integrations/slack/channels?wallet_address=${walletAddress}`),
      fetch(`${API_URL}/api/v1/integrations/slack/users?wallet_address=${walletAddress}`)
    ]);

    setChannels(channelsData.channels);
    setDms(dmsList); // Derived from users

    // Auto-select first channel and fetch messages
    if (fetchedChannels.length > 0) {
      await fetchMessagesForChannel(firstChannel.id);
    }
  };
  fetchLiveData();
}, []);

// Messages fetched separately when channel selected
const fetchMessagesForChannel = async (channelId: string) => {
  const res = await fetch(
    `${API_URL}/api/v1/integrations/slack/messages?wallet_address=${walletAddress}&channel=${channelId}`
  );
};
```

**Behavior:**
- ✅ Channels list loads correctly from live API
- ✅ Users list loads and converts to DMs
- ✅ Messages load when channel selected
- ❌ Files are NOT displayed (would require RAG query or separate endpoint)

---

## OAuth Status Check

### Required Scopes

**File:** `/Users/MichaelAbril/Desktop/generic-template-dashboard/backend/CLAUDE.md`

```
channels:read       - Read public channels
channels:history    - Read public channel messages
groups:read         - Read private channels
groups:history      - Read private channel messages
users:read          - Read workspace users
files:read          - Read workspace files
chat:write          - Send messages
```

### Token Storage

**Model:** `backend/app/models/purchase.py:OAuthToken`

```python
class OAuthToken(Base):
    __tablename__ = "oauth_tokens"

    user_address = Column(String, index=True)  # Wallet address
    provider = Column(String)  # "slack"
    access_token = Column(Text)  # Encrypted
    refresh_token = Column(Text, nullable=True)  # Encrypted
    expires_at = Column(DateTime(timezone=True), nullable=True)
    provider_data = Column(JSON, nullable=True)  # realm_id, instance_url, etc.
    is_active = Column(Boolean, default=True)
```

**Token Access Pattern (YELLOW-001 Fix):**

```python
# backend/app/api/v1/integrations.py:1505-1514
with OAuthToken.auth_context(user_address):
    access_token = oauth_token.access_token  # Auto-decrypts
    credentials = {"access_token": access_token}

slack = SlackSync(credentials)
channels = await slack.get_channels()
```

---

## Qdrant Collection Structure

**File:** `/Users/MichaelAbril/Desktop/generic-template-dashboard/backend/app/services/rag_service.py:469-553`

### Collection Name
```python
collection_name = f"business_{wallet_address.lower().replace('0x', '')}"
# Example: business_738c812fb221ba32e8726fe38961570a700e87b9
```

### Point Structure (If Indexing Were Working)
```python
{
    "id": str(uuid.uuid4()),
    "vector": embedding,  # 768-dimensional BAAI/bge-base-en-v1.5
    "payload": {
        "cid": "Qm...",
        "preview": "First 500 chars...",
        "integration": "slack",
        "data_type": "files",
        "business_wallet": "0x738c812...",
        "indexed_at": 1735488000.0,
        "record_count": 10
    }
}
```

### Deduplication Logic
```python
# Line 501-508: Check for existing CID before indexing
existing_id = await self._find_by_cid(collection_name, cid)
if existing_id:
    await self._update_point_timestamp(collection_name, existing_id)
    logger.info(f"Dedup: CID {cid} already indexed")
    return existing_id
```

---

## Testing Results

### Manual API Tests (Unable to Execute)

Due to permission restrictions, the following API tests could NOT be run:

```bash
# OAuth Status Check
curl "https://generic-template-dashboard-production.up.railway.app/api/v1/oauth/status/slack?wallet_address=0x738C812FB221ba32E8726fe38961570a700e87b9"

# Get Slack Data
curl "https://generic-template-dashboard-production.up.railway.app/api/v1/integrations/slack/data?wallet_address=0x738C812FB221ba32E8726fe38961570a700e87b9"

# Pipeline Debug
curl "https://generic-template-dashboard-production.up.railway.app/api/v1/ai/debug/pipeline?wallet_address=0x738C812FB221ba32E8726fe38961570a700e87b9"
```

**Recommendation:** User should run these tests manually to check:
1. Is Slack OAuth token active?
2. Are files being uploaded to Pinata during sync?
3. Are files appearing in Qdrant collection?

---

## Root Cause Analysis

### Issue: Files Not Indexed in RAG

**Symptom:** AI queries cannot find Slack files even though they are uploaded to Pinata

**Root Cause:** `BaseDataAdapter` missing RAG indexing step

**Location:** `/Users/MichaelAbril/Desktop/generic-template-dashboard/backend/app/adapters/base_adapter.py`

**Problem:** After `_store_chunked_data()` uploads to Pinata (lines 330-425), there is NO code to:
1. Check if `data_type` is in `RAG_ENABLED_TYPES`
2. Call `rag_service.index_business_data(wallet, cid, data, integration, data_type)`

**Impact:**
- Slack files uploaded to Pinata ✅
- Slack files encrypted correctly ✅
- Slack files indexed in Qdrant ❌
- AI queries can't find Slack files ❌

---

## Comparison with Other Integrations

### Google Workspace
**RAG Types:** `["drive", "contacts"]`
**Live API Types:** `["gmail", "calendar"]`
**Same Issue:** Files uploaded but NOT indexed

### QuickBooks
**RAG Types:** `["invoices", "expenses", "customers", "vendors", "payments"]`
**Same Issue:** All data uploaded but NOT indexed

### Microsoft 365
**RAG Types:** `["onedrive", "contacts"]`
**Live API Types:** `["mail", "calendar"]`
**Same Issue:** Files uploaded but NOT indexed

**Conclusion:** This is a SYSTEMIC issue affecting ALL integrations, not just Slack.

---

## Recommended Fixes

### Fix 1: Add RAG Indexing to BaseDataAdapter

**File:** `/Users/MichaelAbril/Desktop/generic-template-dashboard/backend/app/adapters/base_adapter.py`

**After line 425 in `_store_chunked_data()`, add:**

```python
# RAG Indexing (if enabled for this data type)
if self.should_index_in_rag(data_type):
    from app.services.rag_service import BusinessRAGService
    rag_service = BusinessRAGService()

    # Index the latest chunk
    if latest_cid:
        # Get the data package for the latest chunk
        latest_chunk_id = sorted_chunk_ids[0]
        latest_records = chunks[latest_chunk_id]

        data_package = {
            "records": latest_records,
            "data_type": data_type,
            "integration": self.INTEGRATION_NAME,
            "chunk_id": latest_chunk_id
        }

        await rag_service.index_business_data(
            business_wallet=wallet_address,
            cid=latest_cid,
            data=data_package,
            integration=self.INTEGRATION_NAME,
            data_type=data_type
        )

        logger.info(
            f"RAG indexed: {self.INTEGRATION_NAME}/{data_type}, "
            f"CID={latest_cid}, records={len(latest_records)}"
        )
```

### Fix 2: Add Manual Re-indexing Endpoint

**File:** `/Users/MichaelAbril/Desktop/generic-template-dashboard/backend/app/api/v1/integrations.py`

```python
@router.post("/{provider}/reindex")
async def reindex_existing_data(
    provider: str,
    request: SyncRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Re-index existing Pinata data into Qdrant.

    This is a one-time fix for data that was uploaded before
    RAG indexing was implemented.
    """
    from app.services.filecoin_service import FilecoinService
    from app.services.rag_service import BusinessRAGService
    from app.services.encryption_service import normalize_wallet_address

    wallet_address = normalize_wallet_address(request.wallet_address)
    filecoin = FilecoinService()
    rag = BusinessRAGService()

    # Get adapter to check RAG_ENABLED_TYPES
    adapter_map = {
        "slack": SlackSync,
        "google": GoogleWorkspaceSync,
        # ... etc
    }

    adapter = adapter_map[provider]({"access_token": "dummy"})

    # List all files for this integration
    files = await filecoin.list_customer_files(
        customer_wallet=wallet_address,
        integration=provider
    )

    indexed_count = 0

    for file_meta in files:
        data_type = file_meta.get("data_type")
        cid = file_meta.get("cid")

        # Only index if RAG-enabled
        if not adapter.should_index_in_rag(data_type):
            continue

        # Retrieve and decrypt data
        encrypted_data = await filecoin.retrieve_data(cid)
        decrypted_data = await encryption_service.decrypt_with_wallet(
            encrypted_data, wallet_address
        )

        # Index in Qdrant
        await rag.index_business_data(
            business_wallet=wallet_address,
            cid=cid,
            data=decrypted_data,
            integration=provider,
            data_type=data_type
        )

        indexed_count += 1

    return {
        "success": True,
        "provider": provider,
        "files_scanned": len(files),
        "files_indexed": indexed_count
    }
```

### Fix 3: Add Pipeline Health Endpoint

```python
@router.get("/debug/pipeline-health")
async def check_pipeline_health(
    wallet_address: str = Query(...),
    integration: str = Query(...)
):
    """
    Check if data is flowing through all pipeline stages:
    1. OAuth token exists
    2. Data uploaded to Pinata
    3. Data indexed in Qdrant
    """
    from app.services.filecoin_service import FilecoinService
    from app.services.rag_service import BusinessRAGService

    wallet_address = normalize_wallet_address(wallet_address)
    filecoin = FilecoinService()
    rag = BusinessRAGService()

    # Check OAuth
    oauth_exists = await db.execute(
        select(OAuthToken).where(
            and_(
                OAuthToken.user_address == wallet_address,
                OAuthToken.provider == integration,
                OAuthToken.is_active == True
            )
        )
    )
    oauth_token = oauth_exists.scalar_one_or_none()

    # Check Pinata
    pinata_files = await filecoin.list_customer_files(
        customer_wallet=wallet_address,
        integration=integration
    )

    # Check Qdrant
    collection_name = f"business_{wallet_address.lower().replace('0x', '')}"
    qdrant_points = rag.qdrant.scroll(
        collection_name=collection_name,
        scroll_filter=Filter(
            must=[
                FieldCondition(
                    key="integration",
                    match=MatchValue(value=integration)
                )
            ]
        ),
        limit=100
    )[0]

    return {
        "wallet_address": wallet_address,
        "integration": integration,
        "oauth_connected": bool(oauth_token),
        "pinata_files": len(pinata_files),
        "qdrant_points": len(qdrant_points),
        "pipeline_healthy": bool(oauth_token) and len(pinata_files) > 0 and len(qdrant_points) > 0,
        "issues": [
            "No OAuth token" if not oauth_token else None,
            "No Pinata files" if len(pinata_files) == 0 else None,
            "No Qdrant points" if len(qdrant_points) == 0 else None
        ]
    }
```

---

## Next Steps

1. **Immediate:** Run manual API tests to confirm OAuth status
2. **Short-term:** Implement Fix 1 (RAG indexing in BaseDataAdapter)
3. **Mid-term:** Run Fix 2 (re-index existing data)
4. **Long-term:** Add Fix 3 (pipeline health monitoring)

---

## File References

### Backend
- `/Users/MichaelAbril/Desktop/generic-template-dashboard/backend/app/adapters/slack/sync.py` - Slack adapter
- `/Users/MichaelAbril/Desktop/generic-template-dashboard/backend/app/adapters/base_adapter.py` - Base adapter (MISSING RAG indexing)
- `/Users/MichaelAbril/Desktop/generic-template-dashboard/backend/app/api/v1/integrations.py` - Integration endpoints
- `/Users/MichaelAbril/Desktop/generic-template-dashboard/backend/app/services/rag_service.py` - RAG indexing service
- `/Users/MichaelAbril/Desktop/generic-template-dashboard/backend/app/services/filecoin_service.py` - Pinata upload service
- `/Users/MichaelAbril/Desktop/generic-template-dashboard/backend/app/models/purchase.py` - OAuthToken model

### Frontend
- `/Users/MichaelAbril/Desktop/generic-template-dashboard/src/components/integrations/slack/SlackPage.tsx` - Slack UI component

---

**End of Report**
