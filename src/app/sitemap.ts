import type { MetadataRoute } from 'next'
import { siteUrl } from '@/lib/email'

/** The public entry points: the landing page, both sign-ups and the terms. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl()
  return ['', '/join', '/supplier/join', '/terms'].map((path) => ({ url: `${base}${path}` }))
}
