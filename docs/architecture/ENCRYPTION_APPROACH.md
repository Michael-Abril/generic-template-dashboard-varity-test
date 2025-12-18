# Varity Generic Template - Encryption Approach

## Current Implementation: MVP Placeholder

### Overview

For the MVP (Minimum Viable Product), we're using a **placeholder encryption approach** because the Lit Protocol Python SDK is not yet available. This document explains:

1. Current placeholder implementation
2. Why it's secure enough for testing
3. Production-ready alternatives
4. Migration path to full Lit Protocol

## Current Approach: Base64 Placeholder

### Implementation

```python
# Current encryption (encryption_service.py)
encrypted_data_base64 = base64.b64encode(data_string.encode()).decode()
encrypted_key_base64 = base64.b64encode(b"placeholder_key").decode()
```

### What This Provides

✅ **Data Structure**: Correct format for Lit Protocol integration
✅ **Namespace Isolation**: Customer data separated by wallet address
✅ **Access Control Logic**: Only specified wallet can decrypt (enforced in code)
✅ **Testing**: Full end-to-end flow validation
✅ **Development**: Rapid iteration without external dependencies

### What This Does NOT Provide

❌ **Real Encryption**: Data is only Base64 encoded (reversible)
❌ **Cryptographic Security**: No actual encryption keys
❌ **Wallet Signature Verification**: Placeholder only
❌ **Production Security**: NOT suitable for real customer data

## Production-Ready Alternatives

### Option 1: Lit Protocol via Node.js Subprocess (Recommended)

**Status**: Ready to implement
**Timeline**: 1-2 days
**Security**: Production-grade

#### Implementation

1. Install Lit Protocol JS SDK:
   ```bash
   npm install @lit-protocol/lit-node-client
   ```

2. Create Node.js wrapper (`lit_encryption.js`):
   ```javascript
   const LitJsSdk = require('@lit-protocol/lit-node-client');

   async function encrypt(data, accessControlConditions) {
     const litNodeClient = new LitJsSdk.LitNodeClient({
       litNetwork: 'cayenne'
     });
     await litNodeClient.connect();

     const { ciphertext, dataToEncryptHash } = await LitJsSdk.encryptString(
       {
         accessControlConditions,
         chain: 'arbitrum',
         dataToEncrypt: JSON.stringify(data),
       },
       litNodeClient
     );

     return {
       ciphertext,
       dataToEncryptHash,
       accessControlConditions
     };
   }
   ```

3. Call from Python (`encryption_service.py`):
   ```python
   import subprocess
   import json

   async def _call_lit_sdk(operation, params):
       """Call Node.js Lit SDK via subprocess"""
       script = f"node lit_encryption.js {operation} '{json.dumps(params)}'"

       result = subprocess.run(
           script,
           shell=True,
           capture_output=True,
           text=True
       )

       return json.loads(result.stdout)
   ```

#### Pros
- ✅ Uses official Lit Protocol SDK
- ✅ Production-grade security
- ✅ Wallet signature verification
- ✅ Well-documented API
- ✅ Community support

#### Cons
- ❌ Requires Node.js installation
- ❌ Subprocess overhead (slower)
- ❌ More complex deployment

### Option 2: AES-256-GCM Encryption (Alternative)

**Status**: Can implement immediately
**Timeline**: 4-6 hours
**Security**: Production-grade (but not Lit Protocol)

#### Implementation

```python
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2
import os

async def encrypt_for_customer(data, customer_wallet):
    """
    Encrypt with AES-256-GCM using wallet-derived key
    """
    # Derive encryption key from wallet address
    salt = os.urandom(16)
    kdf = PBKDF2(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=100000,
    )

    key = kdf.derive(customer_wallet.encode())

    # Encrypt with Fernet (AES-256-GCM)
    f = Fernet(key)
    encrypted_data = f.encrypt(json.dumps(data).encode())

    return {
        "encrypted_data": encrypted_data.decode(),
        "salt": salt.hex(),
        "algorithm": "AES-256-GCM",
        "customer_wallet": customer_wallet
    }
```

#### Pros
- ✅ Production-grade encryption
- ✅ No external dependencies (just cryptography library)
- ✅ Fast and efficient
- ✅ Well-tested algorithms

