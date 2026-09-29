# Deploying Compass

Compass serves a browser-local application. It requires no application database, provider key or account service. The published origin is https://compass-control-plane.alx21.chatgpt.site/.

Run the checks in README.md, build with `pnpm build`, then publish the generated Worker and assets through the configured Sites project in `.openai/hosting.json`. Push the exact source commit before saving a Sites version, and build the deployment archive from that commit. The GitHub repository and Sites repository may have separate histories; their tracked source trees should match.

Keep the existing origin and IndexedDB name `contextdock-v1` to preserve browser data. Changing origins creates a separate workspace; use JSON export/import to move content. Confirm public pages and native WebMCP discovery after deployment. A successful build alone does not verify either.

For another host, adapt the Worker deployment settings to that host and update canonical URLs in `app/` and `public/`. This repository is configured for a Cloudflare Worker runtime, not a static HTML-only upload. Do not commit credentials, generated builds or local browser data.
