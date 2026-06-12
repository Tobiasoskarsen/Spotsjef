'use client'
import { useEffect } from 'react'

// Registrerer service worker-en så Nær blir installerbar og virker offline.
export default function PwaRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Registrering feilet – appen fungerer fint uten, så vi ignorerer
      })
    }
  }, [])
  return null
}
