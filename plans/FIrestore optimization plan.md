The main issue today is not one expensive query, but repeated broad queries + client-side slicing/filtering. The biggest read waste is in secretary history.

What’s Expensive Right Now

getSecretaryAttendanceHistoryPaginated() is not true pagination; it fetches all accessible sessions, then slices in memory (src/lib/firestore.ts:1634). In infinite scroll, every page re-reads the same full dataset.
That function also re-queries appointments (getAccessibleSectionIdsForSecretary) on every page (src/lib/firestore.ts:378), multiplying reads.
Teacher analytics page fetches all teacher sessions for today and then filters by section client-side (src/app/dashboard/teacher/attendance/page.tsx:117 + :125), though only one section is needed.
Teacher secretaries page always loads 120-day session history (src/app/dashboard/teacher/secretaries/page.tsx:160) even when workspace is not history-focused.
Some list/detail fetches do per-item doc reads (e.g., section lookups in secretary dashboard/history), which are okay at small scale but can be consolidated.
Optimization Plan (Querying Firestore Only)

~~Phase 1: Stop repeated full-history reads (highest ROI)~~
~~Replace current infinite-query backend pagination with one of:~~
~~immediate fix: fetch history once per stale window, paginate client-side only;~~
proper fix: true cursor pagination strategy.
~~Reuse cached section-access IDs (appointments-derived) instead of refetching each page.~~
Target files: src/lib/firestore.ts, src/app/dashboard/secretary/history/page.tsx, src/app/dashboard/secretary/dashboard/page.tsx.
~~Expected impact: very large read reduction on secretary history load-more flows.~~
~~Phase 2: Narrow broad “today” queries~~
~~Teacher attendance page: replace getTeacherAttendance(teacherId, today) + section filter with deterministic single-doc read via getAttendanceSession(attendanceId) for selected section/date.~~
~~Keep class-level “all sessions today” only where truly needed (dashboard).~~
~~Target file: src/app/dashboard/teacher/attendance/page.tsx.~~
~~Expected impact: reads drop from “N sections/day” to “1 doc/day” for that page.~~
~~Phase 3: Make heavy queries conditional by workspace~~
~~In teacher secretaries page, only enable 120-day attendance query when entering records/history workspace.~~
~~For secretary list workspace, rely on appointments + profile batch only.~~
~~Target file: src/app/dashboard/teacher/secretaries/page.tsx.~~
~~Expected impact: large background read reduction during normal secretary management.~~
Phase 4: Consolidate section lookups
Add batch helper (IDs in chunks) instead of repeated getSectionById loops where applicable.
Use shared query cache key for section maps so pages can reuse warmed data.
Target files: src/lib/firestore.ts, secretary dashboard/history pages.
Expected impact: fewer network round trips; moderate read/latency improvement.
Phase 5: Refetch discipline
For low-churn queries (sections, appointments, profiles), reduce unnecessary refetch triggers on focus/reconnect.
Audit invalidation calls to avoid over-invalidating after sync/status changes.
Target files: query configs in dashboard/sections/secretaries pages.
Expected impact: steady-state read reduction across daily usage.
Measurement Plan (Before/After)

Track Firestore read count for 3 user journeys:
Secretary history: open page + load 3 more pages.
Teacher attendance analytics: open page + switch section 3 times.
Teacher secretaries: open page, switch workspaces.
Use existing diagnostic logs plus a simple per-query read counter (query name, docs returned, timestamp).
Success criteria:
Secretary history journey reads reduced by at least 60%.
Teacher attendance page reads reduced to ~1 session read + existing summaries/students reads.
No UX regression in offline/history flows.
~~One design decision to lock before implementation:~~

~~Do you want quick win first (fetch-once history + client pagination), or~~
go straight to true server pagination/index approach (more work, best long-term scalability)?
