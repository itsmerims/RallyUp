# RallyUp — Dashboard Improvement Implementation Plan

Status: Draft  
Related: [spec.md](./spec.md) · [design.md](./design.md) · [proposal.md](./proposal.md) · [tasks.md](./tasks.md)

---

## Phase 1 — Data layer (store + types)

**Goal:** groundwork for everything else; nothing user-visible yet.

| Item | Detail |
|---|---|
| P1.1 | Add `'reserved'` to `PlayerStatus` in `src/types.ts` |
| P1.2 | Add `updatePlayer` action + interface entry in `src/store.ts` (local-first write + Firestore sync) |
| P1.3 | Rework `completeMatch` with `countsForRanking = true` param; skip rating/stats when false |
| P1.4 | `addMatch` sets players to `reserved`; Firestore writes `status: 'reserved'` |
| P1.5 | `startMatch`: `reserved → active`; `cancelMatch`: `reserved/active → waiting` |
| P1.6 | Update `readWorkspace` self-heal whitelist with `'reserved'` |
| P1.7 | Add status color/badge entries for `'reserved'` in Dashboard roster, PlayerDashboard, LiveSessionView |
| P1.8 | Remove `resetMatchTimer` action + interface entry |
| ✅ | `npm run lint` |

## Phase 2 — Edit Player feature

| Item | Detail |
|---|---|
| P2.1 | Change `PlayerInfoModal` props to `playerId`; derive live player from store |
| P2.2 | Add editable fields: name, tier, rating (+reset-to-tier-default helper), hasPaid, status, time in/out |
| P2.3 | Save → `updatePlayer`; Cancel discards; toast on save |
| P2.4 | Dashboard: track `detailPlayerId` instead of snapshot; wire from CompactPipeline + Roster |
| ✅ | Manual: edit persists across reload and online/offline switch |

## Phase 3 — Courts & Queues UI/UX (`CompactPipeline.tsx`)

| Item | Detail |
|---|---|
| P3.1 | Scroll/сортPlayers panel: show reserved players with badge; update counts header |
| P3.2 | Reserved players not draggable and cannot be assigned to drafts |
| P3.3 | Auto-start toggle (localStorage `rallyup_auto_start`, default ON), "Next up" hint + toast |
| P3.4 | When OFF: Start Next triggers; enabled when a Waiting match exists |
| P3.5 | Fix draft submit: no silent retry; inline "No courts available" hint |
| P3.6 | Live elapsed timer (1 s tick, mm:ss) on active court cards |
| P3.7 | Paid badge + quick toggle on player cards |
| P3.8 | Queued match reorder (up/down within court) + Start shortcut on queue cards |
| P3.9 | Confirmation dialogs for delete player, delete court, cancel match |
| P3.10 | Empty states: no players / no courts / no queue |
| ✅ | `npm run lint` + manual online/offline pass |

## Phase 4 — Roster tab (`Dashboard.tsx` players tab)

| Item | Detail |
|---|---|
| P4.1 | Fix tier filter select → real `SkillTier` values |
| P4.2 | Per-card: paid toggle + edit button |
| P4.3 | Bulk actions: row checkboxes → Rest / Set Waiting / Mark Paid / Delete (with confirm) |
| P4.4 | Remove fake `draggable` attribute |
| ✅ | `npm run lint` + manual roster pass |

## Phase 5 — Dead code removal

| Item | Detail |
|---|---|
| P5.1 | Delete legacy `) : false ? (` QM view block (sidebar, inline add form, queue strip, court grid, 3D, FAB) |
| P5.2 | Delete hidden duplicate header cluster (`div.hidden`) |
| P5.3 | Remove orphaned state/refs/handlers (`is3DViewCollapsed`, `isRosterCollapsed`, `addMode`, `playerInput`, `waitingRoster`, `handleAddPlayerFromInput`, `parsePlayerInput`, `courtGridRef` + its GSAP effects) |
| P5.4 | Delete `src/components/Court3D.tsx`; drop unused imports (`CourtScene`, `RotateCcw`, etc.) |
| P5.5 | Keyboard `A` → open Add Player modal; keep `M` + `1–9` |
| ✅ | `npm run lint` + `npm run build` |

## Phase 6 — Verification

| Item | Detail |
|---|---|
| P6.1 | `npm run lint` |
| P6.2 | `npm run build` |
| P6.3 | Manual smoke: online↔offline, bulk add, queue→start→complete, edit player, reserved flow, quick-declare (rating unchanged), auto-start ON/OFF, court delete, roster tier filters |
| P6.4 | Commit + push |

---

## Notes
- Each phase is committed separately with a descriptive message.
- Design details for each item live in [design.md](./design.md); acceptance criteria in
  [spec.md](./spec.md).