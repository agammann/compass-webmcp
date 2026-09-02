---
title: Compass authentication and authorization
description: Why Compass needs no account and how visible page-side permissions authorize agent tools
canonical: https://compass-control-plane.alx21.chatgpt.site/auth.md
last-updated: 2026-09-02
---

# Compass authentication and authorization

Compass has no account system, login, OAuth flow, API key, or remote service identity. The application is browser-local and its WebMCP tools run only in the open page.

Authorization is controlled by the person in the visible interface:

1. The active Context Pack defines the accessible Spaces and items.
2. The WebMCP switch enables or removes page-side tools.
3. Read and write switches control allowed operations.
4. Item-type switches limit notes, tasks, bookmarks, and snippets.
5. Every tool handler re-checks the live rules before accessing IndexedDB.

These controls are not a substitute for server-side authentication because Compass has no remote data server.
