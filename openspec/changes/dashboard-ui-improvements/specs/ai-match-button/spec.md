## Purpose

The one-click match-generation button is renamed and rebranded to surface the AI-powered matching capability to queue managers.

## ADDED Requirements

### Requirement: AI-labeled match button
The system SHALL label the one-click match-generation button with an AI identifier so its purpose is immediately clear to queue managers.

#### Scenario: Button label includes AI
- **WHEN** the queue-management dashboard Courts panel is rendered in idle (non-collapsed) header state
- **THEN** the match-generation button displays a label containing the word "AI" (e.g., "AI Match") instead of the generic "Auto" label

#### Scenario: Disabled state retained
- **WHEN** fewer than four waiting players or no courts are available
- **THEN** the AI-labeled button renders disabled, indicating match generation is unavailable

### Requirement: Keyboard shortcut preserved
The system SHALL continue to trigger the one-click match generation with the existing keyboard shortcut regardless of the button's new label.

#### Scenario: Shortcut still generates a match
- **WHEN** a queue manager presses the documented keyboard shortcut and at least four players are waiting and a court is available
- **THEN** the system generates and queues a match exactly as it would when clicking the renamed button