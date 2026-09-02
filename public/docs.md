---
title: Compass WebMCP Documentation
description: Tool catalog, permission model, and production verification flow for Compass.
canonical: https://compass-control-plane.alx21.chatgpt.site/docs
last-updated: 2026-09-02
---

# Compass WebMCP Documentation

Compass is a local-first personal knowledge workspace with ten imperative, page-side WebMCP tools. The tools operate on the same IndexedDB-backed state as the visible interface.

## Quick start

1. Open [Compass](https://compass-control-plane.alx21.chatgpt.site/) in a WebMCP-capable browser.
2. A clean browser initializes the clearly labeled fictional Atlas Launch demo automatically.
3. Confirm WebMCP, read, write, and the intended item types are enabled in Agent Access.
4. Ask the agent to search the active Context Pack for unresolved launch blockers.
5. Ask it to create a high-priority task and verify the item and Agent Activity update visibly.
6. Disable write access and confirm mutation tools disappear.

## Tools

Read tools: `get_active_context`, `list_spaces`, `search_personal_context`, `get_personal_item`, and `list_recent_activity`.

Write tools: `create_personal_item`, `update_personal_item`, `complete_task`, `link_personal_items`, and `create_context_pack`.

Every handler validates its input and repeats the current Context Pack, read/write, and item-type permission checks. Stored content is returned as untrusted data. Permission changes abort the previous registration lifecycle and rebuild the exposed tool set.

## When an agent should use Compass

Use Compass when the person asks you to find, summarize, create, update, connect, or complete records inside the active Context Pack. Start with `get_active_context`. Do not use Compass for cloud accounts, external APIs, files outside this browser origin, or any record the active pack and visible permissions do not expose.

## Human control

The human selects the active Context Pack and controls every permission in the visible interface. Agent writes appear in Agent Activity and supported recent mutations can be undone. Creating a Context Pack never activates it; activation remains a human action.

See the [agent-readable overview](https://compass-control-plane.alx21.chatgpt.site/index.md), [privacy details](https://compass-control-plane.alx21.chatgpt.site/privacy), and [public source](https://github.com/agammann/compass-webmcp).
