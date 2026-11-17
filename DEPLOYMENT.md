# Deploying Compass

Compass serves a browser-local application. It requires no application database, provider key or account service. The published origin is https://compass-control-plane.alx21.chatgpt.site/.

Run the checks in README.md, build with `pnpm build`, then publish the generated Worker and assets through the configured Sites project in `.openai/hosting.json`. Push the exact source commit before saving a Sites version, and build the deployment archive from that commit. The GitHub repository and Sites repository may have separate histories; their tracked source trees should match.

Keep the existing origin and IndexedDB name `contextdock-v1` to preserve browser data. Changing origins creates a separate workspace; use JSON export/import to move content. Confirm public pages and native WebMCP discovery after deployment. A successful build alone does not verify either.

The root layout bypasses the server-render cache. The six document routes and
their RSC responses use `private, no-cache, max-age=0, must-revalidate` to require
browser revalidation and exclude shared caching while preserving browser memory
restoration where supported. Verify this policy on GET and HEAD responses for
`/` and `/docs`, including after repeated requests and for RSC requests with the
`RSC: 1` header. Their referenced JavaScript and CSS must return 200 with the
expected content types; a missing asset must return 404. Client asset caching is
unchanged. This reduces stale HTML references to retired bundles and costs a
Worker render per document request; it does not establish the cause of a prior transient
hosted asset mismatch or guarantee atomic platform publication. If live assets
or workspace initialization fail, keep the deployment unaccepted, investigate
delivery and recheck after recovery; roll back to a known working saved version
if needed. Never clear browser data to repair asset delivery.

For another host, adapt the Worker deployment settings to that host and update canonical URLs in `app/` and `public/`. This repository is configured for a Cloudflare Worker runtime, not a static HTML-only upload. Do not commit credentials, generated builds or local browser data.
