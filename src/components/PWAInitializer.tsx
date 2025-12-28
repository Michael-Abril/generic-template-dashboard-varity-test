'use client';

import { useEffect } from 'react';
import { initializePWA } from '@/lib/pwa';
import { logger } from '@/lib/logger';

/**
 * PWA Initializer Component
 * Registers service worker and sets up PWA features on client side
 */
export function PWAInitializer() {
  useEffect(() => {
    // Initialize PWA features when component mounts
    initializePWA();

    // Log environment info (logger.debug only logs in development)
    logger.debug('[PWA] Service worker enabled', { enabled: process.env.NEXT_PUBLIC_ENABLE_SW === 'true' });
  }, []);

  // This component doesn't render anything
  return null;
}
