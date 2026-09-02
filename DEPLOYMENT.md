# Deployment

ContextDock is a client-first Vinext application prepared for Cloudflare Workers and OpenAI Sites. The browser database is origin-scoped, so changing the production origin creates a separate empty workspace unless the user exports and imports a backup.

## Production build

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Set `NEXT_PUBLIC_SITE_URL` to the final HTTPS origin during the build so Open Graph image URLs are absolute.

## Sites deployment

The repository contains `.openai/hosting.json` and the official Sites Vite plugin. Use the Sites workflow to create a project, package a committed source revision, and deploy it. Keep the first deployment private while checking the final build; changing it to public is a separate deliberate publishing action.

## Security headers

`public/_headers` provides a conservative CSP, Permissions Policy, Referrer Policy, and MIME-sniffing protection for compatible hosts. Verify them on the deployed response. If the platform does not consume `_headers`, configure the equivalent headers at the edge.

The CSP currently permits inline scripts and styles for Vinext compatibility. Tighten this with nonces or hashes when the hosting stack provides stable support. Do not add third-party script origins without documenting the privacy and supply-chain impact.

## Release checklist

- Production build and all automated checks pass
- HTTPS works and no mixed content appears
- First-run Demo and Empty paths both work
- WebMCP tools appear only under the correct switches
- Read and write scoping is verified with Atlas Launch
- Denied operations are logged and Undo restores a write
- Mobile layout and keyboard focus are usable
- Social image and metadata resolve at the production origin
- Raw HTML identifies ContextDock without JavaScript and includes canonical and JSON-LD metadata
- `sitemap.xml`, `llms.txt`, `agents.md`, `index.md`, and both ARD catalog paths resolve with their intended content
- No secrets, real personal data, source maps containing secrets, or machine-specific paths are shipped
- Deployment URL is copied into the README and submission only after verification
