export function getTodayRange() {
  const now = new Date()
  const start = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0,
  )
  return {
    start: start.toISOString(),
    end: now.toISOString(),
  }
}
