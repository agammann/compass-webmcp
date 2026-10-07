# Contributing

Use Node.js 24 and pnpm 11.19.0. Install the frozen lockfile and run the README verification commands before proposing changes. Include a regression test for behavior changes and describe what you actually verified.

Preserve existing IndexedDB data, the browser-local architecture and the distinction between whole-Space and individual-item access. Keep user documentation and page-side tool schemas aligned with implemented behavior. Use fictional data in tests and screenshots. Never commit local workspaces, credentials or generated build output.

Run `pnpm test:audit-policy` and `pnpm security:audit` with the other checks. CI retains the full dependency report; review it when changing dependencies. `pnpm package:release` requires a clean committed tree. Verify the actual source ZIP with `python scripts/unpack-release.py --out ../compass-clean-consumer`, then run a fresh frozen install, build and browser suites from its extracted folder. Packaging validation uses Python 3.11+ standard-library tools; the application uses Node.js 24+.
