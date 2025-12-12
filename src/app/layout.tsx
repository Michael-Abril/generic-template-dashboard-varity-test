import './globals.css';
import { Inter } from 'next/font/google';
import { Providers } from './providers';
import { PWAInitializer } from '@/components/PWAInitializer';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Varity - Company-Specific AI Dashboard',
  description: 'Generic template for company-specific AI dashboards on Varity L3',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Varity',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#3b82f6',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="theme-color" content="#3b82f6" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Varity" />
      </head>
      <body className={inter.className}>
        <Providers>{children}</Providers>
        <PWAInitializer />
      </body>
    </html>
  );
}
