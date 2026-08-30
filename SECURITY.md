# Security policy

## Scope

ContextDock is a browser-local demonstration application. Security reports should focus on the application code, data validation, permission enforcement, WebMCP tool behavior, import/export handling, and deployment configuration in this repository.

## Security properties

The project is intended to preserve these properties:

- A WebMCP operation must be enabled by the global WebMCP switch and the relevant read/write switch.
- Item reads and writes must remain inside the active Context Pack and its allowed item types.
- Disabling a capability must unregister the affected tools and stale handlers must still deny access.
- Tool inputs and imported backups must reject unexpected fields and invalid cross-references.
- Bookmark URLs must use `http:` or `https:`.
- Agent writes and permission denials must produce an audit entry.
- Undo may restore only the exact before-state captured for the associated recent write.
- User content must render as text; it must not become executable HTML.

## Implemented safeguards

- Closed JSON Schemas plus Zod runtime validation
- Shared Pack and permission checks in every WebMCP handler
- AbortController-based tool-registration lifecycle
- Item/type/Space allowlists and bounded input lengths
- Safe URL validation and `rel="noreferrer"` on external links
- Versioned strict import schema, 2 MB limit, and referential-integrity checks
- IndexedDB transactions for multi-record mutations
- Structured, concise tool outputs and security-oriented tool annotations
- Suggested CSP and browser security headers in `public/_headers`
- No secrets, API keys, authentication tokens, analytics, or remote database

## Known limitations

- IndexedDB is not encrypted at rest. Anyone with access to the browser profile can inspect the data.
- Same-origin application code, a compromised dependency, or a sufficiently privileged browser extension could read the database.
- ContextDock has no user identity or server-side authorization boundary; its controls are an origin-local capability boundary for a trusted browser profile.
- WebMCP is evolving. Browser support and API shape may change, and unsupported browsers simply run the human UI without registered tools.
- An agent may summarize untrusted personal content inaccurately. The `untrustedContentHint` annotation helps signal this risk but cannot make content trustworthy.
- Undo is deliberately bounded to recorded recent mutations and is not a general history or backup system.
- `public/_headers` is honored only by compatible hosts. Apply equivalent headers in the production platform if it is ignored.

Do not use ContextDock as a password manager, secret vault, medical record system, or sole backup for important data.

## Reporting

Please open a private security report with a clear reproduction, expected impact, and affected commit. Do not include real personal data or credentials. If private reporting is unavailable, open a minimal issue requesting a secure contact channel.
