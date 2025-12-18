/**
 * PWA Registration and Management
 * Handles service worker registration and installation prompt
 */

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

// Service Worker Registration
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  // Only register in browser environment
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return null;
  }

  // Check if service workers are supported
  if (!('serviceWorker' in navigator)) {
    console.log('[PWA] Service workers are not supported in this browser');
    return null;
  }

  // Don't register in development mode (unless explicitly enabled)
  if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_ENABLE_SW !== 'true') {
    console.log('[PWA] Service worker disabled in development mode');
    return null;
  }

  try {
    console.log('[PWA] Registering service worker...');

    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    console.log('[PWA] Service worker registered successfully:', registration.scope);

    // Check for updates on page load
    registration.update();

    // Handle service worker updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;

      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // New service worker available
          console.log('[PWA] New service worker available');

          // Notify user about update
          notifyServiceWorkerUpdate(registration);
        }
      });
    });

    return registration;
  } catch (error) {
    console.error('[PWA] Service worker registration failed:', error);
    return null;
  }
}

// Unregister service worker (for cleanup)
export async function unregisterServiceWorker(): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();

    if (registration) {
      const success = await registration.unregister();
      console.log('[PWA] Service worker unregistered:', success);
      return success;
    }

    return false;
  } catch (error) {
    console.error('[PWA] Service worker unregistration failed:', error);
    return false;
  }
}

// Update service worker
export function updateServiceWorker(registration: ServiceWorkerRegistration): void {
  const waiting = registration.waiting;

  if (!waiting) {
    return;
  }

  // Tell the service worker to skip waiting
  waiting.postMessage({ type: 'SKIP_WAITING' });

  // Reload the page when the new service worker activates
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });
}

// Notify user about service worker update
function notifyServiceWorkerUpdate(registration: ServiceWorkerRegistration): void {
  // You can implement custom notification UI here
  // For now, we'll just show a console message
  console.log('[PWA] A new version is available! Reload to update.');

  // Optionally, auto-update after a delay
  if (process.env.NEXT_PUBLIC_AUTO_UPDATE_SW === 'true') {
    setTimeout(() => {
      updateServiceWorker(registration);
    }, 5000);
  }
}

// PWA Install Prompt
let deferredPrompt: BeforeInstallPromptEvent | null = null;

export function setupInstallPrompt(): void {
  if (typeof window === 'undefined') {
    return;
  }

  // Listen for the beforeinstallprompt event
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();

    // Stash the event so it can be triggered later
    deferredPrompt = e as BeforeInstallPromptEvent;

    console.log('[PWA] Install prompt available');

    // Dispatch custom event to notify app
    window.dispatchEvent(new CustomEvent('pwa-install-available'));
  });

  // Listen for successful installation
  window.addEventListener('appinstalled', () => {
    console.log('[PWA] App installed successfully');
    deferredPrompt = null;

    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('pwa-installed'));
  });
}

export function showInstallPrompt(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferredPrompt) {
    console.log('[PWA] Install prompt not available');
    return Promise.resolve('unavailable');
  }

  // Show the install prompt
  deferredPrompt.prompt();

  // Wait for the user to respond to the prompt
  return deferredPrompt.userChoice.then((choiceResult) => {
    console.log('[PWA] User choice:', choiceResult.outcome);

    deferredPrompt = null;

    return choiceResult.outcome;
  });
}

export function isInstallPromptAvailable(): boolean {
  return deferredPrompt !== null;
}

// Check if app is running as PWA
export function isPWA(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  // Check if running in standalone mode (installed PWA)
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
}

// Get PWA display mode
export function getPWADisplayMode(): 'browser' | 'standalone' | 'minimal-ui' | 'fullscreen' {
  if (typeof window === 'undefined') {
    return 'browser';
  }

  if (window.matchMedia('(display-mode: standalone)').matches) {
    return 'standalone';
  }

  if (window.matchMedia('(display-mode: minimal-ui)').matches) {
    return 'minimal-ui';
  }

  if (window.matchMedia('(display-mode: fullscreen)').matches) {
    return 'fullscreen';
  }

  return 'browser';
}

// Cache URLs manually
export async function cacheURLs(urls: string[]): Promise<void> {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  const registration = await navigator.serviceWorker.getRegistration();

  if (!registration || !registration.active) {
    return;
  }

  // Send message to service worker to cache URLs
  registration.active.postMessage({
    type: 'CACHE_URLS',
    urls,
  });
}

// Clear all caches
export async function clearCaches(): Promise<void> {
  if (typeof window === 'undefined' || !('caches' in window)) {
    return;
  }

  try {
    const cacheNames = await caches.keys();

    await Promise.all(
      cacheNames.map((cacheName) => caches.delete(cacheName))
    );

    console.log('[PWA] All caches cleared');
  } catch (error) {
    console.error('[PWA] Failed to clear caches:', error);
  }
}

// Get cache size
export async function getCacheSize(): Promise<number> {
  if (typeof window === 'undefined' || !('caches' in window)) {
    return 0;
  }

  try {
    const cacheNames = await caches.keys();
    let totalSize = 0;

    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();

      for (const request of keys) {
        const response = await cache.match(request);
        if (response) {
          const blob = await response.blob();
          totalSize += blob.size;
        }
      }
    }

    return totalSize;
  } catch (error) {
    console.error('[PWA] Failed to get cache size:', error);
    return 0;
  }
}

// Format bytes to human-readable size
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Initialize PWA features
export function initializePWA(): void {
  if (typeof window === 'undefined') {
    return;
  }

  // Register service worker
  registerServiceWorker();

  // Setup install prompt
  setupInstallPrompt();

  // Log PWA status
  console.log('[PWA] Running as PWA:', isPWA());
  console.log('[PWA] Display mode:', getPWADisplayMode());
}
