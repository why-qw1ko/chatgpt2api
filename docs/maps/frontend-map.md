# Frontend Map

Status: current

The Vue application owns transport validation, interaction state, layout, and
rendering. Business meaning arrives through backend projections.

## Route ownership

The route source is
[`../../web-vue/src/router/routes.ts`](../../web-vue/src/router/routes.ts).

| Route | Page owner | Principal page-private runtime/adapters |
| --- | --- | --- |
| `/login` | `Login.vue` | Auth adapter and redirect validation |
| `/` | `Dashboard.vue` | `dashboard/useDashboardPage.ts`, `statsApi` |
| `/accounts` | `Accounts.vue` | `accounts/useAccountsPage.ts`, account CRUD, selection, import, bulk-operation, and test runtimes |
| `/settings` | `Settings.vue` | Settings configuration, integrations, Prompt Sources, User Keys, backup, and external-source runtimes |
| `/proxy` | `Proxy.vue` | Default-proxy, group, and node-import runtimes; `proxyApi` |
| `/logs` | `Logs.vue` | Query, selection, export, and detail runtimes; `logsApi` |
| `/monitor` | `Monitor.vue` | Realtime list and detail runtimes; `monitorApi` |
| `/gallery` | `Gallery.vue` | Query, interaction, and operation runtimes; `galleryApi` |
| `/studio` | `Studio.vue` | Send, chat stream, image/file task, polling, conversation, prompt, model, layout, and scroll runtimes |
| `/debug` | Redirect only | Redirects to `/studio`; it is not a separate page |

`AppShell.vue` owns authenticated product navigation and header-level overlays.
Each page owns its responsive composition and has one explicit scroll owner per
scrolling region.

## Data path

```mermaid
flowchart LR
    Contract["Backend JSON contract"] --> Adapter["web-vue/src/api adapter"]
    Adapter --> Runtime["Page or page-private runtime"]
    Runtime --> View["Vue page/components"]
    ElementPlus["Element Plus controls"] --> UI["Product UI adapters / CSS theme"]
    UI --> View
```

- `web-vue/src/api/` owns HTTP transport, request types, response validation,
  and protocol normalization.
- Page-private runtimes own drafts, selection, polling, retained snapshots,
  loading/error state, overlay state, and orchestration for one page.
- Vue components render final backend semantics and page state. They may format
  pure visual values, but cannot infer backend status, capability, or next
  action from raw error strings or parallel flags.

## UI ownership boundary

| Belongs to `element-plus` | Belongs to this repository |
| --- | --- |
| Form controls, menus, popovers, modal dialogs/drawers, keyboard focus primitives, cards, and notifications | LuxuryImage branding, CSS tokens, theme preference, UI adapters, AppShell, routes, product copy, tables, charts, non-modal panels, page workflows, and responsive layout |

`web-vue/src/components/ui/` adapts Element Plus to the product's sizing,
semantic tones, model values, and overlay contracts. Page-specific code stays
next to its page. `web-vue/src/style.css` owns the light/dark CSS tokens and
maps them to Element Plus variables; `web-vue/src/lib/theme.ts` owns preference
persistence for light/dark modes. The authenticated shell imports
`web-vue/src/styles/workspace.css` for console-only light/dark palettes, control density, responsive toolbars, and surface styling.
`PanelHeader` provides an optional page eyebrow; controls in the same action group share
a height, while primary/secondary emphasis is expressed through color.
`useWorkspaceAtmosphere` owns the shell-scoped theme marker and delegated,
frame-limited pointer lighting, with reduced-motion/touch gating and unmount cleanup.
The login page keeps the base theme. Non-modal task panels use a non-blocking region
because an Element Plus drawer traps focus even without a backdrop. Domain
tables retain semantic HTML row slots and a single internal scroll container.

## Lifecycle rules

- Initial load, background refresh with a retained snapshot, true empty state,
  and error state are distinct.
- Entering a page may fetch immediately; refresh timers have one owner and are
  disposed with that owner.
- Closing an overlay returns focus according to the shared overlay contract and
  clears trigger states; pages do not add a competing focus lifecycle.
- A container that owns scrolling must have a bounded size in fixed-layout mode.
  In natural-height mode, document scrolling is the owner and nested regions do
  not claim the same axis.
- Single-item and batch actions call the same bulk Interface with one ID when
  their business semantics are identical.

See [`../control-panel-data-contract.md`](../control-panel-data-contract.md) for
projection consumption rules and [`critical-flows.md`](critical-flows.md) for
cross-layer sequences.
