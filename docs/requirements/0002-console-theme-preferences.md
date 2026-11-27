# 0002: Console theme preferences

Status: pending-verification

- Owner: Console frontend
- Created: 2026-11-18
- Updated: 2026-11-18
- Related ADR: [Backend owns control panel semantics](../adr/0001-backend-owns-control-panel-semantics.md)

## Problem and user outcome

Users can choose a light or dark console and personalize its accent color. Status labels, log timings, selected controls, and history row actions need consistent hierarchy, spacing, and alignment.

## Current behavior and evidence

[`theme.ts`](../../web-vue/src/lib/theme.ts) manages the light/dark preference. [`style.css`](../../web-vue/src/style.css) defines semantic colors and maps them to Element Plus. [`controls.css`](../../web-vue/src/styles/controls.css) styles segmented controls and checkboxes. [`AppShell.vue`](../../web-vue/src/layouts/AppShell.vue) filters navigation by capability.

## Scope

- Add Theme Selection after System Settings in administrator navigation and make it available to authenticated User Key sessions.
- Provide four accent presets and a custom color picker. Apply updates immediately and retain preferences in the current browser.
- Align conversation history actions and the primary line of log rows. Use the theme accent for active refresh and enabled configuration states. Keep shared outcome colors for actual results. Strengthen Settings selection and correct checkbox states.

## Non-goals

- Account synchronization, server settings, and changes to Image Task execution.

## Domain language

Use **User Key**, **Call Record**, and **Image Task** as defined in [`CONTEXT.md`](../../CONTEXT.md). A theme preference is a browser-local UI setting.

## Unique owners

| Concern | Authoritative owner | Interface consumed by others | Forbidden mirror or fallback |
| --- | --- | --- | --- |
| Theme state and persistence | `lib/theme.ts` | Reactive mode and accent | Independent header and page preferences |
| Semantic colors and control styling | `style.css`, `styles/controls.css` | Shared CSS variables | Page-local copies of semantic palettes |
| Log status and duration meaning | Call Record projection | Existing labels and tones | Reclassifying records in Vue |
| Navigation and layout | `AppShell.vue` and affected pages | Authenticated route and shared controls | Granting access to system configuration through theme navigation |

## Backend Modules and Interfaces

The feature uses the existing authenticated shell and leaves API contracts and Image Task execution intact.

## Frontend interaction and responsive behavior

The theme page stays in the normal shell scroll region. Presets and appearance controls expose selection and keyboard focus. The picker uses the Element Plus popup and applies the color on confirmation. Desktop and mobile history put status labels beside the row actions.

## Persistence impact

Browser local storage retains one accent preference alongside the existing mode. Invalid or missing colors use the default preset. The frontend can apply changes for the active page when browser storage is unavailable.

## Concurrency, security, and failure behavior

The route requires login. Theme values accept six-digit hexadecimal colors. Theme changes run locally and require no server write.

## Acceptance criteria

- [ ] Both roles can open Theme Selection, with system configuration restricted to administrators.
- [ ] Light/dark mode, presets, custom color, and reset update the UI and persist across reloads in the same browser.
- [ ] History icons and status labels share a row center. Log timing, result, and actions align with the primary text, including rows with secondary details. Normal timings are neutral and exceptional timings use semantic colors.
- [ ] Automatic refresh, enabled User Keys, enabled account groups, and enabled proxy groups or nodes use the selected accent. Paused and disabled states use the neutral palette.
- [ ] Checked, partial, disabled, and keyboard focus states are visible. Settings selection stands out in both modes.
- [ ] The theme page fits desktop and a 390 px viewport.

## Verification matrix

| Acceptance criterion | Verification level | Evidence required | Status |
| --- | --- | --- | --- |
| Theme access and persistence | Browser | Administrator and User Key routes with mocked API, picker and reload | Passed |
| Alignment, selection, accessibility, overflow | Browser | 1440 px and 390 px Chrome checks with fixtures, including row centers, checkbox states, and horizontal overflow | Passed |
| Frontend integrity | Build | `npm run build` including icon check, TypeScript, and Vite | Passed |
| Frontend runtime suite | Runtime | `npm run test:runtime` | Unavailable. The checkout is missing `tests/local-icons-runtime.mjs` |
| User acceptance | Product review | Confirm the appearance in normal use | Pending |

## Documentation and CHANGELOG impact

Update the frontend route map and the Unreleased section of `CHANGELOG.md`.

## ADR requirement

No ADR is required for browser-local presentation preferences within the existing ownership boundary.

## Rollback

Revert the frontend changes. The browser can retain the unused accent preference without affecting previous versions.

## Unresolved questions

None.
