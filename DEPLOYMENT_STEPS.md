# DEPLOYMENT STEPS - Beta Launch

**Target:** Deploy Generic Template Dashboard for Beta Launch
**Estimated Time:** 30-45 minutes
**Cost:** ~$50-100/month for beta (10-100 users)

---

## INFRASTRUCTURE STRATEGY

### Beta (CURRENT) - Railway + Vercel + Together.ai

```
┌─────────────────────────────────────────────────────────────────────┐
│                    BETA INFRASTRUCTURE                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────┐    ┌──────────────────┐    ┌───────────────┐ │
│  │     VERCEL       │    │     RAILWAY      │    │  TOGETHER.AI  │ │
│  │   (Frontend)     │───▶│    (Backend)     │───▶│    (LLM)      │ │
│  │   Next.js 14     │    │    FastAPI       │    │ Llama 3.1 70B │ │
│  │   FREE tier      │    │   PostgreSQL     │    │  $0.88/1M tok │ │
│  └──────────────────┘    │     Redis        │    └───────────────┘ │
│                          └────────┬─────────┘                       │
│                                   │                                  │
│                          ┌────────▼─────────┐                       │
│                          │     PINATA       │                       │
│                          │ (Filecoin/IPFS)  │                       │
│                          │    $20/month     │                       │
│                          └──────────────────┘                       │
│                                                                      │
│  TOTAL COST: ~$50-150/month for 10-100 businesses                   │
└─────────────────────────────────────────────────────────────────────┘
```

### Mainnet (FUTURE) - 100% Akash Network (DePin)

```
┌─────────────────────────────────────────────────────────────────────┐
│                   MAINNET INFRASTRUCTURE                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────┐    ┌──────────────────┐    ┌───────────────┐ │
│  │  AKASH NETWORK   │    │  AKASH NETWORK   │    │ AKASH NETWORK │ │
│  │   (Frontend)     │───▶│   (Backend)      │───▶│   (GPU LLM)   │ │
│  │   Decentralized  │    │   Decentralized  │    │ Self-hosted   │ │
│  │   ~$30/month     │    │   PostgreSQL     │    │ Llama 3.1 70B │ │
│  └──────────────────┘    │   ~$60/month     │    │  ~$150/month  │ │
│                          └────────┬─────────┘    └───────────────┘ │
│                                   │                                  │
│                          ┌────────▼─────────┐                       │
│                          │    FILECOIN      │                       │
│                          │  (Direct/IPFS)   │                       │
│                          │   ~$50/month     │                       │
│                          └──────────────────┘                       │
│                                                                      │
│  + $5,000/month Conduit L3 Rollup Fee                               │
│  TOTAL COST: ~$5,500/month (Break-even: ~60 customers)              │
└─────────────────────────────────────────────────────────────────────┘
```

### Why Beta Uses Centralized Providers

1. **Speed** - Deploy in minutes, not days
2. **Cost** - No $5,000/mo Conduit fee during validation
3. **Simplicity** - Managed databases, no DevOps needed
4. **Same Code** - Backend code works on both Railway and Akash
5. **Same Contracts** - Testnet uses identical smart contract code

---

## PREREQUISITES

Before starting deployment:

1. **GitHub Account** - Required for Railway and Vercel
2. **Together.ai Account** - Sign up at https://together.ai (for LLM API)
3. **Private Repository** - Create in varity-Labs organization

---

## STEP 0: Create Private Repository in varity-Labs (5 minutes)

