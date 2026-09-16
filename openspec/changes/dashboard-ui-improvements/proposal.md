## Why

The dashboard's main QM courts tab uses a fixed 3-panel layout (PLAYERS | QUEUE | COURTS) that doesn't adapt when the players column isn't needed. The auto-matchmaker button ("Auto") is tucked into the courts panel header with a generic name that doesn't communicate its AI-powered nature. The auto-start toggle ("Auto ON/OFF") is also exposed as a standalone button when it belongs in a secondary menu. These issues reduce discoverability, waste horizontal space, and make the dashboard feel less polished.

## What Changes

- **Collapsible Players column**: The PLAYERS panel becomes collapsible via a toggle. When hidden, the QUEUE and COURT panels expand fluidly to fill the available space.
- **Rename auto-match button**: The "Auto" button gets renamed to "AI Match" (or similar) to clearly communicate the AI-powered matching capability.
- **Move auto-start toggle to three-dot menu**: The "Auto ON/OFF" button is removed from the courts panel header and relocated into the three-dot action menu with a clear label like "Auto-Start Matches".
- **Improved auto-matchmaker logic**: Refine the `handleAutoMatch` and `generateOptimalMatch` flow — improve team balance scoring, wait-time weighting, and repeated-pairing detection to produce better matches more consistently.

## Capabilities

### New Capabilities
- `collapsible-panel`: Collapse/expand the players panel with fluid layout adaptation across the dashboard pipeline
- `ai-match-button`: Rename and rebrand the one-click auto-match button to surface the AI matching capability
- `auto-start-menu-item`: Relocate the auto-start toggle into the three-dot action menu

### Modified Capabilities

## Impact

- `src/components/CompactPipeline.tsx` — panel collapse state, layout grid changes, button rename/move
- `src/components/Dashboard.tsx` — three-dot menu additions, `handleAutoMatch` logic improvements
- `src/utils/matchmaker.ts` — scoring algorithm refinements
- `src/store.ts` — potential new state for panel collapse preference (localStorage)
