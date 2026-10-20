import type { Metadata, Viewport } from 'next';
import './globals.css';

const SITE_URL = 'https://ieltstryagain.com';
const SITE_NAME = 'IELTS Try Again';
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
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
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
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: SITE_NAME,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} — IELTS practice with AI band feedback`,
    description: DESCRIPTION,
    images: ['/og-image.png'],
  },
  // Fill these in once you register with each service; remove any you don't use.
  verification: {
    google: '',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F7F4EC' },
    { media: '(prefers-color-scheme: dark)', color: '#1C2B39' },
  ],
};

const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'EducationalOrganization',
  name: SITE_NAME,
  url: SITE_URL,
  description: DESCRIPTION,
  sameAs: [],
};

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