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
│   └── dashboard/       # Role-based dashboard (teacher/secretary)
├── components/
│   └── AuthGuard.tsx    # Auth protection wrapper
├── contexts/
│   ├── AuthContext.tsx  # Firebase auth context provider
│   └── ThemeContext.tsx # Dark/light theme toggle
└── lib/
    ├── firebase.ts      # Firebase initialization
    └── firestore.ts     # Firestore utilities
```

### Key Features

- **Authentication:** Email/password sign-in and registration via Firebase Auth
- **Role-based:** Users can register as "teacher" or "secretary"
- **Protected Routes:** AuthGuard component protects dashboard access
- **Auto-redirect:** Home page redirects authenticated users to dashboard
- **Role-Specific Dashboards:**
  - **Teacher Dashboard:** Purple/lilac theme - Manage sections, students, take attendance, view reports, schedule, settings
  - **Secretary Dashboard:** Orange/coral theme - Staff management, student records, reports, schedules, documents, settings
- **Dark Mode:** Toggle on all pages (login, register, dashboard)

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

**Note:** The dev server runs in the background. If configuration files change (`globals.css`, `tailwind.config.ts`, `next.config.ts`, etc.), you may need to restart the dev server for changes to take effect.

**To restart:**
1. Stop the current dev server: Press `Ctrl+C` in the terminal
2. Run: `npm run dev`

**When a restart is needed:**
- Changes to `globals.css` or Tailwind configuration
- Changes to `next.config.ts`
- Changes to context providers (`AuthContext`, `ThemeContext`)
- Hot reload not reflecting recent changes

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
- Custom hooks follow the `use*` naming convention (e.g., `useAuth`, `useTheme`)
- AuthContext provides: `user`, `userProfile`, `loading`, `signIn`, `signUp`, `logout`
- ThemeContext provides: `isDark`, `toggleTheme`
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

### Design System

**Theme:** Modern, clean, and professional with a centered layout approach.

**Color Palette:**
- **Primary (App-wide):** Indigo (`#6366F1`) - used for common elements, buttons, links
- **Teacher Theme:** Lilac purple (`#D2AFFF`) - used for teacher-specific UI, badges, accents
  - Primary: `#D2AFFF` (lilac)
  - Dark: `#A855F7` (purple-500)
  - Light: `#F3E8FF` (purple-100)
- **Secretary Theme:** Coral orange (`#FB7185` / `#F97316`) - used for secretary-specific UI, badges, accents
  - Primary: `#FB7185` (rose-400)
  - Dark: `#F97316` (orange-500)
  - Light: `#FFEDD5` (orange-100)
- **Neutral:** Gray scale (`gray-50` to `gray-900`) - for text, borders, backgrounds
- **Success:** Green (`#16A34A`) - for confirmations, positive actions
- **Error:** Red (`#DC2626`) - for errors, warnings
- **Background:** Subtle gradients (`from-indigo-50 to-purple-100`)

**Layout Principles:**
- **Centered content:** All pages use centered layouts with `min-h-screen flex items-center justify-center`
- **Card-based design:** Content in white cards with subtle shadows (`shadow-lg`, `rounded-xl`)
- **Consistent spacing:** Use Tailwind spacing scale (`p-6`, `gap-4`, `space-y-4`)
- **Modern typography:** Bold headings (`font-bold`), readable body text (`text-gray-600`)

**Component Patterns:**
- **Buttons:** Rounded (`rounded-lg`), with hover effects (`hover:opacity-90`), focus rings (`focus:ring-2`)
- **Inputs:** Border with focus states (`focus:ring-2 focus:ring-indigo-500`), rounded corners
- **Cards:** White background, shadow-lg, rounded-xl, padding-6-or-more
- **Role badges:** Colored badges showing user role (purple for teacher, coral for secretary)

**Teacher vs Secretary Design:**
| Element | Teacher | Secretary |
|---------|---------|-----------|
| Primary color | `purple-500` | `orange-500` |
| Accent color | `#D2AFFF` (lilac) | `#FB7185` (coral) |
| Gradient | `from-purple-500 to-fuchsia-600` | `from-orange-500 to-rose-500` |
| Light gradient | `from-purple-50 via-fuchsia-50 to-pink-50` | `from-orange-50 via-rose-50 to-pink-50` |
| Focus ring | `focus:ring-purple-200` | `focus:ring-orange-200` |
| Badge | `bg-purple-100 text-purple-800` | `bg-orange-100 text-orange-800` |
| Selected card | `bg-purple-50 border-purple-200` | `bg-orange-50 border-orange-200` |

**Dark Mode:**
- Login and Register pages support dark mode toggle
- Toggle button in top-right corner (sun/moon icon)
- Theme preference saved in localStorage
- Dark mode colors:
  - Background: `dark:from-gray-900 dark:via-gray-900 dark:to-gray-900`
  - Card: `dark:bg-gray-800 dark:border-gray-700`
  - Text: `dark:text-white` (headings), `dark:text-gray-400` (secondary)
  - Inputs: `dark:bg-gray-700 dark:border-gray-600 dark:text-white`
  - Labels: `dark:text-gray-300`
  - Error: `dark:bg-red-900/30 dark:border-red-800 dark:text-red-300`

**Dashboard Design:**
- Single dashboard page (`/dashboard`) with role-based content
- Teacher sees purple/lilac themed cards and icons
- Secretary sees orange/coral themed cards and icons
- Theme toggle in top-right corner (same as login/register)
- Responsive grid layout (1 col mobile, 2 cols tablet, 3 cols desktop)
- Cards include: icon, title, description, action button
- Teacher cards: Sections, Students, Take Attendance, Reports, Schedule, Settings
- Secretary cards: Staff Management, Student Records, Reports, Schedules, Documents, Settings

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
