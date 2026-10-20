import type { Metadata, Viewport } from 'next';
import './globals.css';

const SITE_URL = 'https://ieltstryagain.com';
const SITE_NAME = 'Try Again — Yours IELTS Partner';
const LOGO_PATH = '/try-again-logo.png';
const DESCRIPTION =
  'Practice real IELTS-style Listening, Reading, Writing and Speaking tasks, get an examiner-style AI band after every attempt, and try again before the real test.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} | IELTS practice with AI band feedback`,
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
    'Try Again IELTS',
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
      { url: '/favicon.ico' },
      { url: LOGO_PATH, type: 'image/png' },
    ],
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
        url: LOGO_PATH,
        width: 1200,
        height: 400,
        alt: `${SITE_NAME} Logo`,
      },
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
    images: [LOGO_PATH],
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
    { media: '(prefers-color-scheme: dark)', color: '#0B1E2D' },
  ],
};

const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'EducationalOrganization',
  name: 'Try Again',
  alternateName: SITE_NAME,
  slogan: 'Yours IELTS partner',
  url: SITE_URL,
  logo: {
    '@type': 'ImageObject',
    url: `${SITE_URL}${LOGO_PATH}`,
    width: 1200,
    height: 400,
  },
  image: `${SITE_URL}${LOGO_PATH}`,
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