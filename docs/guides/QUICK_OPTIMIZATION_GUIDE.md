# QUICK OPTIMIZATION GUIDE
## Immediate Performance Fixes - Get to Production Fast

This guide provides copy-paste code to fix the **3 critical performance issues** blocking production deployment.

---

## ISSUE #1: Bundle Size (134 MB → 2-3 MB) ❌ CRITICAL

### Step 1: Install Bundle Analyzer

```bash
npm install --save-dev @next/bundle-analyzer
```

### Step 2: Update next.config.js

```javascript
// next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  compress: true,

  // Optimize production bundle
  productionBrowserSourceMaps: false,

  // Reduce JavaScript bundle size
  experimental: {
    optimizeCss: true,
    optimizeFonts: true,
  },

  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
  },

  // Webpack configuration
  webpack: (config, { isServer }) => {
    // Only include needed wallet libraries
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    return config;
  },
};

module.exports = withBundleAnalyzer(nextConfig);
```

### Step 3: Lazy Load Heavy Components

**Create `src/app/providers.tsx` with dynamic imports:**

```typescript
// src/app/providers.tsx
'use client';

import { ReactNode, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Lazy load wallet providers - they're 50+ MB!
const PrivyProvider = dynamic(
  () => import('@privy-io/react-auth').then(mod => mod.PrivyProvider),
  { ssr: false }
);

const ThirdwebProvider = dynamic(
  () => import('@thirdweb-dev/react').then(mod => mod.ThirdwebProvider),
  { ssr: false }
);

export function Providers({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <PrivyProvider appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ''}>
      <ThirdwebProvider>
        {children}
      </ThirdwebProvider>
    </PrivyProvider>
  );
}
```

### Step 4: Dynamic Import for Routes

**Update heavy route pages:**

```typescript
// src/app/marketplace/page.tsx
import dynamic from 'next/dynamic';

// Don't load marketplace until user navigates to it
const MarketplacePage = dynamic(() => import('./MarketplaceContent'), {
  loading: () => <div>Loading marketplace...</div>,
  ssr: false,
});

export default MarketplacePage;

// Create MarketplaceContent.tsx with the actual component
```

```typescript
// src/app/ai-assistant/page.tsx
import dynamic from 'next/dynamic';

const AIAssistantPage = dynamic(() => import('./AIAssistantContent'), {
  loading: () => <div>Loading AI assistant...</div>,
  ssr: false,
});

export default AIAssistantPage;
```

### Step 5: Analyze Bundle

```bash
# Analyze bundle to find large dependencies
ANALYZE=true npm run build

# This will open bundle analyzer in browser
# Look for chunks > 1MB and lazy load them
```

### Step 6: Remove Unused Dependencies (Optional)

```bash
# Remove duplicate wallet libraries if not needed
npm uninstall @thirdweb-dev/react @thirdweb-dev/sdk

# Or remove Privy if using Thirdweb
npm uninstall @privy-io/react-auth

# Keep only the wallet library you're actually using
```

**Expected Result:** Bundle size 134 MB → 2-3 MB (98% reduction)

---

## ISSUE #2: No Caching (0% → 90% cache hit rate) ❌ CRITICAL

### Step 1: Create Cache Manager

```bash
# Create new file
touch backend/app/core/cache.py
```

