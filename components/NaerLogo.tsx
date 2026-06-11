// Nær-logoen: et hus med myke hjørner (blå→grønn gradient) som rommer en
// familie og et hjerte. Tegnet som SVG så den er skarp i alle størrelser.
export default function NaerLogo({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <defs>
        <linearGradient id="naerGradient" x1="10" y1="6" x2="54" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#35a6ef" />
          <stop offset="1" stopColor="#4cb878" />
        </linearGradient>
        <clipPath id="naerHus">
          <path d="M32 4.5 L57.5 23 V50 a9.5 9.5 0 0 1 -9.5 9.5 H16 a9.5 9.5 0 0 1 -9.5 -9.5 V23 Z" />
        </clipPath>
      </defs>

      {/* Huset – stroke med runde hjørner gir den myke formen */}
      <path
        d="M32 4.5 L57.5 23 V50 a9.5 9.5 0 0 1 -9.5 9.5 H16 a9.5 9.5 0 0 1 -9.5 -9.5 V23 Z"
        fill="url(#naerGradient)"
        stroke="url(#naerGradient)"
        strokeWidth="5"
        strokeLinejoin="round"
      />

      <g clipPath="url(#naerHus)">
        {/* Hjertet øverst */}
        <path
          d="M32 19.5 c-1.8-3.9-7.3-3.5-8.3 0.5 c-0.8 3.2 2.6 6 8.3 9.7 c5.7-3.7 9.1-6.5 8.3-9.7 c-1-4-6.5-4.4-8.3-0.5 Z"
          fill="#ffffff"
        />
        {/* Stor person (venstre) */}
        <circle cx="23.5" cy="34" r="7" fill="#ffffff" />
        <path d="M10.5 61 c0-10.5 5.8-17 13-17 s13 6.5 13 17 Z" fill="#ffffff" />
        {/* Liten person (høyre) */}
        <circle cx="42" cy="38.5" r="5.6" fill="#ffffff" />
        <path d="M31.5 61 c0-8.4 4.7-13.7 10.5-13.7 S52.5 52.6 52.5 61 Z" fill="#ffffff" />
      </g>
    </svg>
  )
}
