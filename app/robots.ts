import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: 'https://sanko-sho.com//sitemap.xml', // 💡 ここもご自身のURLに書き換えます
  }
}