import { CompassApp } from '@/components/compass-app';
import Link from 'next/link';

const siteUrl = 'https://compass-control-plane.alx21.chatgpt.site';

const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${siteUrl}/#website`,
      url: siteUrl,
      name: 'Compass',
      alternateName: 'Compass WebMCP Control Plane',
      description:
        'A local-first personal knowledge workspace and WebMCP control plane.',
      inLanguage: 'en',
      publisher: { '@id': `${siteUrl}/#project` },
    },
    {
      '@type': 'Organization',
      '@id': `${siteUrl}/#project`,
      name: 'Compass Open Source Project',
      url: siteUrl,
      logo: `${siteUrl}/favicon.svg`,
      sameAs: [
        'https://github.com/agammann/compass-webmcp',
        'https://devpost.com/software/contextdock-upim8b',
      ],
    },
    {
      '@type': ['SoftwareApplication', 'WebApplication'],
      '@id': `${siteUrl}/#application`,
      name: 'Compass',
      alternateName: 'Compass WebMCP Control Plane',
      url: siteUrl,
      applicationCategory: 'ProductivityApplication',
      operatingSystem: 'Modern web browser',
      isAccessibleForFree: true,
      publisher: { '@id': `${siteUrl}/#project` },
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
        url: `${siteUrl}/pricing`,
        description: 'Compass is free to use and has no paid plan.',
      },
      description:
        'Compass stores notes, tasks, bookmarks, and snippets in the browser. People select a temporary Context Pack and explicit read, write, and item-type permissions before an agent can use ten structured page-side WebMCP tools.',
      featureList: [
        'Browser-local IndexedDB storage',
        'Human-selected Context Packs',
        'Read, write, and item-type permission gates',
        'Ten page-side WebMCP tools',
        'Visible agent activity log',
        'Undo for agent writes',
      ],
      sameAs: [
        'https://github.com/agammann/compass-webmcp',
        'https://devpost.com/software/contextdock-upim8b',
        'https://youtu.be/s5Jl8F18l5I',
      ],
    },
  ],
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, '\\u003c'),
        }}
      />
      <CompassApp />
      <section
        aria-labelledby="about-compass"
        className="border-t border-white/8 bg-slate-950 px-5 py-12"
      >
        <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
              Agent-readable product overview
            </p>
            <h1 id="about-compass" className="mt-3 text-2xl font-semibold">
              Compass: personal context with a visible, human-controlled boundary
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-400">
              Compass is a free, local-first personal knowledge workspace for
              people who want useful agent assistance without exposing an entire
              workspace. Notes, tasks, bookmarks, and snippets stay in this
              browser. A person chooses a temporary Context Pack, enables the
              exact permissions they want, and can inspect or undo agent writes.
            </p>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
              In a WebMCP-capable browser, Compass registers ten structured
              page tools. Those tools call the same repository operations as the
              visible interface, so searches, task changes, activity entries, and
              undo state remain synchronized with what the person sees.
            </p>
          </div>
          <nav aria-label="Compass resources" className="grid content-start gap-2 text-sm">
            <Link className="rounded-xl border border-white/10 bg-white/[0.025] px-4 py-3 text-cyan-100 hover:bg-white/[0.05]" href="/about">
              About Compass
            </Link>
            <Link className="rounded-xl border border-white/10 bg-white/[0.025] px-4 py-3 text-cyan-100 hover:bg-white/[0.05]" href="/docs">
              WebMCP and judge documentation
            </Link>
            <Link className="rounded-xl border border-white/10 bg-white/[0.025] px-4 py-3 text-cyan-100 hover:bg-white/[0.05]" href="/privacy">
              Privacy and data handling
            </Link>
            <Link className="rounded-xl border border-white/10 bg-white/[0.025] px-4 py-3 text-cyan-100 hover:bg-white/[0.05]" href="/pricing">
              Free pricing and availability
            </Link>
            <Link className="rounded-xl border border-white/10 bg-white/[0.025] px-4 py-3 text-cyan-100 hover:bg-white/[0.05]" href="/contact">
              Contact and project support
            </Link>
            <Link className="rounded-xl border border-white/10 bg-white/[0.025] px-4 py-3 text-cyan-100 hover:bg-white/[0.05]" href="/llms.txt">
              Agent-readable index
            </Link>
            <a className="rounded-xl border border-white/10 bg-white/[0.025] px-4 py-3 text-cyan-100 hover:bg-white/[0.05]" href="https://github.com/agammann/compass-webmcp">
              Public source on GitHub
            </a>
          </nav>
        </div>
      </section>
    </>
  );
}
