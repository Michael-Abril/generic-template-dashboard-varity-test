# Quick Deployment Guide - Varity Generic Template Dashboard

**Status**: ✅ Ready for Production Launch
**Time to Deploy**: 15-20 minutes
**Difficulty**: Easy

---

## Prerequisites

✅ Docker installed
✅ Node.js 16+ installed
✅ Git repository cloned
✅ Privy account (free at https://dashboard.privy.io)
✅ thirdweb account (free at https://thirdweb.com/dashboard)
✅ Pinata account (free at https://pinata.cloud)

---

## 5-Minute Quick Start

### Step 1: Configure Backend (5 minutes)

```bash
cd backend
cp .env.example .env

# Edit .env and set these REQUIRED values:
# 1. PINATA_API_KEY=your_key_here
# 2. PINATA_SECRET_KEY=your_secret_here
# 3. PINATA_JWT=your_jwt_here

# All other values have sensible defaults!
```

**Get Pinata Keys** (2 minutes):
1. Sign up at https://pinata.cloud (free tier)
2. Go to API Keys section
3. Create new key with all permissions
4. Copy API Key, Secret, and JWT to .env

### Step 2: Configure Frontend (3 minutes)

```bash
cd ..
cp .env.local.example .env.local

# Edit .env.local and set these REQUIRED values:
# 1. NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id
# 2. NEXT_PUBLIC_THIRDWEB_CLIENT_ID=your_thirdweb_client_id

# Optionally customize company branding:
# 3. NEXT_PUBLIC_COMPANY_NAME=Your Company
# 4. NEXT_PUBLIC_PRIMARY_COLOR=#3b82f6
```

**Get Privy App ID** (1 minute):
1. Sign up at https://dashboard.privy.io (free)
2. Create new app
3. Copy App ID to .env.local

**Get thirdweb Client ID** (1 minute):
1. Sign up at https://thirdweb.com/dashboard (free)
2. Create new project
3. Copy Client ID to .env.local

### Step 3: Start Everything (2 minutes)

```bash
# Start all Docker containers
docker-compose up -d

# Wait 30 seconds for services to start
sleep 30

# Check health
curl http://localhost:8002/health

# Expected: {"status":"healthy","version":"1.0.0",...}
```

### Step 4: Start Frontend (1 minute)

```bash
# Install dependencies (first time only)
npm install

# Start development server
npm run dev

# Visit: http://localhost:3001
```

### Step 5: Test the Dashboard (2 minutes)

1. Open http://localhost:3001
2. Connect your wallet (MetaMask, Coinbase Wallet, or email)
3. Explore the dashboard
4. Test AI assistant
5. Try OAuth integrations

**Done!** Your dashboard is running locally.

---

## Production Deployment (15 minutes)

### Step 1: Deploy Smart Contracts (5 minutes)

```bash
cd contracts

# Compile contracts
npx hardhat compile

# Deploy to Varity L3 testnet
npx hardhat deploy --network varity-testnet

# Copy deployed addresses to .env.local
# NEXT_PUBLIC_MARKETPLACE_ADDRESS=0x...
# NEXT_PUBLIC_LICENSE_NFT_ADDRESS=0x...
# NEXT_PUBLIC_SUBSCRIPTION_ADDRESS=0x...
```

### Step 2: Build Frontend (3 minutes)

```bash
cd ..

# Build production bundle
npm run build

# Verify build succeeded (should see "✓ Generating static pages")
```

### Step 3: Deploy to Production (7 minutes)

**Option A: IPFS/Filecoin (Recommended)**
```bash
# Deploy frontend to IPFS
npm run deploy:ipfs

# Note the IPFS hash (e.g., QmXxx...)
# Your dashboard is now at: https://gateway.pinata.cloud/ipfs/QmXxx...
```

**Option B: Vercel (Quick Testing)**
```bash
# Install Vercel CLI (first time only)
npm install -g vercel

# Deploy to Vercel
vercel deploy --prod

# Your dashboard is now at: https://your-project.vercel.app
```

**Option C: Netlify (Quick Testing)**
```bash
# Install Netlify CLI (first time only)
npm install -g netlify-cli

# Deploy to Netlify
netlify deploy --prod

# Your dashboard is now at: https://your-project.netlify.app
```

### Step 4: Configure Production Backend (Optional)

```bash
# For production, update docker-compose
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# This enables:
# - Multi-worker backend (better performance)
# - Resource limits (prevents overuse)
# - Automatic restarts (higher uptime)
```

---

## Common Issues & Solutions

### Issue: "Cannot connect to backend"

**Solution**:
```bash
# Check if backend is running
docker-compose ps

# Check backend logs
docker-compose logs backend

# Restart backend
docker-compose restart backend
```

### Issue: "Database connection failed"

**Solution**:
```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Check PostgreSQL logs
docker-compose logs postgres

# Restart PostgreSQL
docker-compose restart postgres
```

### Issue: "Wallet connection fails"

**Solution**:
- Verify NEXT_PUBLIC_PRIVY_APP_ID in .env.local
- Check browser console for errors
- Ensure you're on the correct network (Varity L3 Testnet, Chain ID 33529)

### Issue: "OAuth integration fails"

**Solution**:
1. Check OAuth credentials in backend/.env
2. Verify redirect URI matches: http://localhost:3001/oauth/callback
3. Check backend logs: `docker-compose logs backend | grep oauth`

### Issue: "AI assistant not working"

**Solution**:
```bash
# Check if Ollama is running
docker-compose ps ollama

# Check Ollama logs
docker-compose logs ollama

# Restart Ollama
docker-compose restart ollama

# Wait 30 seconds for model to load
```

---

## Environment Variables Quick Reference

### Backend (.env) - Required

| Variable | Where to Get | Example |
|----------|--------------|---------|
| PINATA_API_KEY | https://pinata.cloud | `abc123...` |
| PINATA_SECRET_KEY | https://pinata.cloud | `xyz789...` |
| PINATA_JWT | https://pinata.cloud | `eyJhbGci...` |

### Frontend (.env.local) - Required

| Variable | Where to Get | Example |
|----------|--------------|---------|
| NEXT_PUBLIC_PRIVY_APP_ID | https://dashboard.privy.io | `clxxx...` |
| NEXT_PUBLIC_THIRDWEB_CLIENT_ID | https://thirdweb.com/dashboard | `abc123...` |

### Backend (.env) - Optional OAuth Integrations

| Variable | Where to Get |
|----------|--------------|
| QUICKBOOKS_CLIENT_ID | https://developer.intuit.com |
| SALESFORCE_CLIENT_ID | https://developer.salesforce.com |
| SHOPIFY_CLIENT_ID | https://partners.shopify.com |
| STRIPE_CLIENT_ID | https://dashboard.stripe.com |
| GOOGLE_CLIENT_ID | https://console.cloud.google.com |
| HUBSPOT_CLIENT_ID | https://app.hubspot.com/developer |
| SLACK_CLIENT_ID | https://api.slack.com/apps |
| ZENDESK_CLIENT_ID | https://developer.zendesk.com |
| MONDAY_CLIENT_ID | https://monday.com/developers/apps |
| MICROSOFT_CLIENT_ID | https://portal.azure.com |

---

## Docker Commands Cheat Sheet

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend

# Restart a service
docker-compose restart backend

# Check service status
docker-compose ps

# Remove all data (DESTRUCTIVE!)
docker-compose down -v
```

---

## Testing Checklist

Before launching to customers, verify:

- [ ] Dashboard loads at http://localhost:3001
- [ ] Wallet connection works (MetaMask, Coinbase, or email)
- [ ] AI assistant responds to queries
- [ ] OAuth integration flow works (at least one integration)
- [ ] Data syncs from integrated apps
- [ ] Dashboard displays synced data
- [ ] Settings page works
- [ ] Team management works (if applicable)
- [ ] Analytics page shows data
- [ ] No errors in browser console
- [ ] Backend health check returns 200 OK

---

## Production URLs

### Varity L3 Testnet
- **RPC**: https://rpc-varity-testnet-rroe52pwjp.t.conduit.xyz
- **Explorer**: https://explorer-varity-testnet-rroe52pwjp.t.conduit.xyz
- **Chain ID**: 33529

### Bridging
- **Superbridge**: https://superbridge.app
- **Source**: Arbitrum Sepolia (testnet) or Arbitrum One (mainnet)
- **Destination**: Varity L3 Testnet

### Faucets
- **Arbitrum Sepolia**: https://faucet.quicknode.com/arbitrum/sepolia
- **Bridge to Varity L3**: Use Superbridge

---

## Next Steps

### After Local Deployment
1. Customize company branding (.env.local)
2. Add company logo to /public/logos/
3. Configure OAuth integrations you need
4. Test AI assistant with your business data
5. Deploy smart contracts to testnet

### After Production Deployment
1. Set up monitoring (Grafana + Prometheus)
2. Configure custom domain (if using Vercel/Netlify)
3. Enable analytics tracking
4. Set up backup strategies
5. Configure production database
6. Enable SSL/TLS certificates
7. Set up CI/CD pipeline (GitHub Actions)

### Industry-Specific Customization
1. Add industry-specific features to /src/app/
2. Configure industry RAG knowledge base
3. Deploy industry-specific smart contracts
4. Customize dashboard layout
5. Add industry-specific integrations

---

## Support

**Documentation**: https://docs.varity.xyz
**Discord**: https://discord.gg/varity
**GitHub Issues**: https://github.com/varity/generic-template/issues
**Email**: support@varity.xyz

---

## Cost Estimates

### Free Tier (Testing)
- Pinata: 1 GB storage, unlimited pins ✅ FREE
- Privy: 1,000 MAU (monthly active users) ✅ FREE
- thirdweb: Free tier available ✅ FREE
- Vercel: Unlimited personal projects ✅ FREE
- Arbitrum L3 Testnet: Free testnet ETH ✅ FREE

**Total Cost (Testing)**: **$0/month**

### Production (100 Customers)
- Infrastructure (Akash + Filecoin): $1,938/month
- Pinata (paid tier): $20/month
- Privy (Professional): $99/month
- thirdweb (Pro): $99/month
- Hosting (IPFS/Filecoin): Included
- Monitoring: $20/month

**Total Cost**: **$2,176/month**
**Cost per Customer**: **$21.76/month**

**Comparison to Google Cloud**: $2,400/month
**Savings**: $224/month (9%)

---

**END OF QUICK DEPLOYMENT GUIDE**
