import type { Metadata } from 'next';
import { InformationPage } from '@/components/information-page';

export const metadata: Metadata = {
  title: 'Contact the Compass Project',
  description:
    'Public support, source, demo, and challenge-submission channels for Compass.',
  alternates: {
    canonical: '/contact',
    types: { 'text/markdown': '/contact.md' },
  },
};

export default function ContactPage() {
  return (
    <InformationPage
      eyebrow="Contact"
      title="Public project channels"
      intro="Compass is an open-source WebMCP Challenge project. Use the public repository for technical questions and issue reports, and the Devpost page for challenge context."
    >
      <section>
        <h2 className="text-xl font-semibold text-slate-100">Technical support</h2>
        <p className="mt-3">
          Review the source or open a public issue at{' '}
          <a className="text-cyan-300 hover:text-cyan-200" href="https://github.com/agammann/compass-webmcp">
            github.com/agammann/compass-webmcp
          </a>.
          Do not include private workspace content in a public issue.
        </p>
      </section>
      <section>
        <h2 className="text-xl font-semibold text-slate-100">Project evidence</h2>
        <p className="mt-3">
          See the{' '}
          <a className="text-cyan-300 hover:text-cyan-200" href="https://devpost.com/software/contextdock-upim8b">
            Devpost submission
          </a>{' '}
          and the{' '}
          <a className="text-cyan-300 hover:text-cyan-200" href="https://youtu.be/s5Jl8F18l5I">
            narrated demo
          </a>{' '}
          for the product story and verified workflow.
        </p>
      </section>
    </InformationPage>
  );
}
