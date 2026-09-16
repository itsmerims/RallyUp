## Purpose

The auto-start toggle moves from the courts panel header into the three-dot action menu with an obvious function label, decluttering the panel while preserving the feature.

## ADDED Requirements

### Requirement: Auto-start toggle in action menu
The system SHALL expose the auto-start-toggle capability from the three-dot action menu on the queue-management dashboard header with a clear, functional label.

#### Scenario: Toggle appears in three-dot menu
- **WHEN** a queue manager opens the three-dot action menu
- **THEN** the menu displays an auto-start entry labeled with its obvious function (e.g., "Auto-Start Matches") that reflects the current on/off state

#### Scenario: Toggle changes auto-start state
- **WHEN** a queue manager selects the auto-start entry in the menu
- **THEN** the auto-start state flips (off to on or on to off) and the menu entry immediately reflects the new state

### Requirement: Courts panel header no longer shows auto-start toggle
The system SHALL remove the auto-start toggle button from the courts panel header so the panel header contains only match generation and related actions.

#### Scenario: Header without auto-start toggle
- **WHEN** the queue-management dashboard Courts panel header is rendered
- **THEN** it does not display a standalone auto-start toggle button

### Requirement: Auto-start behavior unchanged
The system SHALL preserve the existing auto-start behavior: when enabled and a court becomes available, queued matches start automatically.

#### Scenario: Auto-start still fires on court availability
- **WHEN** auto-start is enabled in the three-dot menu and a court frees up with a queued match waiting
- **THEN** the queued match starts automatically on the free court

#### Scenario: Auto-start state persists
- **WHEN** a queue manager toggles auto-start off (or on) and reloads the dashboard
- **THEN** the persisted state is restored and the three-dot menu entry reflects it