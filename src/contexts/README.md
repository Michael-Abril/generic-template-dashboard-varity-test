# React Contexts

This directory contains React Context providers for global state management.

## Purpose

- Manage global application state
- Provide shared data across components
- Avoid prop drilling

## Structure

- `AuthContext.tsx` - Authentication state
- `Web3Context.tsx` - Blockchain connection state
- `ThemeContext.tsx` - UI theme state (optional)

## Usage

```typescript
import { useAuth } from '@/contexts/AuthContext';

function MyComponent() {
  const { user, login, logout } = useAuth();

  return (
    <div>
      {user ? `Welcome ${user.email}` : 'Please login'}
    </div>
  );
}
```

## Note

If you're using state management libraries (Redux, Zustand, etc.), you may not need this folder.
