# RallyUp — Dashboard (Courts & Queues) Improvement Specification

Status: Draft  
Author: opencode  
Date: 2026-08-12  
Related: [proposal.md](./proposal.md) · [design.md](./design.md) · [plan.md](./plan.md) · [tasks.md](./tasks.md)

---

## 1. Overview

Improve the Queue Master (QM) dashboard focused on the **Courts & Queues** view and the
**Roster** database. The scope covers: making player details editable, fixing broken buttons,
cleaning dead code, and upgrading the UI/UX of courts, queues, and the roster.

These documents are produced from an analysis of `Dashboard.tsx`, `CompactPipeline.tsx`,
`PlayerInfoModal.tsx`, `AddPlayerModal.tsx`, `store.ts`, `CourtScene.tsx`, and supporting utils.

---

## 2. Goals & Non-Goals

### 2.1 Goals
- Allow a QM to **edit a player's details** (name, tier, rating, paid, status, time-in/out) from
  both the Courts & Queues view and the Roster tab.
- Fix broken/surprising buttons and behaviors (roster tier filter, dead "A" shortcut,
  quick-declare ratings, misleading drag affordances, implicit auto-start, silent draft retries).
- Up-level the Courts & Queues UI: live match timers, queued-player visibility ("Reserved"),
  paid status on player cards, clearer empty states, safer destructive actions.
- Remove confirmed dead code to reduce maintenance and bundle surface.

### 2.2 Non-Goals
- No changes to the public LiveSessionView feed.
- No changes to global rankings / clubs / finance logic (only UI wiring mentioned here).
- No rewrite of the matchmaker.

---

## 3. Functional Requirements

### FR-1: Edit Player
- `FR-1.1` QM can open an edit view for any player from:
  - Courts & Queues Players panel (pencil / card click).
  - Roster tab player cards.
- `FR-1.2` Editable fields:
  - Name (text)
  - Tier (select of the 9 `SkillTier` values)
  - Rating (number) with a "reset to tier default" helper
  - Has Paid (boolean toggle)
  - Status (`waiting | resting | timeout` — `active`/`reserved` are match-managed)
  - Time In / Time Out (time inputs)
- `FR-1.3` Save persists locally first, then syncs to Firestore (local-first model).
- `FR-1.4` Modal shows live store data (derived by player id), not a stale snapshot.
- `FR-1.5` Cancel discards local form edits.

### FR-2: Reserved player state
- `FR-2.1` A new `PlayerStatus` value `'reserved'` marks players locked into a queued
  (Waiting) match.
- `FR-2.2` Reserved players remain **visible** in the Courts & Queues Players panel with an
  indigo "Reserved" badge.
- `FR-2.3` Reserved players are **not draggable** into another draft and cannot be assigned
  to a new queue.
- `FR-2.4` Panels header count shows "N waiting · M resting · K reserved".
- `FR-2.5` Transitions:
  - queue → `reserved`
  - started → `active`
  - cancelled → `waiting`
  - completed → `waiting`

### FR-3: Auto-start control
- `FR-3.1` A toggle (persisted in localStorage under `rallyup_auto_start`, default ON)
  controls whether a queued match starts automatically when a court becomes free.
- `FR-3.2` When ON: existing behavior, plus a visible "Next up: Team A vs Team B on Court X"
  indicator and a toast on auto-start.
- `FR-3.3` When OFF: "Start Next" on the court card starts the match (enabled when a Waiting
  match exists).

### FR-4: Quick-declare matches do not count toward rankings
- `FR-4.1` Finalizing a match via Quick Declaration records the completed match (scores 21–19
  default, 1 shuttle) but does **not** mutate player rating or stats.
- `FR-4.2` Score-Entry finalization continues to apply the normal ±15/−10 rating and stat
  updates.
- `FR-4.3` UI copy ("recorded under Match Declarations, not Rankings") becomes accurate.

### FR-5: Courts & Queues UI
- `FR-5.1` Active court cards show a live ticking elapsed time (mm:ss, 1 s refresh).
- `FR-5.2` Player cards show a Paid/Unpaid indicator with a quick toggle.
- `FR-5.3` Queued match cards support reorder within a court (up/down) and a "Start" shortcut.
- `FR-5.4` Clear empty states for: no players, no courts, no queue.
- `FR-5.5` Confirmation before: delete player, delete court, cancel match.
- `FR-5.6` Draft submission with no courts available keeps the draft and shows an inline hint
  (no silent auto-resubmit on a later court appearing).
- `FR-5.7` Keyboard: `A` opens the Add Player modal (`#player-input` no longer exists).

### FR-6: Roster tab
- `FR-6.1` Tier filter uses the real 9 `SkillTier` values (fixes broken options).
- `FR-6.2` Per-card: paid toggle + edit button.
- `FR-6.3` Bulk actions: select rows → Rest / Set Waiting / Mark Paid / Delete.
- `FR-6.4` Remove fake `draggable` (no drop target exists).

### FR-7: Dead code removal
- `FR-7.1` Remove the unreachable legacy QM view (`) : false ? (` block).
- `FR-7.2` Delete `src/components/Court3D.tsx`.
- `FR-7.3` Remove the CSS-hidden duplicate header cluster.
- `FR-7.4` Remove orphaned state and the dead `resetMatchTimer` store action.
- `FR-7.5` Keep the Add Player modal as the single add-player entry point.

---

## 4. Data Model Changes

### 4.1 `PlayerStatus` (`src/types.ts`)
```ts
export type PlayerStatus = 'waiting' | 'active' | 'reserved' | 'resting' | 'timeout';
```

### 4.2 `CompleteMatch` signature (`src/store.ts`)
```ts
completeMatch(
  userId: string,
  matchId: string,
  teamAScore: number,
  teamBScore: number,
  shuttlesUsed: number,
  countsForRanking?: boolean,   // default true
): Promise<void>;
```

### 4.3 New store action
```ts
updatePlayer(userId: string, playerId: string, updates: Partial<Player>): Promise<void>;
```

### 4.4 UI preference (localStorage)
- `rallyup_auto_start` : `'true' | 'false'` (default `'true'`).

---

## 5. Non-Functional Requirements
- **NFR-1** Local storage remains the source of truth for workspace data; Firestore sync is
  non-blocking (per existing architecture).
- **NFR-2** `npm run lint` (`tsc --noEmit`) and `npm run build` must pass.
- **NFR-3** No regressions in the online ↔ offline switching flows.
- **NFR-4** All status transitions in FR-2.5 must leave local + Firestore consistent.

---

## 6. Acceptance Criteria
- A QM can open Edit Player, change name/tier/paid/status/times, save, and see it persist and
  survive an online↔offline switch.
- Queued players are visible with a "Reserved" badge and cannot be double-queued.
- Quick-declaring a winner does not change rating/stats; score entry still does.
- Auto-start toggle works both ways; "Next up" hint and toast appear.
- Roster tier filter returns correct players for every tier.
- All listed dead code is gone and the app builds cleanly.