```python
# backend/app/core/cache.py
"""
Redis caching manager for API endpoints
"""
from redis import asyncio as aioredis
from functools import wraps
import json
import hashlib
import logging
from typing import Optional, Any, Callable
import os

logger = logging.getLogger(__name__)

class CacheManager:
    """Async Redis cache manager"""

    def __init__(self):
        self.redis: Optional[aioredis.Redis] = None
        self._connected = False

    async def connect(self):
        """Connect to Redis"""
        if self._connected:
            return

        try:
            redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
            self.redis = await aioredis.from_url(
                redis_url,
                encoding="utf-8",
                decode_responses=True,
                socket_connect_timeout=5
            )
            # Test connection
            await self.redis.ping()
            self._connected = True
            logger.info("Connected to Redis cache")
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
            self.redis = None
            self._connected = False

    async def disconnect(self):
        """Disconnect from Redis"""
        if self.redis:
            await self.redis.close()
            self._connected = False

    def _generate_key(self, prefix: str, *args, **kwargs) -> str:
        """Generate cache key from function arguments"""
        # Create deterministic hash from arguments
        args_str = str(args) + str(sorted(kwargs.items()))
        args_hash = hashlib.md5(args_str.encode()).hexdigest()[:8]
        return f"{prefix}:{args_hash}"

    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        if not self.redis:
            return None

        try:
            value = await self.redis.get(key)
            if value:
                return json.loads(value)
        except Exception as e:
            logger.error(f"Cache get error: {e}")

        return None

    async def set(self, key: str, value: Any, ttl: int = 300):
        """Set value in cache with TTL"""
        if not self.redis:
            return

        try:
            serialized = json.dumps(value, default=str)
            await self.redis.setex(key, ttl, serialized)
        except Exception as e:
            logger.error(f"Cache set error: {e}")

    async def delete(self, key: str):
        """Delete key from cache"""
        if not self.redis:
            return

        try:
            await self.redis.delete(key)
        except Exception as e:
            logger.error(f"Cache delete error: {e}")

    def cached(self, ttl: int = 300, key_prefix: str = ""):
        """
        Decorator for caching async function results

        Usage:
            @cache.cached(ttl=3600, key_prefix="products")
            async def get_products():
                return await db.query(Product).all()
        """
        def decorator(func: Callable):
            @wraps(func)
            async def wrapper(*args, **kwargs):
                # Skip cache if not connected
                if not self.redis:
                    return await func(*args, **kwargs)

                # Generate cache key
                prefix = key_prefix or func.__name__
                cache_key = self._generate_key(prefix, *args, **kwargs)

                # Try to get from cache
                cached_value = await self.get(cache_key)
                if cached_value is not None:
                    logger.debug(f"Cache HIT: {cache_key}")
                    return cached_value

                # Cache miss - execute function
                logger.debug(f"Cache MISS: {cache_key}")
                result = await func(*args, **kwargs)

                # Store in cache
                await self.set(cache_key, result, ttl)

                return result

            return wrapper
        return decorator

# Global cache instance
cache = CacheManager()
```

### Step 2: Initialize Cache in FastAPI

```python
# backend/app/main.py
from app.core.cache import cache

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    await cache.connect()
    logger.info("Application started")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    await cache.disconnect()
    logger.info("Application shutdown")
```

### Step 3: Add Caching to API Endpoints

```python
# backend/app/api/v1/marketplace.py
from app.core.cache import cache

@router.get("/products")
@cache.cached(ttl=3600, key_prefix="marketplace_products")  # Cache 1 hour
async def list_products(db: AsyncSession = Depends(get_db)):
    """List all products - CACHED"""
    logger.info("Fetching products from database")
    result = await db.execute(select(Product))
    products = result.scalars().all()

    # Convert to dict...
    return products_list
```

```python
# backend/app/api/v1/dashboard.py
from app.core.cache import cache

@router.get("/kpis")
@cache.cached(ttl=300, key_prefix="dashboard_kpis")  # Cache 5 minutes
async def get_kpis(
    wallet_address: str,
    db: AsyncSession = Depends(get_db)
):
    """Get dashboard KPIs - CACHED"""
    # ... compute KPIs
    return kpis
```

```python
# backend/app/api/v1/oauth.py
from app.core.cache import cache

@router.get("/status/{provider}")
@cache.cached(ttl=600, key_prefix="oauth_status")  # Cache 10 minutes
async def get_oauth_status(
    provider: str,
    wallet_address: str,
    db: AsyncSession = Depends(get_db)
):
    """Get OAuth connection status - CACHED"""
    # ... check OAuth status
    return status
```

### Step 4: Cache Invalidation (When Data Changes)

```python
# backend/app/api/v1/marketplace_purchases.py
from app.core.cache import cache

@router.post("/purchase")
async def purchase_license(
    purchase: PurchaseRequest,
    db: AsyncSession = Depends(get_db)
):
    """Purchase a license"""
    # Process purchase...

    # Invalidate user's dashboard cache
    dashboard_key = cache._generate_key("dashboard_kpis", wallet_address=purchase.wallet_address)
    await cache.delete(dashboard_key)

    return {"success": True}
```

### Step 5: Start Redis

```bash
# If not already running
docker-compose up -d redis

# Or standalone
docker run -d -p 6379:6379 redis:7-alpine
```

**Expected Result:** API response times 100-500ms → 10-50ms for cached requests

---

## ISSUE #3: No React Memoization (Unnecessary Re-renders) ⚠️

### Step 1: Memoize Dashboard Component

```typescript
// src/app/dashboard/page.tsx
'use client';

import { memo, useMemo, useCallback } from 'react';

// Memoize KPI cards to prevent re-renders
const KPICard = memo(({ title, value, change }: {
  title: string;
  value: string | number;
  change: number;
}) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-gray-500 text-sm">{title}</h3>
      <p className="text-2xl font-bold mt-2">{value}</p>
      <p className={`text-sm mt-1 ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
        {change >= 0 ? '+' : ''}{change}%
      </p>
    </div>
  );
});

KPICard.displayName = 'KPICard';

