/**
 * Jest Setup File
 * Runs before each test
 */

import '@testing-library/jest-dom';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
  }),
  usePathname: () => '/',
}));

// Mock environment variables
process.env.NEXT_PUBLIC_VARITY_CHAIN_ID = '33529';
process.env.NEXT_PUBLIC_VARITY_RPC_URL = 'https://rpc-varity-testnet-rroe52pwjp.t.conduit.xyz';
process.env.NEXT_PUBLIC_PRIVY_APP_ID = 'test-privy-app-id';
process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID = 'test-thirdweb-client-id';
process.env.NEXT_PUBLIC_BACKEND_URL = 'http://localhost:8000';
