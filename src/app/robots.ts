import type { MetadataRoute } from 'next'
import { siteUrl } from '@/lib/email'

/**
 * What search engines may index: the public pages, never the private ones.
 * `/o/` and the `enter`/`link` routes carry personal tokens in the address,
 * so an indexed one would be a way into someone's account.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/api/', '/o/', '/carpenter/', '/supplier/enter/', '/supplier/confirm/', '/doc/'],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  }
}
