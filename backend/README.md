# Varity Generic Template - Backend

Decentralized storage backend using Filecoin/IPFS (via Pinata) with Lit Protocol encryption for maximum data privacy.

## Quick Start

```bash
# 1. Navigate to backend directory
cd backend

# 2. Run automated setup
./setup_storage.sh

# 3. Follow prompts to add Pinata credentials
# Get credentials from: https://app.pinata.cloud/developers/api-keys

# 4. Tests will run automatically
# ✅ All tests should pass
```

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                  VARITY STORAGE ARCHITECTURE                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Customer Data → Encrypt (Lit Protocol) → Pinata → Filecoin     │
│                                                                  │
│  Filecoin → Pinata Gateway → Decrypt (Wallet) → Customer        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Core Principles

1. **Maximum Privacy**: ALL data encrypted before storage
2. **Wallet-Based Access**: ONLY customer's wallet can decrypt
3. **Decentralized**: No central cloud providers
4. **Sovereign Ownership**: Customers control their data

## Project Structure

```
backend/
├── app/
│   ├── services/
│   │   ├── filecoin_service.py      # Pinata/IPFS integration
│   │   ├── encryption_service.py    # Lit Protocol encryption
│   │   └── __init__.py
│   ├── utils/
│   │   ├── namespace_utils.py       # 3-layer namespace system
│   │   └── __init__.py
│   ├── core/
│   │   ├── config.py                # Environment configuration
│   │   └── __init__.py
│   ├── models/
│   │   └── __init__.py              # Data models
│   └── __init__.py
├── test_storage.py                   # Integration tests
├── requirements.txt                  # Python dependencies
├── .env.example                      # Environment template
├── .env                              # Your credentials (DO NOT COMMIT)
├── setup_storage.sh                  # Automated setup script
├── STORAGE_SETUP.md                  # Detailed setup guide
├── ENCRYPTION_APPROACH.md            # Encryption documentation
└── README.md                         # This file
```

## 3-Layer Storage Architecture

### Layer 1: Varity Internal
- **Purpose**: Company documents, platform knowledge
- **Namespace**: `varity-internal/{category}/{timestamp}`
- **Access**: Varity admins only
- **Encryption**: Lit Protocol

### Layer 2: Industry RAG
- **Purpose**: Shared industry knowledge (finance, healthcare, etc.)
- **Namespace**: `industry-rag/{industry}/{category}/v{version}`
- **Access**: All customers in industry + Varity admins
- **Encryption**: Lit Protocol + Celestia DA

### Layer 3: Customer Data
- **Purpose**: Individual customer business data
- **Namespace**: `customer-{wallet}/{integration}/{data_type}/{timestamp}`
- **Access**: Single customer only + Emergency admin
- **Encryption**: Lit Protocol + Celestia DA + ZK proofs

## Key Services

### FilecoinService (`app/services/filecoin_service.py`)

Handles Filecoin/IPFS storage via Pinata API:

```python
from app.services.filecoin_service import FilecoinService

filecoin = FilecoinService()

# Upload encrypted data
cid = await filecoin.upload_encrypted_data(
    customer_wallet="0x1234...",
    integration="google-workspace",
    data_type="emails",
    encrypted_data={...}
)

# Retrieve by CID
data = await filecoin.retrieve_data(cid)

# List customer files
files = await filecoin.list_customer_files(
    customer_wallet="0x1234...",
    integration="google-workspace"
)
```

### EncryptionService (`app/services/encryption_service.py`)

Handles Lit Protocol encryption (placeholder for MVP):

```python
from app.services.encryption_service import EncryptionService

encryption = EncryptionService()

# Encrypt for customer wallet
encrypted = await encryption.encrypt_for_customer(
    data={"emails": [...]},
    customer_wallet="0x1234..."
)

# Decrypt with wallet
decrypted = await encryption.decrypt_with_wallet(
    encrypted_data=encrypted,
    customer_wallet="0x1234...",
    auth_signature=signature
)
```

### NamespaceBuilder (`app/utils/namespace_utils.py`)

Builds namespace paths following Varity conventions:

```python
from app.utils.namespace_utils import NamespaceBuilder

# Layer 1: Varity Internal
ns = NamespaceBuilder.varity_internal("platform-docs")
# → varity-internal/platform-docs/2024-11-14T12:00:00

# Layer 2: Industry RAG
ns = NamespaceBuilder.industry_rag("finance", "compliance", version=1)
# → industry-rag/finance/compliance/v1

# Layer 3: Customer Data
ns = NamespaceBuilder.customer_integration("0x1234...", "google-workspace", "emails")
# → customer-data/0x1234.../google-workspace/emails/2024-11-14T12:00:00
```

## Environment Configuration

Required environment variables in `.env`:

```bash
# Pinata (Filecoin/IPFS Gateway)
PINATA_API_KEY=your_api_key
PINATA_SECRET_KEY=your_secret_key
PINATA_JWT=your_jwt_token

# Lit Protocol
LIT_NETWORK=cayenne  # testnet

# Varity L3
VARITY_CHAIN_ID=33529
VARITY_RPC_URL=https://rpc-varity-testnet-rroe52pwjp.t.conduit.xyz
```

