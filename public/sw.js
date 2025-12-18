// Varity Generic Company Dashboard - Service Worker
// Version: 1.0.0

const CACHE_VERSION = 'varity-v1';
const CACHE_NAME = `${CACHE_VERSION}-${Date.now()}`;

// Static assets to cache on install
const STATIC_CACHE_URLS = [
  '/',
  '/dashboard',
  '/marketplace',
  '/analytics',
  '/ai-assistant',
  '/settings',
  '/onboarding',
  '/offline',
];

// Cache strategies
const CACHE_STRATEGIES = {
  CACHE_FIRST: 'cache-first',
  NETWORK_FIRST: 'network-first',
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate',
};

// Resource type cache strategies
const CACHE_STRATEGY_MAP = {
  document: CACHE_STRATEGIES.NETWORK_FIRST,
  script: CACHE_STRATEGIES.CACHE_FIRST,
  style: CACHE_STRATEGIES.CACHE_FIRST,
  image: CACHE_STRATEGIES.CACHE_FIRST,
  font: CACHE_STRATEGIES.CACHE_FIRST,
  api: CACHE_STRATEGIES.NETWORK_FIRST,
};

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing service worker...', CACHE_NAME);

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Precaching static assets');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        console.log('[Service Worker] Installation complete');
        // Force activation immediately
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[Service Worker] Installation failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating service worker...', CACHE_NAME);

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName.startsWith('varity-')) {
              console.log('[Service Worker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[Service Worker] Activation complete');
        // Take control of all clients immediately
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache with fallback strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome extensions and other protocols
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Determine cache strategy based on request type
  const strategy = determineStrategy(request);

  event.respondWith(
    handleFetchWithStrategy(request, strategy)
      .catch((error) => {
        console.error('[Service Worker] Fetch failed:', error);
        return handleOfflineFallback(request);
      })
  );
});

// Determine caching strategy based on request
function determineStrategy(request) {
  const url = new URL(request.url);
  const destination = request.destination;

  // API requests - network first
  if (url.pathname.startsWith('/api/') || url.hostname.includes('api.')) {
    return CACHE_STRATEGIES.NETWORK_FIRST;
  }

  // Use destination-based strategy
  return CACHE_STRATEGY_MAP[destination] || CACHE_STRATEGIES.NETWORK_FIRST;
}

// Handle fetch with specified strategy
async function handleFetchWithStrategy(request, strategy) {
  switch (strategy) {
    case CACHE_STRATEGIES.CACHE_FIRST:
      return cacheFirst(request);

    case CACHE_STRATEGIES.NETWORK_FIRST:
      return networkFirst(request);

    case CACHE_STRATEGIES.STALE_WHILE_REVALIDATE:
      return staleWhileRevalidate(request);

    default:
      return networkFirst(request);
  }
}

// Cache First strategy - serve from cache, fallback to network
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  const networkResponse = await fetch(request);

  // Cache successful responses
  if (networkResponse.ok) {
    cache.put(request, networkResponse.clone());
  }

  return networkResponse;
}

// Network First strategy - try network, fallback to cache
async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const networkResponse = await fetch(request);

    // Cache successful responses
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    throw error;
  }
}

// Stale While Revalidate strategy - serve cache, update in background
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);

  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  });

  return cachedResponse || fetchPromise;
}

// Handle offline fallback
async function handleOfflineFallback(request) {
  const cache = await caches.open(CACHE_NAME);

  // Try to serve cached version
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  // Serve offline page for navigation requests
  if (request.destination === 'document') {
    const offlineResponse = await cache.match('/offline');
    if (offlineResponse) {
      return offlineResponse;
    }
  }

  // Return a basic offline response
  return new Response(
    JSON.stringify({
      error: 'Offline',
      message: 'You are currently offline. Please check your internet connection.',
    }),
    {
      status: 503,
      statusText: 'Service Unavailable',
      headers: new Headers({
        'Content-Type': 'application/json',
      }),
    }
  );
}

// Message event - handle messages from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CACHE_URLS') {
    const urls = event.data.urls || [];
    event.waitUntil(
      caches.open(CACHE_NAME)
        .then((cache) => cache.addAll(urls))
    );
  }
});

// Background sync for failed requests (if supported)
if ('sync' in self.registration) {
  self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-requests') {
      event.waitUntil(syncFailedRequests());
    }
  });
}

async function syncFailedRequests() {
  // Implement background sync logic here
  console.log('[Service Worker] Syncing failed requests...');
}

console.log('[Service Worker] Service worker loaded successfully');
