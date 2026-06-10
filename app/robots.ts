import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/courses', '/about', '/how-it-works'],
        disallow: ['/admin/', '/student/', '/teacher/', '/api/'],
      },
    ],
    sitemap: 'https://howlfoxacademy.com/sitemap.xml',
  };
}
