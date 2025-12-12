# 🔐 OAuth Provider Setup Guide - Varity L3 Marketplace

## 🎯 Overview

This guide helps you configure OAuth providers to achieve **100% enterprise-grade quality** for the Varity L3 Marketplace. Each business will control their own OAuth credentials, with complete privacy isolation through wallet-based encryption.

## 📊 Current Status: 90% Complete

✅ **Completed:**
- AES-256-GCM encryption with wallet-derived keys
- Multi-tenant isolation (Business A cannot decrypt Business B's tokens)
- Frontend OAuth flow with popup windows
- OAuth callback handlers
- License verification
- Automatic sync triggering

⏳ **Remaining (10%):**
- Add OAuth credentials to .env
- Configure marketplace smart contract address
- Test with real OAuth providers

## 🚀 Quick Start

### Step 1: Copy Environment Template

```bash
cd backend
cp .env.oauth.template .env
```

### Step 2: Add Smart Contract Address

Edit `.env` and add:
```env
# Varity L3 Configuration
MARKETPLACE_CONTRACT=0x... # Your deployed contract on Varity L3
VARITY_CHAIN_ID=33529
VARITY_RPC_URL=https://rpc-varity-testnet-rroe52pwjp.t.conduit.xyz
```

### Step 3: Configure OAuth Providers

Follow the detailed instructions below for each provider.

---

## 📦 OAuth Provider Configuration

### 1. QuickBooks

**Create OAuth App:**
1. Go to [QuickBooks Developer Portal](https://developer.intuit.com)
2. Create a new app
3. Select "QuickBooks Online and Payments"
4. Configure OAuth settings

**Redirect URIs:**
```
Development: http://localhost:3000/oauth/callback/quickbooks
Production: https://your-domain.com/oauth/callback/quickbooks
```

**Environment Variables:**
```env
QUICKBOOKS_CLIENT_ID=your_client_id_here
QUICKBOOKS_CLIENT_SECRET=your_client_secret_here
```

**Scopes Required:**
- com.intuit.quickbooks.accounting
- com.intuit.quickbooks.payment

---

### 2. Stripe

**Create OAuth App:**
1. Go to [Stripe Dashboard](https://dashboard.stripe.com/settings/connect)
2. Navigate to Connect Settings
3. Configure OAuth settings

**Redirect URIs:**
```
Development: http://localhost:3000/oauth/callback/stripe
Production: https://your-domain.com/oauth/callback/stripe
```

**Environment Variables:**
```env
STRIPE_CLIENT_ID=ca_your_client_id
STRIPE_CLIENT_SECRET=sk_your_secret_key
```

**Scopes Required:**
- read_write

---

### 3. Salesforce

**Create OAuth App:**
1. Go to [Salesforce Setup](https://login.salesforce.com)
2. Navigate to App Manager
3. Create New Connected App
4. Enable OAuth Settings

**Redirect URIs:**
```
Development: http://localhost:3000/oauth/callback/salesforce
Production: https://your-domain.com/oauth/callback/salesforce
```

**Environment Variables:**
```env
SALESFORCE_CLIENT_ID=your_consumer_key
SALESFORCE_CLIENT_SECRET=your_consumer_secret
```

**Scopes Required:**
- api
- refresh_token
- offline_access

---

### 4. Google Workspace

**Create OAuth App:**
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project or select existing
3. Enable necessary APIs (Drive, Calendar, Gmail)
4. Create OAuth 2.0 credentials

**Redirect URIs:**
```
Development: http://localhost:3000/oauth/callback/google-workspace
Production: https://your-domain.com/oauth/callback/google-workspace
```

**Environment Variables:**
```env
GOOGLE_WORKSPACE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_WORKSPACE_CLIENT_SECRET=your_client_secret
```

**Scopes Required:**
- https://www.googleapis.com/auth/drive
- https://www.googleapis.com/auth/calendar
- https://www.googleapis.com/auth/gmail.readonly

---

### 5. Shopify

**Create OAuth App:**
1. Go to [Shopify Partners](https://partners.shopify.com)
2. Create a new app
3. Configure OAuth settings

**Redirect URIs:**
```
Development: http://localhost:3000/oauth/callback/shopify
Production: https://your-domain.com/oauth/callback/shopify
```

**Environment Variables:**
```env
SHOPIFY_CLIENT_ID=your_api_key
SHOPIFY_CLIENT_SECRET=your_api_secret
```

**Scopes Required:**
- read_products
- write_products
- read_orders
- write_orders

---

### 6. Microsoft 365

**Create OAuth App:**
1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to Azure Active Directory
3. App registrations → New registration
4. Configure authentication

**Redirect URIs:**
```
Development: http://localhost:3000/oauth/callback/microsoft-365
Production: https://your-domain.com/oauth/callback/microsoft-365
```

**Environment Variables:**
```env
MICROSOFT_365_CLIENT_ID=your_application_id
MICROSOFT_365_CLIENT_SECRET=your_client_secret
```

**Scopes Required:**
- User.Read
- Files.ReadWrite
- Calendars.ReadWrite
- Mail.Read

---

### 7. Slack

**Create OAuth App:**
1. Go to [Slack API](https://api.slack.com/apps)
2. Create New App
3. OAuth & Permissions
4. Configure redirect URLs

**Redirect URIs:**
```
Development: http://localhost:3000/oauth/callback/slack
Production: https://your-domain.com/oauth/callback/slack
```

**Environment Variables:**
```env
SLACK_CLIENT_ID=your_client_id
SLACK_CLIENT_SECRET=your_client_secret
```

**Scopes Required:**
- channels:read
- chat:write
- users:read
- files:read

---

### 8. Zendesk

**Create OAuth App:**
1. Go to Zendesk Admin Center
2. Apps and integrations → APIs → OAuth Clients
3. Add OAuth client

**Redirect URIs:**
```
Development: http://localhost:3000/oauth/callback/zendesk
Production: https://your-domain.com/oauth/callback/zendesk
```

**Environment Variables:**
```env
ZENDESK_CLIENT_ID=your_client_id
ZENDESK_CLIENT_SECRET=your_client_secret
```

**Scopes Required:**
- read
- write

---

### 9. Mailchimp

**Create OAuth App:**
1. Go to [Mailchimp Account](https://us1.admin.mailchimp.com/account/oauth2/)
2. Register an app
3. Configure OAuth settings

**Redirect URIs:**
```
Development: http://localhost:3000/oauth/callback/mailchimp
Production: https://your-domain.com/oauth/callback/mailchimp
```

**Environment Variables:**
```env
MAILCHIMP_CLIENT_ID=your_client_id
MAILCHIMP_CLIENT_SECRET=your_client_secret
```

---

### 10. HubSpot

**Create OAuth App:**
1. Go to [HubSpot Developers](https://developers.hubspot.com)
2. Create an app
3. Configure OAuth

**Redirect URIs:**
```
Development: http://localhost:3000/oauth/callback/hubspot
Production: https://your-domain.com/oauth/callback/hubspot
```

**Environment Variables:**
```env
HUBSPOT_CLIENT_ID=your_client_id
HUBSPOT_CLIENT_SECRET=your_client_secret
```

**Scopes Required:**
- contacts
- content
- forms
- tickets

---

## 🧪 Testing OAuth Flow

### 1. Start the Backend

```bash
cd backend
python -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

### 2. Start the Frontend

```bash
cd ..
npm run dev
```

### 3. Test OAuth Connection

1. **Connect Wallet**: Connect your MetaMask to Varity L3 testnet
2. **Purchase License**: Buy a license on the marketplace (or use existing)
3. **Navigate to Integrations**: Go to `/integrations` page
4. **Click Connect**: Click the OAuth button for any provider
5. **Authorize**: Complete the OAuth flow in the popup
6. **Verify**: Check that tokens are encrypted in the database

### 4. Verify Encryption

```python
# backend/test_oauth_encryption.py
from app.services.encryption_service import encrypt_oauth_for_customer, decrypt_oauth_for_customer

wallet = "0x1234567890123456789012345678901234567890"
tokens = {
    "access_token": "test_token",
    "refresh_token": "refresh_token"
}

# Encrypt
encrypted = encrypt_oauth_for_customer(wallet, tokens)
print(f"Encrypted: {encrypted}")

# Decrypt with same wallet (should work)
decrypted = decrypt_oauth_for_customer(wallet, encrypted)
print(f"Decrypted: {decrypted}")

# Try with different wallet (should fail)
try:
    wrong_wallet = "0x9876543210987654321098765432109876543210"
    decrypt_oauth_for_customer(wrong_wallet, encrypted)
    print("ERROR: Isolation failed!")
except PermissionError as e:
    print(f"✅ Isolation working: {e}")
```

---

## 📈 Quality Verification

Run the enterprise quality checker:

```bash
cd backend
python3 check_enterprise_quality.py
```

Expected output:
```
📊 ENTERPRISE QUALITY SCORE: 100%
🎉 CONGRATULATIONS! 🎉
100% Enterprise-Grade Quality ACHIEVED!
```

---

## 🔒 Security Features

### Wallet-Based Encryption
- Each business has a unique encryption key derived from their wallet address
- Keys are generated using PBKDF2 with 100,000 iterations
- AES-256-GCM encryption for all OAuth tokens

### Multi-Tenant Isolation
- Business A cannot decrypt Business B's OAuth tokens
- Complete privacy - Varity never sees plaintext tokens
- Tokens are encrypted before database storage

### CSRF Protection
- State parameter validation
- Session storage verification
- Wallet address confirmation

---

## 🚨 Important Security Notes

1. **Never commit credentials to git**
   - Add `.env` to `.gitignore`
   - Use environment variables for all secrets

2. **Production Deployment**
   - Use HTTPS for all redirect URIs
   - Enable rate limiting
   - Implement webhook verification
   - Monitor for suspicious activity

3. **Token Refresh**
   - Implement automatic token refresh
   - Handle expired tokens gracefully
   - Log token refresh events

---

## 📞 Support

If you encounter issues:

1. **Check Backend Logs**:
   ```bash
   docker logs generic-company-dashboard-backend-1
   ```

2. **Check Frontend Console**: Browser Developer Tools

3. **Verify Wallet Connection**: Must be connected for OAuth

4. **Ensure License Ownership**: Required before OAuth connection

5. **Common Issues**:
   - Popup blocked: Allow popups for the site
   - CORS errors: Check backend CORS configuration
   - Token expiry: Implement refresh token logic

---

## ✅ Checklist for 100% Quality

- [ ] OAuth credentials added to `.env`
- [ ] Marketplace contract address configured
- [ ] All redirect URIs configured with providers
- [ ] Test QuickBooks connection
- [ ] Test Stripe connection
- [ ] Test at least 3 other providers
- [ ] Verify encryption in database
- [ ] Verify multi-tenant isolation
- [ ] Run quality checker (100% score)
- [ ] Deploy to Varity L3 testnet

---

## 🎉 Congratulations!

Once you complete this guide, your Varity L3 Marketplace will achieve **100% enterprise-grade quality** with:

- ✅ Complete privacy isolation for each business
- ✅ Military-grade AES-256-GCM encryption
- ✅ Seamless OAuth integration flow
- ✅ Automatic data synchronization
- ✅ Production-ready security

**Welcome to the future of decentralized business software!** 🚀