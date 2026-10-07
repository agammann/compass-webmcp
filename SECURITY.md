# Security and data handling

Compass stores workspace content in same-origin IndexedDB. It has no application account service, cloud database or encrypted vault. A browser agent may send permitted tool results to its own provider. WebMCP permissions constrain these tools; they do not sandbox separate browser automation or code on the same origin.

Tool arguments and imported JSON are validated. Pack, item-type and read/write access are checked in the same database transaction as a tool operation. Agents can create inactive Packs within their current scope; only the interface activates one. Item content cannot change permissions or execute code. Bookmarks accept only HTTP(S) URLs. Followed links are external websites.

Undo refuses changes that would overwrite newer content or leave references broken. JSON imports validate record IDs and references before atomic replacement, and disable imported WebMCP access. Export/import does not preserve activity or undo history.

For a suspected vulnerability, use GitHub private vulnerability reporting when available on this repository. Otherwise contact the maintainer privately before sharing sensitive data. Include the affected version, observed behavior and a minimal description using fictional data. Do not put personal workspace exports or credentials in public issues.

## Accepted dependency finding for 1.1.1

The release accepts the high-severity [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) finding in braces 3.0.3 at exactly this development/build path:

```text
vinext > vite-plugin-commonjs > vite-plugin-dynamic-import > fast-glob > micromatch > braces
```

On October 6, 2026, the primary GitHub-reviewed advisory identifies versions through 3.0.3 and no patched version; the package registry ends at 3.0.3. The audit feed suggests `>=3.0.4`, which is not a published release. Available patched transitive updates are applied. This accepted finding remains in the complete audit; the checks do not establish application exploitability or eliminate the dependency risk.

`pnpm audit --json` gives the complete audit and still exits nonzero for this finding. `pnpm security:audit` records that output and checks the exact accepted advisory, severity, installed version and dependency path, current primary advisory metadata and current registry versions. New/different findings, an identified or published patch, missing/malformed metadata, audit errors and inconsistent counts fail. It uses no severity filter or blanket advisory ignore. CI retains `reports/dependency-*` evidence.

For an offline primary-source read during local verification, supply a freshly obtained official advisory JSON file with `pnpm security:audit --advisory-file <path>`. The same validation applies; CI obtains the current primary JSON directly. Do not use stale supplied metadata to claim current patch availability.
