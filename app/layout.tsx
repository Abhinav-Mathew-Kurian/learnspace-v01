import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import SessionProvider from '@/components/shared/SessionProvider';
import { Toaster } from 'sonner';
import { Analytics } from '@vercel/analytics/next';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#4f46e5',
};

export const metadata: Metadata = {
  metadataBase: new URL('https://howlfoxacademy.com'),
  title: {
    default: 'Howlfox Academy — Online Courses, Live Classes & Expert Training in India',
    template: '%s | Howlfox Academy',
  },
  description:
    'Howlfox Academy offers expert-led online courses in Digital Marketing, Meta Ads, UI/UX Design, Graphic Design, Photography, Videography, and Business. Join live classes, get AI-powered assistance, and learn from industry experts. Enroll today.',
  keywords: [
    'Howlfox Academy',
    'howlfox',
    'online courses India',
    'digital marketing course',
    'meta ads course',
    'UI UX design course',
    'graphic design course',
    'photography course India',
    'videography course',
    'business course India',
    'live online classes',
    'learn digital marketing',
    'online learning platform India',
    'expert led courses',
    'howlfox academy courses',
  ],
  authors: [{ name: 'Howlfox Academy', url: 'https://howlfoxacademy.com' }],
  creator: 'Howlfox Academy',
  publisher: 'Howlfox Academy',
  alternates: {
    canonical: 'https://howlfoxacademy.com',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: 'https://howlfoxacademy.com',
    siteName: 'Howlfox Academy',
    title: 'Howlfox Academy — Online Courses & Live Classes in India',
    description: 'Expert-led courses in Digital Marketing, UI/UX, Graphic Design, Photography, and more. Join live classes and learn from industry experts.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Howlfox Academy — Online Courses India' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Howlfox Academy — Online Courses & Live Classes in India',
    description: 'Expert-led courses in Digital Marketing, UI/UX, Graphic Design, Photography, and more.',
    images: ['/og-image.png'],
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.png', type: 'image/png', sizes: '192x192' },
    ],
    apple: '/apple-touch-icon.png',
    shortcut: '/favicon.ico',
  },
  verification: {
    google: 'NcXbRcPMPeZLKLEdDHxm6G_VoCXZEcKxm-nYJKPTyRc',
  },
  category: 'education',
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://howlfoxacademy.com/#organization',
      name: 'Howlfox Academy',
      url: 'https://howlfoxacademy.com',
      logo: {
        '@type': 'ImageObject',
        url: 'https://howlfoxacademy.com/images/logo/HOWLFOOX-LOGO2.svg',
      },
      contactPoint: {
        '@type': 'ContactPoint',
        telephone: '+91-6238750649',
        contactType: 'customer service',
        email: 'howlfoxceo@gmail.com',
        areaServed: 'IN',
        availableLanguage: 'English',
      },
      sameAs: ['https://instagram.com/howlfoxacademy'],
    },
    {
      '@type': 'WebSite',
      '@id': 'https://howlfoxacademy.com/#website',
      url: 'https://howlfoxacademy.com',
      name: 'Howlfox Academy',
      description: 'Expert-led online courses in Digital Marketing, UI/UX Design, Graphic Design, Photography, Videography, and Business.',
      publisher: { '@id': 'https://howlfoxacademy.com/#organization' },
      potentialAction: {
        '@type': 'SearchAction',
        target: { '@type': 'EntryPoint', urlTemplate: 'https://howlfoxacademy.com/courses?q={search_term_string}' },
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@type': 'EducationalOrganization',
      '@id': 'https://howlfoxacademy.com/#educational-org',
      name: 'Howlfox Academy',
      url: 'https://howlfoxacademy.com',
      description: 'Howlfox Academy offers expert-led online courses in Digital Marketing, Meta Ads, UI/UX Design, Graphic Design, Photography, Videography, and Business in India.',
      address: { '@type': 'PostalAddress', addressCountry: 'IN' },
      telephone: '+91-6238750649',
      email: 'howlfoxceo@gmail.com',
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${jakarta.variable} h-full`} suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-full font-sans antialiased" suppressHydrationWarning>
        <SessionProvider>{children}</SessionProvider>
        <Analytics />
        <Toaster
          position="top-right"
          richColors
          closeButton
          toastOptions={{
            style: { fontFamily: 'var(--font-jakarta, sans-serif)' },
          }}
        />
      </body>
    </html>
  );
}
