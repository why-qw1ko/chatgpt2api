# 0004: Studio chat context

Status: pending-verification

- Owner: repository maintainers
- Created: 2026-11-24
- Updated: 2026-11-24
- Related requirement: [Studio continuity and User Key operations](0003-studio-continuity-and-user-key-operations.md)

## Problem and user outcome

Users expect replies in the same Studio conversation to use its history across
account selection, refresh, edits, and retries. The previous request builder
sent up to 48 individual messages and could also supply upstream thread IDs.
Continuity then depended on the messages available when upstream continuation
failed. Users need a configurable total turn limit for each conversation and
a clear prompt to start a new conversation when a submission would exceed it.

## Scope and domain language

A turn is a Studio user message with its associated replies, if any. The limit
applies to the total number of turns in one conversation, including the new
submission, and defaults to three. Text requests carry the current branch's
full history through the current question. Starting a new conversation starts
with an empty history. Conversation and message ownership stay with the User Key
and Studio Conversation Repository.

The limit applies across chat, image, search, and file modes. These modes retain
their existing request interfaces. Available chat images travel with the
corresponding user message. The existing local reference cache can recover
originals in the same browser while they remain available.

## Unique owners and interfaces

| Concern | Authoritative owner | Interface consumed by others |
| --- | --- | --- |
| Effective conversation turn limit | Settings Management and Configuration | `studio_context_rounds` on administrator settings and `context_rounds` on authenticated Studio session reads |
| Current branch and transcript | Studio conversation and message runtimes | Ordered messages associated with the current question |
| Turn admission | Studio send runtime | Accept an in-range submission or prompt the user to start a conversation |
| Per-request context | Studio chat request builder | Ordered OpenAI-compatible messages and notices for unavailable reference images |
| Synced history and local originals | Studio Conversation Repository and browser reference cache | Owner-scoped conversation snapshot and local file lookup |

## Interaction and failure behavior

The administrator edits a positive integer under Settings. The composer waits
for initial session restoration unless the user starts a new conversation.
When the first load fails and there is no local conversation, the interface
asks the user to reload or start a new conversation explicitly. A submission
or resend that would add a turn above the limit is blocked before a request is
sent and prompts the user to start a new conversation. Editing or retrying an
in-range existing turn is allowed. Stored history stays available when an
administrator lowers the limit. A send with inaccessible images displays a
notice and proceeds with the available content.

Turn admission uses the transcript loaded by Studio. Simultaneous submissions
from different devices can race before their session snapshots synchronize.

Each Studio text request supplies its current branch history explicitly. It uses the
existing streaming endpoint and opts into preserving the supplied history during
compatibility normalization. Attachment lookup follows existing owner isolation
and reference retention. The settings update and session sync keep their existing
transaction boundaries. The feature requires no persistence migration or ADR.

## Acceptance and verification

| Scenario | Expected result | Verification |
| --- | --- | --- |
| Initial load and sends to the selected conversation | Each accepted text request includes the full current branch in order | Runtime and browser |
| Existing edits and retries | Editing or retrying an in-range turn replays its branch | Runtime and browser |
| Default and configured limits | The first three turns are allowed by default. A saved integer applies to subsequent submissions | Settings projection, runtime, and browser |
| Turn limit reached | Submissions and resends across modes that would exceed the limit make no request and prompt the user to start a conversation | Runtime and browser |
| New conversation | A new conversation starts with its own first turn and empty history | Runtime and browser |
| Uploaded image available or missing | Available images accompany their message. Missing images trigger a notice | Runtime |

The 23 targeted runtime checks and the production console build passed. The
mock browser checks at 1280 and 390 pixels verified full third-round history,
fourth-round rejection with the draft intact, setting changes, and new
conversation isolation. The desktop check also covered image replay after
reload and reference cleanup when cancelling an edit or switching conversations.
A local Axios adapter check verified that queued requests and stale 401 responses
respect the session that started them. Live upstream and user acceptance remain
pending.

## Documentation and rollback

Document the visible behavior in `CHANGELOG.md` and the Studio conversation
flow in the current frontend and data contract references. Application rollback
restores the previous request behavior. The additive configuration value can
remain in the existing settings store.
