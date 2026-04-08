# Secretary PWA Offline Attendance Plan

## Goal

Enable secretaries to reliably take attendance even without internet, then sync to Firestore automatically when connectivity returns, with minimal manual steps.

## Product Intent

- Secretary workflow should remain usable during intermittent or zero connectivity.
- Attendance actions made offline must be preserved locally and synced later.
- Sync should feel seamless, with clear status and conflict handling.
- Offline support should prioritize secretary pages first (not full app offline).

## Confirmed Clarifications

1. Phase 1 offline support is **secretary routes only**.
2. Conflict handling is **Needs review** only (no secretary-initiated teacher-override request UI in Phase 1).
3. Login remains online-only in Phase 1; once logged in, secretary can continue using cached/offline-capable routes.
4. If a teacher already created an open session for the same section/day, secretary should continue that shared session (this is not a conflict).
5. Local offline queue retention target is the **entire school year** (preferred over short TTL).
6. Retention boundary follows each queued item's `schoolYear` from section context (not a single global active school-year switch).
7. Service worker caching scope is strict in Phase 1: app shell + secretary dashboard routes only; all other routes remain network-first/no offline document fallback.

## Proposed Scope (Phase 1)

### Offline-capable routes (secretary only)

- `/dashboard/secretary/attendance`
- `/dashboard/secretary/history` (read-only cached view of previously fetched data)
- `/dashboard/secretary/dashboard` (basic cached shell and status)

### Online-only routes in Phase 1

- Authentication flows (`/login`, `/register`)
- Teacher pages
- API routes that require fresh server execution

## Architecture Direction

## 1) PWA Foundation

- Add a web app manifest and install metadata.
- Register a service worker using `@serwist/next` (`withSerwist`) and a custom worker file.
- Use InjectManifest-style setup (`swSrc` + `swDest`) with explicit runtime rules for secretary routes only.
- In `next.config.ts`, set:
  - `disable: process.env.NODE_ENV === "development"` (avoid dev cache issues)
  - `reloadOnOnline: false` (avoid forced reload that could interrupt unsynced attendance work)
- Cache strategy:
  - **App shell/static assets**: cache-first
  - **Secretary page document/data requests**: network-first with offline fallback
  - **Non-secretary pages**: keep current behavior (no heavy offline caching)
- Ensure installability and standalone launch on mobile.

### Cache Scope Rules (Phase 1 - Strict)

- Cache only:
  - static app shell assets (`/_next/static/*`, CSS/JS bundles, icons, manifest)
  - secretary dashboard route documents/fallbacks:
    - `/dashboard/secretary/dashboard`
    - `/dashboard/secretary/attendance`
    - `/dashboard/secretary/history`
- Do **not** cache broad document navigations.
- Teacher routes and non-secretary routes must fall through to network.
- Any expansion to broader offline navigation is deferred to Phase 2.

## 2) Offline Data Strategy

- Enable Firestore local persistence for client reads where possible.
- Add an explicit local queue (IndexedDB) for write operations initiated by secretary attendance actions.
- Queue item shape should include:
  - deterministic operation id
  - attendance/session identifiers (`attendanceId`, `sectionId`, `date`)
  - payload snapshot (records map and metadata)
  - created timestamp
  - retry count + last error
  - status (`pending` | `syncing` | `synced` | `failed`)

Rationale: explicit queue gives deterministic retry, better UX visibility, and safer conflict handling than relying on implicit SDK behavior alone.

## 3) Sync Engine

- Build a client-side sync manager for secretary attendance operations.
- Triggers:
  - browser `online` event
  - app foreground/resume
  - periodic retry while online
  - manual "Sync now" action
- Behavior:
  - process queue in FIFO order per section/date session
  - use idempotent writes keyed by deterministic IDs (already aligned with your ID rules)
  - exponential backoff for transient failures
  - stop/retry policy for permission/validation failures

## 4) Conflict & Lock Handling

- Before pushing queued updates, fetch latest `attendance/{date}_{sectionSlug}` status.
- If session exists and is `open`, secretary sync should merge into that same shared session (no conflict by default).
- If teacher already submitted and `status === "locked"`, discard secretary queued writes for that session/day, prompt the secretary, and refresh to the teacher-recorded final attendance.
- If remote record has newer teacher override metadata (`updatedAt`, `updatedByTeacherId`), treat local stale operation as conflict.
- On conflict, refresh secretary UI to the latest recorded attendance for that section/day so the user sees current truth immediately.
- Provide conflict states in UI:
  - "Synced"
  - "Pending sync"
  - "Needs review" (conflict)

## 5) Secretary UX Requirements

- Always-visible connection indicator: `Online`, `Offline`, `Syncing`, `Sync error`.
- Per-session sync badge in attendance header.
- Non-blocking toast/alert when queue is saved offline.
- Manual retry button for failed operations.
- Offline fallback page for uncached routes: short guidance and quick links to cached secretary pages.

## 6) Data Safety Rules

- Never discard unsynced queue items unless explicitly resolved or synced.
- Keep queue entries encrypted-at-rest only if required by policy (future enhancement).
- Store only attendance-minimum payload; avoid unnecessary PII duplication.
- Persist `schoolYear` on every queue item and retain queue history for that entire year.
- At sync-time and app-start, run cleanup only for items whose `schoolYear` is older than current section context.
- Add bounded storage safeguards (size cap + oldest-synced-first cleanup) to avoid device storage pressure.
- Recommended initial local queue cap: **50 MB per device/user namespace**; if exceeded, block new offline enqueues and prompt secretary to reconnect/sync.

