# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (React 19) |
| Styling | Tailwind CSS 4 |
| Database | Firebase (Firestore) |
| Language | TypeScript (strict mode enabled) |
| Spreadsheet | xlsx library |
| Icons | Lucide React |
| Charts | Chart.js + react-chartjs-2 |
| Animations | Framer Motion |
| State/Cache | TanStack Query (React Query) |
| Compiler | React Compiler (babel-plugin-react-compiler) |
| Linting | ESLint (nextjs + typescript configs) |

## Commands

```bash
npm run dev      # Start Next.js dev server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

Note: No test framework is currently configured. Tests should use `console.log` debugging or manual verification.

## Terminal Heads-Up

- Shell is `cmd.exe` only; do not use PowerShell cmdlets (for example `Get-Content`, `Select-String`)
- Always use absolute paths and quote paths that contain spaces
- Prefer this stable command set first: `dir`, `type`, `git`, `npm`, `node`
- If a command fails once due to shell incompatibility, switch immediately to a `cmd`-safe fallback instead of probing multiple variants
- If available, `rg` may be used for fast search; if not available, continue with `dir`/`type` patterns

## Code Style Guidelines

### TypeScript Conventions

- **Strict mode enabled** - No implicit any, strict null checks enforced
- **Explicit return types** for public functions and exported APIs
- **Interface over type** for object shapes; use `type` for unions/primitives
- **Union types** for status fields: `"active" | "inactive" | "archived"`
- **Firestore Timestamp** - Accept `Date | Timestamp` in interfaces; convert to `Date` before storing

```typescript
// Good - union type for status
export interface Section {
  status: "active" | "inactive" | "archived";
}

// Good - Date | Timestamp for compatibility
createdAt: Date | Timestamp;

// Good - explicit return type
export async function getUserProfile(uid: string): Promise<UserData | null>
```

### File Naming & Structure

- Components: PascalCase (`SecretaryCard.tsx`)
- Utilities/hooks: camelCase (`useRequireRole.tsx`)
- API routes: `route.ts` in folder (`/api/create-secretary/route.ts`)
- Barrel exports: `index.ts` in each component folder
- Path alias: `@/` maps to `src/`

### Import Order

```typescript
// 1. React/core (alphabetical)
import { useState, useEffect } from "react";

// 2. Third-party libraries
import * as XLSX from "xlsx";

// 3. Internal imports - absolute paths
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { PopupAlert } from "@/components/ui";

// 4. Relative imports
import { StudentPreviewTable } from "./StudentPreviewTable";
```

### React Component Patterns

- Client components: `"use client"` directive at top
- Destructure all props in function signature
- Use named exports for components (not default export)

```typescript
"use client";

interface SecretaryCardProps {
  secretaryName: string;
  status: "active" | "removed";
  onRemove?: () => void;
}

export default function SecretaryCard({
  secretaryName,
  status,
  onRemove,
}: SecretaryCardProps) {
  // component code
}
```

### Error Handling

- Use try/catch with specific error logging
- API routes: Return `NextResponse.json` with appropriate status codes
- Client-side: Use state-based alerts (`PopupAlert` component)
- Never expose internal error details to client in production

```typescript
// API route error pattern
try {
  await doSomething();
} catch (error) {
  console.error("Error doing something:", error);
  return NextResponse.json(
    { error: "User-friendly error message" },
    { status: 500 }
  );
}

// Client-side error pattern
const [error, setError] = useState<string | null>(null);
if (error) {
  return <PopupAlert message={error} type="error" onClose={() => setError(null)} />;
}
```

### Firestore Patterns

- **Document ID = LRN** for students: `sections/{sectionId}/students/{lrn}`
- **Atomic updates**: Always use `writeBatch` for multi-document operations
- **TanStack Query for fetching/caching**: Use `useQuery` for all data fetching
- **Cache invalidation**: Use `queryClient.invalidateQueries()` after mutations
- **Real-time updates**: Use `onSnapshot` with unsubscribe function (for live data)

```typescript
// TanStack Query pattern - fetching AND caching handled automatically
const { data: sections = [], isLoading, error } = useQuery({
  queryKey: ['sections', user?.uid],
  queryFn: () => getTeacherSections(user?.uid || ''),
  enabled: !!user?.uid,
  staleTime: 2 * 60 * 1000,  // 2 minutes
  gcTime: 5 * 60 * 1000,     // 5 minutes
});

