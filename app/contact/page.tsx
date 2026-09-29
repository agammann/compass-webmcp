import type { Metadata } from 'next';
import { InformationPage } from '@/components/information-page';

export const metadata: Metadata = {
  title: 'Contact the Compass Project',
  description: 'Source and technical support for Compass.',
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
      intro="Compass is a free, open-source personal workspace. Use the public repository for technical questions and issue reports."
    >
      <section>
        <h2 className="text-xl font-semibold text-slate-100">
          Technical support
        </h2>
        <p className="mt-3">
          Review the source or open a public issue at{' '}
          <a
            className="text-cyan-300 hover:text-cyan-200"
            href="https://github.com/agammann/compass-webmcp"
          >
            github.com/agammann/compass-webmcp
          </a>
          . Do not include private workspace content in a public issue.
        </p>
      </section>
    </InformationPage>
  );
}
