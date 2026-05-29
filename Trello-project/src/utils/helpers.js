export function pluralize(count, singular, plural) {
  return count === 1 ? singular : plural || singular + 's'
}

export function formatDate(ts) {
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

export function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}
