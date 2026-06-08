import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const zone = searchParams.get('zone') || 'NO1'
  const date = searchParams.get('date')

  let dateStr: string
  if (date) {
    dateStr = date
  } else {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    dateStr = `${year}/${month}-${day}`
  }

  try {
    const res = await fetch(
      `https://www.hvakosterstrommen.no/api/v1/prices/${dateStr}_${zone}.json`
    )

    // API-et svarer 404 for datoer som ikke finnes ennå (f.eks. morgendagen før kl. 13).
    // Returner en tom liste i stedet for å la feilen velte frontend.
    if (!res.ok) {
      return NextResponse.json([], { status: 200 })
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Kunne ikke hente priser:', error)
    return NextResponse.json([], { status: 200 })
  }
}