'use client'
import { useEffect, useRef } from 'react'

// Holder en visning fersk uten at brukeren må laste siden på nytt:
//  1. kjører `fn` med en gang (når `aktiv` blir true)
//  2. deretter med jevne mellomrom (`intervalMs`)
//  3. og UMIDDELBART når fanen/appen blir synlig igjen – det er øyeblikket
//     brukeren faktisk ser på skjermen (mobil som våkner, fanebytte på laptop)
//
// `fn` leses via ref, så den kan trygt bruke ferske props/state uten at
// intervallet restartes for hver render.
export function useAutoOppdater(aktiv: boolean, intervalMs: number, fn: () => void) {
  const fnRef = useRef(fn)
  fnRef.current = fn

  useEffect(() => {
    if (!aktiv) return
    const kjor = () => fnRef.current()
    kjor()
    const t = setInterval(kjor, intervalMs)
    const vedSynlig = () => {
      if (document.visibilityState === 'visible') kjor()
    }
    document.addEventListener('visibilitychange', vedSynlig)
    window.addEventListener('focus', vedSynlig)
    return () => {
      clearInterval(t)
      document.removeEventListener('visibilitychange', vedSynlig)
      window.removeEventListener('focus', vedSynlig)
    }
  }, [aktiv, intervalMs])
}
