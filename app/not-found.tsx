import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 px-5 text-slate-100">
      <div className="max-w-xl rounded-2xl border border-white/10 bg-white/[0.025] p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">404 · Not found</p>
        <h1 className="mt-3 text-3xl font-semibold">That Compass page does not exist</h1>
        <p className="mt-4 leading-7 text-slate-400">
          Return to the workspace, read the WebMCP documentation, or use the
          agent-readable index to find a supported public resource.
        </p>
        <nav aria-label="Recovery links" className="mt-6 flex flex-wrap gap-3 text-sm">
          <Link className="text-cyan-300 hover:text-cyan-200" href="/">Workspace</Link>
          <Link className="text-cyan-300 hover:text-cyan-200" href="/docs">Documentation</Link>
          <Link className="text-cyan-300 hover:text-cyan-200" href="/llms.txt">Agent index</Link>
        </nav>
      </div>
    </main>
  );
}
