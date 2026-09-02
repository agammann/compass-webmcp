# Devpost submission copy

## Project name

Compass

## Tagline

Your personal context. Your rules. Your agent.

## Short description

Compass is a local-first personal knowledge workspace and WebMCP control plane. Users organize notes, tasks, bookmarks, and snippets into Spaces, assemble a temporary Context Pack, and explicitly choose which read and write capabilities an agent may use. Typed WebMCP tools operate on the same IndexedDB-backed repository as the human UI, so every allowed change appears live, every denied or successful agent action is auditable, and recent writes can be undone.

## Inspiration

Personal agents become far more useful when they understand our current projects, open tasks, references, and decisions. But the obvious shortcut—handing an agent an entire personal workspace—creates an uncomfortable privacy and control tradeoff. We wanted a product where the user can see and change the boundary, not merely trust a broad authorization screen.

Compass turns that boundary into a first-class object: a Context Pack. It is a temporary, understandable bundle of Spaces and selected items, further constrained by item type and live read/write switches.

## What it does

Compass stores notes, tasks, bookmarks, and snippets locally in IndexedDB. Users can create Spaces, build Context Packs, search deterministically, link related items, complete tasks, and import or export a validated JSON backup.

When WebMCP is available, Compass registers ten typed tools for reading the active context, listing Spaces, searching and retrieving items, reviewing recent activity, creating and updating items, completing tasks, linking records, and creating a new inactive Pack. Permission changes rebuild the registry immediately. Every handler repeats the permission and Pack checks, and agent writes appear live in the UI with readable audit entries and Undo.

The included fictional Project Atlas workspace gives judges a safe, useful flow immediately: ask the agent to find launch blockers, create a high-priority task for the most urgent one, disable writes, confirm the write surface disappears, then undo an agent change.

## How we built it

- React 19, TypeScript, Vite, and Vinext for the responsive interface
- Dexie over IndexedDB for local-first persistence and reactive updates
- Zod and closed JSON Schemas for import and tool-input validation
- The WebMCP imperative API with AbortController-managed registration
- Shared repository and permission modules for both UI and agent operations
- Vitest and fake-indexeddb for deterministic permission, validation, undo, registration, and end-to-end tool tests
- Cloudflare/OpenAI Sites deployment configuration

## Challenges we ran into

The hardest part was making permissions a real runtime boundary rather than decorative switches. Tools must disappear when a capability is disabled, but a stale or in-flight handler also needs to reject the operation. We solved this with both dynamic registration and repeated handler-level gates.

Undo also required careful design. We record the exact before-state inside the same repository layer used by agent writes, then associate the audit event with a bounded undo record. That keeps the feature explainable and avoids pretending the app has unlimited version history.

Finally, strict import validation needed more than parsing JSON. Compass checks size, schema version, unexpected properties, safe URLs, unique identifiers, and references between Spaces, items, Packs, relations, settings, activity, and undo records before any replacement occurs.

## Accomplishments that we're proud of

- A complete local-first product that remains useful without WebMCP support
- Ten real, typed tools backed by persistent application state
- Immediate permission-driven registration plus defense-in-depth handler checks
- Live UI refresh, transparent denial logging, and reversible agent writes
- A judge-ready fictional demo with no account, API key, or onboarding dependency
- Deterministic automated tests for the highest-risk trust boundaries

## What we learned

WebMCP is most compelling when the website exposes meaningful domain operations rather than reproducing button clicks. A compact tool like `search_personal_context` can return ranked, permission-scoped records with stable IDs and clear provenance; the agent does not need to infer state from pixels.

We also learned that tool metadata is part of the safety design. Concise descriptions, read-only hints, untrusted-content hints, closed schemas, and small structured responses give the client and model better information for deciding how to use a tool.

## What's next for Compass

- Optional end-to-end encrypted sync between a user's devices
- Pack expiration, scheduled deactivation, and per-tool rate limits
- Richer relation editing without exposing additional context
- Import adapters for common note and bookmark formats
- Signed export manifests and stronger local backup history
- Broader browser interoperability as the WebMCP specification evolves

## Built with

TypeScript, React, Vite, Vinext, IndexedDB, Dexie, Zod, Vitest, WebMCP, Cloudflare Workers, OpenAI Sites

## Published links

- Live app: https://contextdock-control-plane.alx21.chatgpt.site
- Public repository: https://github.com/agammann/compass-webmcp
- Demo video: https://youtu.be/DtfjV9JT3Xk
