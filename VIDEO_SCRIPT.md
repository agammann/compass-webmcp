# Compass narrated demo

- Public video: https://youtu.be/s5Jl8F18l5I
- Runtime: 2 minutes 35 seconds
- Source: real production WebMCP calls and visible Compass state
- Demo data: fictional Project Atlas workspace

## Storyboard

### 0:00–0:13 — Compass

Introduce Compass as a local-first personal context control plane built for WebMCP. Establish that the demonstration uses the production site, its live structured tools, and fictional data.

### 0:13–0:32 — Human-selected boundary

Show the Atlas Launch Context Pack with 21 accessible items. Explain browser-local storage and the visible WebMCP, read, write, and item-type permission controls.

### 0:32–0:50 — Typed tools

Open the exposed-tool dialog. Show ten registered page-side tools—five reads and five writes—with closed schemas and safety annotations.

### 0:50–1:10 — Real WebMCP search

Call `search_personal_context` for “unresolved launch blockers” with a five-result limit. Show Launch Readiness ranked first and the corresponding visible search state.

### 1:10–1:30 — Agent-to-UI synchronization

Call `create_personal_item` for the urgent DNS blocker. Show the new high-priority task, the item count changing from 21 to 22, and Agent Activity updating immediately.

### 1:30–1:49 — Permission revocation

Turn Allow write off. Show the registry reduced to five read tools, every mutation marked not exposed, and a fresh `create_personal_item` call rejected as unavailable.

### 1:49–2:06 — Audit trail

Show the readable agent event with actor, tool name, timestamp, and the bounded Undo action.

### 2:06–2:20 — Human undo

Use Undo. Show the task removed, the item count restored to 21, and the reversal recorded without erasing agent history.

### 2:20–2:35 — Close

Summarize the proof: scoped context, structured actions, live interface synchronization, permission enforcement, and human undo. Close with “Your personal context. Your rules. Your agent.”

