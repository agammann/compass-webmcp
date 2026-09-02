# Contributing

Thanks for helping improve Compass.

## Development

1. Use Node.js 22.13 or newer and pnpm.
2. Run `pnpm install` and `pnpm dev`.
3. Keep repository functions independent from the UI so humans and WebMCP tools share the same rules.
4. Add tests for permission, scoping, validation, audit, and undo changes.
5. Before opening a change, run:

   ```bash
   pnpm typecheck
   pnpm lint
   pnpm test
   pnpm build
   ```

## Pull requests

Keep changes focused and explain user-visible behavior. Include screenshots for interface changes and a concise test plan. Never commit real personal exports, secrets, API keys, generated build output, or `node_modules`.

Security-sensitive changes should state which invariant in [SECURITY.md](SECURITY.md) they preserve or strengthen.
