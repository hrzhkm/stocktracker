const KUALA_LUMPUR_TIMEZONE = 'Asia/Kuala_Lumpur'

export function getKualaLumpurDateString(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: KUALA_LUMPUR_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export function toStartOfUtcDay(dateString: string) {
  return new Date(`${dateString}T00:00:00.000Z`)
}

export function toIsoDate(date: Date | string) {
  if (typeof date === 'string') {
    return date.slice(0, 10)
  }

  return date.toISOString().slice(0, 10)
}

export function formatDateLabel(dateString: string | null) {
  if (!dateString) {
    return 'No data yet'
  }

  return new Intl.DateTimeFormat('en-MY', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${dateString}T00:00:00.000Z`))
}
