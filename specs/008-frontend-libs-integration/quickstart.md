# Quickstart: Frontend Libraries Integration

**Feature**: 008-frontend-libs-integration
**Last Updated**: 2026-01-03

## Overview

This guide provides step-by-step instructions for integrating shadcn/ui, Zod, and Zustand into the membran.app frontend. Follow these steps in order for a smooth integration.

---

## Prerequisites

Before starting, ensure you have:

1. **Existing Setup** (already configured):
   - React 18 with Vite
   - Tailwind CSS installed and configured
   - TypeScript strict mode enabled
   - TanStack Router configured

2. **Verify Tailwind Configuration**:
   ```bash
   # Check if tailwind.config.ts exists in apps/web/
   ls apps/web/tailwind.config.ts
   ```

---

## Step 1: Install Dependencies

### 1.1 Install shadcn/ui CLI and Core Dependencies

```bash
cd apps/web

# Install shadcn/ui CLI (global)
bun add -D @shadcn-ui/cli

# Install required peer dependencies (if not already installed)
bun add class-variance-authority clsx tailwind-merge
```

### 1.2 Install Zod

```bash
# From repo root (affects packages/shared)
bun add zod
```

### 1.3 Install Zustand

```bash
# From apps/web
bun add zustand
```

### 1.4 Install Optional DevTools Dependencies

```bash
# React Hook Form (for form validation - optional but recommended)
bun add react-hook-form @hookform/resolvers

# Dev middleware for Zustand (development only)
bun add -D zustand-middleware-devtools
```

---

## Step 2: Configure shadcn/ui

### 2.1 Initialize shadcn/ui

```bash
cd apps/web
npx shadcn-ui@latest init
```

**Interactive Prompts**:
```
Would you like to use TypeScript? yes
Which style would you like to use? › Default
Which color would you like to use as base color? › Slate
Where is your global CSS file? › src/styles/globals.css
Would you like to use CSS variables for colors? › yes
Where is your tailwind.config.js located? › tailwind.config.ts
Configure the import alias for components: › @/components
Configure the import alias for utils: › @/lib
Are you using React Server Components? › no
```

### 2.2 Install Core Components (P1 - MVP)

```bash
# Form components
npx shadcn-ui@latest add button
npx shadcn-ui@latest add input
npx shadcn-ui@latest add label
npx shadcn-ui@latest add card

# Modal components
npx shadcn-ui@latest add dialog

# Form structure components
npx shadcn-ui@latest add form
npx shadcn-ui@latest add form-field
npx shadcn-ui@latest add form-item
npx shadcn-ui@latest add form-message
```

### 2.3 Verify Installation

```bash
# Check component files exist
ls src/components/ui/button.tsx
ls src/components/ui/input.tsx
ls src/components/ui/card.tsx
```

---

## Step 3: Configure Zod

### 3.1 Create Schema Directory Structure

```bash
# Create shared schemas directory
mkdir -p packages/shared/src/schemas
```

### 3.2 Create Base Schemas

Create `packages/shared/src/schemas/auth.ts`:

```typescript
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters' }),
});

export type LoginInput = z.infer<typeof loginSchema>;
```

Create `packages/shared/src/schemas/index.ts`:

```typescript
export * from './auth';
// Add more exports as schemas are created
```

### 3.3 Verify TypeScript Inference

```bash
# Build packages to verify type inference works
cd packages/shared
bun run build
```

---

## Step 4: Configure Zustand

### 4.1 Create Store Directory

```bash
mkdir -p apps/web/src/stores
```

### 4.2 Create Auth Store

Create `apps/web/src/stores/auth.ts`:

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  username: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      logout: () => set({ user: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-storage',
    }
  )
);
```

### 4.3 Create UI Store (for theme, sidebar state)

Create `apps/web/src/stores/ui.ts`:

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'system';

interface UIState {
  theme: Theme;
  sidebarOpen: boolean;
  setTheme: (theme: Theme) => void;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: 'system',
      sidebarOpen: true,
      setTheme: (theme) => set({ theme }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
    }),
    {
      name: 'ui-storage',
    }
  )
);
```