// After mutation - invalidate to trigger refetch
const queryClient = useQueryClient();
await deleteSection(sectionId, user?.uid || '');
queryClient.invalidateQueries({ queryKey: ['sections', user?.uid] });

// Atomic batch update (still use for multi-document writes)
const batch = writeBatch(db);
batch.set(studentRef, studentData);
batch.update(sectionRef, { studentCount: increment(1) });
await batch.commit();
queryClient.invalidateQueries({ queryKey: ['students', user?.uid] });
```

### TanStack Query Patterns

**Benefits:**
- Automatic caching with configurable TTL (staleTime, gcTime)
- Query deduplication (multiple components = single fetch)
- Background refetch on window focus
- Built-in loading/error states
- Easy cache invalidation after mutations

**Query Key Conventions:**
```typescript
// List queries
queryKey: ['sections', uid]
queryKey: ['students', uid]
queryKey: ['appointments', uid]

// Single item queries
queryKey: ['section', sectionId]
queryKey: ['userProfile', uid]

// Conditional queries (use enabled flag)
queryKey: ['section', selectedSectionId],
enabled: !!selectedSectionId,
```

**After Mutations:**
```typescript
const queryClient = useQueryClient();

// Create
await createSection(...);
queryClient.invalidateQueries({ queryKey: ['sections', uid] });

// Update
await updateStudent(...);
queryClient.invalidateQueries({ queryKey: ['students', uid] });

// Delete
await deleteSection(...);
queryClient.invalidateQueries({ queryKey: ['sections', uid] });
```

### Diagnostic Firestore Logging

For debugging TanStack Query cache behavior, all Firestore fetch functions include diagnostic logs:

```typescript
console.log("🔥 FIRESTORE | [ComponentName] | [Method] | [Collection/Doc Path]")
```

**Rules:**
- **For `getDocs` / `getDoc`** — log placed before the `await` call
- **For `onSnapshot`** — log placed inside the callback (fires on every update)
- **For custom hooks** — log inside the hook, not the component that calls it
- Replace `[ComponentName]` with the actual file or component name
- Replace `[Method]` with `getDocs`, `getDoc`, or `onSnapshot`
- Replace `[Collection/Doc Path]` with the actual Firestore path being queried

**Usage:**
When navigating between pages, watch the console:
- **No log appears** = TanStack Query served from cache correctly
- **Log appears on revisited page** = Potential `staleTime` or `queryKey` issue to investigate

**Example:**
```typescript
export async function getTeacherSections(teacherId: string): Promise<Section[]> {
  const sectionsRef = collection(db, "sections");
  const q = query(sectionsRef, where("teacherId", "==", teacherId));
  console.log("🔥 FIRESTORE | [firestore.ts] | [getDocs] | [sections] (teacherId filter)");
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Section));
}
```

Note: The old `getCachedData`/`setCachedData` functions in `firestore.ts` are now no-op shims. TanStack Query owns all caching. The shims exist only to preserve call signatures while the migration completes.

### CSS/Tailwind

- Use Tailwind utility classes primarily
- Inline styles only for dynamic values from props/state
- Color values: Use hex codes matching design system (`#6C5CE7`, `#1F1F1F`)
- Responsive: `lg:` and `md:` prefixes for larger screens
- Icons: Use Lucide React components (`import { IconName } from "lucide-react"`)

### Security Rules

