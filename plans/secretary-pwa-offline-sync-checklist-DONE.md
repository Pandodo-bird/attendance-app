# Secretary PWA Offline Sync Implementation Checklist

Use this checklist together with `plans/secretary-pwa-offline-sync-plan.md`.

## 0) Setup and dependencies

- [x] Install required packages:
  - [x] `npm i @serwist/next idb`
  - [x] `npm i -D serwist`
- [x] Confirm project builds before changes (`npm run build`).

## 1) PWA foundation (Serwist + manifest)

- [x] Update `next.config.ts`:
  - [x] Wrap config with `withSerwist`.
  - [x] Set `disable: process.env.NODE_ENV === "development"`.
  - [x] Set `reloadOnOnline: false`.
  - [x] Set `swSrc` and `swDest`.
- [x] Add service worker source at `src/app/sw.ts`:
  - [x] Precache app shell/static assets.
  - [x] Add strict runtime caching only for secretary routes:
    - [x] `/dashboard/secretary/dashboard`
    - [x] `/dashboard/secretary/attendance`
    - [x] `/dashboard/secretary/history`
  - [x] Ensure teacher and non-secretary route documents are not broadly cached.
- [x] Add/update web manifest at `src/app/manifest.ts` (or `public/manifest.webmanifest` if needed by existing setup).
- [x] Ensure icons exist under `public/` and are referenced by manifest.

## 2) App metadata and registration wiring

- [x] Update `src/app/layout.tsx`:
  - [x] Ensure PWA metadata (application name, apple web app, theme color).
  - [x] Ensure manifest is discoverable.
- [x] Add/confirm SW registration client hook/component (if not auto-registered by chosen Serwist config path).

## 3) Offline queue data layer (IndexedDB)

- [x] Create `src/lib/offlineQueue.ts`:
  - [x] Define queue item interface with deterministic operation id.
  - [x] Include: `uid`, `schoolYear`, `attendanceId`, `sectionId`, `date`, payload snapshot, retry metadata, status.
  - [x] Add CRUD helpers: enqueue, list pending, mark syncing, mark synced, mark failed, delete/discard.
  - [x] Add schema versioning/migration support.
  - [x] Add 50 MB cap checks and oldest-synced-first pruning.
- [x] Namespace storage by `uid` to isolate shared-device accounts.

## 4) Network/sync orchestration layer

- [x] Create `src/lib/networkStatus.ts`:
  - [x] Expose online/offline status hook/util.
- [x] Create `src/lib/syncManager.ts`:
  - [x] Trigger sync on `online`, app resume, periodic online retry, and manual sync.
  - [x] Enforce single active sync per `uid` (IndexedDB lease lock).
  - [x] Process queue FIFO per session key (`sectionId + date`).
  - [x] Add retry/backoff for transient errors.
  - [x] Classify non-transient errors (`failed_auth`, `failed_permission`, validation).

## 5) Firestore replay and conflict-safe writes

- [x] Update `src/lib/firestore.ts` (or add helper module) for replay preflight checks:
  - [x] Fetch latest `attendance/{date}_{sectionSlug}` before replay write.
  - [x] If session is `open`, allow merge/replay.
  - [x] If teacher already submitted/`locked`, discard secretary queued item for that day.
  - [x] If teacher override metadata is newer, mark `Needs review` (no blind overwrite).
  - [x] Keep writes idempotent using deterministic IDs.

## 6) Secretary attendance integration

- [x] Update `src/app/dashboard/secretary/attendance/page.tsx`:
  - [x] Queue-first behavior for offline or transient failures.
  - [x] Persist unsynced changes locally.
  - [x] Show per-session sync state (`Synced`, `Pending sync`, `Needs review`, `Sync error`).
  - [x] Add manual `Sync now` action.
  - [x] On locked-session conflict, discard local queued item and refresh to teacher final data.

## 7) Secretary dashboard/history offline UX

- [x] Update `src/app/dashboard/secretary/layout.tsx`:
  - [x] Global sync/connection indicator.
  - [x] Prompt handling for lock-discard and auth/permission failures.
- [x] Update `src/app/dashboard/secretary/history/page.tsx`:
  - [x] Read cached previously-fetched data offline.
  - [x] Show explicit offline/cached data state.

## 8) Shared-device and auth handling

- [x] On logout/login switch, ensure only current `uid` queue is accessible.
- [x] Pause retry on auth expiration and prompt re-login.
- [x] Resume sync automatically after successful re-auth.

## 9) School-year retention and cleanup

- [x] Persist `schoolYear` per queue item from section context.
- [x] Cleanup only items older than current section context school year.
- [x] Never auto-delete unsynced items solely due to cap; block and prompt user if necessary.

## 10) Observability and diagnostics

- [x] Add structured logs for queue lifecycle:
  - [x] enqueue
  - [x] replay start/end
  - [x] conflict/lock discard
  - [x] retry/failure classification
- [x] Keep logs concise and removable/toggleable for production if needed.

## 11) Validation pass (manual)

- [ ] Online baseline still works for secretary flows.
- [ ] Offline attendance edits persist across reload/reopen.
- [ ] Reconnect auto-sync works without duplicate writes.
- [ ] Teacher-locked session causes discard + prompt + UI refresh.
- [ ] Teacher override conflict surfaces `Needs review`.
- [ ] History page shows cached data offline.
- [ ] Teacher pages remain network-only.
- [ ] Shared-device account isolation is confirmed.

## 12) Final quality checks

- [x] Run `npm run lint` and fix errors.
- [x] Run `npm run build` and fix build issues.
- [ ] Re-test critical secretary offline path after production build.