## Edge Cases and Pre-Decisions

- **Teacher lock while secretary offline**
  - Final rule: if teacher has already submitted/locked that day, secretary queue for that session/day is discarded.
  - UX: prompt + auto-refresh to latest server truth.

- **Teacher override vs secretary replay race**
  - Rule: replay is never blind-write.
  - Before each queued write, fetch latest attendance/record metadata; if teacher override is newer or session is locked, skip local replay and mark `Needs review`.

- **Queue storage pressure**
  - Expected footprint is typically low MBs, but can grow with long offline periods.
  - Rule: cap at 50 MB; keep unsynced items, prune oldest synced items first, then surface blocking warning if still over cap.

- **Account switching on shared devices**
  - Rule: queue is namespaced by `uid` (and schema version).
  - On logout/login switch, only current `uid` queue is visible/replayable.

- **Multi-tab duplicate sync**
  - Rule: one active sync worker per `uid` using an IndexedDB lease lock to prevent duplicate replays.

- **Auth/permission failures on reconnect**
  - Rule: classify as non-transient (`failed_auth`/`failed_permission`), pause retries for those items, prompt secretary to re-authenticate.

- **Partial replay success**
  - Rule: maintain per-item status and session aggregate progress (`x/y synced`) with retry for failed-transient items only.

## Libraries Needed

### Required

- `idb`
  - Purpose: typed IndexedDB wrapper for local offline queue storage.
  - Why: simpler and safer than raw IndexedDB APIs for queue CRUD and schema upgrades.

- `@serwist/next`
  - Purpose: Next.js integration layer for service worker build/injection.
  - Why: currently aligned with Next.js PWA guidance and keeps SW integration cleaner than manual raw Workbox wiring.

- `serwist` (dev dependency)
  - Purpose: service worker runtime/caching APIs used by the custom worker.
  - Why: maintained Workbox-compatible stack with explicit worker control.

### Optional (Phase 1.5 / Phase 2)

- None for Phase 1.
- Keep app-level queue replay as the primary sync mechanism (do not rely on browser Background Sync API in Phase 1).

### Not Needed for Phase 1

- `next-pwa`
  - We are using `@serwist/next` instead.

- Raw `workbox-*` packages (`workbox-window`, `workbox-precaching`, `workbox-routing`, `workbox-strategies`)
  - Not installed directly; Serwist covers this layer for our implementation path.

## Implementation Plan

1. Add PWA baseline (`manifest`, `withSerwist` in `next.config.ts`, custom SW, route fallback).
2. Implement secretary route caching and verify offline navigation for cached pages.
3. Add IndexedDB queue module and typed queue schemas.
4. Integrate attendance submit path to write queue entries when offline (or on transient failure).
5. Build sync manager with online/resume triggers and backoff.
6. Add conflict detection against locked/overridden sessions.
7. Add secretary UI sync states and manual retry controls.
8. Add observability logs for queue lifecycle and sync attempts.
9. Validate with manual offline test matrix.

## Suggested File Touchpoints

- `src/app/layout.tsx` (manifest metadata and registration entry)
- `next.config.ts` (`withSerwist`, `disable`, `reloadOnOnline`, `swSrc`, `swDest`)
- `src/app/sw.ts` (custom Serwist service worker)
- `src/app/dashboard/secretary/layout.tsx` (secretary-scoped offline UI wrapper)
- `src/app/dashboard/secretary/attendance/page.tsx` (queue-first attendance submit)
- `src/app/dashboard/secretary/history/page.tsx` (cached read behavior + offline state)
- `src/lib/firestore.ts` (idempotent write paths and pre-sync checks)
- `src/lib/` new modules:
  - `offlineQueue.ts`
  - `syncManager.ts`
  - `networkStatus.ts`
- `public/manifest.webmanifest` and service worker file(s)

## Manual Verification Checklist

1. Install app on mobile/home screen and launch standalone.
2. Open secretary attendance while online, then go offline.
3. Mark attendance changes offline and confirm local pending state persists across reload.
4. Restore internet and confirm automatic sync without duplicate records.
5. Verify locked-session conflict is surfaced and not silently overwritten.
6. Verify teacher override made while secretary is offline results in conflict/review state.
7. Confirm secretary history page still opens cached data offline.
8. Confirm non-cached/non-secretary routes show offline fallback messaging.

## Risks

- **Duplicate writes** if operations are not fully idempotent.
- **Silent conflicts** if lock/override checks are skipped before replay.
- **Queue corruption** if schema versioning is not planned.
- **User confusion** without strong sync status UI.

## Rollout Strategy

- Feature flag for secretary offline mode.
- Internal pilot with a few secretary accounts.
- Monitor sync failure rate and conflict frequency.
- Gradually enable for all secretary users after stability.

## Notes for Next Iteration

- Consider a Phase 2 enhancement where secretary can submit a teacher-override request from a conflict state.
- If school-year retention causes noticeable storage growth on low-end devices, introduce optional shorter retention controls.