### 0.1 Create New Private Repo
1. Go to https://github.com/varity-Labs
2. Click **"New"** to create repository
3. Name: `generic-template-dashboard`
4. Description: `Varity Generic AI Dashboard Template - Beta`
5. Visibility: **Private**
6. Do NOT initialize with README (we'll push existing code)
7. Click **"Create repository"**

### 0.2 Push Code to New Repo
```bash
# Navigate to dashboard directory
cd /home/macoding/blokko-internal-os/varity/chains/arbitrum/deployments/testnet/testing/generic-company-dashboard

# Initialize git if needed (skip if already initialized)
git init

# Add remote for varity-Labs
git remote add varity-labs https://github.com/varity-Labs/generic-template-dashboard.git

# Add all files
git add .

# Commit
git commit -m "Initial commit: Generic Template Dashboard for Beta Launch"

# Push to varity-Labs
git push -u varity-labs main
```

---

## STEP 1: Deploy Backend to Railway (15 minutes)

### 1.1 Create Railway Account
1. Go to https://railway.app
2. Sign up with GitHub (recommended) or email
3. Verify your account

### 1.2 Create New Project
1. Click **"New Project"**
2. Select **"Deploy from GitHub Repo"**
3. Connect your GitHub account if not already connected
4. Select the repository: `blokko-internal-os` (or your fork)
5. Railway will detect the monorepo - select the **backend** directory

### 1.3 Configure Backend Service
1. After deployment starts, click on the service
2. Go to **Settings > General**
3. Set **Root Directory**: `varity/chains/arbitrum/deployments/testnet/testing/generic-company-dashboard/backend`
4. Set **Build Command**: Leave default (uses Dockerfile)
5. Set **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### 1.4 Add PostgreSQL Plugin
1. Click **"+ New"** in your project
2. Select **"Database"** > **"Add PostgreSQL"**
3. Railway auto-generates `DATABASE_URL` environment variable

### 1.5 Add Redis Plugin
1. Click **"+ New"** again
2. Select **"Database"** > **"Add Redis"**
3. Railway auto-generates `REDIS_URL` environment variable

### 1.6 Set Environment Variables
1. Click on your backend service
2. Go to **Variables** tab
3. Click **"RAW Editor"** and paste:

```bash
# Railway provides these automatically:
# DATABASE_URL=postgresql://...
# REDIS_URL=redis://...

# Required Variables (copy from backend/.env.railway)
FRONTEND_URL=https://your-app.vercel.app
OAUTH_REDIRECT_BASE_URL=https://your-app.vercel.app

# Pinata (Filecoin/IPFS)
PINATA_API_KEY=85129e92e21e7b51cb44
PINATA_SECRET_KEY=35b44fb64bd61a1683fddf0154ed545be0c248f793a371abd4f8e16955cd1f05
PINATA_JWT=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiI5MmI3MWNjOC00ODhiLTQxNWQtODk4Ny1jNWM2M2I5ODEyOGMiLCJlbWFpbCI6InNpcmVuaWMuY3NAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsInBpbl9wb2xpY3kiOnsicmVnaW9ucyI6W3siZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiRlJBMSJ9LHsiZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiTllDMSJ9XSwidmVyc2lvbiI6MX0sIm1mYV9lbmFibGVkIjpmYWxzZSwic3RhdHVzIjoiQUNUSVZFIn0sImF1dGhlbnRpY2F0aW9uVHlwZSI6InNjb3BlZEtleSIsInNjb3BlZEtleUtleSI6Ijg1MTI5ZTkyZTIxZTdiNTFjYjQ0Iiwic2NvcGVkS2V5U2VjcmV0IjoiMzViNDRmYjY0YmQ2MWExNjgzZmRkZjAxNTRlZDU0NWJlMGMyNDhmNzkzYTM3MWFiZDRmOGUxNjk1NWNkMWYwNSIsImV4cCI6MTc5NjI2OTQ0M30.XIgJYgWVPSSaIxVAPMpCY5mtXlmg5ZKHsR_W39QOt1o

# Privy Authentication
PRIVY_APP_ID=cmhwbozxu004fjr0cicfz0tf8
PRIVY_APP_SECRET=2BuR8Ro1oRrhsxjTCK1riCqRQnuGrbAQi22FNEHptfaraQykAnXjYvu24Khx6XxomSzw9s5Vc2mb49qXvneBXYWK

# Thirdweb
THIRDWEB_CLIENT_ID=acb17e07e34ab2b8317aa40cbb1b5e1d

# ZeroDev Smart Wallets
ZERODEV_PROJECT_ID=88173d8e-c975-49e2-aa94-3e857c5aaf48
ZERODEV_BUNDLER_URL=https://bundler-varity-testnet-rroe52pwjp.t.conduit.xyz
ZERODEV_PAYMASTER_URL=https://rpc.zerodev.app/api/v3/88173d8e-c975-49e2-aa94-3e857c5aaf48/chain/33529?selfFunded=true

# Decent Cross-Chain
DECENT_API_KEY=be3083b99654290beea78d52d1ed95c6

# Varity L3 Network
VARITY_CHAIN_ID=33529
VARITY_RPC_URL=https://rpc-varity-testnet-rroe52pwjp.t.conduit.xyz

# Environment
ENVIRONMENT=production
LOG_LEVEL=INFO
DEV_MODE=false

# Lit Protocol
LIT_NETWORK=cayenne

# QuickBooks OAuth (already configured)
QUICKBOOKS_CLIENT_ID=ABX6u8d2g40ZFuGCMcaR6KNGQ0J4GWGukB1oTKtHQqkElbyYuL
QUICKBOOKS_CLIENT_SECRET=E184srbFxJhtrpSC4SfCZosXk3N8VqG16qk1Yqup

# Google OAuth (ADD YOUR CREDENTIALS)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Microsoft 365 (ADD YOUR CREDENTIALS)
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=

# Slack (ADD YOUR CREDENTIALS)
SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=

# LLM Configuration (Together.ai for beta)
TOGETHER_API_KEY=
LLM_PROVIDER=together
LLM_MODEL=meta-llama/Llama-3.1-70B-Instruct-Turbo
```

### 1.7 Deploy and Get URL
1. Click **"Deploy"** or wait for auto-deploy
2. Once deployed, go to **Settings > Networking**
3. Click **"Generate Domain"**
4. Copy your Railway URL (e.g., `https://your-backend.up.railway.app`)

### 1.8 Verify Backend Health
```bash
curl https://your-backend.up.railway.app/health
```

---

## STEP 2: Deploy Frontend to Vercel (10 minutes)

### 2.1 Create Vercel Account
1. Go to https://vercel.com
2. Sign up with GitHub (recommended)
3. Verify your account

### 2.2 Import Project
1. Click **"Add New..."** > **"Project"**
2. Import from GitHub: `blokko-internal-os`
3. Select **Root Directory**: `varity/chains/arbitrum/deployments/testnet/testing/generic-company-dashboard`

### 2.3 Configure Build Settings
- **Framework Preset**: Next.js (auto-detected)
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`

### 2.4 Set Environment Variables
In Vercel dashboard, add these environment variables:

```bash
NEXT_PUBLIC_API_URL=https://your-backend.up.railway.app
NEXT_PUBLIC_PRIVY_APP_ID=cmhwbozxu004fjr0cicfz0tf8
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=acb17e07e34ab2b8317aa40cbb1b5e1d
NEXT_PUBLIC_VARITY_CHAIN_ID=33529
NEXT_PUBLIC_VARITY_RPC_URL=https://rpc-varity-testnet-rroe52pwjp.t.conduit.xyz
NEXT_PUBLIC_EXPLORER_URL=https://explorer-varity-testnet-rroe52pwjp.t.conduit.xyz
NEXT_PUBLIC_USDC_ADDRESS=0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d
```

**IMPORTANT:** Replace `your-backend.up.railway.app` with your actual Railway URL from Step 1.7!

### 2.5 Deploy
1. Click **"Deploy"**
2. Wait for build to complete (2-3 minutes)
3. Copy your Vercel URL (e.g., `https://your-app.vercel.app`)

### 2.6 Verify Frontend
Open your Vercel URL in browser - you should see the dashboard landing page.

---

## STEP 3: Update Backend with Frontend URL (5 minutes)

### 3.1 Update Railway Variables
1. Go back to Railway dashboard
2. Select your backend service
3. Go to **Variables**
4. Update these variables with your actual Vercel URL:

```bash
FRONTEND_URL=https://your-app.vercel.app
OAUTH_REDIRECT_BASE_URL=https://your-app.vercel.app
```

5. Railway will auto-redeploy

---

## STEP 4: Update Google OAuth (5 minutes)

### 4.1 Update Redirect URI in Google Cloud Console
1. Go to https://console.cloud.google.com/apis/credentials
2. Select your OAuth 2.0 Client ID (for Varity Dashboard)
3. In **Authorized redirect URIs**, add:
   ```
   https://your-app.vercel.app/oauth/callback/google
   ```
4. Click **Save**

### 4.2 Add Google Credentials to Railway
1. Go to Railway dashboard > Variables
2. Add your Google OAuth credentials:
   ```
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   ```

---

## STEP 5: Update Marketing Website (5 minutes)

### 5.1 Update "Start Free Trial" Button
The marketing website needs to point to your production dashboard:

**File:** `/varity/chains/arbitrum/platform/marketing/marketing-website/apps/marketing/src/components/dashboard/hero.tsx`
**Line 66:** Change `http://localhost:3001` to your Vercel URL

```typescript
// OLD:
<a href="http://localhost:3001" target="_blank" ...>Start Free Trial</a>

// NEW:
<a href="https://your-app.vercel.app" target="_blank" ...>Start Free Trial</a>
```

---

## STEP 6: Test Everything (10 minutes)

### 6.1 Health Check
```bash
# Backend health
curl https://your-backend.up.railway.app/health

# Should return:
{
  "status": "healthy",
  "database": "connected",
  "redis": "connected"
}
```

### 6.2 Frontend Test
1. Open https://your-app.vercel.app
2. You should see the dashboard landing page
3. Try signing in with Privy (email or wallet)

### 6.3 OAuth Test
1. Go to /integrations page
2. Click "Connect QuickBooks"
3. Complete OAuth flow
4. Verify connection success

### 6.4 Marketing Website Test
1. Go to marketing website
2. Click "Start Free Trial"
3. Should open your dashboard in new tab

---

## POST-DEPLOYMENT: Your Production URLs

After completing all steps, you'll have:

| Service | URL | Purpose |
|---------|-----|---------|
| **Frontend** | `https://your-app.vercel.app` | Customer-facing dashboard |
| **Backend** | `https://your-backend.up.railway.app` | API server |
| **Marketing** | (existing) | Lead generation |

---

## COST SUMMARY

| Service | Cost/Month | Notes |
|---------|------------|-------|
| **Railway Hobby** | $5 | 500 hours, 8GB RAM |
| **Railway PostgreSQL** | $5-20 | Scales with usage |
| **Railway Redis** | $5 | Basic caching |
| **Vercel Hobby** | $0 | Free for hobby use |
| **Together.ai API** | $0-50 | Pay per use (optional for beta) |
| **TOTAL** | **~$15-80/month** | |

For 10-100 beta users, expect ~$50-100/month total.

---

## TROUBLESHOOTING

### Railway Build Fails
- Check Dockerfile exists in backend/
- Verify requirements.txt is present
- Check build logs for missing dependencies

### Vercel Build Fails
- Ensure package.json has correct build script
- Check for TypeScript errors
- Verify all dependencies in package.json

### OAuth Redirect Mismatch
- Ensure FRONTEND_URL in Railway matches Vercel URL exactly
- No trailing slash
- Same protocol (https://)
- Redirect URI registered in OAuth provider matches exactly

### Database Connection Error
- Railway auto-provides DATABASE_URL
- Check PostgreSQL plugin is healthy
- Verify connection string format

---

## NEXT STEPS AFTER DEPLOYMENT

1. **Add Remaining OAuth Providers**
   - Microsoft 365: https://portal.azure.com
   - Slack: https://api.slack.com/apps

2. **Custom Domain (Optional)**
   - Vercel: Settings > Domains > Add domain
   - Railway: Settings > Networking > Custom Domain

3. **Monitoring Setup**
   - Railway has built-in metrics
   - Consider adding Sentry for error tracking

4. **Business Outreach**
   - Dashboard is live and ready
   - Start cold email campaigns
   - Leverage network for beta signups
