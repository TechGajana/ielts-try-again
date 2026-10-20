import type { Metadata, Viewport } from 'next';
import './globals.css';

// Matches the indexed URL in your Google Search screenshot
const SITE_URL = 'https://www.ieltstryagain.com';
const SITE_NAME = 'IELTS Try Again';
const LOGO_PATH = '/try-again-logo.png';
const DESCRIPTION =
  'Practice real IELTS-style Listening, Reading, Writing and Speaking tasks, get an examiner-style AI band after every attempt, and try again before the real test.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — IELTS practice with AI band feedback`,
    template: `%s · ${SITE_NAME}`,
  },
  description: DESCRIPTION,
  keywords: [
    'IELTS practice',
    'IELTS mock test',
    'IELTS band score',
    'IELTS writing feedback',
    'IELTS speaking practice',
    'IELTS reading practice',
    'IELTS listening practice',
    'AI IELTS evaluation',
  ],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/icon', type: 'image/png', sizes: '192x192' },
      { url: '/favicon.ico', sizes: '48x48' },
    ],
    shortcut: '/icon',
    apple: [{ url: '/icon', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — IELTS practice with AI band feedback`,
    description: DESCRIPTION,
    images: [
      {
        url: LOGO_PATH,
        width: 1200,
        height: 400,
        alt: SITE_NAME,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} — IELTS practice with AI band feedback`,
    description: DESCRIPTION,
    images: [LOGO_PATH],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F7F4EC' },
    { media: '(prefers-color-scheme: dark)', color: '#0B1E2D' },
  ],
};

const structuredData = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    alternateName: 'Try Again — Yours IELTS Partner',
    url: SITE_URL,
  },
  {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: {
      '@type': 'ImageObject',
      url: `${SITE_URL}/icon`,
      width: 192,
      height: 192,
    },
    image: `${SITE_URL}${LOGO_PATH}`,
    description: DESCRIPTION,
    sameAs: [],
  },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger -- static JSON-LD, no user input involved
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}