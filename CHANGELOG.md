# Changelog

## 1.1.2

2026-10-30

- Verify the unchanged ten native WebMCP tools and permission lifecycle in Chrome 157 by extending the tested browser-version gate after all four native cases passed locally.
- Keep the browser workspace, IndexedDB schema, version 1 backups, and tool contracts unchanged.

## 1.1.1

2026-10-06

- Retain the existing browser-local workspace, Context Pack permissions, safe
  Undo and version 1 backups with a documented v1 support/recovery contract.
- Apply available patched transitive updates: tinypool 2.1.2, source-map-js
  1.2.2 and sharp 0.35.5. Retain the current framework and runtime dependencies.
- Deliver a source ZIP with MIT license, frozen lockfile and checksums, verified
  through fresh source installation and ordinary/native browser suites before
  publishing the exact checked main commit.

Earlier source version: 1.1.0. Historical verification remains dated in README.md.
