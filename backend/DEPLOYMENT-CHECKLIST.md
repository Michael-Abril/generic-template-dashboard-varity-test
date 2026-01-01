# VarityDataCommitments Deployment Checklist

**Contract:** VarityDataCommitments
**Network:** Varity L3 Testnet (Chain ID: 33529)
**Status:** NOT DEPLOYED (Ready for deployment)
**Date:** December 31, 2025

---

## Quick Status

- ✅ Contract code ready (`backend/contracts/VarityDataCommitments.sol`)
- ✅ Deployment script ready (`backend/contracts/script/Deploy.s.sol`)
- ✅ Foundry configured (`backend/contracts/foundry.toml`)
- ✅ Backend service ready (`backend/app/services/l3_commitment_service.py`)
- ❌ Contract NOT compiled yet
- ❌ Contract NOT deployed yet
- ❌ Environment variable NOT set

---

## Prerequisites

### 1. Install Foundry

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### 2. Get USDC for Gas

**Deployer wallet needs USDC on Varity L3 Testnet:**
- Estimated deployment cost: $0.15 - $0.50 in USDC
- Faucet: Check Conduit dashboard or Varity Discord

### 3. Set Environment Variables

Create `backend/contracts/.env`:
```bash
DEPLOYER_PRIVATE_KEY=<your_private_key_here>
VARITY_L3_RPC=https://rpc-varity-testnet-rroe52pwjp.t.conduit.xyz
```

---

## Deployment Steps

### Step 1: Navigate to Contracts Directory

```bash
cd /Users/MichaelAbril/Desktop/generic-template-dashboard/backend/contracts
```

### Step 2: Install Dependencies

```bash
forge install
```

### Step 3: Compile Contract

```bash
forge build
```

**Expected output:**
```
[⠊] Compiling...
[⠒] Compiling 1 files with 0.8.20
[⠢] Solc 0.8.20 finished in X.XXs
Compiler run successful!
```

**Check size:**
```bash
forge build --sizes
```

Contract must be < 24KB.

### Step 4: Deploy to Varity L3 Testnet

```bash
forge script script/Deploy.s.sol:DeployVarityDataCommitments \
  --rpc-url varity_testnet \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --broadcast \
  --verify
```

**Expected output:**
```
========================================
Deployment Complete!
========================================
Contract: VarityDataCommitments
Address: 0x... [COPY THIS ADDRESS]
Chain ID: 33529
```

### Step 5: Save Contract Address

**IMPORTANT:** Copy the deployed contract address from the output.

Example: `0x1234567890abcdef1234567890abcdef12345678`

### Step 6: Verify Deployment

**On Block Explorer:**
```
https://explorer-varity-testnet-rroe52pwjp.t.conduit.xyz/address/[CONTRACT_ADDRESS]
```

**Via Foundry:**
```bash
forge script script/Deploy.s.sol:VerifyDeployment \
  --rpc-url varity_testnet \
  --sig "run(address)" [CONTRACT_ADDRESS]
```

### Step 7: Run Test Commitment

```bash
forge script script/Deploy.s.sol:TestCommitment \
  --rpc-url varity_testnet \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --sig "run(address)" [CONTRACT_ADDRESS] \
  --broadcast
```

---

## Backend Configuration

### Step 8: Update Local Environment

Edit `backend/.env`:
```bash
# Add the deployed contract address
VARITY_DATA_COMMITMENTS_ADDRESS=0x... [YOUR_DEPLOYED_ADDRESS]

# Ensure L3 configuration exists
VARITY_L3_RPC=https://rpc-varity-testnet-rroe52pwjp.t.conduit.xyz
VARITY_L3_CHAIN_ID=33529

# Add signing key for L3 transactions (use same or different key)
VARITY_L3_PRIVATE_KEY=<private_key_with_USDC>
```

### Step 9: Update Railway Environment

**In Railway Dashboard → Variables:**

Add three environment variables:
```bash
VARITY_DATA_COMMITMENTS_ADDRESS=[YOUR_DEPLOYED_ADDRESS]
VARITY_L3_PRIVATE_KEY=[PRIVATE_KEY_FOR_COMMITS]
VARITY_L3_RPC=https://rpc-varity-testnet-rroe52pwjp.t.conduit.xyz
```

**Note:** Railway will auto-restart backend service after env var changes.

### Step 10: Verify Backend Integration

**Test MCP status endpoint:**
```bash
curl https://generic-template-dashboard-production.up.railway.app/api/v1/sync/mcp-status
```

