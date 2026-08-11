# RallyUp — Dashboard Improvements Proposal

Status: Draft  
Author: opencode  
Date: 2026-08-12

---

## 1. Problem Statement

The Queue Master dashboard's Courts & Queues view has several broken or misleading interactions,
one notable missing capability (player editing), and a large amount of dead code that makes the
codebase harder to maintain.

Key user-facing pain points:

1. **Players cannot be edited.** The pencil/click affordance opens a read-only modal; there is no
   way to change a player's name, tier, rating, or payment status from the live view.
2. **Players appear to "disappear"** when queued (status becomes `active` and they leave the
   waiting panel), which reads as data loss.
3. **Misleading/contradictory behavior:** quick-declare winners are described as "not Rankings"
   but still change ratings; the roster tier filter options don't match real tiers; cards are
   `draggable` with no drop target; queued matches auto-start silently; drafts silently
   auto-submit later.
4. **Dead code bloat:** an unreachable ~450-line legacy QM view, an unused `Court3D.tsx`, a
   CSS-hidden duplicate header, and orphaned state linger in the bundle and confuse future work.

---

## 2. Findings (from code analysis)

| # | Issue | Location |
|---|---|---|
| 1 | Edit player broken (modal read-only; no `updatePlayer` action) | `PlayerInfoModal.tsx`, `store.ts` |
| 2 | Roster tier filter uses invalid tier values | `Dashboard.tsx:1485-1495` |
| 3 | Quick-declare still mutates rating/stats — copy is false | `Dashboard.tsx:597-599`, `store.ts:completeMatch` |
| 4 | Dead legacy QM view | `Dashboard.tsx:1038-1449` (`) : false ? (`) |
| 5 | Unused 3D file | `src/components/Court3D.tsx` |
| 6 | Hidden duplicate header cluster | `Dashboard.tsx:803-906` |
| 7 | Dead `"A"` shortcut targeting `#player-input` | `Dashboard.tsx:233-250` |
| 8 | No delete/cancel confirmations | `CompactPipeline.tsx`, `Dashboard.tsx` |
| 9 | Queued players leave the panel (status `active`) | `store.ts:addMatch` |
| 10 | Silent auto-start + silent draft retry | `CompactPipeline.tsx:69-74,104-109` |
| 11 | Fake drag affordance on roster cards | `Dashboard.tsx:1502` |
| 12 | No live timer / no paid status on courts & queues | `CompactPipeline.tsx` |
| 13 | Stale snapshot in PlayerInfoModal | `Dashboard.tsx` `detailPlayer` |

---

## 3. Proposed Changes

### 3.1 Features (add)
- **Edit Player** — full edit modal (name, tier, rating, paid, status, times) with live store
  data, opened from Courts & Queues and Roster.
- **Reserved player state** — `'reserved'` status so queued players stay visible and are clearly
  marked, and cannot be double-queued.
- **Auto-start toggle** — optionally disable automatic match starting; add a "Next up" hint and
  auto-start toast.
- **Live timers + paid badges** on the Courts & Queues view.
- **Bulk roster actions** — Rest / Set Waiting / Mark Paid / Delete.
- **Queue reorder (within a court)** and Start-from-queue shortcut.
- **Confirmations** for destructive actions (delete player/court, cancel match).

### 3.2 Fixes (change)
- Roster tier filter → real `SkillTier` values.
- Quick-declare → skip rating/stats (`countsForRanking` flag) to match the UI copy.
- Keyboard `A` → opens Add Player modal.
- Draft submit → no silent retry; inline "No courts available" hint.
- Roster cards → drop fake `draggable`.
- `PlayerInfoModal` — derive player by id so it never shows stale data.

### 3.3 Removals (delete)
- Unreachable legacy QM view block.
- `src/components/Court3D.tsx`.
- Hidden duplicate header cluster.
- Orphaned state, `resetMatchTimer` store action, unused imports.

---

## 4. Decisions (confirmed with product owner)

| Decision | Choice | Rationale |
|---|---|---|
| Edit scope | All fields (name, tier, rating, paid, status, times) | Full QM control; rating override includes a "reset to tier default" helper |
| Queued players | Show as "Reserved", stay visible | Removes the "players disappeared" confusion |
| Auto-start | Keep but make obvious + optional (toggle, default ON) | Preserves current flow while giving control |
| Quick declare | Skip rankings | Makes the existing UI copy true |
| Dead code | Delete all | User confirmed removal; 3D scene remains on the player dashboard |

---

## 5. Impact

### 5.1 Files touched
- `src/types.ts`, `src/store.ts`, `src/services/localData.ts`
- `src/components/PlayerInfoModal.tsx`, `src/components/CompactPipeline.tsx`,
  `src/components/Dashboard.tsx`, `src/components/PlayerDashboard.tsx` (minor),
  `src/components/LiveSessionView.tsx` (minor)
- Delete `src/components/Court3D.tsx`

### 5.2 Risk
- The `'reserved'` status ripples through all status color maps / whitelists — must be done in
  one pass with lint as the guard.
- Dead-code deletion is high-line-count; relies on `tsc --noEmit` + a manual smoke test to confirm
  nothing referenced the removed block.

### 5.3 No-impact areas
- Public LiveSessionView read path (minor cosmetic status colors only).
- Global rankings, clubs, finance, matchmaker.

---

## 6. Suggested Sequencing

1. Data layer (store/types) → foundation.
2. Edit Player feature.
3. Courts & Queues UX.
4. Roster tab.
5. Dead code removal.
6. Verification (lint + build + manual online/offline pass).

See [plan.md](./plan.md) and [tasks.md](./tasks.md).