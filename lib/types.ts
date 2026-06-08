export type Pris = {
  time: string
  pris: number // øre/kWh etter strømstøtte (inkl. mva)
  raw: number // NOK/kWh etter strømstøtte (inkl. mva)
  spot: number // øre/kWh før strømstøtte (inkl. mva) – for visning
}

export type Apparat = {
  navn: string
  watt: number
  timer: number
  ikon?: string
  gangerPerUke?: number // hvor ofte apparatet brukes – for riktig månedskostnad
}

export type Anbefaling = {
  startTime: string
  sluttTime: string
  snittPris: string
  kostnad: string // kostnad ved billigste vindu
  kostnadDyrest: string // kostnad ved dyreste vindu i dag (for spar-estimat)
  startIdx: number
}

export type HistorikkPunkt = {
  dato: string
  snitt: number
}

export type ApiPris = {
  time_start: string
  NOK_per_kWh: number
}
