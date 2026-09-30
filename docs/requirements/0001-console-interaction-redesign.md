# Console interaction and visual redesign

Status: pending-verification

- Owner: console frontend
- Created: 2026-09-30
- Updated: 2026-09-30

## Problem and outcome

The user rejected the first cosmetic refinement. Buttons, inputs, selectors,
page surfaces and overlays need a coherent redesign, with explicit verification
of the existing page states and interactions rather than route smoke alone.

## Scope and ownership

All console routes and shared UI controls are in scope. The existing sidebar
appearance, navigation entries and behavior are preserved at the user's explicit
request. Element Plus continues
to own controls, overlay positioning and modal focus. Existing page runtimes own
selection, drafts, polling and actions. Workspace CSS owns the console palette
and layout; the shared control stylesheet owns console control presentation.
Backend projections remain the authority for business meaning. No public API,
database, authentication policy, dependency or deployment change is proposed.

## Interaction and failure behavior

Use quiet neutral filled controls, a clear primary action, consistent sizing,
legible labels and distinct hover, keyboard-focus, selected, disabled, invalid
and busy states. Menus and drawers must fit the viewport. Preserve one scroll
owner per region and retained snapshots during background refresh. Transitions
must not move a running task's data or replay on polling. Honor reduced motion.

Requested decorative motion: a direct pointer dot and requestAnimationFrame ring
with 0.15 interpolation; requestAnimationFrame/easeOutCubic metric counters;
setInterval character reveal with a step-end border cursor; overview-card
perspective of 800px and rotations clamped to ±15 degrees with radial highlights;
independently timed login circles; pure CSS linear infinite loading rotation;
a 1.6-second ease-in-out pendulum at the overview's upper left; an inset
clip-path reveal at its lower left. Decorative layers do not intercept input.

## Acceptance and verification matrix

| Area | Required states and interactions | Evidence |
| --- | --- | --- |
| Shared controls | Single/multiple/grouped selection, keyboard menus, disabled/invalid/busy controls, confirmation, focus return, nested overlays | Isolated browser assertions |
| Authentication/shell | Login failure/success, capability navigation, theme, mobile navigation, route switching | Mock browser assertions |
| Overview | Loading/error/retry, ready/empty metrics, range changes | Mock browser assertions |
| Accounts | List/cards, search/filter, selection, edit/add, groups, import modes, batch menus, operation feedback | Mock browser assertions |
| Monitor | Loading/error/ready, auto-refresh pause/resume, interval, detail tabs and drawer | Mock browser assertions |
| Logs | Loading/error/empty/data, filters/reset, selection/delete confirmation, export, detail/preview | Mock browser assertions |
| Gallery | Loading/error/empty/data, search/tags, layout/selection, preview, tags, download, storage actions | Mock browser assertions |
| Proxy | Loading/error/ready, direct/group/custom drafts, validation, group editor, import and operation feedback | Mock browser assertions |
| Settings | Loading/error/retry, every settings tab, save/validation, nested editors and confirmation | Mock browser assertions |
| Studio | All compose modes, model/parameter menus, history, prompt picker, references, sending/success/error/cancel, image/file results | Mock browser assertions |
| Visual quality | Desktop and narrow phone, light/dark, long content, scrolling, focus, reduced motion | Screenshots and geometry assertions |

Source-discovered paths are recorded in the local verification inventory. Report
actual executed checks and remaining gaps separately. Mock acceptance verifies
frontend behavior, not real upstream providers, production data or delivery.
Visual acceptance remains with the user. No real write operations are exercised.

## Verification boundary

Local checks cover 91 page-state and interaction scenarios, 19 shared-control
assertions and 12 authentication, capability, viewport and proxy-state checks.
Additional visual checks cover both themes, 320/390/640/1440px composer alignment,
neutral selector focus, image preview dismissal and reduced motion. Build and
TypeScript checks pass. The repository's separate runtime command cannot start
because its referenced local test files are absent.

Import providers, backup restore, upstream image generation and remote service
effects are not verified against live services. Import entry dialogs were
exercised; this does not certify every provider-specific payload or destructive
bulk-operation combination. Visual approval and external verification remain
pending. No production data was changed.

## Documentation and rollback

Update the frontend map if the style entry points change and maintain the
Unreleased changelog. No ADR or persistence migration is required: ownership
and data contracts are unchanged. The frontend-only diff can be reversed
without touching stored data. Generated tests, screenshots and coverage output
remain local under the existing ignored test directories.
