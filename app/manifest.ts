import type { MetadataRoute } from 'next'

// Web App Manifest – gjør Flyt installerbar på hjemskjermen.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Flyt — strømpriser',
    short_name: 'Flyt',
    description: 'Finn den billigste tiden å bruke strøm. Strømpriser, vær og smarte råd.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#080b11',
    theme_color: '#080b11',
    lang: 'no',
    categories: ['utilities', 'lifestyle'],
    icons: [
      {
        src: '/flyt-icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/flyt-icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  }
}
