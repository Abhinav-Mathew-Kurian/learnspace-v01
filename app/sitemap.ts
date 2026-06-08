import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://howlfoxacademy.com';
  const now = new Date();
  return [
    { url: base,                        lastModified: now, changeFrequency: 'daily',   priority: 1   },
    { url: `${base}/courses`,           lastModified: now, changeFrequency: 'daily',   priority: 0.9 },
    { url: `${base}/about`,             lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/how-it-works`,      lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/login`,             lastModified: now, changeFrequency: 'yearly',  priority: 0.4 },
  ];
}
