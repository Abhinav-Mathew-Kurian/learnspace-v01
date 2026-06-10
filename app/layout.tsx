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
    default: 'Howlfox Academy — Kerala\'s Best Skill Learning Platform | Online Courses & Live Classes',
    template: '%s | Howlfox Academy',
  },
  description:
    'Howlfox Academy — Kerala\'s best skill learning platform. Expert-led online courses in Digital Marketing, Meta Ads, UI/UX Design, Graphic Design, Photography, Videography, and Business. A HowlFox initiative. Join live classes, get AI-powered assistance, and learn from industry experts. Enroll today.',
  keywords: [
    // Brand
    'Howlfox Academy',
    'howlfox',
    'HowlFox',
    'howlfox academy',
    'Howlfox Academy courses',
    'HowlFox initiative',
    // Kerala-specific
    'Kerala best skill learning platform',
    'best online courses in Kerala',
    'online learning platform Kerala',
    'skill development Kerala',
    'Kerala digital marketing course',
    'best digital marketing course Kerala',
    'Kerala online courses',
    'Kerala ed-tech platform',
    'online courses Kerala students',
    'best online academy Kerala',
    'learn online Kerala',
    'Kerala creative courses',
    'top online learning platform Kerala',
    'professional courses Kerala',
    'certificate courses Kerala',
    // Course categories
    'digital marketing course India',
    'meta ads course',
    'UI UX design course',
    'graphic design course',
    'photography course India',
    'videography course',
    'business course India',
    'social media marketing course',
    'content creation course',
    'freelancing course India',
    // Platform features
    'live online classes',
    'live coaching sessions',
    'AI powered learning',
    'online learning platform India',
    'expert led courses',
    'learn digital marketing',
    'online certification courses India',
    'affordable online courses India',
    'online skill courses India',
  ],
  authors: [{ name: 'Howlfox Academy', url: 'https://howlfoxacademy.com' }],
  creator: 'HowlFox',
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
    title: 'Howlfox Academy — Kerala\'s Best Skill Learning Platform',
    description: 'Expert-led courses in Digital Marketing, UI/UX, Graphic Design, Photography, and more. A HowlFox initiative. Join live classes and learn from industry experts.',
    images: [{ url: '/og-image.png', width: 216, height: 216, alt: 'Howlfox Academy — Kerala\'s Best Skill Learning Platform' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Howlfox Academy — Kerala\'s Best Skill Learning Platform',
    description: 'Expert-led courses in Digital Marketing, UI/UX, Graphic Design, Photography, and more. A HowlFox initiative.',
    images: ['/og-image.png'],
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.png', type: 'image/png', sizes: '216x216' },
    ],
    apple: { url: '/apple-touch-icon.png', sizes: '216x216', type: 'image/png' },
    shortcut: '/favicon.png',
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
        url: 'https://howlfoxacademy.com/images/logo/howlfoxlogoforweb.png',
        width: 216,
        height: 216,
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
