export type Pris = {
  time: string
  pris: number // øre/kWh
  raw: number // NOK/kWh (rådata fra API)
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
  kostnad: string
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
