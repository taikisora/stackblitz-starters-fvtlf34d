import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://sanko-sho.com/',
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 1,
    },
    
    {
       url: 'https://sanko-sho.com/search',
       lastModified: new Date(),
       changeFrequency: 'monthly',
       priority: 0.8,
     },
  ];
}