import { useEffect, useRef, useState } from 'react'

// Animerer en tallverdi jevnt fra forrige til ny verdi
export function useAnimatedNumber(target: number, duration = 600): number {
  const [display, setDisplay] = useState(0)
  const fraRef = useRef(0)

  useEffect(() => {
    let start: number | null = null
    const fra = fraRef.current
    const step = (ts: number) => {
      if (start === null) start = ts
      const progress = Math.min((ts - start) / duration, 1)
      const verdi = fra + (target - fra) * progress
      setDisplay(verdi)
      if (progress < 1) {
        requestAnimationFrame(step)
      } else {
        fraRef.current = target
      }
    }
    requestAnimationFrame(step)
  }, [target, duration])

  return display
}
