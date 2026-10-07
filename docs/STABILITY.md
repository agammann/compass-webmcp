# Compass v1 support and recovery

Release 1.1.1 supports the ordinary browser workspace: create and edit Spaces,
notes, tasks, bookmarks and snippets; search; Context Pack selection; Activity
and safe Undo; reload; and version 1 JSON export/import. The bounded newcomer
journey uses fictional records and restores exported content in a fresh browser
context. Invalid imports must preserve existing saved records.

The data remains in same-origin IndexedDB (`contextdock-v1`). There is no account,
server workspace, cloud sync or built-in encryption. Keep the existing origin to
retain data across application updates. Export before clearing browser storage,
using a different origin/profile or resetting the example. Import validates
references and disables imported WebMCP access until you enable it manually.
Activity and Undo history remain local and are not part of a backup. There is no
account recovery if browser data and backups are both lost.

Within v1, version 1 exports remain readable and the documented ten WebMCP tool
names and validated argument contracts remain supported. Ordinary controls work
without WebMCP. The experimental native integration is measured separately:
Chrome 155 uses object arguments; dated Chrome/Edge 154 records used serialized
arguments. A browser must expose the real API, and an agent must support page
tool discovery. This does not establish support for every browser or agent.

If a save conflicts with another tab, reopen the item before editing again. Undo
refuses to overwrite later changes or remove referenced content. Read the error
and use manual editing if a safe Undo is unavailable. For a rejected backup,
retain the original file, correct its structure/references and retry; do not
clear the current workspace to try to fix an invalid import.

Upgrading the source from 1.1.0 to 1.1.1 requires Node.js 24+, pnpm 11.19.0 and
the frozen lockfile. No IndexedDB or export migration is introduced. A deployment
to another origin creates a separate workspace; export/import is the supported
transfer. Remove a self-hosted deployment using its host's normal controls after
preserving backups. Removing source files does not clear browser data; Settings
offers explicit confirmed clearing when desired.

Source distributions include the MIT license and frozen lockfile. Hosted delivery has a separate acceptance check.
