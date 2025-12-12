# TypeScript Type Definitions

This directory contains TypeScript type definitions and interfaces used throughout the application.

## Purpose

- Define reusable TypeScript types and interfaces
- Ensure type safety across the application
- Document data structures and API contracts

## Structure

- `index.ts` - Main type exports
- `api.ts` - API request/response types
- `models.ts` - Data model types
- `components.ts` - Component prop types

## Usage

```typescript
import { User, ApiResponse } from '@/types';

const user: User = {
  address: '0x...',
  email: 'user@example.com'
};
```
