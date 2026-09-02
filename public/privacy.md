---
title: Compass privacy and data handling
description: Browser-local storage and the human-controlled WebMCP access boundary
canonical: https://compass-control-plane.alx21.chatgpt.site/privacy
last-updated: 2026-09-02
---

# Compass privacy and data handling

Compass does not send workspace content to a Compass server. Notes, tasks, bookmarks, snippets, permissions, Context Packs, activity, and undo records stay in IndexedDB for the current browser origin.

The application has no account system, analytics script, cloud database, or hidden API dependency. A person can export a versioned JSON backup or clear all local data. Imports are size-limited and structurally validated before replacing the workspace.

WebMCP tools can access only records selected by the active Context Pack and allowed by the current read, write, and item-type switches. Context Pack activation remains a visible human action.

Local-first does not mean encrypted at rest. Other code running on the same trusted origin may be able to access the browser database. Use the fictional demo workspace for evaluation before storing sensitive personal information.