- Teachers can only access their own sections (filtered by `teacherId`)
- Secretaries can only open shared attendance for sections they are appointed to
- Users can only access their own profile in `/users/{uid}`
- Secretaries can create `attendance`, `attendanceRecords`, and `studentSummaries` documents
- Teachers can update `studentSummaries` (for override corrections)
- Teachers and secretaries can both update `attendance` while the session is open; only teachers can override after lock
- Never expose Firebase Admin SDK to client code

## Routes

```
/                                    # Landing / redirect
/login                               # Auth login
/register                            # Auth registration
/dashboard                           # Role-based redirect
/dashboard/teacher                   # Teacher layout
/dashboard/teacher/dashboard         # Teacher home
/dashboard/teacher/sections          # Sections CRUD
/dashboard/teacher/students          # Students CRUD
/dashboard/teacher/secretaries       # Secretary management
/dashboard/teacher/attendance        # Attendance analytics (ClassAnalytics, MonthlyTrendChart, StudentSummaryCard)
/dashboard/teacher/reports           # Reports & exports
/dashboard/teacher/settings          # Teacher settings
/dashboard/secretary                 # Secretary layout
/dashboard/secretary/dashboard       # Secretary home
/dashboard/secretary/attendance      # Take attendance
/dashboard/secretary/history         # Attendance history (paginated)
/dashboard/secretary/profile         # Secretary profile
/api/register-teacher                # Server-side teacher registration
/api/create-secretary                # Server-side secretary account creation
```

## Firestore Structure (Final — Optimized)

Three-layer attendance design: session header (map for live view), flat records (audit log),
and pre-computed summaries (analytics). All three are written atomically in one `writeBatch()`
on every session submit.

### Document ID Conventions

All human-readable document IDs follow these construction rules:

| ID Type | Pattern | Example |
|---------|---------|---------|
| `sectionSlug` | `{gradeLevel}-{sectionName}` | `"G10-Rizal"`, `"G10-Jose-Rizal"` |
| `attendanceId` | `{date}_{sectionSlug}` | `"2026-04-01_G10-Rizal"` |
| `attendanceRecordId` | `{date}_{sectionSlug}_{studentLrn}` | `"2026-03-26_G10-Rizal_129584150009"` |
| `studentSummaryId` | `{sectionSlug}_{lastName}_{lrn}_{schoolYear}` | `"G10-Rizal_ALBANI_129584150009_2025-2026"` |

**Construction in code:**

```typescript
const sectionSlug  = `${gradeLevel}-${sectionName.replace(/\s+/g, '-')}`
const attendanceId = `${date}_${sectionSlug}`
const recordId     = `${date}_${sectionSlug}_${studentLrn}`
const summaryId    = `${sectionSlug}_${lastName.toUpperCase().replace(/\s+/g, '-')}_${lrn}_${schoolYear}`
```

**Uniqueness guarantees:**
- **attendance**: `date + sectionSlug` guarantees one shared session per section per day
- **attendanceRecords**: `date + sectionSlug + studentLrn` is unique per student per day
- **studentSummaries**: `sectionSlug + lastName + lrn + schoolYear` is unique per student per year

---

### Existing Collections (Unchanged)

```
users/{uid}
  role: "teacher" | "secretary"
  displayName: string
  email: string                        # fake email e.g. juan.dela.cruz@app.local
  lrn: string                          # secretaries only
  createdAt: Timestamp

sections/{id}                          # id is Firestore auto-generated
  sectionName: string
  gradeLevel: string
  schoolYear: string
  teacherId: string                    # → users/{uid}
  status: "active" | "inactive" | "archived"
  studentCount: number
  createdAt: Timestamp

  subcollection: students/{lrn}        # document ID = LRN
    lrn: string
    lastName: string
    firstName: string
    middleName: string
    sex: "male" | "female" | ""
    birthDate: Timestamp
    religion: string
    barangay: string
    city: string
    province: string
    fatherName: string
    motherMaidenName: string
    guardianName: string
    guardianRelationship: string
    guardianContactNumber: string
    learningModality: string
    studentStatus: "active" | "inactive" | "graduated" | "dropped"
    createdAt: Timestamp

appointments/{id}                      # id is Firestore auto-generated
  secretaryUid: string                 # → users/{uid}
  secretaryLrn: string                 # → sections/{id}/students/{lrn}
  teacherId: string                    # → users/{uid}
  sectionId: string                    # → sections/{id}
  schoolYear: string
  status: "active" | "removed"
  appointedAt: Timestamp
```

