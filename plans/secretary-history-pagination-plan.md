# Secretary History Pagination Plan

## Goal

Replace the current fake pagination used by secretary history views with real Firestore-backed pagination so the app stops fetching the full remote history before slicing it in the frontend.

Target pages:
- `src/app/dashboard/secretary/history/page.tsx`
- `src/app/dashboard/secretary/dashboard/page.tsx`

Primary helper to replace:
- `getSecretaryAttendanceHistoryPaginated()` in `src/lib/firestore.ts`

## Current Problem

The current secretary history flow still does broad reads first:

- `src/app/dashboard/secretary/history/page.tsx` calls `getSecretaryAttendanceHistory(uid)` and then uses `slice(0, visibleCount)` in the client.
- `src/app/dashboard/secretary/dashboard/page.tsx` calls `getSecretaryAttendanceHistoryPaginated(uid, 5, 0)`, but that helper is also fake pagination because it loads full history first and slices afterward.

This means:
- more `attendance` documents are read than the UI actually shows
- read cost grows with history size
- the dashboard "recent history" widget gets more expensive over time
- the naming of the current helper is misleading because it is not true query-level pagination

## Constraints

Secretary history is more complex than the teacher-side selected section/selected secretary pagination because a secretary can access multiple sections.

Current secretary history semantics are section-access based, not strictly `secretaryUid == currentUser` based:
- a secretary can view attendance history for the sections they are appointed to
- this currently comes from `getAccessibleSectionIdsForSecretary()` and `getAttendanceBySectionIds()`

Firestore limitation to respect:
- a single clean global cursor across many arbitrary `sectionId` values is not as straightforward as the teacher-side single-section query
- `in` queries are chunked to 10 values max

## Proposed Query Strategy

Use real backend-limited reads while preserving the current "accessible sections" behavior.

### 1. Keep section-access resolution

- Continue using `getAccessibleSectionIdsForSecretary(secretaryUid)`
- Reuse the cached section access IDs already present in `firestore.ts`

### 2. Add a real secretary history pagination helper

Add a new helper in `src/lib/firestore.ts`, likely replacing the current `getSecretaryAttendanceHistoryPaginated()` implementation.

Proposed return shape:

```ts
interface SecretaryHistoryPageCursor {
  chunks: Array<{
    sectionIds: string[];
    cursor: { date: string; id: string } | null;
  }>;
}

Promise<{
  sessions: Attendance[];
  nextCursor: SecretaryHistoryPageCursor | null;
  hasMore: boolean;
}>
```

### 3. Chunk by accessible section IDs

- Split accessible section IDs into groups of 10
- For each chunk, query `attendance` with:
  - `where("sectionId", "in", chunk)`
  - optional date filter later if needed
  - `orderBy("date", "desc")`
  - `orderBy(documentId(), "desc")`
  - `limit(perChunkLimit)`
  - `startAfter(...)` when continuing a chunk

### 4. Merge chunk results in memory

- Combine chunk results from Firestore
- Sort merged results by:
  - `date desc`
  - `documentId desc`
- Return only the top page-size sessions to the UI

### 5. Track per-chunk cursors

- Store which chunk docs were consumed
- Return a cursor object that lets the next page continue from the correct per-chunk positions

This is not a perfect single-query cursor, but it is still a major improvement because Firestore only returns bounded query chunks instead of the full remote history.

## UI Integration Plan

### A. Secretary History Page

File:
- `src/app/dashboard/secretary/history/page.tsx`

Changes:
- Replace the current `useQuery` full-history fetch with `useInfiniteQuery`
- Replace `visibleCount` client slicing with Firestore-backed `fetchNextPage`
- Keep the existing offline queue merge behavior
- Keep the local cached history fallback behavior, but make it work with page chunks instead of a single full-history assumption

Behavior after change:
- first load fetches only page 1
- `Load more` fetches the next page only
- merged offline items still appear in the combined list

### B. Secretary Dashboard Recent History

File:
- `src/app/dashboard/secretary/dashboard/page.tsx`

Changes:
- Continue asking for the first 5 recent sessions
- but use the new real paginated helper instead of the fake slice helper

Behavior after change:
- recent history card reads only what it needs

## Offline / PWA Impact

This change should be low-risk for offline behavior if done carefully, but there are important effects to account for.

### What does NOT change

- The secretary attendance submission flow remains queue-first for offline edits
- IndexedDB queue and drafts in `src/lib/offlineQueue.ts` are unaffected
- Service worker caching strategy does not need to change just because history reads become paginated
- `/api/network-status` probing behavior is unaffected
- offline history still needs to merge:
  - cached remote sessions
  - local pending queue items

### What DOES change

- The remote history cache can no longer assume "one fetch equals the whole history"
- `src/app/dashboard/secretary/history/page.tsx` currently caches `sessions` directly after client slicing
- after real pagination, we need to be explicit about whether the offline cache stores:
  - only the pages fetched so far, or
  - an accumulated merged remote history list built from fetched pages

### Recommended offline-safe approach

For the history page:
- accumulate fetched remote pages in memory
- write the accumulated fetched remote sessions to `replaceSecretaryHistoryCache(...)`
- continue to show cached remote sessions plus local unsynced queue items when offline

This preserves today’s offline UX expectation:
- history page offline = show previously fetched history plus pending local items

### Offline risks to avoid

1. Do not clear cached history just because only page 1 was fetched on the current visit.
2. Do not let pagination reset remove offline-visible sessions unexpectedly.
3. Do not couple remote-page cursors to offline rendering.
4. Do not change queue replay/sync semantics as part of this optimization.

## Firestore Index Expectation

Most likely required composite index for the secretary history chunk query:

- Collection: `attendance`
- Fields:
  - `sectionId` ascending
  - `date` descending

Because cursor pagination also uses `orderBy(documentId(), "desc")`, Firestore may still ask for an exact generated index when the query runs. If so, use the generated Firebase link and create that exact index.

## Implementation Steps

1. Replace fake `getSecretaryAttendanceHistoryPaginated()` with a real bounded-read implementation.
2. Add cursor types for multi-chunk secretary history pagination.
3. Convert `src/app/dashboard/secretary/history/page.tsx` to `useInfiniteQuery`.
4. Replace `visibleCount`-based frontend slicing with `fetchNextPage()`.
5. Update offline cached-history writing so it stores accumulated fetched remote pages safely.
6. Update `src/app/dashboard/secretary/dashboard/page.tsx` recent history widget to use the new helper.
7. Verify online behavior, offline cached-history behavior, and queue-item merge behavior.

## Validation Checklist

- Secretary history page first load fetches only one page from Firestore
- `Load more` fetches only the next page
- Secretary dashboard recent history fetches only the needed recent items
- Cached history still renders while offline
- Local pending queue items still merge into history correctly
- No regressions in sync, lock, or needs-review states
- No regressions in service worker / PWA navigation behavior

## Success Criteria

- Secretary history no longer loads full remote history before rendering page 1
- Secretary dashboard recent history no longer does full-history reads under the hood
- Offline history UX remains intact
- Firestore read volume for secretary history drops materially as history grows
