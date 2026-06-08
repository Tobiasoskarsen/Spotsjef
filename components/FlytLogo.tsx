// Flyt-logoen: flytende blå→turkis bølger med en glødende prikk.
// Ren SVG, så den er knivskarp i alle størrelser og matcher temaet.
export default function FlytLogo({ size = 42 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size * 0.7}
      viewBox="0 0 64 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <defs>
        <linearGradient id="flytWave" x1="2" y1="42" x2="62" y2="6" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2b8fff" />
          <stop offset="1" stopColor="#2bd4b0" />
        </linearGradient>
        <radialGradient id="flytDot" cx="0.5" cy="0.5" r="0.6">
          <stop stopColor="#eaf6ff" />
          <stop offset="1" stopColor="#7cc4ff" />
        </radialGradient>
      </defs>
      <path d="M3 17 C 22 5, 44 8, 61 13 C 44 16, 24 22, 3 17 Z" fill="url(#flytWave)" />
      <path d="M5 24 C 24 13, 47 16, 61 21 C 46 24, 26 30, 5 24 Z" fill="url(#flytWave)" opacity="0.78" />
      <path d="M9 31 C 27 23, 46 25, 57 28 C 46 31, 29 36, 9 31 Z" fill="url(#flytWave)" opacity="0.55" />
      <circle cx="55" cy="9" r="4" fill="url(#flytDot)" />
    </svg>
  )
}