---

## Step 5: Update Tailwind Configuration

### 5.1 Configure Tailwind for shadcn/ui

Update `apps/web/tailwind.config.ts`:

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/app/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
```

### 5.2 Update Global CSS

Update or verify `apps/web/src/styles/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 212.7 26.8% 83.9%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

---

## Step 6: Create Utility Functions

### 6.1 Create cn Utility (className merge)

Create `apps/web/src/lib/cn.ts`:

```typescript
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

---

## Step 7: Testing Integration

### 7.1 Test Component Rendering

Create test file `apps/web/tests/e2e/components.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test('Button component renders correctly', async ({ page }) => {
  await page.goto('/test');
  const button = page.locator('button:has-text("Click me")');
  await expect(button).toBeVisible();
  await button.click();
  await expect(button).toHaveAttribute('data-state', 'active');
});

test('Input component handles keyboard navigation', async ({ page }) => {
  await page.goto('/test');
  const input = page.locator('input[type="email"]');
  await input.focus();
  await input.fill('test@example.com');
  await expect(input).toHaveValue('test@example.com');
});
```

### 7.2 Run Tests

```bash
# Run E2E tests
cd apps/web
bunx playwright test
```

---

## Step 8: Verify Build and Bundle Size

### 8.1 Build Application

```bash
cd apps/web
bun run build
```

### 8.2 Check Build Output

```bash
# Verify build time is <10s (target from spec)
# Build output will show total time

# Check bundle size
# Look for .gzipped file sizes in dist/
```

---

## Step 9: Usage Examples

### 9.1 Use shadcn Components

```tsx
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

export function MyPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Example Page</CardTitle>
      </CardHeader>
      <CardContent>
        <Input type="email" placeholder="Enter email" />
        <Button>Submit</Button>
      </CardContent>
    </Card>
  );
}
```

### 9.2 Use Zod Validation

```tsx
import { loginSchema } from '@membran-app/shared/schemas';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

export function LoginForm() {
  const form = useForm({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = (data) => {
    // data is typed as LoginInput
    console.log(data);
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <Input {...form.register('email')} />
      {form.formState.errors.email && (
        <span>{form.formState.errors.email.message}</span>
      )}
      <Button type="submit">Login</Button>
    </form>
  );
}
```

### 9.3 Use Zustand Store

```tsx
import { useAuthStore } from '@/stores/auth';

export function UserProfile() {
  const { user, logout } = useAuthStore();

  if (!user) {
    return <div>Please log in</div>;
  }

  return (
    <div>
      <p>Welcome, {user.username}</p>
      <Button onClick={logout}>Logout</Button>
    </div>
  );
}
```

---

## Troubleshooting

### Issue: shadcn components don't render correctly

**Solution**: Verify Tailwind CSS is properly configured and `globals.css` is imported in your main entry file.

### Issue: TypeScript errors with Zod inference

**Solution**: Ensure TypeScript strict mode is enabled. Run `bun run build` to verify type checking.

### Issue: Zustand state doesn't persist

**Solution**: Verify localStorage is available (not in private browsing mode). Check browser console for quota errors.

### Issue: Bundle size exceeds 100KB target

**Solution**: Run `bunx vite-bundle-visualizer` to analyze bundle. Import components individually rather than barrel exports.

---

## Next Steps

After completing this quickstart:

1. ✅ Verify all components render correctly
2. ✅ Run E2E tests for accessibility
3. ✅ Test theme switching (light/dark mode)
4. ✅ Verify form validation with Zod schemas
5. ✅ Test state persistence across page refreshes
6. ✅ Update CLAUDE.md with new library information
7. ✅ Begin using libraries in feature implementations

---

## Resources

- **shadcn/ui Docs**: [https://ui.shadcn.com](https://ui.shadcn.com)
- **Zod Docs**: [https://zod.dev](https://zod.dev)
- **Zustand Docs**: [https://zustand.docs.pmnd.rs](https://zustand.docs.pmnd.rs)
- **Radix UI Docs**: [https://www.radix-ui.com](https://www.radix-ui.com)
