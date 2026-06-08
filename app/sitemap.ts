import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://howlfoxacademy.com';
  return [
    { url: base, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/how-it-works`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/login`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.5 },
    { url: `${base}/courses`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
  ];
}
