# RallyUp — Dashboard Improvement Task Tracker

Status legend: `⬜ pending` · `🔄 in progress` · `✅ done` · `❌ blocked`

---

## Phase 1 — Data layer

| ID | Task | File(s) | Status |
|---|---|---|---|
| P1.1 | Add `'reserved'` to `PlayerStatus` | `src/types.ts` | ✅ |
| P1.2 | Add `updatePlayer` action + interface entry | `src/store.ts` | ✅ |
| P1.3 | `completeMatch` gains `countsForRanking` flag | `src/store.ts` | ✅ |
| P1.4 | `addMatch` marks players `reserved` (+ Firestore) | `src/store.ts` | ✅ |
| P1.5 | `startMatch` `reserved→active`; `cancelMatch` → `waiting` | `src/store.ts` | ✅ |
| P1.6 | Self-heal whitelist includes `'reserved'` | `src/services/localData.ts` | ✅ |
| P1.7 | Status color/badge entries for `'reserved'` | `Dashboard.tsx`, `PlayerDashboard.tsx`, `LiveSessionView.tsx` | ✅ |
| P1.8 | Remove `resetMatchTimer` | `src/store.ts` | ✅ |
| P1.V | `npm run lint` passes | — | ✅ |

## Phase 2 — Edit Player feature

| ID | Task | File(s) | Status |
|---|---|---|---|
| P2.1 | `PlayerInfoModal` takes `playerId`, derives live player | `src/components/PlayerInfoModal.tsx` | ✅ |
| P2.2 | Editable fields (name/tier/rating+reset/paid/status/times) | `src/components/PlayerInfoModal.tsx` | ✅ |
| P2.3 | Save → `updatePlayer`; Cancel; toast | `src/components/PlayerInfoModal.tsx` | ✅ |
| P2.4 | Dashboard uses `detailPlayerId`; wire from both views | `src/components/Dashboard.tsx` | ✅ |
| P2.V | Manual: edit persists across reload + mode switch | — | 🔄 |

## Phase 3 — Courts & Queues UI/UX

| ID | Task | File(s) | Status |
|---|---|---|---|
| P3.1 | Reserved players visible with badge; counts header | `src/components/CompactPipeline.tsx` | ✅ |
| P3.2 | Reserved not draggable / not assignable to drafts | `src/components/CompactPipeline.tsx` | ✅ |
| P3.3 | Auto-start toggle + "Next up" hint + toast | `src/components/CompactPipeline.tsx` | ✅ |
| P3.4 | OFF mode: Start Next triggers (enabled when queue exists) | `src/components/CompactPipeline.tsx` | ✅ |
| P3.5 | Fix draft submit (no silent retry; inline hint) | `src/components/CompactPipeline.tsx` | ✅ |
| P3.6 | Live elapsed timer (1 s, mm:ss) | `src/components/CompactPipeline.tsx` | ✅ |
| P3.7 | Paid badge + quick toggle on player cards | `src/components/CompactPipeline.tsx` | ✅ |
| P3.8 | Queued match reorder (up/down) + Start shortcut | `src/components/CompactPipeline.tsx` + store helper | ✅ |
| P3.9 | Confirm dialogs: delete player/court, cancel match | `src/components/CompactPipeline.tsx` | ✅ |
| P3.10 | Empty states (players/courts/queue) | `src/components/CompactPipeline.tsx` | ✅ |
| P3.V | `npm run lint` + manual online/offline pass | — | 🔄 |

## Phase 4 — Roster tab

| ID | Task | File(s) | Status |
|---|---|---|---|
| P4.1 | Fix tier filter to real `SkillTier` values | `src/components/Dashboard.tsx` | ✅ |
| P4.2 | Per-card paid toggle + edit button | `src/components/Dashboard.tsx` | ✅ |
| P4.3 | Bulk actions (Rest/Wait/Paid/Delete + confirm) | `src/components/Dashboard.tsx` | ✅ |
| P4.4 | Remove fake `draggable` | `src/components/Dashboard.tsx` | ✅ |
| P4.V | `npm run lint` + manual roster pass | — | 🔄 |

## Phase 5 — Dead code removal

| ID | Task | File(s) | Status |
|---|---|---|---|
| P5.1 | Delete legacy `) : false ? (` QM view block | `src/components/Dashboard.tsx` | ✅ |
| P5.2 | Delete hidden duplicate header cluster | `src/components/Dashboard.tsx` | ✅ |
| P5.3 | Remove orphaned state/refs/handlers | `src/components/Dashboard.tsx` | ✅ |
| P5.4 | Delete `Court3D.tsx`; prune unused imports | `src/components/Court3D.tsx`, `Dashboard.tsx` | ✅ |
| P5.5 | Keyboard `A` → Add modal; keep `M`, `1–9` | `src/components/Dashboard.tsx` | ✅ |
| P5.V | `npm run lint` + `npm run build` | — | ✅ |

## Phase 6 — Verification & ship

| ID | Task | Status |
|---|---|---|
| P6.1 | `npm run lint` | ✅ |
| P6.2 | `npm run build` | ✅ |
| P6.3 | Manual smoke (online↔offline, queue→start→complete, edit, reserved, quick-declare, auto-start, filters) | 🔄 |
| P6.4 | Commit + push | ✅ |

---

## Milestones
- **M1** — Data layer merges cleanly (`P1`). ✅
- **M2** — Player editing live end-to-end (`P2`). ✅
- **M3** — Courts & Queues UX pass done (`P3`). ✅
- **M4** — Roster tab fixed (`P4`). ✅
- **M5** — Codebase cleaned (`P5`). ✅
- **M6** — Shipped and verified (`P6`). 🔄
