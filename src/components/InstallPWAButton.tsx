'use client';

import { useState, useEffect } from 'react';
import { showInstallPrompt, isInstallPromptAvailable, isPWA } from '@/lib/pwa';

/**
 * Install PWA Button Component
 * Shows install button when PWA can be installed
 */
export function InstallPWAButton() {
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    setIsInstalled(isPWA());

    // Listen for install prompt availability
    const handleInstallAvailable = () => {
      setCanInstall(isInstallPromptAvailable());
    };

    // Listen for installation
    const handleInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
    };

    window.addEventListener('pwa-install-available', handleInstallAvailable);
    window.addEventListener('pwa-installed', handleInstalled);

    // Check initial state
    setCanInstall(isInstallPromptAvailable());

    return () => {
      window.removeEventListener('pwa-install-available', handleInstallAvailable);
      window.removeEventListener('pwa-installed', handleInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    const result = await showInstallPrompt();

    if (result === 'accepted') {
      console.log('[PWA] User accepted the install prompt');
    } else if (result === 'dismissed') {
      console.log('[PWA] User dismissed the install prompt');
    }

    setCanInstall(false);
  };

  // Don't show button if already installed or can't install
  if (isInstalled || !canInstall) {
    return null;
  }

  return (
    <button
      onClick={handleInstallClick}
      className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-lg"
      aria-label="Install app"
    >
      <svg
        className="w-5 h-5 mr-2"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
        />
      </svg>
      Install App
    </button>
  );
}