---

### Attendance Layer (3 Collections)

**1. attendance/{date}_{sectionSlug}**

```typescript
// e.g. attendance/2026-04-01_G10-Rizal
// 1 shared document per section per day — session header

{
  sectionId: string                    // → sections/{id}
  teacherId: string                    # → users/{uid}
  secretaryUid?: string                # optional metadata for secretary-started sessions
  secretaryLrn?: string                # optional metadata for secretary-started sessions
  date: string                         // "YYYY-MM-DD"
  schoolYear: string
  status: "open" | "locked"            // locked = no more edits allowed
  records: map {                       // keyed by LRN — secretary live view only
    [lrn]: {
      studentName: string
      status: "present" | "late" | "absent" | "excused"
      remarks: string
      timeRecorded: Timestamp
      recordedByUid: string
      updatedAt?: Timestamp            // set when teacher overrides
      updatedByTeacherId?: string
      updatedByTeacherName?: string
    }
  }
  createdAt: Timestamp
  lockedAt?: Timestamp
  createdByUid: string
  createdByRole: "teacher" | "secretary"
  submittedByUid?: string
  submittedByRole?: "teacher" | "secretary"
}
```

**PURPOSE:** 1 read loads the full class list for the secretary's active view and for the teacher viewing a specific day's attendance. `records` map is for display only — never use for analytics or reports. Check `status` field before allowing edits — locked sessions are read-only. Teachers may create the session before any secretary is appointed; secretaries later join the same section-day document.

---

**2. attendanceRecords/{date}_{sectionSlug}_{studentLrn}**

```typescript
// e.g. attendanceRecords/2026-03-26_G10-Rizal_129584150009
// 1 document per student per session — flat audit log

{
  attendanceId: string                 // → attendance/{id} — links back to session
  teacherId: string                    // denormalized — self-contained for audit queries
  lrn: string
  sectionId: string
  date: string                         // "YYYY-MM-DD"
  schoolYear: string
  status: "present" | "late" | "absent" | "excused"
  remarks?: string
  timeRecorded: Timestamp
  recordedByUid: string
  updatedAt?: Timestamp                // set when teacher overrides
  updatedByTeacherId?: string
  updatedByTeacherName?: string
}
```

**PURPOSE:** Raw source of truth for audits, report exports, and summary recomputation. `teacherId` is denormalized here so audit/export queries are self-contained — no extra read needed to identify which teacher owns the record. Never query this collection for the analytics page — use `studentSummaries` instead.

---

**3. studentSummaries/{sectionSlug}_{lastName}_{lrn}_{schoolYear}**

```typescript
// e.g. studentSummaries/G10-Rizal_ALBANI_129584150009_2025-2026
// e.g. studentSummaries/G10-Rizal_DELA-CRUZ_129584150009_2025-2026
// 1 document per student per section per school year — pre-computed analytics

{
  lrn: string
  sectionId: string
  schoolYear: string
  totalDays: number                    // increments every session
  present: number                      // running total
  late: number                         // running total
  absent: number                       // running total
  excused?: number                     // running total
  trend: map {                         // monthly breakdown keyed by "YYYY-MM"
    "YYYY-MM": { present: number, late: number, absent: number, excused?: number }
  }
}
```

**PURPOSE:** Powers all analytics. 1 read per student instead of 110. Document ID is always deterministic — always a direct lookup, never a query. Always updated in the same `writeBatch()` as the session — never out of sync.

