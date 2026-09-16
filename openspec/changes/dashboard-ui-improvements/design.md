## Context

The QM dashboard's courts tab (`CompactPipeline.tsx`) is a 3-panel flex/grid layout at the `xl` breakpoint: `grid-cols-[minmax(280px,1fr)_minmax(340px,1.35fr)_minmax(340px,1.35fr)]` (players | queue | courts). Below `xl` it stacks to one column. There is no per-column collapse control today.

Two auto features live side by side in the courts panel header (`CompactPipeline.tsx:245`):
1. "Auto" (Sparkles) → one-click match generation wired to `handleAutoMatch` in `Dashboard.tsx:122`.
2. "Auto ON/OFF" (Play) → `autoStart` local state (`CompactPipeline.tsx:49`), persisted to `localStorage['rallyup_auto_start']`, default ON.

The three-dot action menu lives in `Dashboard.tsx:737-748` and toggles via `isActionMenuOpen`. `/opsx-apply` will need the state lifted because the toggle moves from `CompactPipeline` to `Dashboard`.

Matching is done in `src/utils/matchmaker.ts`. `generateOptimalMatch` brute-forces the oldest waiting player with every trio, tries 3 team splits, and scores by balance/compatibility/wait/novelty. `handleAutoMatch` separately re-detects recent repeats (30-min window) and asks `window.confirm`.

## Goals / Non-Goals

**Goals:**
- Players panel collapses to free space; queue/courts grow fluidly at `xl`.
- One-click button renamed to surface AI capability.
- Auto-start toggle moves into the three-dot menu with an obvious label, same behavior.
- Matchmaker produces better pairings: fewer immediate repeats, smoother wait weighting, stronger balance when ratings exist.

**Non-Goals:**
- No changes to player/rest/reserve behavior.
- No changes to the live view, session modal, or player dashboards.
- No new external dependencies (icons come from lucide-react, already present).

## Decisions

### 1. Collapsible players panel
- Add a collapse toggle (ChevronLeft/ChevronRight) to the PLAYERS header in `CompactPipeline.tsx`.
- Collapse state in local React state, persisted to `localStorage['rallyup_players_panel_collapsed']` so it survives reloads (spec: persistence).
- Layout: the grid becomes conditional. When collapsed, render the players section with width 0/hidden (hide content via `hidden xl:flex` header-only rail or simply conditionally omit the panel and switch to a 2-column grid). Choose **conditional grid swap**: when collapsed the container uses `xl:grid-cols-[minmax(340px,1.35fr)_minmax(340px,1.35fr)]` and the players section no longer participates. The remaining panels with `min-w-0` and `1.35fr` automatically share the full width — fluid adaptation comes free from CSS grid fractional units.

### 2. Lifting auto-start state
- Move `autoStart` INIT + persistence effect from `CompactPipeline` to `Dashboard.tsx` (the component that owns the three-dot menu).
- `Dashboard` renders the menu item and passes `autoStart` + `setAutoStart` down to `CompactPipeline` as props.
- `CompactPipeline` keeps only the auto-start behavior effect (lines 98-110), unchanged. Persistence stays in `localStorage['rallyup_auto_start']` to preserve "state persists" (spec).
- Menu entry: "Auto-Start Matches" with a Play icon, showing current state (e.g., emerald dot / switch) and toggles on click, closing the menu.

### 3. Button rename
- Change the Sparkles button label from "Auto" to "AI Match" in `CompactPipeline.tsx:245`. Icon and disabled logic unchanged; keeps the `M` keyboard shortcut (`Dashboard.tsx:185`) untouched (spec: shortcut preserved).

### 4. Matchmaker improvements (`src/utils/matchmaker.ts` + `handleAutoMatch`)
- **Repeat cool-down:** In `scoreTeams`, cap novelty penalties so any partner-pair that appeared in the last ~4 matches gets strongly penalized; exact same-4-group repeats become the strongest negative signal.
- **Rating-aware balance:** `playerStrength` already prefers `ratingScore`. Add a compatibility term using the same strength when ratings exist, so near-equal strength quartets rank higher; fall back to tier weight when no rating.
- **Rematch suppression:** `handleAutoMatch` no longer relies only on `window.confirm`. Instead `generateOptimalMatch` accepts and avoids the immediately-previous same-4 group when alternatives exist; `handleAutoMatch` keeps a confirm only as a final fallback when no non-repeat option exists.
- **Wait smoothing:** make wait score rise slower early (under ~6 min) and dominate near `WAIT_CAP_MS`, so fairness vs. quality stays balanced without starving the longest waiter.
- All numbers live as named constants at the top of `matchmaker.ts`.

## Risks / Trade-offs

- Conditional grid swap could cause a brief layout jump → mitigated by CSS grid fractional sizing; no JS animation needed at `xl`, and below `xl` the panel already stacks so collapse is hidden/irrelevant on mobile.
- Lifting `autoStart` touches two components → small surface, keep the persistence key identical so existing users keep their preference.
- Stronger repeat penalties could, in small pools, repeatedly pick the same weaker pair → penalties scale with available pool size; `generateOptimalMatch` falls back gracefully (still returns a quartet).
- Logic changes alter match output; existing recent-pair confirm stays as a safety net, so no silent surprises.

## Migration Plan

- No data migration. `localStorage['rallyup_auto_start']` semantics unchanged. New key `rallyup_players_panel_collapsed` is additive.
- Rollback: revert the single commit; layout and state keys are backwards-compatible.

## Open Questions

None.