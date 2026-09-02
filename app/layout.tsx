import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ??
      'https://contextdock-control-plane.alx21.chatgpt.site',
  ),
  title: 'ContextDock — Your Personal WebMCP Control Plane',
  description:
    'A local-first workspace that exposes only the personal context and capabilities you approve through WebMCP.',
  applicationName: 'ContextDock',
  alternates: {
    canonical: '/',
  },
  category: 'productivity',
  keywords: [
    'WebMCP',
    'local-first',
    'personal knowledge workspace',
    'agent context',
    'Context Packs',
  ],
  robots: {
    index: true,
    follow: true,
  },
  icons: { icon: '/favicon.svg' },
  openGraph: {
    title: 'ContextDock — Your Personal WebMCP Control Plane',
    description: 'Your personal context. Your rules. Your agent.',
    type: 'website',
    images: [{ url: '/contextdock-social-preview.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ContextDock — Your Personal WebMCP Control Plane',
    description: 'Your personal context. Your rules. Your agent.',
    images: ['/contextdock-social-preview.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          rel="ai-catalog"
          type="application/ai-catalog+json"
          href="/.well-known/ard.json"
        />
        <link
          rel="alternate"
          type="text/markdown"
          href="/index.md"
          title="ContextDock agent-readable overview"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
