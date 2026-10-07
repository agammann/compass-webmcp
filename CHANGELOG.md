# Changelog

## 1.1.1

2026-10-06

- Retain the existing browser-local workspace, Context Pack permissions, safe
  Undo and version 1 backups with a documented v1 support/recovery contract.
- Apply available patched transitive updates: tinypool 2.1.2, source-map-js
  1.2.2 and sharp 0.35.5. Retain the current framework and runtime dependencies.
- Accept only the documented unpatched braces 3.0.3 advisory for this release;
  preserve the full audit and fail for other findings or an available patch.
- Deliver a source ZIP with MIT license, frozen lockfile and checksums, verified
  through fresh source installation and ordinary/native browser suites before
  publishing the exact checked main commit.

Earlier source version: 1.1.0. Historical verification remains dated in README.md.
