# 0003: Studio continuity and User Key operations

Status: pending-verification

- Owner: repository maintainers
- Created: 2026-11-19
- Updated: 2026-11-19
- Related ADRs: [Studio Image Tasks](../adr/0002-studio-uses-asynchronous-image-tasks.md), [Application Database](../adr/0004-use-one-application-database-with-domain-repositories.md)

## Problem and user outcome

Studio should display each answer after its prompt and continue from the
correct history after reload, editing, and retrying. A retry of an image edit
should retain the original edit inputs. Users should be able to paste a copied
image into another app and copy the visible error when an operation fails.

Administrators should be able to create a custom User Key, rotate it without
losing ownership of its records, see its daily image usage, and inspect its
Call Records. Studio and the compatible image APIs should consume the same
daily allowance. Existing User Key capabilities apply across modes.

## Current behavior and evidence

- [Studio conversation storage](../../services/storage/studio_conversation_repository.py)
  resolves equal creation times by message ID. Studio reuses the loaded order
  for text context and looks backward from a reply to find its prompt.
- [Studio send runtime](../../web-vue/src/views/studio/studioSendRuntime.ts)
  retries with no attached files. The message and preview copy actions write
  text, including the image address in the preview.
- [User Key management](../../api/accounts.py) omits null values in partial
  updates. The daily limit check runs in the image task path, while compatible
  API routes can generate images without that check.

## Scope

- Preserve the prompt/reply relationship across Studio save, load, and sync.
- Rebuild the upstream text context after branching and retain the selected
  image revision and inputs when repeating an edit.
- Provide explicit copy actions for an image, its link, and visible errors.
- Support custom key creation, server-generated rotation, daily limit removal,
  today's image usage, and logs filtered by User Key ID.
- Apply the daily allowance across all Studio and compatible API paths that
  generate or edit images.

## Non-goals

- Per-mode permissions or changes to the ownership of existing Image Tasks,
  Image Assets, Studio conversations, or Call Records.

## Domain language

User Key, Capability, Image Task, Image Asset, Call Record, and Application
Database follow [the existing domain terminology](../../CONTEXT.md).

## Unique owners

| Concern | Authoritative owner | Interface consumed by others | Forbidden mirror or fallback |
| --- | --- | --- | --- |
| Studio message relationships and branch selection | Studio conversation and send runtimes | Ordered history and edit/retry request | Random ID as turn order |
| Synced conversation history | Studio Conversation Repository | Owner-scoped session projection | Full replacement of concurrent snapshots |
| Image quota admission and settlement | Image quota service | Reserve, settle, and daily usage projection | Per-entry-point counters or browser estimates |
| User Key credentials | Auth Service and Account Repository | Validation, rotation, and administrator projection | Plaintext listing or a new identity on rotation |
| Call troubleshooting | Call Record service and repository | Exact key ID filter | Inferring caller identity from its display name |
| Studio and Settings interaction | Vue runtimes and components | Actions, focus, and status feedback | Recalculating quota from visible records |

## Backend Modules and Interfaces

The Studio session contract carries optional relationship and branch data while
accepting existing snapshots. Management endpoints require administrator
authentication. The credential update distinguishes a missing daily limit from
an explicit null. Rotation returns a new raw value once and retains the key
ID. Compatible image routes and Studio Image Tasks use the quota service to
admit requests and settle their image results.

## Frontend interaction and responsive behavior

Studio places copy controls on the applicable image result or message, offers
copy feedback, and communicates when an edit input cannot be recovered. The
User Key panel validates custom values, confirms rotation, and opens filtered
Call Records through the existing Logs view. Both pages keep their existing
layout and scrolling owners.

## Persistence impact

The existing User Key ID connects credentials, quota, and usage records. Daily
admission and settlement use durable state in the Application Database. Image
Tasks and assets keep their present storage. Older Studio messages continue to
load under the history ordering fallback.

## Concurrency, security, and failure behavior

Quota admission must serialize competing reservations by key and day. Failed
or incomplete requests release the unused portion. A retry of an image edit
with unavailable inputs must give an actionable error. Rotation invalidates
the previous credential, and credential values are excluded from lists and
Call Records.

## Acceptance criteria

- [ ] Equal-time prompts and replies retain their turn order after reload.
- [ ] Editing an earlier prompt sends the revised branch to the model.
- [ ] A successful edit can be used as the next source, and retry preserves
  the original inputs or reports precisely that they are unavailable.
- [ ] Copy writes usable image data or the displayed error. Copy link remains
  an explicit action.
- [ ] Custom creation and rotation validate values, preserve stable ownership,
  and allow clearing the daily image limit.
- [ ] One key shares daily usage across Studio and compatible image routes.
  Competing requests respect the allowance and failure frees unused quota.
- [ ] The panel shows today's allowance and opens the selected key's logs.

## Verification matrix

| Acceptance criterion | Verification level | Evidence required | Status |
| --- | --- | --- | --- |
| Studio reload, text branch, and image retry | Runtime and contract | Equal-time history, edited request, actual retry payload | Targeted checks passed |
| Copy and User Key workflow | Browser and runtime | Clipboard modes, copy feedback, key actions, narrow viewport | Mock browser passed at 1280 px and 390 px |
| Authentication, logs, and shared admission | Backend integration | Rotation, log filtering, contention, failure and partial settlement | Isolated checks passed. Full database integration pending. |

## Documentation and CHANGELOG impact

Update the user-facing changelog, compatibility API guide, and current maps
for cross-layer changes in Studio and User Key operations.

## ADR requirement

The existing Application Database decision covers an independent quota
repository for new usage records. Existing persistence owners stay in place.

## Rollback

Rolling back application code restores the previous behavior. New quota records
can remain in the Application Database. Credential rotation changes the active
secret and uses the same account record as other credential updates.

## Unresolved questions

None for the confirmed scope.
