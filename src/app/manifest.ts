import type { MetadataRoute } from 'next'

/**
 * What a phone uses when a carpenter adds the site to the home screen: the N on
 * navy as the icon, and the catalogue as the page it opens on — an app icon one
 * tap from reordering, which is the whole point of coming back.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'שוק הנגרים · Nagarim',
    short_name: 'Nagarim',
    description: 'הזמנת חומרים, פרזול וציוד לנגריות — ישירות מהספק.',
    start_url: '/carpenter/catalog',
    display: 'standalone',
    dir: 'rtl',
    lang: 'he',
    background_color: '#1E2A3B',
    theme_color: '#1E2A3B',
    icons: [
      { src: '/brand/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/brand/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/brand/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
