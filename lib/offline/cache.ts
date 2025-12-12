export type OfflineCacheKey = "tasks" | "hackathons"

const PREFIX = "hacktrackr.offline.v1"

function keyFor(userId: string, key: OfflineCacheKey) {
  return `${PREFIX}.${userId}.${key}`
}

export function setOfflineCache<T>(userId: string, key: OfflineCacheKey, value: T) {
  try {
    localStorage.setItem(
      keyFor(userId, key),
      JSON.stringify({ savedAt: new Date().toISOString(), value }),
    )
  } catch {
    // ignore
  }
}

export function getOfflineCache<T>(userId: string, key: OfflineCacheKey): { savedAt: string; value: T } | null {
  try {
    const raw = localStorage.getItem(keyFor(userId, key))
    if (!raw) return null
    return JSON.parse(raw) as { savedAt: string; value: T }
  } catch {
    return null
  }
}
