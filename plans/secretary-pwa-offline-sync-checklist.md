# Secretary PWA Offline Sync Implementation Checklist

Use this checklist together with `plans/secretary-pwa-offline-sync-plan.md`.

## 0) Setup and dependencies

- [ ] Install required packages:
  - [ ] `npm i @serwist/next idb`
  - [ ] `npm i -D serwist`
- [ ] Confirm project builds before changes (`npm run build`).

## 1) PWA foundation (Serwist + manifest)

- [ ] Update `next.config.ts`:
  - [ ] Wrap config with `withSerwist`.
  - [ ] Set `disable: process.env.NODE_ENV === "development"`.
  - [ ] Set `reloadOnOnline: false`.
  - [ ] Set `swSrc` and `swDest`.
- [ ] Add service worker source at `src/app/sw.ts`:
  - [ ] Precache app shell/static assets.
  - [ ] Add strict runtime caching only for secretary routes:
    - [ ] `/dashboard/secretary/dashboard`
    - [ ] `/dashboard/secretary/attendance`
    - [ ] `/dashboard/secretary/history`
  - [ ] Ensure teacher and non-secretary route documents are not broadly cached.
- [ ] Add/update web manifest at `src/app/manifest.ts` (or `public/manifest.webmanifest` if needed by existing setup).
- [ ] Ensure icons exist under `public/` and are referenced by manifest.

## 2) App metadata and registration wiring

- [ ] Update `src/app/layout.tsx`:
  - [ ] Ensure PWA metadata (application name, apple web app, theme color).
  - [ ] Ensure manifest is discoverable.
- [ ] Add/confirm SW registration client hook/component (if not auto-registered by chosen Serwist config path).

## 3) Offline queue data layer (IndexedDB)

- [ ] Create `src/lib/offlineQueue.ts`:
  - [ ] Define queue item interface with deterministic operation id.
  - [ ] Include: `uid`, `schoolYear`, `attendanceId`, `sectionId`, `date`, payload snapshot, retry metadata, status.
  - [ ] Add CRUD helpers: enqueue, list pending, mark syncing, mark synced, mark failed, delete/discard.
  - [ ] Add schema versioning/migration support.
  - [ ] Add 50 MB cap checks and oldest-synced-first pruning.
- [ ] Namespace storage by `uid` to isolate shared-device accounts.

## 4) Network/sync orchestration layer

- [ ] Create `src/lib/networkStatus.ts`:
  - [ ] Expose online/offline status hook/util.
- [ ] Create `src/lib/syncManager.ts`:
  - [ ] Trigger sync on `online`, app resume, periodic online retry, and manual sync.
  - [ ] Enforce single active sync per `uid` (IndexedDB lease lock).
  - [ ] Process queue FIFO per session key (`sectionId + date`).
  - [ ] Add retry/backoff for transient errors.
  - [ ] Classify non-transient errors (`failed_auth`, `failed_permission`, validation).

## 5) Firestore replay and conflict-safe writes

- [ ] Update `src/lib/firestore.ts` (or add helper module) for replay preflight checks:
  - [ ] Fetch latest `attendance/{date}_{sectionSlug}` before replay write.
  - [ ] If session is `open`, allow merge/replay.
  - [ ] If teacher already submitted/`locked`, discard secretary queued item for that day.
  - [ ] If teacher override metadata is newer, mark `Needs review` (no blind overwrite).
  - [ ] Keep writes idempotent using deterministic IDs.

## 6) Secretary attendance integration

- [ ] Update `src/app/dashboard/secretary/attendance/page.tsx`:
  - [ ] Queue-first behavior for offline or transient failures.
  - [ ] Persist unsynced changes locally.
  - [ ] Show per-session sync state (`Synced`, `Pending sync`, `Needs review`, `Sync error`).
  - [ ] Add manual `Sync now` action.
  - [ ] On locked-session conflict, discard local queued item and refresh to teacher final data.

## 7) Secretary dashboard/history offline UX

- [ ] Update `src/app/dashboard/secretary/layout.tsx`:
  - [ ] Global sync/connection indicator.
  - [ ] Prompt handling for lock-discard and auth/permission failures.
- [ ] Update `src/app/dashboard/secretary/history/page.tsx`:
  - [ ] Read cached previously-fetched data offline.
  - [ ] Show explicit offline/cached data state.

## 8) Shared-device and auth handling

- [ ] On logout/login switch, ensure only current `uid` queue is accessible.
- [ ] Pause retry on auth expiration and prompt re-login.
- [ ] Resume sync automatically after successful re-auth.

## 9) School-year retention and cleanup

- [ ] Persist `schoolYear` per queue item from section context.
- [ ] Cleanup only items older than current section context school year.
- [ ] Never auto-delete unsynced items solely due to cap; block and prompt user if necessary.

## 10) Observability and diagnostics

- [ ] Add structured logs for queue lifecycle:
  - [ ] enqueue
  - [ ] replay start/end
  - [ ] conflict/lock discard
  - [ ] retry/failure classification
- [ ] Keep logs concise and removable/toggleable for production if needed.

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

- [ ] Run `npm run lint` and fix errors.
- [ ] Run `npm run build` and fix build issues.
- [ ] Re-test critical secretary offline path after production build.