#### Cons
- ❌ Not true Lit Protocol integration
- ❌ Wallet signature verification must be added separately
- ❌ Less decentralized (key derivation in code)

### Option 3: Lit Protocol Direct HTTP API

**Status**: Experimental
**Timeline**: 3-5 days
**Security**: Production-grade (if implemented correctly)

#### Implementation

```python
import httpx

async def encrypt_with_lit_api(data, access_control_conditions):
    """
    Direct HTTP calls to Lit Protocol nodes
    """
    lit_nodes = [
        "https://cayenne.litprotocol.com",
        # ... other nodes
    ]

    # 1. Get session signatures from nodes
    # 2. Encrypt data with threshold encryption
    # 3. Store encrypted shares on nodes
    # 4. Return ciphertext + metadata

    # This requires implementing the Lit Protocol manually
    # Reference: https://developer.litprotocol.com/v3/sdk/access-control/quick-start
```

#### Pros
- ✅ No subprocess overhead
- ✅ Pure Python implementation
- ✅ Full control over encryption flow

#### Cons
- ❌ Must implement Lit Protocol manually
- ❌ Complex threshold signature logic
- ❌ Harder to maintain
- ❌ More error-prone

## Recommendation for MVP → Production

### Phase 1: MVP (Current) ✅
- **Use**: Base64 placeholder
- **Purpose**: Testing, development, demo
- **Security**: NOT for real customer data
- **Timeline**: Complete

### Phase 2: Production Beta (Option 1)
- **Use**: Lit Protocol via Node.js subprocess
- **Purpose**: Real customer data with proper encryption
- **Security**: Production-grade
- **Timeline**: 1-2 days to implement
- **Cost**: Free (Lit Protocol testnet)

### Phase 3: Production Optimized (Option 3)
- **Use**: Direct Lit Protocol HTTP API
- **Purpose**: Optimized performance at scale
- **Security**: Production-grade
- **Timeline**: 3-5 days to implement
- **Cost**: Free (Lit Protocol mainnet)

## Migration Path

### Step 1: Test Current Implementation
```bash
# Verify placeholder works end-to-end
python test_storage.py
```

### Step 2: Set Up Node.js Environment
```bash
# Install Node.js dependencies
npm install @lit-protocol/lit-node-client

# Create lit_encryption.js wrapper
# See Option 1 above
```

### Step 3: Update encryption_service.py
```python
# Replace placeholder with subprocess calls
async def encrypt_for_customer(data, customer_wallet):
    return await self._call_lit_sdk('encrypt', {
        'data': data,
        'wallet': customer_wallet
    })
```

### Step 4: Test Production Encryption
```bash
# Run tests with real Lit Protocol
python test_storage.py

# Verify encryption/decryption works
# Check wallet signature verification
```

### Step 5: Deploy to Production
```bash
# Update environment variables
export LIT_NETWORK=manzano  # mainnet

# Deploy with production encryption
./deploy.sh
```

## Security Considerations

### For MVP (Current)
- ⚠️ **DO NOT** use with real customer data
- ✅ **OK** for testing and development
- ✅ **OK** for demos with fake data
- ⚠️ **DO NOT** deploy to production

### For Production (Lit Protocol)
- ✅ Real cryptographic encryption (AES-256-GCM)
- ✅ Wallet-based access control
- ✅ Threshold signature scheme
- ✅ Decentralized key management
- ✅ No single point of failure

## Testing Encryption

### Test Placeholder Encryption
```bash
cd backend
python test_storage.py
```

### Test Production Encryption (after implementing Option 1)
```bash
# Set production encryption flag
export USE_REAL_ENCRYPTION=true

# Run tests
python test_storage.py

# Should see:
# ✅ Using Lit Protocol SDK for encryption
# ✅ Wallet signature verification enabled
```

## Documentation References

- Lit Protocol Docs: https://developer.litprotocol.com/
- Encryption Best Practices: https://developer.litprotocol.com/v3/sdk/access-control/
- Python Cryptography: https://cryptography.io/
- NIST Encryption Standards: https://csrc.nist.gov/projects/cryptographic-standards

## Support

For encryption implementation questions:
- Lit Protocol Discord: https://litprotocol.com/discord
- Varity Architecture Docs: `docs/5_LAYER_PRIVACY_ARCHITECTURE.md`
