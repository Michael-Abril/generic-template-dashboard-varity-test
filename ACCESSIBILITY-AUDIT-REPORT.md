# WCAG 2.1 AA Accessibility Audit Report

**Application:** Varity Dashboard (https://app.varity.so)
**Date:** December 26, 2025
**Target Users:** 30-60 year old business owners
**Audit Standard:** WCAG 2.1 Level AA
**Auditor:** UI/UX Validation Team (Accessibility Compliance)

---

## Executive Summary

**Overall Accessibility Score: 68/100 (Moderate)**

The Varity Dashboard has foundational accessibility features in place but has several significant gaps that would impact users who rely on assistive technologies. The application needs remediation in key areas before it can be considered WCAG 2.1 AA compliant.

### Quick Status

| Category | Status | Priority Issues |
|----------|--------|-----------------|
| **Color Contrast** | PARTIAL | Gray text on white backgrounds |
| **Keyboard Navigation** | PARTIAL | Missing focus traps, inconsistent ESC handling |
| **Screen Reader** | NEEDS WORK | Missing landmarks, labels, and ARIA |
| **Focus Management** | PARTIAL | Focus visible present, but incomplete modal handling |
| **Forms** | NEEDS WORK | Missing error associations, required field indicators |

---

## Critical Findings (Must Fix Before Launch)

### 1. Viewport Zoom Disabled (WCAG 1.4.4 - CRITICAL)

**Location:** `/src/app/layout.tsx` (lines 28-34)

```typescript
export const viewport = {
  // ...
  userScalable: false,  // VIOLATION
};
```

**Issue:** `userScalable: false` prevents users with low vision from zooming the page.

**Impact:** CRITICAL - This violates WCAG 1.4.4 (Resize Text) and is a legal compliance risk.

**Fix:**
```typescript
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,  // Allow up to 500% zoom
  userScalable: true,  // MUST BE TRUE
  themeColor: '#3b82f6',
};
```

---

### 2. Missing Skip Link (WCAG 2.4.1 - CRITICAL)

**Location:** `/src/components/Layout.tsx`, `/src/app/layout.tsx`

**Issue:** No "Skip to main content" link exists. Users navigating via keyboard must tab through the entire sidebar navigation on every page.

**Impact:** CRITICAL - Keyboard and screen reader users cannot bypass repetitive navigation.

**Fix:** Add skip link at the top of the page:

```tsx
// In Layout.tsx or layout.tsx
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:bg-blue-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg"
>
  Skip to main content
</a>

// On main content wrapper
<main id="main-content" className="lg:ml-64 h-full overflow-auto">
```

---

### 3. Forms Missing Programmatic Label Associations (WCAG 1.3.1, 3.3.2 - HIGH)

**Locations:**
- `/src/components/onboarding/steps/CompanyProfileStep.tsx`
- `/src/app/settings/page.tsx`
- `/src/components/AIChat.tsx`

**Issue:** Form inputs have visible labels but lack `htmlFor`/`id` associations.

**Example (CompanyProfileStep.tsx):**
```tsx
// CURRENT - No association
<label className="block text-sm font-medium text-gray-700 mb-1">
  Company Name <span className="text-red-500">*</span>
</label>
<input
  type="text"
  value={companyName}
  onChange={(e) => onUpdate({ companyName: e.target.value })}
/>

// FIXED - Proper association
<label htmlFor="company-name" className="block text-sm font-medium text-gray-700 mb-1">
  Company Name <span className="text-red-500" aria-hidden="true">*</span>
  <span className="sr-only">(required)</span>
</label>
<input
  id="company-name"
  type="text"
  value={companyName}
  onChange={(e) => onUpdate({ companyName: e.target.value })}
  required
  aria-required="true"
/>
```

**Affected forms:** ~15 input fields across onboarding, settings, and AI assistant.

---

### 4. Modal Dialogs Missing Focus Trapping (WCAG 2.4.3 - HIGH)

**Locations:**
- `/src/app/settings/page.tsx` (Invite Modal, Role Modal)
- `/src/components/pages/MarketplaceContent.tsx` (Connection Modal)
- `/src/components/ui/dialog.tsx`

**Issue:** Modal dialogs do not trap focus. Users can tab out of the modal into the background content.

**Current (dialog.tsx):**
```tsx
// Missing: Focus trap, ESC key handler, initial focus management
const Dialog: React.FC<DialogProps> = ({ open, onOpenChange, children }) => {
  // Only handles body scroll, no focus management
```

**Fix:** Implement proper focus trap:
```tsx
import { useEffect, useRef } from 'react';

const Dialog: React.FC<DialogProps> = ({ open, onOpenChange, children }) => {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    // Store previously focused element
    const previouslyFocused = document.activeElement as HTMLElement;

    // Focus first focusable element
    const focusableElements = dialogRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements?.[0] as HTMLElement;
    firstElement?.focus();

    // Handle ESC key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onOpenChange?.(false);
      }
      // Trap focus
      if (e.key === 'Tab' && focusableElements) {
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus();  // Return focus on close
    };
  }, [open, onOpenChange]);

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
    >
      {children}
    </div>
  );
};
```

---

### 5. Missing ARIA Landmarks (WCAG 1.3.1 - MEDIUM)

**Location:** `/src/components/Sidebar.tsx`, `/src/components/Layout.tsx`

**Issue:** The application lacks proper ARIA landmarks for navigation regions.

**Current:**
```tsx
<aside className="fixed top-0 left-0...">  // No role
<nav className="flex-1 overflow-y-auto...">  // OK but needs aria-label
```

**Fix:**
```tsx
<aside
  role="complementary"
  aria-label="Main sidebar"
  className="fixed top-0 left-0..."
>
<nav aria-label="Main navigation" className="flex-1...">
<nav aria-label="Tool navigation" className="space-y-1">  // For tools section
```

---

## Detailed Audit by WCAG Principle

### Perceivable (Principle 1)

#### 1.1.1 Non-text Content (Level A)

| Item | Status | Notes |
|------|--------|-------|
| Logo images | PASS | Alt text present (`/src/components/Sidebar.tsx:91`) |
| Icon buttons | FAIL | Many icon-only buttons lack accessible names |
| Decorative icons | PASS | Used appropriately with no alt text |

**Icon Button Issues:**
- `/src/components/Sidebar.tsx:57-68` - Mobile menu button has no accessible name
- `/src/app/settings/page.tsx:915-920` - Modal close button has no label

**Fix for mobile menu:**
```tsx
<button
  onClick={() => setIsMobileOpen(!isMobileOpen)}
  aria-label={isMobileOpen ? "Close menu" : "Open menu"}
  aria-expanded={isMobileOpen}
  className="lg:hidden fixed top-4 left-4..."
>
```

---

#### 1.3.1 Info and Relationships (Level A)

| Item | Status | Notes |
|------|--------|-------|
| Heading hierarchy | PARTIAL | Some pages skip levels |
| Form labels | FAIL | Missing htmlFor associations |
| Tables | PASS | Data tables have headers |
| Lists | PASS | Proper ul/ol usage |
| ARIA landmarks | FAIL | Missing main, nav labels |

**Heading Issues:**
- Settings page jumps from `<h1>` to `<h3>` in tab content
- Onboarding steps use `<h2>` inside the wizard but no parent `<h1>`

---

#### 1.4.3 Contrast (Minimum) (Level AA)

| Element | Ratio | Required | Status |
|---------|-------|----------|--------|
| `text-gray-500` on white | 4.6:1 | 4.5:1 | PASS (barely) |
| `text-gray-400` on white | 3.0:1 | 4.5:1 | FAIL |
| `text-gray-600` on white | 5.7:1 | 4.5:1 | PASS |
| `text-gray-900` on white | 15.6:1 | 4.5:1 | PASS |
| Blue focus ring (#3b82f6) | 3.1:1 | 3.0:1 | PASS |
| Disabled buttons (gray-300/gray-500) | 2.4:1 | 3.0:1 | FAIL |

**Problematic Locations:**
- `/src/components/onboarding/OnboardingProgress.tsx:69-71` - Step labels use `text-gray-400`
- `/src/app/settings/page.tsx:720-721` - Helper text uses `text-gray-500` (marginal)
- Throughout: Disabled state contrast is insufficient

**Fix:** Replace `text-gray-400` with `text-gray-500` minimum, and disabled states should use `text-gray-600`.

---

#### 1.4.4 Resize Text (Level AA)

| Item | Status | Notes |
|------|--------|-------|
| Text resizing to 200% | FAIL | viewport `userScalable: false` blocks zoom |
| Container overflow | PASS | Content reflows properly |
| No content clipping | PASS | Scrolling available |

---

#### 1.4.11 Non-text Contrast (Level AA)

| Element | Ratio | Status |
|---------|-------|--------|
| Form input borders (gray-300) | 1.5:1 | FAIL |
| Button borders (outline variant) | 1.5:1 | FAIL |
| Focus indicator | 3.1:1 | PASS |

**Fix:** Change input borders from `border-gray-300` to `border-gray-400` (minimum 3:1).

---

### Operable (Principle 2)

#### 2.1.1 Keyboard (Level A)

| Item | Status | Notes |
|------|--------|-------|
| All interactive elements reachable | PARTIAL | Some custom components need tabindex |
| Logical tab order | PASS | Follows DOM order |
| Enter/Space activates buttons | PASS | Native buttons work |
| Custom widgets | FAIL | Role selectors in settings missing keyboard |

**Issue:** Team member role buttons in `/src/app/settings/page.tsx` (lines 876-895) don't have proper keyboard interaction.

---

#### 2.1.2 No Keyboard Trap (Level A)

| Item | Status | Notes |
|------|--------|-------|
| Modal dialogs | FAIL | No focus trap, can escape |
| Mobile sidebar | PARTIAL | Overlay blocks content but focus not trapped |
| Dropdown menus | PASS | Can escape |

---

#### 2.4.1 Bypass Blocks (Level A)

| Item | Status | Notes |
|------|--------|-------|
| Skip link | FAIL | Not implemented |
| Landmarks | FAIL | Missing aria-labels |
| Heading structure | PARTIAL | Could be improved |

---

#### 2.4.7 Focus Visible (Level AA)

| Item | Status | Notes |
|------|--------|-------|
| Global focus style | PASS | `focus-visible` defined in globals.css |
| Custom components | PARTIAL | Some buttons override focus |
| Input fields | PASS | Ring focus visible |

**Good Implementation:**
```css
/* /src/app/globals.css:36-41 */
*:focus-visible {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
  border-radius: 0.25rem;
}
```

---

### Understandable (Principle 3)

#### 3.1.1 Language of Page (Level A)

| Item | Status | Notes |
|------|--------|-------|
| HTML lang attribute | PASS | `<html lang="en">` in layout.tsx |

---

#### 3.2.1 On Focus (Level A)

| Item | Status | Notes |
|------|--------|-------|
| No context change on focus | PASS | No violations found |

---

#### 3.3.1 Error Identification (Level A)

| Item | Status | Notes |
|------|--------|-------|
| Error messages visible | PASS | Red text shown |
| Error linked to input | FAIL | Missing aria-describedby |
| Error announced | FAIL | Missing role="alert" on error messages |

**Example Fix (CompanyProfileStep.tsx):**
```tsx
<input
  id="contact-email"
  type="email"
  aria-invalid={emailTouched && !isValidEmail(contactEmail)}
  aria-describedby={emailTouched && !isValidEmail(contactEmail) ? "email-error" : undefined}
/>
{emailTouched && contactEmail && !isValidEmail(contactEmail) && (
  <p id="email-error" role="alert" className="mt-1 text-xs text-red-600">
    Please enter a valid email
  </p>
)}
```

---

#### 3.3.2 Labels or Instructions (Level A)

| Item | Status | Notes |
|------|--------|-------|
| Visible labels | PASS | All inputs have labels |
| Required field indication | PARTIAL | Red asterisk but no sr-only text |
| Format hints | PARTIAL | Placeholder text only |

**Fix for required fields:**
```tsx
<label htmlFor="company-name">
  Company Name
  <span className="text-red-500" aria-hidden="true">*</span>
  <span className="sr-only">(required)</span>
</label>
```

---

### Robust (Principle 4)

#### 4.1.2 Name, Role, Value (Level A)

| Item | Status | Notes |
|------|--------|-------|
| Native elements | PASS | Proper use |
| Custom toggle switches | FAIL | Missing role and state |
| Modal dialogs | FAIL | Missing role="dialog", aria-modal |
| Progress indicators | PARTIAL | Missing aria-valuenow |

**Toggle Switch Issue (Settings page):**
```tsx
// Current - No accessibility
<label className="relative inline-flex items-center cursor-pointer">
  <input type="checkbox" className="sr-only peer" />
  <div className="w-11 h-6 bg-gray-200..."></div>
</label>

// Fixed - Accessible toggle
<label className="relative inline-flex items-center cursor-pointer">
  <input
    type="checkbox"
    role="switch"
    aria-checked={checked}
    className="sr-only peer"
  />
  <span className="sr-only">Weekly Summary Report</span>
  <div className="w-11 h-6 bg-gray-200..."></div>
</label>
```

---

#### 4.1.3 Status Messages (Level AA)

| Item | Status | Notes |
|------|--------|-------|
| Toast notifications | PASS | Has role="alert" |
| Loading states | FAIL | Not announced |
| Save confirmations | PASS | Via toast |

**Toast Implementation (Good):**
```tsx
// /src/components/ui/Toast.tsx:77-85
<div
  className="..."
  role="alert"  // Correct!
>
```

---

## Accessibility Improvements Already in Place

1. **Reduced Motion Support** (`/src/app/globals.css:27-34`)
   ```css
   @media (prefers-reduced-motion: reduce) {
     * {
       animation-duration: 0.01ms !important;
       animation-iteration-count: 1 !important;
       transition-duration: 0.01ms !important;
       scroll-behavior: auto !important;
     }
   }
   ```

2. **Focus Visible Styles** (`/src/app/globals.css:36-46`)

3. **Toast Notifications with role="alert"** (`/src/components/ui/Toast.tsx`)

4. **Proper HTML lang attribute** (`/src/app/layout.tsx`)

5. **Semantic heading structure in most pages**

6. **Button component with focus-visible** (`/src/components/ui/button.tsx`)

---

## Prioritized Remediation Plan

### Phase 1: Critical (Week 1)

| Issue | File | Effort | Impact |
|-------|------|--------|--------|
| Enable zoom (userScalable) | layout.tsx | 5 min | Legal compliance |
| Add skip link | Layout.tsx | 30 min | Navigation |
| Add form label associations | Multiple | 2 hours | Screen readers |

### Phase 2: High Priority (Week 2)

| Issue | File | Effort | Impact |
|-------|------|--------|--------|
| Modal focus trapping | dialog.tsx, settings | 3 hours | Keyboard users |
| Error message ARIA | CompanyProfileStep.tsx | 1 hour | Screen readers |
| Icon button labels | Sidebar.tsx, settings | 1 hour | Screen readers |
| ARIA landmarks | Layout.tsx, Sidebar.tsx | 1 hour | Navigation |

### Phase 3: Medium Priority (Week 3)

| Issue | File | Effort | Impact |
|-------|------|--------|--------|
| Input border contrast | Multiple | 2 hours | Low vision |
| Toggle switch accessibility | settings/page.tsx | 2 hours | Screen readers |
| Progress indicator ARIA | OnboardingProgress.tsx | 1 hour | Screen readers |
| Heading hierarchy | Multiple | 2 hours | Navigation |

### Phase 4: Enhancement (Week 4)

| Issue | File | Effort | Impact |
|-------|------|--------|--------|
| Loading state announcements | Multiple | 2 hours | Screen readers |
| Disabled button contrast | button.tsx | 30 min | Low vision |
| Keyboard shortcuts documentation | New file | 2 hours | Power users |

---

## Testing Recommendations

### Automated Testing

```bash
# Add to CI/CD pipeline
npm install -D @axe-core/playwright
```

```typescript
// playwright.config.ts
import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('should have no accessibility violations', async ({ page }) => {
  await page.goto('/onboarding');
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(results.violations).toEqual([]);
});
```

### Manual Testing Checklist

- [ ] Navigate entire app using only keyboard
- [ ] Test with VoiceOver (Mac) or NVDA (Windows)
- [ ] Zoom to 400% and verify content reflows
- [ ] Test with Windows High Contrast mode
- [ ] Verify all modals trap focus and close with ESC

### Recommended Tools

1. **axe DevTools** - Browser extension for real-time testing
2. **WAVE** - Visual accessibility checker
3. **Lighthouse** - Built into Chrome DevTools
4. **pa11y** - CLI testing tool

---

## Conclusion

The Varity Dashboard has a reasonable foundation for accessibility but requires targeted remediation to achieve WCAG 2.1 AA compliance. The most critical issues are:

1. **Zoom prevention** - Must be fixed immediately (legal risk)
2. **Skip navigation** - Essential for keyboard users
3. **Form label associations** - Required for screen reader users
4. **Modal focus management** - Keyboard trap is missing

With the prioritized fixes outlined above, the application can reach full compliance within 4 weeks of dedicated effort. The target user base (30-60 year old business owners) is statistically more likely to have visual impairments, making accessibility especially important for this product.

---

**Report Generated:** December 26, 2025
**Next Audit Recommended:** After Phase 2 completion