---

### Which Collection Serves Which View

| Use Case | Collection | Reads |
|----------|------------|-------|
| "Show today's attendance" | `attendance/{date}_{sectionSlug}` | 1 read |
| "Show student X's attendance rate" | `studentSummaries/{id}` | 1 read |
| "Show all absences in March" | `attendanceRecords` | query |
| "Export full semester attendance" | `attendanceRecords` | query |
| "Audit / recompute a student summary" | `attendanceRecords` | query |

**`attendanceRecords` is the last-resort collection** — read rarely, only for audits, exports, and summary recomputation. Never read on normal page loads.

---

### Write Flow (Every Session Submit)

Single `writeBatch()` — 101 writes total for 50 students:

1. `attendance/{id}` — set/update records map and lock → **1 write**
2. `attendanceRecords/{id}` — set 1 flat doc per student → **50 writes**
3. `studentSummaries/{id}` — upsert running totals per student → **50 writes**

```typescript
const sectionSlug  = `${gradeLevel}-${sectionName.replace(/\s+/g, '-')}`
const monthKey     = date.slice(0, 7)   // "YYYY-MM"

// Full batch example (submitFullAttendance in firestore.ts):
const batch = writeBatch(db)

// 1. Session header — update records map and lock
const attendanceRef = doc(db, 'attendance', attendanceId)
batch.update(attendanceRef, {
  records: recordsMap,
  status: 'locked',
})

// 2. Flat records + 3. Summaries
students.forEach(student => {
  // 2. attendanceRecords
  const recordId = `${date}_${sectionSlug}_${student.lrn}`
  batch.set(doc(db, 'attendanceRecords', recordId), {
    attendanceId,
    teacherId,                                 // denormalized
    lrn: student.lrn,
    sectionId,
    date,
    schoolYear,
    status: student.status,
    timeRecorded: new Date(),
    recordedByUid: appointment.secretaryUid,
  })

  // 3. studentSummaries — use atomic increment for consistency
  const summaryId = `${sectionSlug}_${student.lastName.toUpperCase().replace(/\s+/g, '-')}_${student.lrn}_${schoolYear}`
  const summaryRef = doc(db, 'studentSummaries', summaryId)
  const monthlyStatusPath = `trend.${monthKey}.${student.status}`

  batch.set(summaryRef, {
    lrn: student.lrn,
    sectionId,
    schoolYear,
    totalDays: increment(1),
    [student.status]: increment(1),
    [monthlyStatusPath]: increment(1),
  }, { merge: true })
})

await batch.commit()
```

---

### Read Strategy Per Page

| Page | Collection | Method | Reads |
|------|------------|--------|-------|
| Secretary attendance view | `attendance/{date}_{sectionSlug}` | `onSnapshot`/`getDoc` (scoped) | 1 read |
| Teacher view specific day | `attendance/{date}_{sectionSlug}` | `getDoc` | 1 read |
| Teacher analytics 1 student | `studentSummaries` | `getDocs` | 1 read |
| Teacher analytics full class | `studentSummaries` | `getDocs` | 50 reads |
| Teacher reports / audit | `attendanceRecords` | `getDocs` | raw query |
| Secretary history (paginated) | `attendance` | section-access query batches + client pagination | 10/page |
| Sections, Students, Settings | various | `getDocs` | stable |

**Use `onSnapshot` ONLY on the active attendance page** — scope it tightly. Use `getDocs` everywhere else. TanStack Query `staleTime: 30 minutes` for analytics pages.

---

### Scaling Estimates

**50 students, 1 section session per day, 110 school days (1 semester):**
- **Writes:** 101 × 110 = 11,110/semester (~101/day)
- **Documents:** 5,500 flat records + 110 headers + 50 summaries = 5,660 total

**At 10 sections simultaneously:**
- **Writes:** ~1,010/day (5% of free tier limit: 20,000/day)
- **Reads:** ~500/day (1% of free tier limit: 50,000/day)

