# Varity Generic Template - Storage Setup Guide

This guide walks you through setting up the decentralized storage layer using Pinata (Filecoin/IPFS) and Lit Protocol encryption.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                  VARITY STORAGE ARCHITECTURE                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Customer Data (encrypted) → Lit Protocol                    │
│  2. Encrypted Data → Pinata API → Filecoin/IPFS                 │
│  3. CID stored → PostgreSQL database                            │
│  4. Retrieval: CID → Pinata → Decrypt with Wallet              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Key Principles

1. **Maximum Data Privacy**: ALL data encrypted with Lit Protocol before upload
2. **Wallet-Based Access**: ONLY customer's wallet can decrypt their data
3. **Decentralized Storage**: Filecoin/IPFS via Pinata (no central cloud)
4. **Sovereign Ownership**: Customers control their data completely

## Step 1: Create Pinata Account

### 1.1 Sign Up

1. Go to https://pinata.cloud
2. Click "Sign Up" (free tier available)
3. Verify your email address
4. Complete account setup

### 1.2 Get API Credentials

1. Log into Pinata dashboard
2. Navigate to **API Keys** section (left sidebar)
3. Click **"New Key"** button
4. Configure permissions:
   - ✅ **pinFileToIPFS** (upload files)
   - ✅ **pinJSONToIPFS** (upload JSON data)
   - ✅ **unpin** (delete files)
   - ✅ **pinList** (list uploaded files)
   - Optional: **userPinPolicy** (advanced)

5. Give your key a name (e.g., "Varity Generic Template Dev")
6. Click **"Create Key"**

### 1.3 Save Your Credentials

You'll receive three credentials:

```
API Key: e.g., 1a2b3c4d5e6f7g8h9i0j
API Secret: e.g., 9i8h7g6f5e4d3c2b1a0z9y8x7w6v5u4t3s2r1q0p
JWT: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3...
```

**CRITICAL**: Save these immediately! The API Secret is shown only once.

## Step 2: Configure Environment

### 2.1 Create .env File

Copy the example environment file:

```bash
cd backend
cp .env.example .env
```

### 2.2 Add Your Pinata Credentials

Edit `.env` file and add your credentials:

```bash
# Pinata Credentials (REQUIRED)
PINATA_API_KEY=your_api_key_here
PINATA_SECRET_KEY=your_api_secret_here
PINATA_JWT=your_jwt_token_here

# Lit Protocol (uses placeholder for MVP)
LIT_NETWORK=cayenne

# Varity L3 Testnet
VARITY_CHAIN_ID=33529
VARITY_RPC_URL=https://rpc-varity-testnet-rroe52pwjp.t.conduit.xyz
VARITY_CHAIN_NAME=Varity L3 Testnet

# Application
DEBUG=false
API_HOST=0.0.0.0
API_PORT=8000
```

### 2.3 Secure Your .env File

```bash
# Make sure .env is NOT committed to git
echo ".env" >> .gitignore

# Set proper permissions (Linux/Mac)
chmod 600 .env
```

## Step 3: Install Dependencies

```bash
# Ensure you're in the backend directory
cd backend

# Create virtual environment (if not exists)
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate  # Linux/Mac
# OR
venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt
```

## Step 4: Test Storage Integration

### 4.1 Run Storage Tests

```bash
# Make sure virtual environment is activated
source venv/bin/activate

# Run the test script
python test_storage.py
```

### 4.2 Expected Output

```
================================================================================
VARITY GENERIC TEMPLATE - STORAGE INTEGRATION TEST
================================================================================

TEST 1: Pinata Connection Test
--------------------------------------------------------------------------------
✅ Pinata connection successful

TEST 2: Lit Protocol Encryption Test
--------------------------------------------------------------------------------
Test data: {
  "company": "Acme Corp",
  "integration": "google-workspace",
  ...
}

Encrypted payload keys: ['encrypted_data', 'encrypted_symmetric_key', ...]
✅ Data encrypted successfully
   Access control: Only wallet 0x1234567890abcdef1234567890abcdef12345678 can decrypt

TEST 3: Upload to Filecoin/IPFS via Pinata
--------------------------------------------------------------------------------
✅ Upload successful!
   CID: QmXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxX
   Gateway URL: https://gateway.pinata.cloud/ipfs/QmXxxx...

TEST 4: Retrieve from Filecoin/IPFS
--------------------------------------------------------------------------------
✅ Retrieval successful!
   Retrieved data keys: ['encrypted_data', 'encrypted_symmetric_key', ...]

TEST 5: Decrypt with Customer Wallet
--------------------------------------------------------------------------------
✅ Decryption successful!
   Decrypted data: {
     "company": "Acme Corp",
     ...
   }

TEST 6: Data Integrity Verification
--------------------------------------------------------------------------------
✅ Data integrity verified!
   Original data matches decrypted data

TEST 7: List Customer Files
--------------------------------------------------------------------------------
✅ Found 1 file(s) for customer 0x1234567890abcdef1234567890abcdef12345678
   File 1:
      CID: QmXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxX
      Name: customer-data/0x1234.../google-workspace/emails/2024-11-14T12:00:00
      Size: 1234 bytes
      Date: 2024-11-14T12:00:00.000Z

TEST 8: Cleanup Test File
--------------------------------------------------------------------------------
Delete test file from Pinata? (y/n): y
✅ Test file unpinned: QmXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxX

================================================================================
STORAGE INTEGRATION TEST COMPLETE
================================================================================

✅ All tests passed!

Storage Architecture:
  - Encryption: Lit Protocol (placeholder implementation)
  - Storage: Filecoin/IPFS via Pinata
  - Access Control: Wallet-based (only customer can decrypt)
  - Namespace: customer-{wallet}/{integration}/{data_type}/{timestamp}
```