See `.env.example` for full configuration options.

## Testing

### Run All Tests

```bash
# Activate virtual environment
source venv/bin/activate

# Run tests
python test_storage.py
```

### Expected Output

```
✅ Pinata connection successful
✅ Data encrypted successfully
✅ Upload successful! CID: QmXxx...
✅ Retrieval successful!
✅ Decryption successful!
✅ Data integrity verified!
✅ All tests passed!
```

## Installation

### Prerequisites

- Python 3.8+ (3.11 recommended)
- pip and virtualenv
- Pinata account (free tier available)

### Manual Installation

```bash
# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate  # Linux/Mac
# OR
venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and add Pinata credentials

# Run tests
python test_storage.py
```

### Automated Installation

```bash
# Run setup script
./setup_storage.sh

# Script will:
# 1. Create virtual environment
# 2. Install dependencies
# 3. Validate configuration
# 4. Run tests
```

## API Reference

### FilecoinService Methods

- `upload_encrypted_data()` - Upload JSON data to IPFS
- `upload_encrypted_file()` - Upload file to IPFS
- `retrieve_data()` - Download JSON by CID
- `retrieve_file()` - Download file by CID
- `list_customer_files()` - List files for customer
- `unpin_file()` - Delete file from IPFS
- `test_connection()` - Test Pinata API connection

### EncryptionService Methods

- `encrypt_for_customer()` - Encrypt data for wallet
- `decrypt_with_wallet()` - Decrypt with wallet signature
- `encrypt_file_for_customer()` - Encrypt file for wallet
- `decrypt_file_with_wallet()` - Decrypt file
- `get_encryption_metadata()` - Get encryption config

### NamespaceBuilder Methods

- `varity_internal()` - Layer 1 namespace
- `industry_rag()` - Layer 2 namespace
- `customer_integration()` - Layer 3 namespace
- `customer_credentials()` - Credentials namespace
- `customer_document()` - Document namespace
- `extract_wallet()` - Get wallet from namespace
- `extract_layer()` - Get storage layer
- `validate_namespace()` - Validate format

## Development Workflow

### 1. Set Up Environment

```bash
./setup_storage.sh
```

### 2. Test Integration

```bash
python test_storage.py
```

### 3. Build Features

```python
# Example: Upload customer data
from app.services.filecoin_service import FilecoinService
from app.services.encryption_service import EncryptionService

async def store_customer_emails(wallet, emails):
    # Encrypt
    encryption = EncryptionService()
    encrypted = await encryption.encrypt_for_customer(
        data={"emails": emails},
        customer_wallet=wallet
    )

    # Upload to Filecoin
    filecoin = FilecoinService()
    cid = await filecoin.upload_encrypted_data(
        customer_wallet=wallet,
        integration="google-workspace",
        data_type="emails",
        encrypted_data=encrypted
    )

    return cid
```

### 4. Verify on Pinata

Check https://app.pinata.cloud/pinmanager to see uploaded files.

## Security Best Practices

1. **NEVER commit .env to git**
   ```bash
   echo ".env" >> .gitignore
   ```

2. **Rotate API keys regularly** (every 90 days)

3. **Use different keys for dev/prod**

4. **Enable IP restrictions** in Pinata dashboard

5. **Monitor usage** for unusual activity

## Encryption Status

### Current: MVP Placeholder
- **Algorithm**: Base64 encoding (NOT secure)
- **Purpose**: Testing and development only
- **Status**: DO NOT use with real customer data

### Production: Lit Protocol
- **Algorithm**: AES-256-GCM with threshold signatures
- **Purpose**: Real customer data
- **Status**: Ready to implement (1-2 days)
- **See**: `ENCRYPTION_APPROACH.md` for details

## Troubleshooting

### Issue: Pinata connection failed
**Solution**: Verify credentials in `.env`

### Issue: Upload failed
**Solution**: Check Pinata dashboard for rate limits

### Issue: Tests fail
**Solution**: Read `STORAGE_SETUP.md` troubleshooting section

## Documentation

- **STORAGE_SETUP.md** - Detailed setup guide
- **ENCRYPTION_APPROACH.md** - Encryption implementation details
- **API Reference** - See inline code documentation

## Resources

- Pinata Dashboard: https://app.pinata.cloud
- Pinata Docs: https://docs.pinata.cloud
- Lit Protocol: https://developer.litprotocol.com
- IPFS Basics: https://docs.ipfs.tech
- Varity L3 RPC: https://rpc-varity-testnet-rroe52pwjp.t.conduit.xyz

## Support

For issues or questions:
1. Read `STORAGE_SETUP.md` for detailed help
2. Check Pinata documentation
3. Review error messages in test output
4. Contact Varity support

## Next Steps

1. ✅ Complete storage setup
2. Integrate OAuth providers (Google, QuickBooks, Salesforce)
3. Build data ingestion pipelines
4. Implement production Lit Protocol encryption
5. Add Celestia DA for Layers 2 & 3
6. Deploy to production

## License

Proprietary - Varity Generic Template
