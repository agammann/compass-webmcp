# Changelog

## 1.1.8

2026-11-16

- Bypass server-render caching through the root layout and require private browser revalidation for document and RSC responses, reducing stale references to client bundles from an older deployment while preserving browser memory restoration where supported.
- Add production-Worker checks for repeated GET and HEAD document responses, RSC responses, referenced client asset status/type/content, and missing-asset 404 behavior.
- Document live delivery acceptance and recovery without clearing browser data. This cache-policy change does not establish or claim to eliminate the cause of the earlier transient hosted asset mismatch.
- Preserve client asset caching, the browser workspace, IndexedDB name, version 1 backups and ten WebMCP tool contracts. Existing releases remain immutable.

## 1.1.7

2026-11-16

- Publish the current tested Tailwind/PostCSS 4.3.5 and TypeScript 7.0.2 toolchain with its frozen lockfile.
- Include the pinned CI action updates, verified artifact roundtrip and published-release preservation check in the source delivery.
- Point installation and recovery guidance to this matching source release; retain the workspace, IndexedDB name, version 1 backups and ten WebMCP tool contracts.

## 1.1.6

2026-11-12

- Update Vite to 8.3.7 and Rolldown to 1.2.18, addressing [GHSA-p4f5-76q4-ffq7](https://github.com/vitejs/vite/security/advisories/GHSA-p4f5-76q4-ffq7). The advisory affects development servers explicitly exposed to the network; the previous source release included affected Vite 8.2.4.
- Ship the matching React, React DOM and React Server Components 19.2.9 updates already verified on main, along with the tested fake-indexeddb and lint-tool updates.
- Retain the existing browser workspace, IndexedDB schema, version 1 backups and ten WebMCP tools. Existing published release assets remain unchanged.

## 1.1.5

2026-10-31

- Preserve concurrent Agent Access changes and prompt for review when a setting is stale.
- Refresh all open Compass tabs after updating so each uses the current permission controls.

## 1.1.4

2026-10-31

- Tighten write acknowledgements when read access is disabled.

## 1.1.3

2026-10-30

- Tighten Context Pack scoping for Space metadata and activity responses.

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
