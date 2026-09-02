import type { Metadata } from 'next';
import { InformationPage } from '@/components/information-page';

export const metadata: Metadata = {
  title: 'About Compass',
  description:
    'What Compass is, who it is for, and how its human-controlled agent boundary works.',
  alternates: { canonical: '/about' },
};

export default function AboutPage() {
  return (
    <InformationPage
      eyebrow="About"
      title="A personal WebMCP control plane"
      intro="Compass is for people who want an agent to help with personal knowledge work without granting broad, invisible access to an entire workspace."
    >
      <section>
        <h2 className="text-xl font-semibold text-slate-100">The problem</h2>
        <p className="mt-3">
          Personal agents become useful when they can search notes, inspect tasks,
          and make small changes. A blanket connection to every personal record is
          too broad. Compass makes the access boundary visible and temporary.
        </p>
      </section>
      <section>
        <h2 className="text-xl font-semibold text-slate-100">How it works</h2>
        <p className="mt-3">
          Spaces organize durable notes, tasks, bookmarks, and snippets. A Context
          Pack selects whole Spaces or individual items for a particular job. The
          person then controls WebMCP, read access, write access, and each item type
          with visible switches. Agent actions appear in an activity trail, and
          supported writes can be undone.
        </p>
      </section>
      <section>
        <h2 className="text-xl font-semibold text-slate-100">What it is not</h2>
        <p className="mt-3">
          Compass is not a hosted data service, remote MCP server, or account
          platform. It does not require an API key. Workspace content is stored in
          IndexedDB under the current browser origin, and WebMCP tools are registered
          on the page when a compatible browser provides the Model Context API.
        </p>
      </section>
    </InformationPage>
  );
}
