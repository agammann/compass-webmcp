import type { Metadata } from 'next';
import { InformationPage } from '@/components/information-page';

export const metadata: Metadata = {
  title: 'Compass Pricing — Free and Open Source',
  description:
    'Compass is free to use, has no paid plan, and ships as MIT-licensed open-source software.',
  alternates: {
    canonical: '/pricing',
    types: { 'text/markdown': '/pricing.md' },
  },
};

export default function PricingPage() {
  return (
    <InformationPage
      eyebrow="Pricing"
      title="Free to use. No paid plan."
      intro="Compass costs $0 USD. The public application and MIT-licensed source are available without an account, trial, subscription, payment method, or API key."
    >
      <section>
        <h2 className="text-xl font-semibold text-slate-100">What is included</h2>
        <p className="mt-3">
          The complete local-first workspace, fictional Atlas demo, Context Packs,
          permission controls, ten page-side WebMCP tools, activity history, import,
          export, and supported undo operations are all available for free.
        </p>
      </section>
      <section>
        <h2 className="text-xl font-semibold text-slate-100">No transaction flow</h2>
        <p className="mt-3">
          Compass has no checkout, paid tier, subscription, marketplace, or
          in-product purchase. Workspaces remain in the current browser origin.
        </p>
      </section>
    </InformationPage>
  );
}