**Expected response:**
```json
{
  "success": true,
  "l3_connected": true,
  "l3_network": {
    "name": "Varity Testnet",
    "chain_id": 33529,
    "contract_address": "0x... [YOUR_DEPLOYED_ADDRESS]",
    "rpc_url_active": "https://rpc-varity-testnet-rroe52pwjp.t.conduit.xyz",
    "explorer_url": "https://explorer-varity-testnet-rroe52pwjp.t.conduit.xyz"
  }
}
```

---

## Testing

### Test 1: Trigger Data Sync (Single Item)

```bash
curl -X POST "https://generic-template-dashboard-production.up.railway.app/api/v1/integrations/google/sync" \
  -H "Content-Type: application/json" \
  -d '{
    "wallet_address": "0x...",
    "data_types": ["contacts"]
  }'
```

**Check logs for:**
- "L3 batch committed: X items"
- Transaction hash logged
- No errors

**Verify on explorer:**
```
https://explorer-varity-testnet-rroe52pwjp.t.conduit.xyz/tx/[TX_HASH]
```

Look for `DataCommitted` or `BatchCommitted` event.

### Test 2: Trigger Batch Sync (50+ Items)

```bash
curl -X POST "https://generic-template-dashboard-production.up.railway.app/api/v1/integrations/google/sync" \
  -H "Content-Type: application/json" \
  -d '{
    "wallet_address": "0x...",
    "data_types": ["drive"]
  }'
```

**Verify:**
- `BatchCommitted` event with Merkle root
- itemCount matches synced files
- Gas used ~25,000 (much cheaper than individual)

---

## Troubleshooting

### Issue: "insufficient funds for gas"

**Solution:**
- Fund deployer wallet with more USDC
- Check balance: `https://explorer-varity-testnet-rroe52pwjp.t.conduit.xyz/address/[DEPLOYER_ADDRESS]`

### Issue: "contract code size exceeds limit"

**Solution:**
- Contract is too large (>24KB)
- Enable via-ir optimization in `foundry.toml`
- Or reduce contract functionality

### Issue: "L3 contract not configured"

**Solution:**
- Check `VARITY_DATA_COMMITMENTS_ADDRESS` is set in Railway
- Restart backend service
- Check logs: `railway logs`

### Issue: "RPC connection failed"

**Solution:**
- Verify RPC URL is correct
- Check Conduit network status
- Try backup RPC if available

### Issue: "Transaction reverted"

**Solution:**
- Check deployer has USDC balance
- Verify contract compiles without errors
- Check gas price isn't too low

---

## Post-Deployment

### Update Documentation

1. **CLAUDE.md** (backend)
   - Add deployed contract address
   - Update L3 integration section

2. **MCP-PIPELINE-VALIDATION-REPORT.md**
   - Update deployment status
   - Add test results

3. **README.md** (root)
   - Add contract address to architecture section

### Monitor

- Watch L3 transaction volume
- Track gas usage over time
- Set up alerts for failed commits
- Monitor USDC balance for signing wallet

---

## Quick Reference

**Network:** Varity L3 Testnet
**Chain ID:** 33529
**RPC:** https://rpc-varity-testnet-rroe52pwjp.t.conduit.xyz
**Explorer:** https://explorer-varity-testnet-rroe52pwjp.t.conduit.xyz
**Gas Token:** USDC (0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d)

**Contract Source:** `backend/contracts/VarityDataCommitments.sol`
**Deploy Script:** `backend/contracts/script/Deploy.s.sol`
**Backend Service:** `backend/app/services/l3_commitment_service.py`

**Deployment Command:**
```bash
cd backend/contracts
forge script script/Deploy.s.sol:DeployVarityDataCommitments \
  --rpc-url varity_testnet \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --broadcast
```

---

## Checklist Summary

- [ ] Foundry installed
- [ ] USDC in deployer wallet
- [ ] Dependencies installed (`forge install`)
- [ ] Contract compiled (`forge build`)
- [ ] Contract deployed (`forge script ...`)
- [ ] Contract address saved
- [ ] Deployment verified on explorer
- [ ] Test commitment successful
- [ ] Backend `.env` updated
- [ ] Railway env vars updated
- [ ] Backend service restarted
- [ ] MCP status endpoint returns L3 info
- [ ] Test sync triggers L3 commit
- [ ] L3 transaction visible on explorer
- [ ] Documentation updated
- [ ] Monitoring configured

---

**Total Time:** 1-2 hours
**Estimated Cost:** $0.15 - $0.50 in USDC
**Status After Deployment:** MCP pipeline with full L3 integrity verification ✅
