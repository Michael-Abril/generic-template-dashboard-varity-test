# E2E Test Suite

Comprehensive end-to-end testing for Varity Generic Company Dashboard using Playwright.

## Test Files

- **auth.spec.ts** - Authentication and wallet connection flows
- **marketplace.spec.ts** - Product browsing and purchase workflows
- **integrations.spec.ts** - OAuth integrations and third-party connections
- **navigation.spec.ts** - Page navigation and routing
- **web3.spec.ts** - Web3 interactions and blockchain transactions

## Running Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run in UI mode (interactive)
npm run test:e2e:ui

# Run specific test file
npx playwright test e2e/auth.spec.ts

# Run in specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

## Test Coverage

- **50+ test scenarios** across 5 test files
- **Cross-browser**: Chromium, Firefox, WebKit
- **Mobile**: Pixel 5, iPhone 12
- **All critical user flows** covered

## Configuration

See `playwright.config.ts` for full configuration.

Key settings:
- Base URL: http://localhost:3001
- Screenshots on failure
- Video recording on failure
- HTML + JSON + JUnit reporters
- Automatic dev server startup