## Step 5: Verify Pinata Dashboard

1. Go to https://app.pinata.cloud/pinmanager
2. You should see your uploaded files listed
3. Each file should have:
   - CID (Content Identifier)
   - Name (namespace path)
   - Size
   - Pin date
   - Metadata (customer wallet, integration, etc.)

## Step 6: Understanding the Storage Flow

### Upload Flow

```python
# 1. Create test data
data = {"emails": [...]}

# 2. Encrypt with Lit Protocol (wallet-based)
encrypted = encryption_service.encrypt_for_customer(
    data=data,
    customer_wallet="0x1234..."
)

# 3. Upload to Filecoin/IPFS via Pinata
cid = filecoin_service.upload_encrypted_data(
    customer_wallet="0x1234...",
    integration="google-workspace",
    data_type="emails",
    encrypted_data=encrypted
)

# 4. Save CID to database for retrieval
db.save_file_reference(cid, customer_wallet, integration, data_type)
```

### Retrieval Flow

```python
# 1. Get CID from database
cid = db.get_file_cid(customer_wallet, integration, data_type)

# 2. Download from Filecoin/IPFS via Pinata
encrypted_data = filecoin_service.retrieve_data(cid)

# 3. Decrypt with customer's wallet
data = encryption_service.decrypt_with_wallet(
    encrypted_data=encrypted_data,
    customer_wallet="0x1234...",
    auth_signature=signature  # Wallet signature for auth
)

# 4. Return decrypted data to customer
return data
```

## Troubleshooting

### Issue: "Pinata connection failed"

**Solution**: Check your API credentials in `.env`

```bash
# Verify credentials are correct
cat .env | grep PINATA

# Test with curl
curl -H "Authorization: Bearer YOUR_JWT" \
  https://api.pinata.cloud/data/testAuthentication
```

### Issue: "Invalid API Key"

**Solution**: Regenerate API key in Pinata dashboard

1. Go to https://app.pinata.cloud/developers/api-keys
2. Delete old key
3. Create new key with same permissions
4. Update `.env` file

### Issue: "Upload failed: Rate limit exceeded"

**Solution**: Pinata free tier limits

- Free tier: 100 requests/second
- Upgrade if needed: https://pinata.cloud/pricing

### Issue: "File not found on IPFS"

**Solution**: IPFS propagation delay

- Wait 1-2 minutes after upload
- Try different gateway: `https://ipfs.io/ipfs/{CID}`

## Pinata Free Tier Limits

- **Storage**: 1 GB
- **Bandwidth**: 100 GB/month
- **Request Rate**: 100/second
- **Pins**: Unlimited

For production, consider upgrading:
- **Picnic Plan**: $20/month (10 GB storage)
- **Submarine Plan**: $100/month (100 GB storage)

## Security Best Practices

1. **NEVER commit .env to git**
   ```bash
   # Always in .gitignore
   echo ".env" >> .gitignore
   ```

2. **Rotate API keys regularly**
   - Every 90 days minimum
   - After any suspected compromise

3. **Use different keys for dev/prod**
   - Create separate Pinata projects
   - Different API keys per environment

4. **Enable IP restrictions** (Pinata dashboard)
   - Limit API access to your servers
   - Prevent unauthorized usage

5. **Monitor usage**
   - Check Pinata dashboard regularly
   - Set up alerts for unusual activity

## Next Steps

1. ✅ Complete this storage setup
2. Integrate OAuth providers (Google, QuickBooks, etc.)
3. Build data ingestion pipelines
4. Implement Lit Protocol SDK (replace placeholder)
5. Add Celestia DA for Layers 2 & 3
6. Deploy to production

## Support

- Pinata Support: https://pinata.cloud/support
- Lit Protocol Docs: https://developer.litprotocol.com/
- Varity L3 RPC: https://rpc-varity-testnet-rroe52pwjp.t.conduit.xyz

## Resources

- Pinata Documentation: https://docs.pinata.cloud/
- IPFS Basics: https://docs.ipfs.tech/concepts/
- Lit Protocol Guide: https://developer.litprotocol.com/v3/
- Varity Architecture: See `docs/VARITY_STORAGE_ARCHITECTURE.md`
