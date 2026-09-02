import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ??
      'https://compass-control-plane.alx21.chatgpt.site',
  ),
  title: 'Compass — Your Personal WebMCP Control Plane',
  description:
    'A local-first workspace that exposes only the personal context and capabilities you approve through WebMCP.',
  applicationName: 'Compass',
  alternates: {
    canonical: '/',
    types: {
      'text/markdown': '/index.md',
    },
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
    title: 'Compass — Your Personal WebMCP Control Plane',
    description: 'Your personal context. Your rules. Your agent.',
    type: 'website',
    images: [{ url: '/compass-social-preview.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Compass — Your Personal WebMCP Control Plane',
    description: 'Your personal context. Your rules. Your agent.',
    images: ['/compass-social-preview.png'],
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
          title="Compass agent-readable overview"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