Free tier (Spark plan) is safe up to ~10 active sections simultaneously.

---

### Hard Rules

1. **Never query `attendanceRecords` for analytics** — always use `studentSummaries`
2. **Never use `onSnapshot` outside the active attendance page**
3. **Always write attendance in a single `writeBatch()`** across all 3 collections atomically
4. **Role checks come from Firestore** (`users/{uid}.role`), not Firebase Auth claims
5. **`studentSummaries` document ID is always deterministic** — never auto-generate it
6. **`attendance.records` map is for display only** — not a data source for reports or analytics
7. **Check `attendance.status` before allowing edits** — locked sessions are read-only
8. **`sectionSlug` is always `{gradeLevel}-{sectionName}`** with spaces replaced by hyphens
9. **`lastName` in `studentSummaries` ID is always UPPERCASED** with spaces replaced by hyphens
10. **`attendanceId` is always `{date}_{sectionSlug}`** — never reintroduce subject-based or secretary-based identity
11. **`teacherId` is denormalized on `attendanceRecords`** — always include it on write so audit and export queries are self-contained without joining back to attendance
12. **`submitAttendance` is deprecated** — always use `submitFullAttendance` for new attendance submissions

## Non-Obvious Patterns

### TanStack Query Cache (Replaces Manual Caching)
- All data fetching uses `useQuery` from TanStack Query
- Cache times configured based on data change frequency:
  - **Sections/Appointments**: 30 min (added once per semester)
  - **User Profiles**: 30 min (rarely changes)
  - **Secretary Profiles**: 60 min (almost never changes)
  - **Students**: 10 min (occasional additions/removals)
  - **Section Details**: 15 min (stable info)
  - **Section Students**: 10 min (list changes occasionally)
- Use `queryClient.invalidateQueries()` to refresh after mutations
- Old manual cache functions (`getCachedData`, `setCachedData`) are deprecated no-op shims in `firestore.ts`

### Secretary Creation Flow
1. Teacher selects section and student
2. `SecretaryCreationForm` calls `/api/create-secretary` which creates user in `users/{uid}` with `role: "secretary"`
3. Creates `appointments/{id}` linking secretary to section access
4. Secretary sees all active appointments on their dashboard

### Teacher Attendance Override
- Teachers can override any student's attendance status from locked sessions
- `overrideAttendanceRecord()` in `firestore.ts` updates 3 documents atomically:
  1. `attendance/{id}` — updates the `records.{lrn}` map entry with new status and teacher metadata
  2. `attendanceRecords/{id}` — updates flat record status
  3. `studentSummaries/{id}` — adjusts running totals (decrements old status, increments new status)
- The override tracks: `updatedByTeacherId`, `updatedByTeacherName`, `updatedAt` for audit trail
- Both `attendance` and `attendanceRecords` collections allow teacher updates in `firestore.rules`

### Analytics Functions (in `firestore.ts`)
- `calculateClassAnalytics(summaries)` — returns class-level stats: totalStudents, averageAttendanceRate, perfectAttendance, atRiskStudents
- `aggregateMonthlyTrends(summaries)` — returns month-by-month attendance breakdown from all student summaries
- `calculateAttendanceStats(records)` — returns present/late/absent/excused/total counts from a records map
- `getUserProfilesBatch(uids)` — batch fetches user profiles (batches of 10 due to Firestore `in` query limit)

### Secretary Attendance History
- `getSecretaryAttendanceHistoryPaginated()` uses Firestore `orderBy("date", "desc")` + `limit()` + `startAfter()` for cursor-based pagination
- Returns `{ sessions, lastVisible, hasMore }` for the history page
- Requires composite index: `attendance` collection on `secretaryUid` + `date` (descending)

### Animations

#### Card Hover Animations
- Use Framer Motion `whileHover` for card hover effects (border, shadow, scale)
- **Never combine** `transition-all` or CSS `hover:` classes with Framer Motion animations - this causes flickering
- Let Framer Motion exclusively control hover animations

