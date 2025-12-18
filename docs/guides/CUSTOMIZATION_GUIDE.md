# Customization Guide - Generic Company Dashboard

This guide shows you how to customize the Varity Generic Company Dashboard template for your business or industry.

## Table of Contents

1. [Branding Customization](#branding-customization)
2. [Industry Templates](#industry-templates)
3. [Adding Custom Features](#adding-custom-features)
4. [Conduit Apps Configuration](#conduit-apps-configuration)
5. [Industry RAG Knowledge](#industry-rag-knowledge)
6. [UI Theming](#ui-theming)
7. [Smart Contract Customization](#smart-contract-customization)

---

## Branding Customization

### Quick Branding (5 minutes)

The easiest way to brand the dashboard for your company:

**1. Update Environment Variables**

Edit `.env.local`:

```bash
# Company Branding
NEXT_PUBLIC_COMPANY_NAME="Acme Corporation"
NEXT_PUBLIC_COMPANY_LOGO="/logos/acme-logo.png"
NEXT_PUBLIC_COMPANY_TAGLINE="Your Business Intelligence Partner"

# Theme Colors
NEXT_PUBLIC_PRIMARY_COLOR="#1e40af"      # Blue
NEXT_PUBLIC_SECONDARY_COLOR="#8b5cf6"    # Purple
NEXT_PUBLIC_BACKGROUND_COLOR="#0f172a"   # Dark blue-gray

# Contact Information
NEXT_PUBLIC_COMPANY_EMAIL="support@acmecorp.com"
NEXT_PUBLIC_COMPANY_PHONE="+1-555-0123"
NEXT_PUBLIC_COMPANY_WEBSITE="https://acmecorp.com"
```

**2. Add Your Logo**

```bash
# Add logo to public folder
cp /path/to/your-logo.png public/logos/acme-logo.png

# Recommended sizes:
# - 200x50px for header (horizontal)
# - 150x150px for mobile/square
# - SVG for best quality
```

**3. Update Metadata**

Edit `src/app/layout.tsx`:

```typescript
export const metadata: Metadata = {
  title: 'Acme Corp - AI Business Dashboard',
  description: 'AI-powered business intelligence for Acme Corporation',
  keywords: ['Acme', 'business intelligence', 'AI dashboard', 'analytics'],
  icons: {
    icon: '/logos/acme-logo.png',
    apple: '/logos/acme-logo.png',
  },
}
```

---

## Industry Templates

### Available Industry Templates

Varity provides pre-built templates for common industries:

#### 1. Finance Template

**Features:**
- Financial reporting dashboards
- Compliance tracking (SOX, FINRA, SEC)
- Audit logs and document management
- QuickBooks, Xero integration stubs
- Stripe, Plaid payment integrations

**Enable:**

```bash
cp -r templates/finance/* src/
npm run customize -- --industry finance
```

**Customizations:**
- Replace `src/app/finance/page.tsx` with your financial dashboards
- Update `src/lib/compliance.ts` with your compliance requirements
- Configure integrations in `backend/.env`

#### 2. Healthcare Template

**Features:**
- HIPAA-compliant data handling
- Patient records management
- Appointment scheduling
- Medical billing integration
- Zendesk, Salesforce integration stubs

**Enable:**

```bash
cp -r templates/healthcare/* src/
npm run customize -- --industry healthcare
```

**Customizations:**
- Configure HIPAA compliance settings
- Update encryption keys for patient data
- Integrate with your EHR system

#### 3. Retail Template

**Features:**
- Inventory management
- E-commerce analytics
- Supply chain tracking
- Shopify, WooCommerce integration stubs
- POS system integration

**Enable:**

```bash
cp -r templates/retail/* src/
npm run customize -- --industry retail
```

**Customizations:**
- Connect to your inventory database
- Configure payment gateway
- Setup shipping integrations

#### 4. ISO Merchant Services Template

**Features:**
- Merchant registration and onboarding
- Rep performance tracking
- Residual payment calculations
- PCI compliance monitoring
- Payment processing analytics

**Enable:**

```bash
cp -r templates/iso-merchant-services/* src/
npm run customize -- --industry iso-merchant-services
```

**Customizations:**
- Configure payment processor API keys
- Setup commission structures
- Define rep hierarchy

### Creating Custom Industry Template

If your industry isn't listed, you can create a custom template:

**1. Create Industry Folder**

```bash
mkdir -p src/app/[your-industry]
mkdir -p src/components/[your-industry]
mkdir -p src/lib/[your-industry]
```

**2. Add Industry-Specific Pages**

```typescript
// src/app/[your-industry]/page.tsx
import { IndustryDashboard } from '@/components/[your-industry]/Dashboard'

export default function IndustryPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">
        {process.env.NEXT_PUBLIC_COMPANY_NAME} - Industry Dashboard
      </h1>
      <IndustryDashboard />
    </div>
  )
}
```

**3. Create Industry Components**

```typescript
// src/components/[your-industry]/Dashboard.tsx
export function IndustryDashboard() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Your industry-specific widgets */}
      <MetricsCard title="Industry Metric 1" />
      <MetricsCard title="Industry Metric 2" />
      <MetricsCard title="Industry Metric 3" />
    </div>
  )
}
```

**4. Add Industry Logic**

```typescript
// src/lib/[your-industry]/logic.ts
export async function calculateIndustryMetric() {
  // Your business logic
}

export async function fetchIndustryData(walletAddress: string) {
  // Fetch from your backend or blockchain
}
```

---

## Adding Custom Features

### Example: Adding a Custom Dashboard Widget

**1. Create Component**

```bash
mkdir -p src/components/custom
```

```typescript
// src/components/custom/SalesWidget.tsx
'use client'

import { Card } from '@/components/ui/card'
import { useEffect, useState } from 'react'

export function SalesWidget() {
  const [sales, setSales] = useState<number>(0)

  useEffect(() => {
    // Fetch sales data
    fetch('/api/v1/sales/total')
      .then(res => res.json())
      .then(data => setSales(data.total))
  }, [])

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-2">Total Sales</h3>
      <p className="text-3xl font-bold text-green-600">
        ${sales.toLocaleString()}
      </p>
    </Card>
  )
}
```

**2. Add to Dashboard**

```typescript
// src/app/page.tsx
import { SalesWidget } from '@/components/custom/SalesWidget'

export default function DashboardPage() {
  return (
    <div className="grid grid-cols-3 gap-4">
      <SalesWidget />
      {/* Other widgets */}
    </div>
  )
}
```

**3. Create Backend Endpoint (if needed)**

```python
# backend/app/api/routes/sales.py
from fastapi import APIRouter

router = APIRouter(prefix="/api/v1/sales")

@router.get("/total")
async def get_total_sales():
    # Your business logic
    return {"total": 1250000}
```

---

## Conduit Apps Configuration

### All Conduit Apps Are Pre-Integrated

The generic template includes ALL 6 Conduit marketplace apps by default:

```bash
✅ Privy - Authentication (email, Google, wallet)
✅ thirdweb - Web3 SDK and contracts
✅ Superbridge - L2↔L3 asset bridging
✅ Decent - Cross-chain onboarding
✅ Conduit Builder - Account abstraction (ERC-4337)
✅ USDC - Stablecoin payments
```

### Configuring Privy (Authentication)

**1. Get Privy App ID**

- Go to https://dashboard.privy.io
- Create a new app
- Copy your App ID

**2. Configure Environment**

```bash
# .env.local
NEXT_PUBLIC_PRIVY_APP_ID=your-privy-app-id-here
```

**3. Customize Login Methods**

Edit `src/app/providers.tsx`:

```typescript
<PrivyProvider
  appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
  config={{
    loginMethods: ['email', 'google', 'wallet'],
    appearance: {
      theme: 'dark',
      accentColor: '#1e40af',
      logo: '/logos/your-logo.png',
    },
    embeddedWallets: {
      createOnLogin: 'users-without-wallets',
    },
  }}
>
  {children}
</PrivyProvider>
```

### Configuring thirdweb (Web3 SDK)

**1. Get thirdweb Client ID**

- Go to https://thirdweb.com/dashboard
- Create API key
- Copy Client ID

**2. Configure Environment**

```bash
# .env.local
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=your-thirdweb-client-id
```

**3. Use in Components**

```typescript
import { useContract, useContractRead } from 'thirdweb/react'

const { contract } = useContract('0xYourContractAddress')
const { data } = useContractRead(contract, 'getTools')
```

### Configuring Superbridge (Bridging)

Superbridge is auto-configured. Users can access directly:

```typescript
// Link to Superbridge
<a href="https://varity-testnet-rroe52pwjp-86d3bf2e4517f78c.testnets.rollbridge.app/">
  Bridge Assets
</a>
```

### Configuring Decent (Cross-Chain)

Add Decent widget to your dashboard:

```typescript
import { DecentWidget } from '@decent.xyz/box-ui'

<DecentWidget
  destinationChainId={33529} // Varity L3
  tokenAddress="0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d" // USDC
/>
```

---

## Industry RAG Knowledge

### What is Industry RAG?

Industry RAG (Retrieval-Augmented Generation) provides your AI assistant with industry-specific knowledge:

- Finance: Banking regulations, compliance, tax codes
- Healthcare: HIPAA, medical procedures, billing codes
- Retail: Supply chain, inventory best practices
- ISO: Payment processing, PCI compliance, merchant services

### Enabling Industry RAG

**1. Select Your Industry**

```bash
# Set in .env.local
NEXT_PUBLIC_COMPANY_INDUSTRY="finance"
# Options: finance, healthcare, retail, iso-merchant-services
```

**2. Industry RAG is Auto-Loaded**

When you set the industry, the AI assistant automatically accesses:
- 10,000+ industry-specific documents
- Best practices and compliance requirements
- Industry terminology and jargon

**3. Upload Custom Knowledge (Optional)**

Add your own knowledge base:

```bash
# Upload custom documents to backend
curl -X POST http://localhost:8000/api/v1/rag/upload \
  -F "file=@/path/to/your-documents.pdf" \
  -F "industry=finance"
```

### Testing Industry RAG

```bash
# Ask industry-specific question
curl -X POST http://localhost:8000/api/v1/ai/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What are PCI compliance requirements for merchant services?",
    "wallet_address": "0x..."
  }'
```

---

## UI Theming

### Customizing Colors

**Tailwind Configuration**

Edit `tailwind.config.ts`:

```typescript
module.exports = {
  theme: {
    extend: {
      colors: {
        // Your brand colors
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9', // Main brand color
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        // Add more custom colors
        accent: '#8b5cf6',
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
      },
    },
  },
}
```

### Dark/Light Mode

Enable theme switching:

```typescript
// src/app/providers.tsx
import { ThemeProvider } from 'next-themes'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark">
      {children}
    </ThemeProvider>
  )
}
```

### Custom Fonts

```typescript
// src/app/layout.tsx
import { Inter, Roboto_Mono } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })
const robotoMono = Roboto_Mono({ subsets: ['latin'] })

export default function RootLayout({ children }) {
  return (
    <html className={inter.className}>
      <body>{children}</body>
    </html>
  )
}
```

---

## Smart Contract Customization

### Adding Custom Smart Contracts

**1. Create Contract**

```solidity
// contracts/src/YourContract.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract YourBusinessLogic is Ownable {
    // Your custom business logic

    function customFunction() public {
        // Implementation
    }
}
```

**2. Deploy Contract**

```bash
cd contracts
npx hardhat compile
npx hardhat run scripts/deploy-custom.ts --network varity-testnet
```

**3. Integrate with Frontend**

```typescript
// src/lib/contracts/your-contract.ts
import { getContract } from 'thirdweb'
import { varietyChain } from '@/lib/varity-chain'

export const yourContract = getContract({
  client: thirdwebClient,
  chain: varietyChain,
  address: '0xYourContractAddress',
})
```

### Modifying Existing Contracts

To customize the marketplace logic:

```solidity
// contracts/src/CustomMarketplace.sol
import "./ToolMarketplace.sol";

contract CustomMarketplace is ToolMarketplace {
    // Override or extend functionality

    function listTool(
        string memory name,
        string memory category,
        uint256 monthlyPrice,
        string memory metadataURI
    ) public override returns (uint256) {
        // Add custom logic before listing
        require(monthlyPrice >= MIN_PRICE, "Price too low");

        // Call parent
        return super.listTool(name, category, monthlyPrice, metadataURI);
    }
}
```

---

## Example: ISO Dashboard Customization

Here's how the ISO dashboard was customized from the generic template:

**1. Environment Variables**

```bash
NEXT_PUBLIC_COMPANY_NAME="Merchant Pro"
NEXT_PUBLIC_COMPANY_INDUSTRY="iso-merchant-services"
NEXT_PUBLIC_PRIMARY_COLOR="#1e40af"
```

**2. Industry-Specific Pages**

```typescript
// src/app/merchants/page.tsx
import { MerchantRegistration } from '@/components/iso/MerchantRegistration'
import { RepPerformance } from '@/components/iso/RepPerformance'

export default function MerchantsPage() {
  return (
    <div className="space-y-6">
      <h1>Merchant Management</h1>
      <MerchantRegistration />
      <RepPerformance />
    </div>
  )
}
```

**3. Custom Smart Contracts**

```solidity
// contracts/src/MerchantRegistry.sol
contract MerchantRegistry {
    mapping(address => Merchant) public merchants;

    function registerMerchant(string memory businessName) public {
        merchants[msg.sender] = Merchant({
            businessName: businessName,
            registeredAt: block.timestamp,
            isActive: true
        });
    }
}
```

**4. Industry RAG Knowledge**

- Loaded 10,000+ ISO merchant services documents
- PCI compliance guides
- Payment processing regulations
- Residual calculation examples

---

## Testing Your Customizations

### Local Testing

```bash
# Start development server
npm run dev

# Visit: http://localhost:3001
```

### Checklist

- [ ] Branding displays correctly (logo, colors, company name)
- [ ] Industry features work as expected
- [ ] Custom components render properly
- [ ] Smart contracts deploy successfully
- [ ] RAG knowledge loads correctly
- [ ] All Conduit apps function
- [ ] Theme switching works (if enabled)

### Production Build Test

```bash
# Build for production
npm run build

# Test production build
npm run start
```

---

## Support

For customization help:

- **Documentation**: See README.md and other guides
- **Examples**: Check ISO dashboard in `/ai-dashboards/iso-merchant-services/`
- **Community**: Discord at discord.gg/varity
- **Enterprise Support**: support@varity.xyz

---

**Last Updated**: November 20, 2024
**Template Version**: 1.0.0
**Varity L3**: Chain ID 33529
