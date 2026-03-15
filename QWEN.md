# Attendance System - Project Context

## Project Overview

This is a **Next.js 16** web application for attendance management. It provides a web-based system for teachers and secretaries to manage class sections, students, and attendance records.

### Tech Stack

- **Framework:** Next.js 16.1.6 (App Router)
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS 4
- **Backend:** Firebase (Authentication + Firestore)
- **React:** 19.2.3 with React Compiler enabled

### Architecture

```
src/
├── app/                 # Next.js App Router pages
│   ├── dashboard/       # Protected dashboard page
│   ├── login/           # Login page
│   ├── register/        # Registration page
│   ├── globals.css      # Global styles
│   ├── layout.tsx       # Root layout with AuthProvider
│   └── page.tsx         # Home (redirects based on auth)
├── components/
│   └── AuthGuard.tsx    # Auth protection wrapper
├── contexts/
│   └── AuthContext.tsx  # Firebase auth context provider
└── lib/
    └── firebase.ts      # Firebase initialization
```

### Key Features

- **Authentication:** Email/password sign-in and registration via Firebase Auth
- **Role-based:** Users can register as "teacher" or "secretary"
- **Protected Routes:** AuthGuard component protects dashboard access
- **Auto-redirect:** Home page redirects authenticated users to dashboard

## Building and Running

### Prerequisites

- Node.js 20+
- npm, yarn, pnpm, or bun

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Production Build

```bash
npm run build
npm run start
```

### Linting

```bash
npm run lint
```

## Development Conventions

### Code Style

- **Strict TypeScript:** `strict: true` in tsconfig.json
- **ESLint:** Uses `eslint-config-next` with TypeScript support
- **Path Aliases:** `@/*` maps to `./src/*`
- **React Compiler:** Enabled for automatic optimizations

### Component Patterns

- All components use `"use client"` directive for client-side interactivity
- Custom hooks follow the `use*` naming convention (e.g., `useAuth`)
- AuthContext provides: `user`, `userProfile`, `loading`, `signIn`, `signUp`, `logout`
- `userProfile` contains role-specific data:
  - **Teacher:** `{ role: "teacher", displayName, email, createdAt, sections?, subjects? }`
  - **Secretary:** `{ role: "secretary", displayName, email, createdAt, assignedSections? }`
- Access user role via: `const { userProfile } = useAuth();` then check `userProfile?.role`

### Responsiveness Rules

**All pages and components must be responsive.** Follow these guidelines:

1. **Mobile-first approach:** Design for mobile screens first, then use `sm:`, `md:`, `lg:`, `xl:` breakpoints for larger screens
2. **Flexible layouts:** Use Tailwind's responsive utilities (`w-full`, `max-w-*`, `flex-col` on mobile, `flex-row` on desktop)
3. **Container constraints:** Use `max-w-*` with `mx-auto` to center content and prevent overly wide layouts on large screens
4. **Touch-friendly:** Ensure buttons and inputs are at least 44px tall for mobile touch targets
5. **Test breakpoints:**
   - Mobile: `< 640px` (default)
   - Small: `≥ 640px` (`sm:`)
   - Medium: `≥ 768px` (`md:`)
   - Large: `≥ 1024px` (`lg:`)
   - Extra Large: `≥ 1280px` (`xl:`)

6. **Responsive text:** Use responsive font sizes (`text-base md:text-lg lg:text-xl`)
7. **Responsive spacing:** Adjust padding/margin for different screen sizes (`p-4 md:p-6 lg:p-8`)

### Firebase Configuration

Firebase is initialized in `src/lib/firebase.ts` with the following services:
- **Authentication:** `auth`
- **Firestore Database:** `db`

### Firestore Security Rules

**Project:** `attendance-record-system-22a8b`

**Rules (copy to Firebase Console → Firestore → Rules):**

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

**What these rules do:**
- **Read:** Any authenticated user can read any user profile in `users/` collection
- **Write:** Users can only write to their own profile document (UID must match document ID)
- **Auto-creates:** The `users` collection is auto-created when the first user registers

**To update rules:**
1. Go to [Firebase Console](https://console.firebase.google.com/project/attendance-record-system-22a8b/firestore/rules)
2. Paste the rules above
3. Click **Publish**

**Troubleshooting write errors:**
- `PERMISSION_DENIED` → Rules not published or user not authenticated
- Ensure user is logged in before writing to Firestore

## Project Structure Details

| Directory | Purpose |
|-----------|---------|
| `src/app` | Next.js App Router pages and layouts |
| `src/components` | Reusable UI components (AuthGuard) |
| `src/contexts` | React Context providers (AuthContext) |
| `src/lib` | Utility libraries and Firebase config |

## Key Files

| File | Description |
|------|-------------|
| `next.config.ts` | Next.js config with React Compiler enabled |
| `tsconfig.json` | TypeScript config with path aliases |
| `eslint.config.mjs` | ESLint config using eslint-config-next |
| `package.json` | Dependencies and scripts |