```typescript
// Good - Framer Motion handles all animations
<motion.div
  className="rounded-xl p-4 relative overflow-hidden"
  style={{ backgroundColor: "#FFFFFF", border: "0.5px solid #E5E7EB" }}
  initial={{ opacity: 0, y: 8 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: index * 0.05, duration: 0.25, ease: "easeOut" }}
  whileHover={{
    borderColor: "#D1D5DB",
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  }}
>
  {/* card content */}
</motion.div>

// Bad - CSS transitions conflict with Framer Motion
<motion.div
  className="rounded-xl p-4 transition-all hover:shadow-md"  // ❌ Causes flicker
  whileHover={{ borderColor: "#D1D5DB" }}
>
```

#### Ghost/Action Cards (Add New Section, Appoint Secretary)
- Use solid background color (`#FFFFFF`) to prevent color shift on hover
- Animate border color, text color, and optional scale with `whileHover`
- Inner circle uses separate `motion.div` with its own `whileHover`

```typescript
<motion.button
  onClick={handleOpenModal}
  className="border-2 border-dashed rounded-xl p-4 min-h-[200px]"
  style={{ backgroundColor: "#FFFFFF", borderColor: "#C9B8D6", color: "#484553" }}
  whileHover={{
    borderColor: "#6C5CE7",
    color: "#6C5CE7",
    scale: 1.02,
  }}
>
  <motion.div
    className="w-12 h-12 rounded-full flex items-center justify-center"
    style={{ backgroundColor: "#f1ecf7" }}
    whileHover={{ backgroundColor: "#D4C4E8", scale: 1.05 }}
  >
    <Plus size={24} />
  </motion.div>
</motion.button>
```

#### Sidebar Active Indicator
- Single `motion.div` positioned absolutely within nav container
- Track active button position using `useRef` and `offsetTop`
- Animate `top` property with spring transition for smooth glide
- Render indicator **after** nav items so it appears on top

```typescript
// In parent component
const [indicatorTop, setIndicatorTop] = useState(0);
const [indicatorOpacity, setIndicatorOpacity] = useState(0);
const navContainerRef = useRef<HTMLDivElement>(null);
const activeButtonRef = useRef<HTMLButtonElement>(null);

useEffect(() => {
  if (activeButtonRef.current && navContainerRef.current) {
    const top = activeButtonRef.current.offsetTop;
    setIndicatorTop(top);
    setIndicatorOpacity(1);
  }
}, [pathname]);

// In nav container
<nav className="flex flex-col relative" ref={navContainerRef}>
  {navItems.map((item) => (
    <NavItem key={item.label} ref={item.ref} {...item} />
  ))}
  {/* Render after items to appear on top */}
  <motion.div
    className="absolute left-0 w-[3px] h-[42px] pointer-events-none"
    style={{ backgroundColor: "#1e3a5f", top: indicatorTop, left: "12px" }}
    animate={{ top: indicatorTop, opacity: indicatorOpacity }}
    transition={{ type: "spring", stiffness: 400, damping: 35 }}
    initial={false}
  />
</nav>

// In NavItem
const buttonRef = useRef<HTMLButtonElement>(null);
useEffect(() => {
  if (active) {
    activeButtonRef.current = buttonRef.current;
  }
}, [active]);

<button ref={buttonRef} className="...">
  {/* no indicator here */}
</button>
```

#### Animation Timing Guidelines
- Card entrance: `duration: 0.25, ease: "easeOut"` with staggered delays
- Hover effects: `duration: 0.15-0.2` or spring `stiffness: 400, damping: 35`
- Sidebar indicator: spring `stiffness: 400, damping: 35` for snappy glide
- Scale on hover: `1.02` for subtle, `1.05` for more noticeable effect

