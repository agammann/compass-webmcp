import type { Metadata } from 'next';
import { InformationPage } from '@/components/information-page';

export const metadata: Metadata = {
  title: 'Compass Privacy and Data Handling',
  description:
    'How Compass stores browser-local data and constrains what page-side WebMCP tools can access.',
  alternates: {
    canonical: '/privacy',
    types: { 'text/markdown': '/privacy.md' },
  },
};

export default function PrivacyPage() {
  return (
    <InformationPage
      eyebrow="Privacy"
      title="Browser-local by design"
      intro="Compass does not send workspace content to a Compass server. Notes, tasks, bookmarks, snippets, permissions, packs, activity, and undo records stay in IndexedDB for the current browser origin."
    >
      <section>
        <h2 className="text-xl font-semibold text-slate-100">Data storage</h2>
        <p className="mt-3">
          The application has no account system, analytics script, cloud database,
          or hidden API dependency. A person can export a versioned JSON backup or
          clear all local data from Settings. Imports are size-limited and validated
          before they replace the local workspace.
        </p>
      </section>
      <section>
        <h2 className="text-xl font-semibold text-slate-100">Agent access</h2>
        <p className="mt-3">
          WebMCP tools can access only records selected by the active Context Pack and
          allowed by the current read, write, and item-type switches. Successful and
          denied agent operations are recorded locally. Context Pack activation is a
          visible human action and cannot be performed through a tool.
        </p>
      </section>
      <section>
        <h2 className="text-xl font-semibold text-slate-100">Important limitation</h2>
        <p className="mt-3">
          Local-first does not mean encrypted at rest. Other code running on the same
          trusted origin may be able to access the browser database. Use the fictional
          demo workspace for evaluation and review the public security documentation
          before storing sensitive personal information.
        </p>
      </section>
    </InformationPage>
  );
}
