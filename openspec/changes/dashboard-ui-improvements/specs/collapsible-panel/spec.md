## Purpose

The players column in the queue-management dashboard can be collapsed so the queue and court panels gain the freed horizontal space in a fluid, adaptive layout.

## ADDED Requirements

### Requirement: Players panel can be collapsed and expanded
The system SHALL provide a control to collapse and expand the players panel on the dashboard's queue-management layout. When collapsed, the panel's content SHALL be hidden and the remaining panels SHALL expand to use the available width.

#### Scenario: Collapsing the players panel
- **WHEN** a queue manager clicks the collapse control on the players panel header
- **THEN** the players panel collapses, hiding its content, and the queue and court panels expand fluidly to fill the available horizontal space

#### Scenario: Expanding the players panel
- **WHEN** a queue manager clicks the expand control on the collapsed players panel header
- **THEN** the players panel expands, restoring its content, and the queue and court panels return to their prior widths

### Requirement: Collapse state persists per workspace
The system SHALL persist the players panel collapse state so it is preserved across page reloads.

#### Scenario: Collapse state restored after reload
- **WHEN** a queue manager collapses the players panel and reloads the dashboard
- **THEN** the players panel renders collapsed with the queue and court panels expanded

### Requirement: Fluid layout adaptation
The system SHALL make queue and court panels fluid so their widths grow when the players panel is collapsed and shrink to their minimum useful width when it is expanded.

#### Scenario: Fluid widths when collapsed
- **WHEN** the players panel is collapsed
- **THEN** the queue and court panels widen to fill the reclaimed space without layout overflow or visual breakage

#### Scenario: Search and content remain usable at minimum width
- **WHEN** the players panel is expanded
- **THEN** the queue and court panels remain usable with their content visible and functional at their minimum widths