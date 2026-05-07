# 2026-05-07 UI Design Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up the global design system, install foundational component UI libraries, and build the shell layouts for the Admin and Public zones of the Appointment Booking app.

**Architecture:** Next.js App Router layout configuration with shadcn/ui and Tailwind CSS. The public zone uses a centered card layout format, while the admin zone uses a split-pane collapsible sidebar approach.

**Tech Stack:** Next.js 16, React, Tailwind CSS, shadcn/ui, next-themes.

---

### Task 1: Setup global styling and theming

**Files:**
- Modify: `client/app/globals.css`
- Modify: `client/tailwind.config.ts` (or `client/tailwind.config.js` depending on project setup)
- Modify: `client/components/theme-provider.tsx`

- [ ] **Step 1: Configure globals.css for Indigo/Slate theme**

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

    /* Indigo 600 */
    --primary: 243 75% 59%;
    --primary-foreground: 210 40% 98%;

    /* Slate 100 */
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;

    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;

    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;

    /* Red 500 */
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;

    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 243 75% 59%;

    --radius: 0.5rem;
  }

  .dark {
    /* Deep Slate /0F172A */
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;

    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;

    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;

    /* Indigo 500 for better dark visibility */
    --primary: 243 75% 66%;
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
    --ring: 243 75% 66%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground antialiased;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add client/app/globals.css
git commit -m "fix(ui): apply global indigo and slate theming"
```

### Task 2: Build Admin Layout Shell

**Files:**
- Create: `client/components/layout/admin-sidebar.tsx`
- Create: `client/components/layout/admin-topbar.tsx`
- Modify: `client/app/admin/layout.tsx`

- [ ] **Step 1: Implement Admin Sidebar**

```tsx
import Link from 'next/link';
import { Home, Calendar, Users, Settings, Briefcase } from 'lucide-react';

export function AdminSidebar() {
  return (
    <aside className="hidden lg:flex w-64 flex-col border-r border-slate-200 bg-white dark:bg-slate-900 h-screen sticky top-0">
      <div className="p-6 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-xl font-bold text-indigo-600 dark:text-indigo-400">BookingApp</h1>
      </div>
      <nav className="flex-1 p-4 space-y-2">
        <Link href="/admin/dashboard" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300">
          <Home className="w-5 h-5" /> Dashboard
        </Link>
        <Link href="/admin/appointments" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300">
          <Calendar className="w-5 h-5" /> Appointments
        </Link>
        <Link href="/admin/organizations" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300">
          <Briefcase className="w-5 h-5" /> Organizations
        </Link>
        <Link href="/admin/users" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300">
          <Users className="w-5 h-5" /> Users
        </Link>
        <Link href="/admin/settings" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300">
          <Settings className="w-5 h-5" /> Settings
        </Link>
      </nav>
    </aside>
  );
}
```

- [ ] **Step 2: Implement Admin Topbar**

```tsx
import { Bell, Search, User } from 'lucide-react';

export function AdminTopbar() {
  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center gap-4 flex-1">
        <div className="relative max-w-md w-full hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search..." 
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent text-sm"
          />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
          <Bell className="w-5 h-5" />
        </button>
        <div className="w-8 h-8 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-medium">
          A
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 3: Wire up Admin Layout**

```tsx
// Edit client/app/admin/layout.tsx
import { AdminSidebar } from '@/components/layout/admin-sidebar';
import { AdminTopbar } from '@/components/layout/admin-topbar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 font-sans">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <AdminTopbar />
        <main className="flex-1 p-6 lg:p-8 overflow-auto">
          <div className="mx-auto max-w-6xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add client/components/layout/admin-sidebar.tsx client/components/layout/admin-topbar.tsx client/app/admin/layout.tsx
git commit -m "feat(ui): implement admin sidebar and topbar layout shell"
```

### Task 3: Build Public Booking Shell Layout

**Files:**
- Create: `client/app/book/layout.tsx`

- [ ] **Step 1: Implement Booking Layout**

```tsx
export default function BookingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8 font-sans flex items-start justify-center">
      <div className="w-full max-w-3xl bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        {/* Placeholder for Dynamic Header based on Organization Info */}
        <div className="h-4 bg-indigo-600 w-full" />
        <div className="p-6 sm:p-8">
           {children}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/app/book/layout.tsx
git commit -m "feat(ui): implement public centered booking layout shell"
```