// Memoize entire dashboard page
const DashboardPage = memo(() => {
  const { user } = usePrivy();

  // Memoize KPI calculation
  const kpis = useMemo(() => {
    return {
      revenue: calculateRevenue(),
      customers: calculateCustomers(),
      growth: calculateGrowth(),
    };
  }, [/* dependencies */]);

  // Memoize callback
  const handleRefresh = useCallback(async () => {
    await fetchLatestData();
  }, []);

  return (
    <div>
      <h1>Dashboard</h1>
      <div className="grid grid-cols-3 gap-4">
        <KPICard title="Revenue" value={kpis.revenue} change={5.2} />
        <KPICard title="Customers" value={kpis.customers} change={3.1} />
        <KPICard title="Growth" value={kpis.growth} change={8.4} />
      </div>
      <button onClick={handleRefresh}>Refresh</button>
    </div>
  );
});

DashboardPage.displayName = 'DashboardPage';

export default DashboardPage;
```

### Step 2: Memoize Marketplace Products

```typescript
// src/app/marketplace/page.tsx
'use client';

import { memo, useMemo } from 'react';

// Memoize individual product card
const ProductCard = memo(({ product }: { product: any }) => {
  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h3>{product.name}</h3>
      <p>{product.description}</p>
      <p className="font-bold">${product.price}</p>
    </div>
  );
});

ProductCard.displayName = 'ProductCard';

// Memoize product list
const ProductList = memo(({ products, filter }: {
  products: any[];
  filter: string;
}) => {
  // Memoize filtered products
  const filteredProducts = useMemo(() => {
    return products.filter(p =>
      p.name.toLowerCase().includes(filter.toLowerCase())
    );
  }, [products, filter]);

  return (
    <div className="grid grid-cols-3 gap-4">
      {filteredProducts.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
});

ProductList.displayName = 'ProductList';
```

### Step 3: Debounce Search Input

```typescript
// src/hooks/useDebounce.ts
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Usage in marketplace search:
const [searchTerm, setSearchTerm] = useState('');
const debouncedSearch = useDebounce(searchTerm, 300);

useEffect(() => {
  // Only search after user stops typing for 300ms
  searchProducts(debouncedSearch);
}, [debouncedSearch]);
```

**Expected Result:** Eliminate 60-80% of unnecessary component re-renders

---

## Quick Test Commands

### Test Bundle Size
```bash
# Analyze current bundle
ANALYZE=true npm run build

# Build for production
npm run build

# Check .next/static/chunks sizes
du -h .next/static/chunks/* | sort -h | tail -20
```

### Test Redis Cache
```bash
# Check Redis is running
docker ps | grep redis

# Monitor cache operations
docker exec -it <redis-container> redis-cli MONITOR

# Check cache stats
docker exec -it <redis-container> redis-cli INFO stats
```

### Test React Performance
```bash
# Use React DevTools Profiler
# 1. Install React DevTools extension
# 2. Open app in browser
# 3. Go to Profiler tab
# 4. Click Record
# 5. Interact with app
# 6. Stop recording
# 7. Review flamegraph for re-renders
```

---

## Success Checklist

After implementing these fixes:

- [ ] Bundle size reduced from 134 MB to <5 MB
- [ ] Redis cache connected (check logs for "Connected to Redis")
- [ ] Cache hit rate >50% after 5 minutes of usage
- [ ] API responses <100ms for cached endpoints
- [ ] React DevTools shows fewer re-renders
- [ ] Lighthouse Performance score >80 (target: 95+)
- [ ] Frontend loads in <5 seconds (target: <3s)

---

## Troubleshooting

**Bundle still large?**
```bash
# Check what's included
ANALYZE=true npm run build

# Look for:
# - Multiple wallet libraries (choose one)
# - Large SDK imports (use dynamic imports)
# - Unnecessary polyfills (configure webpack)
```

**Redis not connecting?**
```bash
# Check Redis is running
docker-compose ps

# Check connection
docker exec -it <redis-container> redis-cli ping
# Should return: PONG

# Check logs
docker-compose logs redis
```

**React still re-rendering?**
```typescript
// Add logging to see why component re-renders
useEffect(() => {
  console.log('Component rendered', { props, state });
});

// Use why-did-you-render library
npm install --save-dev @welldone-software/why-did-you-render
```

---

## Next Steps

After these critical fixes:

1. Run load testing (see PERFORMANCE_OPTIMIZATION_REPORT.md Phase 5)
2. Implement cost optimizations (storage compression, LLM routing)
3. Add monitoring (Sentry, Prometheus)
4. Prepare for production deployment

**Estimated time:** 3-5 days for all critical fixes
**Impact:** Production-ready performance and user experience
