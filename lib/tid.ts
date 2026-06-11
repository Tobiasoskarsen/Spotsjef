// Tidshjelpere for gjentakende påminnelser. Delt mellom klient og server.
//
// Viktig: en påminnelse «hver dag kl. 09» skal alltid treffe kl. 09 OSLO-tid,
// også når sommertiden slår inn/ut. Derfor kan vi ikke bare legge til 24 timer
// i UTC – vi må korrigere for endring i Oslo-offset over hoppet.

// Forskjellen (ms) mellom Oslo-veggklokke og UTC på et gitt tidspunkt.
function osloOffsetMs(dato: Date): number {
  const oslo = new Date(dato.toLocaleString('en-US', { timeZone: 'Europe/Oslo' }))
  const utc = new Date(dato.toLocaleString('en-US', { timeZone: 'UTC' }))
  return oslo.getTime() - utc.getTime()
}

export type Gjentakelse = 'daglig' | 'ukentlig'

// Neste forekomst ETTER `naa`, med samme Oslo-veggklokketid som originalen.
export function nesteForekomst(tidISO: string, gjentakelse: Gjentakelse, naa: Date = new Date()): string {
  const steg = gjentakelse === 'daglig' ? 1 : 7
  let d = new Date(tidISO)
  // Sikkerhetsgrense så en ugyldig dato aldri kan låse oss i evig løkke
  for (let i = 0; i < 400 && d <= naa; i++) {
    const offFor = osloOffsetMs(d)
    d = new Date(d.getTime() + steg * 86_400_000)
    const offEtter = osloOffsetMs(d)
    // Krysset vi et sommertidsskifte, flytt slik at veggklokka i Oslo består
    d = new Date(d.getTime() + (offFor - offEtter))
  }
  return d.toISOString()
}
