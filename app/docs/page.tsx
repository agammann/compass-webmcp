import type { Metadata } from 'next';
import { InformationPage } from '@/components/information-page';

export const metadata: Metadata = {
  title: 'Compass WebMCP Documentation',
  description:
    'Judge quick start, WebMCP tool catalog, permission behavior, and verification guidance for Compass.',
  alternates: { canonical: '/docs' },
};

const readTools = [
  'get_active_context',
  'list_spaces',
  'search_personal_context',
  'get_personal_item',
  'list_recent_activity',
];
const writeTools = [
  'create_personal_item',
  'update_personal_item',
  'complete_task',
  'link_personal_items',
  'create_context_pack',
];

export default function DocsPage() {
  return (
    <InformationPage
      eyebrow="Documentation"
      title="WebMCP tools that share visible application state"
      intro="Compass registers ten typed page-side tools. Every handler validates its input and re-checks the active Context Pack and live permissions before reading or writing IndexedDB."
    >
      <section>
        <h2 className="text-xl font-semibold text-slate-100">Judge quick start</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5">
          <li>Open the home page in a WebMCP-capable browser.</li>
          <li>On a clean browser, confirm the fictional Atlas Launch demo initialized automatically.</li>
          <li>Confirm the Atlas Launch Context Pack is active.</li>
          <li>Ask the agent to search for unresolved launch blockers.</li>
          <li>Ask it to create a high-priority task for the most urgent blocker.</li>
          <li>Watch the task and agent activity appear in the visible interface.</li>
          <li>Disable Allow write and confirm write tools disappear.</li>
        </ol>
      </section>
      <section>
        <h2 className="text-xl font-semibold text-slate-100">Read tools</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {readTools.map((tool) => (
            <li key={tool} className="rounded-lg border border-white/10 bg-white/[0.025] px-3 py-2 font-mono text-xs text-cyan-100">
              {tool}
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="text-xl font-semibold text-slate-100">Write tools</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {writeTools.map((tool) => (
            <li key={tool} className="rounded-lg border border-white/10 bg-white/[0.025] px-3 py-2 font-mono text-xs text-cyan-100">
              {tool}
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="text-xl font-semibold text-slate-100">Safety properties</h2>
        <p className="mt-3">
          Tool schemas reject unknown fields. Stored personal content is returned as
          untrusted data, not instructions. Read and write tools unregister when their
          visible permission switch is disabled, while every handler repeats the same
          authorization check to protect against stale or in-flight calls. Creating a
          Context Pack never activates it; activation remains a human-only action.
        </p>
      </section>
      <section>
        <h2 className="text-xl font-semibold text-slate-100">Source and demo</h2>
        <p className="mt-3">
          Review the <a className="text-cyan-300 hover:text-cyan-200" href="https://github.com/agammann/compass-webmcp">public MIT-licensed source</a> or watch the <a className="text-cyan-300 hover:text-cyan-200" href="https://youtu.be/s5Jl8F18l5I">narrated demo</a>.
        </p>
      </section>
    </InformationPage>
  );
}

