import type { ReactNode } from 'react';
import Link from 'next/link';

export function InformationPage({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-background px-5 py-10 text-foreground sm:py-16">
      <article className="mx-auto max-w-3xl">
        <Link className="text-sm font-medium text-cyan-300 hover:text-cyan-200" href="/">
          ← Back to Compass
        </Link>
        <p className="mt-10 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
          {eyebrow}
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
          {title}
        </h1>
        <p className="mt-5 text-base leading-8 text-slate-300">{intro}</p>
        <div className="prose-compass mt-10 space-y-8 text-sm leading-7 text-slate-400">
          {children}
        </div>
      </article>
    </main>
  );
}
