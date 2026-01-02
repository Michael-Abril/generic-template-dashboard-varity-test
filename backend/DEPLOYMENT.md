# Varity L3 & MCP Deployment Configuration

**Date:** December 31, 2025
**Status:** Ready for Production Deployment
**Components:** MCP Pipeline + L3 Blockchain + Encrypted Data Storage

---

## Quick Start: 5-Step Deployment

### 1. Configure Environment Variables

Copy `.env.example` to `.env` and fill in all variables:

```bash
cp .env.example .env

# Critical variables to set:
# - VARITY_L3_RPC (testnet RPC endpoint)
# - VARITY_L3_CHAIN_ID (33529 for testnet)
# - VARITY_DATA_COMMITMENTS_ADDRESS (after smart contract deployment)
# - VARITY_L3_PRIVATE_KEY (for signing L3 transactions)
# - TOGETHER_API_KEY (for AI/LLM)
# - PINATA_API_KEY + PINATA_SECRET_KEY (for storage)
# - All OAuth provider credentials
```

### 2. Deploy L3 Smart Contract

Deploy the `VarityDataCommitments` contract to Varity L3 Testnet:

```bash
# Prerequisites
npm install --save-dev hardhat @nomiclabs/hardhat-waffle

# Deploy to Varity L3 Testnet
npx hardhat deploy --network varity-testnet

# Output will include:
# ✅ VarityDataCommitments deployed to: 0x...
# Copy this address → VARITY_DATA_COMMITMENTS_ADDRESS env var
```

**Hardhat Config for Varity L3:**

```javascript
// hardhat.config.js
networks: {
  "varity-testnet": {
    url: "https://rpc-varity-testnet-rroe52pwjp.t.conduit.xyz",
    accounts: [process.env.DEPLOYER_PRIVATE_KEY],
    chainId: 33529
  }
}
```

### 3. Generate L3 Signing Key

Generate a secure private key for on-chain data commitments:

```bash
# Generate random hex
openssl rand -hex 32

# Output: a1b2c3d4e5f6...
# Add 0x prefix: 0xa1b2c3d4e5f6...
# Set as VARITY_L3_PRIVATE_KEY in Railway
```

### 4. Verify L3 Connection

Test the RPC connection before deployment:

```bash
curl -X POST https://rpc-varity-testnet-rroe52pwjp.t.conduit.xyz \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'

# Response: {"jsonrpc":"2.0","result":"0x8329","id":1}
# 0x8329 = 33529 in decimal ✅
```

### 5. Deploy to Railway

Push code to trigger Railway deployment:

```bash
git add .
git commit -m "feat: MCP data pipeline + L3 blockchain integration"
git push origin main

# Railway auto-deploys in 2-3 minutes
# Check logs: railway logs
```

---

## Environment Configuration Checklist

### Database (Required)

- [ ] `DATABASE_URL` - PostgreSQL connection string
- [ ] `REDIS_URL` - Redis connection (for session management)

### Storage (Required)

