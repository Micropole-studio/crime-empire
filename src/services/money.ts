export function calculateOfflineMoney(
  money: number,
  incomePerHour: number,
  lastUpdate: string
) {
  const now = Date.now()
  const last = new Date(lastUpdate).getTime()

  const hours = (now - last) / (1000 * 60 * 60)

  return money + incomePerHour * hours
}