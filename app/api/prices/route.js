export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const zone = searchParams.get('zone') || 'NO1'
  const date = searchParams.get('date')

  let dateStr
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
    const data = await res.json()
    return Response.json(data)
  } catch (error) {
    return Response.json({ error: 'Kunne ikke hente priser' }, { status: 500 })
  }
}