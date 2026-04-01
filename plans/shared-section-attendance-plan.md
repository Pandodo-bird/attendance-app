# Shared Section Attendance Plan

## Goal

Refactor attendance from a per-subject, appointment-shaped system into a shared per-section, per-day system.

This should allow:
- teachers to record attendance even when no secretary is appointed yet
- secretaries assigned to a section to open and continue the same daily attendance session
- shared history between teacher and secretary
- analytics to stay correct because there is only one attendance session per section per day
- teacher override to remain the only correction path after submission

## Confirmed Product Decisions

1. Attendance identity becomes one session per `section + date`
2. `subject` is removed from appointments
3. Secretary assignment becomes section-based, not subject-based
4. No migration work is needed because the database is disposable
5. A secretary appointed today may view teacher-recorded attendance from before the appointment date
6. Teacher and secretary share the same session history for a section
7. Teacher can override both teacher-recorded and secretary-recorded attendance
8. Secretary can view locked sessions, but only the teacher can override after submission
9. For now, treat the system as effectively one secretary per section

## Current Problem Summary

The current system is split across two models:

- `attendance` session headers are currently identified by:
  - `date + section + subject + secretaryLrn`
- `attendanceRecords` are currently identified by:
  - `date + section + student`
- `studentSummaries` are already section-based, not subject-based

This means the current model can conflict if more than one session exists for the same section on the same day. A shared section-day session model resolves that mismatch cleanly.

## Target Architecture

## Attendance Identity

Use one canonical attendance session per section per day.

Suggested attendance document ID:
- `{date}_{sectionSlug}`

Examples:
- `2026-04-01_G10-Rizal`

## Appointments

Appointments become section-based access assignments only.

They should no longer define attendance identity.

Suggested appointment shape:
- `secretaryUid`
- `secretaryLrn`
- `teacherId`
- `sectionId`
- `schoolYear`
- `status`
- `appointedAt`

Remove:
- `subject`

## Attendance Document

Refactor the attendance header document to represent a shared daily section session.

Keep or add fields like:
- `sectionId`
- `teacherId`
- `date`
- `schoolYear`
- `status: "open" | "locked"`
- `records`
- `createdAt`
- `lockedAt`
- `createdByUid`
- `createdByRole: "teacher" | "secretary"`
- `submittedByUid`
- `submittedByRole: "teacher" | "secretary"`
- optional recorder display metadata if useful for UI

Remove requirement for:
- `appointmentId`
- `subject`
- `secretaryUid`
- `secretaryLrn`

These may remain optional metadata temporarily if helpful during refactor, but they should no longer define the session.

## Attendance Records

Keep one flat attendance record per student per section per day.

Document ID:
- `{date}_{sectionSlug}_{studentLrn}`

This now cleanly matches the new shared daily session model.

Fields should remain section-day based and no longer depend on subject identity.

## Student Summaries

No major model change needed.

`studentSummaries` are already section-based and will work better once attendance is also section-day based.

## Required Code Changes

## 1. Firestore Types and Helpers

Update `src/lib/firestore.ts`:

- refactor `Appointment` to remove `subject`
- refactor `Attendance` so it is section-day based
- add a section-day attendance ID builder helper
- update any helper that builds IDs from `subject` or `secretaryLrn`

Functions that will need refactor:
- `checkExistingSession`
- `startAttendanceSession`
- `startAttendanceSessionAsTeacher`
- `submitFullAttendance`
- any helper using `appointment.subject`
- any helper using `appointment.secretaryLrn` for attendance IDs

## 2. Teacher Attendance Flow

Current teacher attendance is buried inside the `Secretaries & Records` page and is still appointment-gated.

Refactor teacher flow so:
- teacher can open attendance by section and date
- if session exists, open it
- if session does not exist, create it
- no appointment is required to start teacher attendance

Likely file:
- `src/app/dashboard/teacher/secretaries/page.tsx`

Preferred behavior:
- show all active sections
- if a section has no session for today, teacher can start one
- if a session exists, teacher can continue or review it

## 3. Secretary Attendance Flow

Current secretary page assumes an active appointment and builds session identity from appointment data.

Refactor secretary flow so:
- secretary access is derived from active section appointments
- secretary opens attendance by `section + date`
- if teacher already started the session, secretary joins that same session
- if no session exists yet, secretary may create the shared daily session

Likely file:
- `src/app/dashboard/secretary/attendance/page.tsx`

## 4. Shared History

History should become section-based and shared between teacher and secretary.

### Teacher History
Teacher can continue querying by `teacherId`.

### Secretary History
Secretary history can no longer query only by `secretaryUid` because teacher-created sessions would be missing.

Instead:
1. load the secretary's active and historical section appointments
2. derive accessible `sectionId`s
3. load attendance sessions for those sections
4. show shared sessions with recorder labels

Likely affected files:
- `src/lib/firestore.ts`
- `src/app/dashboard/secretary/history/page.tsx`
- `src/app/dashboard/secretary/dashboard/page.tsx`

## 5. Recorder Labels

Update history and records UI to show who created or submitted the session.

Use:
- `createdByRole`
- `submittedByRole`

Display labels like:
- `Recorded by Teacher`
- `Recorded by Secretary`

Where available, show names instead of only roles.

Likely affected files:
- `src/app/dashboard/teacher/secretaries/page.tsx`
- `src/components/teacher/secretary-records/DailyRecordDetailsModal.tsx`
- `src/app/dashboard/secretary/history/page.tsx`

## 6. Teacher Override

Keep the existing teacher override flow.

The override logic already fits the shared-session model because it updates:
- the attendance header
- the flat attendance record
- the student summary

Refactor only the parts that still assume old attendance identity.

Main function:
- `overrideAttendanceRecord`

## 7. Dashboard Metrics

Current dashboard coverage is appointment-based. That should change.

### Teacher Dashboard
Change expected daily coverage from:
- number of active appointments

to:
- number of active sections

### Secretary Dashboard
Show section-based pending/submitted session status instead of subject-based status.

Likely affected files:
- `src/app/dashboard/teacher/dashboard/page.tsx`
- `src/app/dashboard/secretary/dashboard/page.tsx`

## 8. Firestore Rules

Update rules to match section-based attendance ownership and shared access.

Requirements:
- teacher may create/read/update attendance for their own sections
- secretary may read/create/update attendance only for sections they are appointed to
- teacher remains the only actor allowed to perform override corrections after locking
- shared history reads must still respect section ownership and assignment

Likely file:
- `firestore.rules`

## Implementation Order

1. Refactor types and ID helpers in `firestore.ts`
2. Refactor shared session start/check/submit functions
3. Update teacher section-based attendance entry flow
4. Update secretary attendance page to use shared section-day sessions
5. Update shared history queries and recorder labels
6. Update dashboard metrics
7. Update Firestore rules
8. Run lint and manual verification

## Manual Verification Checklist

1. Teacher can start attendance for a section with no secretary
2. Teacher can submit that session successfully
3. Secretary appointed to that section can later open the same session history
4. Secretary can continue an open session started by teacher
5. Secretary cannot perform teacher-only override after lock
6. Teacher can override locked records regardless of whether teacher or secretary created the session
7. Analytics for the section remain correct and do not double-count
8. History shows shared records with correct recorder labels
9. Dashboard counts are section-based and no longer tied to subjects

## Non-Goals For This Refactor

- multi-secretary collaboration for the same section
- restoring subject-based attendance identity
- data migration for old test records
- per-subject analytics

## Open Optional Question

This is not blocking implementation:

- Should the new teacher section-based attendance entry remain inside `Secretaries & Records`, or later move into a dedicated teacher attendance-recording page?