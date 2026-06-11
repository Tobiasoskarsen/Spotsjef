import type { MetadataRoute } from 'next'

// Web App Manifest – gjør Nær installerbar på hjemskjermen. Viktig for
// mottakeren: installert PWA er det som gir ekte push-varsler på iOS.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Nær – trygghet for familien',
    short_name: 'Nær',
    description: 'Hjelp noen du er glad i med hverdagen: påminnelser, vær og praktiske beskjeder på en skjerm de forstår.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#faf7f1',
    theme_color: '#faf7f1',
    lang: 'no',
    categories: ['lifestyle', 'health'],
    icons: [
      {
        src: '/naer-icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/naer-icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  }
}