### Theme Context (Dark Mode)
- `ThemeContext.tsx` provides `ThemeProvider` and `useTheme()` hook
- Persists to `localStorage` under key `"theme"`
- Toggles `dark` class on `document.documentElement` for Tailwind dark mode
- Usage: `const { isDark, toggleTheme } = useTheme()`

## Component Structure

```
src/components/
├── AuthGuard.tsx                       # Route protection based on auth + role
├── TeacherHeader.tsx                   # Teacher top nav bar
├── TeacherSidebar.tsx                  # Teacher side navigation (with animated indicator)
├── SecretaryHeader.tsx                 # Secretary top nav bar
├── SecretarySidebar.tsx                # Secretary side navigation (with animated indicator)
├── teacher/
│   ├── index.ts                        # Barrel export (re-exports all subfolders)
│   ├── attendance/
│   │   ├── index.ts
│   │   ├── ClassAnalytics.tsx          # Class-level analytics (from calculateClassAnalytics)
│   │   ├── MonthlyTrendChart.tsx       # Monthly trend chart (Chart.js)
│   │   └── StudentSummaryCard.tsx      # Individual student summary card
│   ├── dashboard/
│   │   └── index.ts                    # (barrel, content in page)
│   ├── secretaries/
│   │   ├── index.ts
│   │   ├── ActiveSecretariesCounter.tsx
│   │   ├── SecretaryCard.tsx
│   │   └── SecretaryCreationForm.tsx
│   ├── secretary-records/
│   │   ├── index.ts
│   │   ├── types.ts                    # Types for secretary daily records
│   │   └── DailyRecordDetailsModal.tsx # Modal showing daily attendance details
│   ├── sections/
│   │   ├── index.ts
│   │   ├── AddStudentModal.tsx
│   │   ├── FileUploadZone.tsx
│   │   ├── ImportModal.tsx
│   │   ├── SectionDetailModal.tsx
│   │   └── StudentPreviewTable.tsx
│   ├── settings/
│   │   └── index.ts                    # (barrel, content in page)
│   └── students/
│       ├── index.ts
│       ├── FilterRow.tsx               # Filter controls for student list
│       ├── SearchBar.tsx               # Search input for students
│       ├── StudentActionsMenu.tsx      # Context menu for student actions
│       ├── StudentDeleteDialog.tsx     # Confirmation dialog for deletion
│       ├── StudentProfileDrawer.tsx    # Slide-out drawer with student profile
│       ├── StudentResultsTable.tsx     # Search results table
│       └── StudentTable.tsx            # Main students table
├── secretary/
│   ├── index.ts                        # Barrel export
│   ├── attendance/
│   │   ├── index.ts
│   │   ├── AttendanceHeader.tsx        # Header with date/appointment info
│   │   ├── BulkAttendanceActions.tsx   # Bulk present/absent/late actions
│   │   └── StudentAttendanceRow.tsx    # Individual student attendance row
│   └── dashboard/
│       └── index.ts                    # (barrel, content in page)
└── ui/
    ├── index.ts                        # Exports: PopupAlert, PageTransition, StaggeredCard
    ├── PopupAlert.tsx                  # Alert/notification component
    ├── PageTransition.tsx              # Page transition wrapper (Framer Motion)
    └── StaggeredCard.tsx              # Staggered card entrance animation
```

## Import Patterns

```typescript
// From barrel exports
import { SecretaryCard, ImportModal } from "@/components/teacher";

// From specific subfolder
import { SecretaryCard } from "@/components/teacher/secretaries";
import { PopupAlert } from "@/components/ui";

// From lib
import { getTeacherSections, Section } from "@/lib/firestore";

// Hooks
import { useRequireRole } from "@/hooks/useRequireRole";

// Contexts
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
```

## Linting

ESLint config uses:
- `eslint-config-next/core-web-vitals` - React/Next.js rules
- `eslint-config-next/typescript` - TypeScript strict rules

Run `npm run lint` before committing. Fix all errors; warnings are acceptable but should be minimized.
