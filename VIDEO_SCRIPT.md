# Compass demo script

Target length: 2 minutes 20 seconds

## 0:00–0:15 — Problem

**Screen:** Compass first launch.

**Voiceover:** “Personal agents are useful when they know what we are working on, but giving an agent an entire personal workspace is too broad. Compass is a local-first WebMCP control plane where the user decides exactly what context and capabilities are available.”

Click **Load Demo Workspace**.

## 0:15–0:38 — Product and boundary

**Screen:** Dashboard, Atlas Launch card, Agent Access panel.

**Voiceover:** “The fictional Project Atlas workspace contains notes, tasks, bookmarks, and snippets stored in IndexedDB. The active Context Pack is Atlas Launch. It scopes the agent to this project and these four item types. The switches on the right control WebMCP, reads, and writes in real time.”

Open **View 10 exposed tools** briefly.

## 0:38–1:10 — Primary WebMCP flow

**Screen:** Supported agent browser beside Compass.

Ask: “Search my current context for unresolved launch blockers. Summarize them, then create one high-priority task for the most urgent blocker.”

**Voiceover:** “The agent calls a typed search tool, receives deterministic results from the active Pack, and creates a task through a validated write tool. It does not inspect pixels or simulate form entry.”

Show the new task appearing in the workspace and Agent Activity.

## 1:10–1:35 — Permission enforcement

Turn **Allow write** off. Open the exposed-tools list, showing only read tools.

Ask: “Create a task called Publish final release.”

**Voiceover:** “Turning off writes unregisters the write tools immediately. Compass also repeats the check inside every handler, so a stale invocation cannot bypass the user’s current choice. Denials are structured and auditable.”

## 1:35–1:55 — Undo and transparency

Re-enable writes, create a small task if needed, open **Activity**, and click **Undo**.

**Voiceover:** “Successful agent writes include a readable activity entry and a bounded Undo action. The human can inspect what happened and restore the previous state without trusting an opaque automation history.”

## 1:55–2:12 — Local-first completeness

Show Spaces, Context Packs, and Settings.

**Voiceover:** “Compass remains a complete personal workspace without WebMCP. Users can organize Spaces, build temporary Packs, link items, complete tasks, and export or validate-import a versioned JSON backup. There is no account, server database, or API key.”

## 2:12–2:20 — Close

Return to Dashboard.

**Voiceover:** “Compass: your personal context, your rules, your agent.”
