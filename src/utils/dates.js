const europeanDateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

const europeanDateTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

function toValidDate(value) {
  const date = new Date(value)

  return Number.isNaN(date.getTime()) ? null : date
}

export function formatEuropeanDate(value, fallback = 'Unknown') {
  const date = toValidDate(value)

  return date ? europeanDateFormatter.format(date) : fallback
}

export function formatEuropeanDateTime(value, fallback = 'never') {
  const date = toValidDate(value)

  return date ? europeanDateTimeFormatter.format(date) : fallback
}
