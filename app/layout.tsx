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
    default: 'Howlfox Academy — Online Course Platform',
    template: '%s | Howlfox Academy',
  },
  description:
    'Howlfox Academy is a private online learning platform offering expert-led courses, live classes, and structured learning paths. Learn at your own pace with video lessons, live sessions, and AI-powered assistance.',
  keywords: ['online courses', 'e-learning', 'live classes', 'video learning', 'Howlfox Academy', 'online education'],
  authors: [{ name: 'Howlfox Academy' }],
  creator: 'Howlfox Academy',
  publisher: 'Howlfox Academy',
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: 'https://howlfoxacademy.com',
    siteName: 'Howlfox Academy',
    title: 'Howlfox Academy — Online Course Platform',
    description: 'Expert-led online courses, live classes, and AI-powered learning. Learn anytime, anywhere.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Howlfox Academy' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Howlfox Academy — Online Course Platform',
    description: 'Expert-led online courses, live classes, and AI-powered learning.',
    images: ['/og-image.png'],
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${jakarta.variable} h-full`} suppressHydrationWarning>
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
