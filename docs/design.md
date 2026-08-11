# RallyUp — Dashboard Improvement Technical Design

Status: Draft  
Related: [spec.md](./spec.md) · [proposal.md](./proposal.md) · [plan.md](./plan.md) · [tasks.md](./tasks.md)

---

## 1. Context

The codebase is a React 19 + Vite + Zustand + Firebase (local-first) PWA. The store
(`src/store.ts`) is the UI's in-memory state; `src/services/localData.ts` persists each user's
workspace to `localStorage`; `src/services/firestore.ts` syncs to Firestore (non-blocking,
fire-and-forget after the local-first refactor).

All workspace writes follow: **mutate store → `writeWorkspacePart` (local) → Firestore**.

---

## 2. Component / File Map

| File | Role in this work |
|---|---|
| `src/types.ts` | `PlayerStatus` gains `'reserved'` |
| `src/store.ts` | new `updatePlayer`; `completeMatch` gains flag; `addMatch`/`startMatch`/`cancelMatch` use `reserved`; remove `resetMatchTimer` |
| `src/services/localData.ts` | self-heal whitelist includes `'reserved'` |
| `src/services/firestore.ts` | no changes needed (generic `updatePlayer` exists) |
| `src/components/PlayerInfoModal.tsx` | read-only → editable; take `playerId` and derive live player |
| `src/components/CompactPipeline.tsx` | reserved UI, timers, auto-start toggle, paid toggle, queue reorder, confirmations, empty states, draft fix |
| `src/components/Dashboard.tsx` | delete dead block + hidden header + orphaned state; wire edit/reroute shortcuts; roster tab fixes |
| `src/components/PlayerDashboard.tsx` | optional status color updates for `reserved` |
| `src/components/LiveSessionView.tsx` | optional status color updates for `reserved` (read-only display) |
| `src/components/Court3D.tsx` | delete file |
| `src/utils/tiers.ts` | unchanged (existing helpers reused) |

---

## 3. Store Changes

### 3.1 `updatePlayer`
```ts
updatePlayer: async (userId: string, playerId: string, updates: Partial<Player>) => {
  const current = get().players.find(p => p.id === playerId);
  if (!current) return;
  const players = get().players.map(p => (p.id === playerId ? { ...p, ...updates } : p));
  set({ players });
  writeWorkspacePart(userId, 'players', players);
  if (get().connectionMode === 'online') void firestoreService.updatePlayer(userId, playerId, updates);
};
```

### 3.2 `completeMatch` flag
- Add `countsForRanking = true` last parameter.
- When `false`, skip the per-player stats/rating block; still record `shuttlecocksUsed`, scores,
  `status: 'Completed'`, `completedAt`, and reset players to `waiting`.

### 3.3 Reserved lifecycle
- `addMatch`: players → `status: 'reserved'` (before: `'active'`). Also write player list to
  Firestore `{ status: 'reserved' }`.
- `startMatch`: `reserved → 'active'` when the match starts; also update Firestore players.
- `cancelMatch`: `reserved/active → 'waiting'` (already handles all queued/active player ids).
- `completeMatch`: already resets involved players to `waiting`.

### 3.4 `resetMatchTimer` removal
- Delete from `AppState` interface and implementation; no callers remain after dead code removal.

---

## 4. PlayerInfoModal → Editable

### 4.1 Props change
```ts
interface PlayerInfoModalProps {
  isOpen: boolean;
  playerId: string | null;
  players: Player[];
  matches: Match[];
  onClose: () => void;
}
```
- Derive `const player = useAppStore(s => players.find(p => p.id === playerId))` — always live.
- If `playerId` becomes null or player is deleted while open, auto-close.

### 4.2 Form
- Controlled local state initialized from the live player (re-synced when `playerId` changes).
- Fields: Name, Tier (select), Rating (number) + "Use tier default" button, Has Paid (toggle),
  Status (select of waiting/resting/timeout), Time In / Time Out.
- Save → `updatePlayer(user.uid, player.id, { name, tier, ratingScore, hasPaid, status,
  timeIn, timeOut })`; close with a toast.
- Keep existing stats grid + recent match history (read-only).

---

## 5. CompactPipeline UI

### 5.1 Reserved players
- Visible set: `players.filter(p => ['waiting','resting','reserved'].includes(p.status))`.
- `waitingPlayers` = waiting & not drafted (auto-match eligibility unchanged).
- `reservedPlayers` = `status === 'reserved'`.
- Card: indigo border + "RESERVED" badge; `draggable=false`; excluded from `assignDraftSlot`.
- Header: `{waiting.length} waiting · {resting.length} resting · {reserved.length} reserved`.

