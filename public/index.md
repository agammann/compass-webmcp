---
title: Compass
description: Local-first personal knowledge workspace and WebMCP control plane
canonical: https://contextdock-control-plane.alx21.chatgpt.site/
last-updated: 2026-09-02
---

# Compass

Compass is a free, local-first personal knowledge workspace and WebMCP control plane. It is built for people who want an agent to help with notes and tasks without exposing an entire personal workspace.

## What a person can do

- Store notes, tasks, bookmarks, and code snippets in browser-local IndexedDB.
- Organize information into Spaces.
- Assemble a temporary Context Pack from whole Spaces or selected items.
- Enable or disable WebMCP, read access, write access, and each item type.
- Inspect successful and denied agent actions.
- Undo supported agent writes.
- Export, import, or clear the local workspace.

## What an agent can do

In a WebMCP-capable browser, the page registers ten structured tools. Read tools describe the active scope, list visible Spaces, search permitted context, retrieve one permitted item, and list recent activity. Write tools create or update permitted items, complete tasks, link items, and create an inactive Context Pack.

Every tool handler validates its input and repeats the live Context Pack and permission checks. User-authored content is treated as untrusted data. A tool can create a Context Pack but cannot activate one; activation stays human-only.

## Architecture

The visible React interface and the WebMCP tools call the same repository functions. State is stored in IndexedDB and refreshed through the same application change event, so agent operations are immediately visible. The application has no account, hosted database, analytics script, or remote API dependency.

## Evaluation

Open the [home page](https://contextdock-control-plane.alx21.chatgpt.site/) in a WebMCP-capable browser, load the fictional Atlas demo workspace, and ask the agent to search for unresolved launch blockers. Then ask it to create a high-priority task. The new task and activity entry should appear in the interface. Disable write access and confirm write tools disappear.

See [WebMCP documentation](https://contextdock-control-plane.alx21.chatgpt.site/docs), [privacy details](https://contextdock-control-plane.alx21.chatgpt.site/privacy), and the [public source repository](https://github.com/agammann/compass-webmcp).