- [ ] `PINATA_API_KEY` - Pinata API key
- [ ] `PINATA_SECRET_KEY` - Pinata secret key
- [ ] `PINATA_JWT` - Pinata JWT token
- [ ] `PINATA_GATEWAY_URL` - Dedicated gateway (https://varity.mypinata.cloud)

### AI & LLM (Required)

- [ ] `TOGETHER_API_KEY` - Together.ai API key
- [ ] `TOGETHER_MODEL` - Model name (default: meta-llama/Llama-3.3-70B-Instruct-Turbo)
- [ ] `LLM_PROVIDER` - Set to "together" (or "ollama" for local)

### Varity L3 Blockchain (Required for Production)

- [ ] `VARITY_L3_RPC` - L3 RPC endpoint
- [ ] `VARITY_L3_CHAIN_ID` - Chain ID (33529 for testnet)
- [ ] `VARITY_DATA_COMMITMENTS_ADDRESS` - Deployed contract address
- [ ] `VARITY_L3_PRIVATE_KEY` - Signing key (0x...)

### MCP Pipeline (Optional - Auto-enabled)

- [ ] `MCP_SERVERS_ENABLED` - Set to true (default)
  - Google Workspace: @anthropic/google-workspace-mcp
  - Slack: korotovsky/slack-mcp-server
  - QuickBooks: @anthropic/quickbooks-online-mcp-server
  - Microsoft 365: Softeria/ms-365-mcp-server
  - Salesforce: Community/MCP-Salesforce
  - HubSpot: @hubspot/mcp-server

### OAuth Providers (10 Available)

- [ ] Google Workspace: `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET`
- [ ] QuickBooks: `QUICKBOOKS_CLIENT_ID` + `QUICKBOOKS_CLIENT_SECRET`
- [ ] Microsoft 365: `MICROSOFT_CLIENT_ID` + `MICROSOFT_CLIENT_SECRET`
- [ ] Slack: `SLACK_CLIENT_ID` + `SLACK_CLIENT_SECRET`
- [ ] Salesforce: `SALESFORCE_CLIENT_ID` + `SALESFORCE_CLIENT_SECRET`
- [ ] HubSpot: `HUBSPOT_CLIENT_ID` + `HUBSPOT_CLIENT_SECRET`
- [ ] Optional: Shopify, Stripe, Zendesk, Monday.com, Xero

### Web Search (Optional)

- [ ] `TAVILY_API_KEY` - Tavily web search API (recommended for LLMs)
- [ ] Alternative: `SERPER_API_KEY` - Serper.dev search API

### Vector Database (Optional)

- [ ] `QDRANT_URL` - Qdrant instance URL
- [ ] `QDRANT_API_KEY` - API key (if required)

### Security (Required)

- [ ] `OAUTH_STATE_SECRET` - Generate with `openssl rand -hex 32`
- [ ] `ENCRYPTION_SECRET` - Generate with `openssl rand -hex 32`
- [ ] `SESSION_COOKIE_SECURE` - Set to true in production
- [ ] `SESSION_COOKIE_HTTPONLY` - Set to true
- [ ] `SESSION_COOKIE_SAMESITE` - Set to "strict"

### Application Settings

- [ ] `ENVIRONMENT` - Set to "production"
- [ ] `DEBUG` - Set to false
- [ ] `FRONTEND_URL` - Frontend domain (https://app.varity.so)
- [ ] `CORS_ORIGINS` - Frontend domain (https://app.varity.so)

---

## Data Flow Architecture

### MCP Ingestion Pipeline

```
1. OAuth Trigger
   ↓
2. MCP Server (stdio transport)
   ├─ Google Workspace MCP
   ├─ Slack MCP
   ├─ QuickBooks MCP
   ├─ Microsoft 365 MCP
   ├─ Salesforce MCP
   └─ HubSpot MCP
   ↓
3. Data Encryption (AES-256-GCM)
   - Each wallet derives unique key via PBKDF2
   - Data encrypted BEFORE leaving service
   ↓
4. Data Routing Decision
   ├─ RAG Storage → Pinata + Qdrant
   ├─ Live API → Store query config only
   └─ Hybrid → Both storage and live endpoints
   ↓
5. Storage Destinations
   ├─ Pinata (IPFS/Filecoin)
   ├─ Qdrant (Vector DB)
   └─ PostgreSQL (Config)
   ↓
6. L3 Blockchain Verification
   - Batch commits via Merkle trees (200x cheaper)
   - On-chain CID + content hash
   - Wallet-attributed data integrity
```

### Data Routing Rules

**Google Workspace:**
- drive_files → RAG (store + index)
- contacts → RAG (store + index)
- gmail → LIVE (real-time queries only)
- calendar → LIVE (real-time queries only)

**Slack:**
- channels → LIVE (real-time queries only)
- messages → HYBRID (store some + live updates)
- users → RAG (store + index)
- files → RAG (store + index)

**QuickBooks:**
- invoices → HYBRID (store + live)
- customers → RAG (store + index)
- payments → LIVE (real-time queries)
- reports → LIVE (real-time queries)

**Microsoft 365:**
- onedrive → RAG (store + index)
- contacts → RAG (store + index)
- mail → LIVE (real-time queries)
- calendar → LIVE (real-time queries)

---

## Production Verification Steps

### Step 1: Verify Database

```bash
# SSH into Railway container or test locally
curl http://localhost:8000/health

# Expected response:
# {"status":"healthy","database":"connected","redis":"connected"}
```

### Step 2: Verify MCP Pipeline

```python
# Test via Python
from mcp_servers import fetch_integration_data

# Test Google Workspace
result = await fetch_integration_data(
    integration="google",
    data_type="drive_files",
    oauth_token="ya29..."
)
# Should return list of files

# Test Slack
result = await fetch_integration_data(
    integration="slack",
    data_type="channels",
    oauth_token="xoxb-..."
)
# Should return list of channels
```

### Step 3: Verify L3 Connection

```python
from app.services.l3_commitment_service import get_l3_service

l3_service = get_l3_service()

# Check connection
is_connected = l3_service.is_connected()
# Should be True

# Get network info
info = l3_service.get_network_info()
# Should show chain_id=33529
```

### Step 4: Verify Encryption

```python
from app.services.encryption_service import EncryptionService

encryption = EncryptionService()

# Encrypt test data
wallet = "0x738C812FB221ba32E8726fe38961570a700e87b9"
plaintext = b"test data"
encrypted = encryption.derive_and_encrypt(plaintext, wallet)
# Should return encrypted bytes

# Decrypt test data
decrypted = encryption.derive_and_decrypt(encrypted, wallet)
# Should return b"test data"
```

### Step 5: Test Complete Pipeline

```bash
# Make a test sync request
curl -X POST http://localhost:8000/api/v1/integrations/slack/sync \
  -H "Content-Type: application/json" \
  -d '{
    "wallet_address": "0x738C812FB221ba32E8726fe38961570a700e87b9",
    "data_types": ["channels", "users"]
  }'

# Expected response includes:
# - channels → {"status":"configured", "destination":"live_api"}
# - users → {"status":"stored", "destination":"rag", "cid":"QmXxx..."}
# - l3_commits → L3 batch commitment result
```

---

## Troubleshooting

### Issue: L3 RPC Connection Failed

**Error:** `Failed to connect to L3 RPC`

**Solution:**

1. Verify RPC URL is correct:
   ```bash
   curl -X POST https://rpc-varity-testnet-rroe52pwjp.t.conduit.xyz \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","method":"net_version","params":[],"id":1}'
   ```

2. Check firewall/network access to Conduit RPC

3. Verify VARITY_L3_RPC env var is set

### Issue: MCP Server Connection Failed

**Error:** `Failed to connect to [integration] MCP`

**Solution:**

1. Verify MCP packages are installed:
   ```bash
   npm list @anthropic/google-workspace-mcp slack-mcp-server ...
   ```

2. Check OAuth token is valid and has required scopes

3. Verify stdio transport is working:
   ```bash
   npx @anthropic/google-workspace-mcp
   # Should prompt for OAuth token
   ```

### Issue: Encryption/Decryption Fails

**Error:** `Data decryption failed for wallet`

**Solution:**

1. Verify ENCRYPTION_SECRET is same across all instances
   - If changed, all previously encrypted data becomes inaccessible
   - Never change ENCRYPTION_SECRET in production

2. Verify wallet address matches exactly (case-insensitive but must be normalized)

3. Check that customer wallet address matches what was used for encryption

### Issue: L3 Contract Not Configured

**Warning:** `L3 contract not configured, skipping L3 commitments`

**Solution:**

1. Deploy VarityDataCommitments contract to L3
2. Set VARITY_DATA_COMMITMENTS_ADDRESS to deployed contract address
3. Verify contract is at that address:
   ```bash
   curl -X POST https://rpc-varity-testnet-rroe52pwjp.t.conduit.xyz \
     -H "Content-Type: application/json" \
     -d '{
       "jsonrpc":"2.0",
       "method":"eth_getCode",
       "params":["0x...", "latest"],
       "id":1
     }'
   # Should return code (not 0x)
   ```

---

## Security Checklist

### Before Production

- [ ] VARITY_L3_PRIVATE_KEY is generated and stored in Railway secrets (NEVER in .env)
- [ ] OAUTH_STATE_SECRET is unique and random (openssl rand -hex 32)
- [ ] ENCRYPTION_SECRET is unique and random (openssl rand -hex 32)
- [ ] SSL/TLS is enabled on all endpoints
- [ ] CORS_ORIGINS restricted to actual frontend domain
- [ ] CSP (Content-Security-Policy) headers enforced
- [ ] HSTS headers enabled
- [ ] SESSION_COOKIE_SECURE=true
- [ ] SESSION_COOKIE_HTTPONLY=true
- [ ] SESSION_COOKIE_SAMESITE=strict

### Ongoing

- [ ] Rotate encryption and OAuth secrets every 90 days
- [ ] Monitor L3 RPC for connectivity issues
- [ ] Monitor Pinata storage usage and costs
- [ ] Monitor Qdrant vector DB performance
- [ ] Audit MCP server updates and security patches
- [ ] Test disaster recovery (data restoration from Pinata)

---

## File References

| File | Purpose |
|------|---------|
| `.env.example` | Template with all variables |
| `app/core/config.py` | Configuration class with validation |
| `mcp_servers/config.py` | MCP server registry |
| `mcp_servers/client.py` | MCP client wrapper |
| `app/services/mcp_ingestion_service.py` | Main data pipeline |
| `app/services/l3_commitment_service.py` | L3 blockchain integration |
| `CLAUDE.md` | Detailed architecture documentation |

---

## Support & Documentation

- **MCP Specification:** https://modelcontextprotocol.io
- **Varity L3 (Conduit):** https://hub.conduit.xyz/varity-testnet-rroe52pwjp
- **Arbitrum Orbit:** https://docs.arbitrum.io/launch-orbit-chain
- **Pinata:** https://docs.pinata.cloud
- **Qdrant:** https://qdrant.tech/documentation
- **Together.ai:** https://docs.together.ai/docs