### 5.2 Auto-start toggle
- `const [autoStart, setAutoStart] = useState(() => localStorage.getItem('rallyup_auto_start') !== 'false')`.
- Effect persists on change.
- Courts header toggle button (ON/OFF switch).
- When `autoStart` is ON, keep the current auto-start effect but:
  - show "Next up: A vs B @ Court" label;
  - emit a toast on each auto-start (`createToast`).
- When OFF, disable auto-start effect; "Start Next" enabled when `queuedMatches.length > 0`.

### 5.3 Live timers
- `const [now, setNow] = useState(Date.now())`; `useEffect` with `setInterval(1000)` while any
  match is `Active`.
- Court card elapsed = `now - active.startTime` rendered as `mm:ss`.

### 5.4 Draft retry fix
- `submitDraftQueue`: if no court, do **not** set `ready`; show inline hint
  "No courts available" on the draft card.

### 5.5 Paid toggle
- Player card: coin/check button → `togglePlayerPaid(user.uid, player.id)`.

### 5.6 Queue reorder (within court)
- Small store helper `reorderQueueMatch(userId, courtId, matchId, dir)`:
  - find court, swap adjacent match ids in `queue`, `set`, write local, Firestore `updateCourt`.
- Up/down arrow buttons shown on queued match cards.

### 5.7 Confirmations
- Lightweight helper (window-ordering-safe): `confirmAction(title, detail)` using the existing
  toast system or a small inline confirm — prefer a shared `ConfirmDialog` micro-component to
  keep the dark-theme look and avoid `window.confirm`.
- Applied to: delete player (both panels), delete court, cancel match, bulk delete.

### 5.8 Empty states
- Players: "No players yet — press Add".
- Courts: "No courts — press Court" (disabled Auto when no courts).
- Queue: keep existing empty copy + guidance to drag players.

---

## 6. Dashboard Changes

### 6.1 Remove dead code
- Delete `) : false ? (` legacy block (sidebar, inline add form, match-queue strip, court grid,
  3D CourtScene, add-court card, auto-queue FAB).
- Delete `div.hidden` duplicate header cluster (connection/session/shortcuts/notifications/
  settings/sign-out duplicates).
- Remove orphaned state: `is3DViewCollapsed`, `isRosterCollapsed`, `addMode`, `playerInput`,
  `waitingRoster`, `handlers` `handleAddPlayerFromInput`, `parsePlayerInput`.
- Remove `courtGridRef` and its two GSAP effects (their `.court-card` target is gone).
- Drop now-unused imports: `CourtScene`, `RotateCcw`, and any icon only used in dead code.

### 6.2 Wire Edit + keyboard
- Keep `onEditPlayer` wiring; pass `playerId` to the new modal signature
  (`detailPlayerId` instead of `detailPlayer`).
- Keyboard `1`–`9` still opens the Complete Match modal if a match is Active.
- `A` → `setShowAddPlayer(true)`.

### 6.3 Roster tab
- Replace broken `<select>` tier options with real `SkillTier` values (`All` + 9 tiers).
- Card buttons: `Pencil` (open edit), `Trash` (confirm), paid toggle.
- Bulk mode: checkbox column, selection state, bulk action bar (Rest / Set Waiting / Mark Paid /
  Delete with confirm).
- Remove `draggable` attribute (no drop target).

### 6.4 Complete Match modal
- Pass `countsForRanking={!quickDeclare}` to `completeMatch`.

---

## 7. Data Consistency

- All new writes follow the local-first write path (store → local → Firestore fire-and-forget).
- `reserved` players written to Firestore as `status: 'reserved'`; readers (LiveSessionView,
  PlayerDashboard) render it via badge color mapping — add a color entry for `reserved` in each
  status color map and in `readWorkspace`'s self-heal whitelist.

---

## 8. Testing Checklist (manual)
1. Online↔offline switching during all flows (reserved/queue/start/complete/edit).
2. Edit player persists across reload and across mode switch.
3. Quick-declare: rating/stats unchanged; Score-Entry: rating changes by ±15/−10.
4. Auto-start ON auto-starts + toast; OFF requires Start Next.
5. Roster tier filter returns correct players for each of the 9 tiers.
6. Delete/cancel paths show confirmation and work offline.
7. `npm run lint` + `npm run build` clean.