## 1. Collapsible Players Panel

- [x] 1.1 Add `panelCollapsed` state in `CompactPipeline.tsx` initialized from `localStorage['rallyup_players_panel_collapsed']`, with a `useEffect` persisting changes
- [x] 1.2 Add a collapse/expand toggle button (ChevronLeft/ChevronRight, lucide-react) to the PLAYERS panel header
- [x] 1.3 When collapsed, hide the players panel content and swap the `xl` grid to a two-column layout `grid-cols-[minmax(340px,1.35fr)_minmax(340px,1.35fr)]` so queue and courts grow fluidly (keep stacked single-column below `xl`, where collapse is irrelevant)
- [x] 1.4 Verify on desktop that collapsing/expanding adapts panel widths without overflow and search/filter content stays usable at minimum width

## 2. AI Match Button Rename

- [x] 2.1 Rename the Sparkles one-click button label from "Auto" to "AI Match" in `CompactPipeline.tsx:245` (keep icon, disabled logic, and styles)
- [x] 2.2 Confirm the `M` keyboard shortcut in `Dashboard.tsx:185` still triggers match generation unchanged

## 3. Move Auto-Start Toggle to Three-Dot Menu

- [x] 3.1 Lift `autoStart` state + `localStorage['rallyup_auto_start']` persistence from `CompactPipeline.tsx` to `Dashboard.tsx`
- [x] 3.2 Pass `autoStart` and an updater to `CompactPipeline` via props; keep the auto-start behavior effect (lines 98-110) unchanged
- [x] 3.3 Remove the "Auto ON/OFF" button from the courts panel header
- [x] 3.4 Add an "Auto-Start Matches" entry (Play icon, current on/off state indicator) to the three-dot menu in `Dashboard.tsx:737-748` that toggles the state and closes the menu
- [x] 3.5 Verify auto-start still fires on court availability and the menu reflects the persisted state after reload

## 4. Auto Matchmaker Logic Improvements

- [x] 4.1 Extract/keep tunable constants at the top of `src/utils/matchmaker.ts` (repeat windows, wait thresholds, novelty caps)
- [x] 4.2 Strengthen partner/opponent/exact-group repeat penalties in `scoreTeams` with recent-match weighting (last ~4 matches strongly penalized)
- [x] 4.3 Add rating-aware balance contribution in `scoreTeams` when `ratingScore` exists (fall back to tier weight otherwise)
- [x] 4.4 Smooth the wait score curve so it rises gently early and dominates near `WAIT_CAP_MS`, keeping the longest waiter prioritized
- [x] 4.5 Make `generateOptimalMatch` avoid the immediately-previous same-4 group when any alternative exists
- [x] 4.6 Simplify `handleAutoMatch` in `Dashboard.tsx` to use `generateOptimalMatch` result directly, keeping `window.confirm` only as a final fallback when no non-repeat option exists
- [x] 4.7 Verify: run tests/build, and sanity-check match output for balance, wait fairness, and no immediate repeat of the exact previous quartet