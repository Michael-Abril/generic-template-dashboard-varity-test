'use client';

import { useEffect } from 'react';
import { initializePWA } from '@/lib/pwa';

/**
 * PWA Initializer Component
 * Registers service worker and sets up PWA features on client side
 */
export function PWAInitializer() {
  useEffect(() => {
    // Initialize PWA features when component mounts
    initializePWA();

    // Log environment info
    if (process.env.NODE_ENV === 'development') {
      console.log('[PWA] Running in development mode');
      console.log('[PWA] Service worker enabled:', process.env.NEXT_PUBLIC_ENABLE_SW === 'true');
    }
  }, []);

  // This component doesn't render anything
  return null;
}
