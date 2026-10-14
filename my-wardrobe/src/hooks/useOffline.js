import { useEffect, useState } from 'react'
import { API_CACHE } from '../lib/cacheNames'

// Já existe algum dado guardado pelo service worker para mostrar sem conexão?
async function hasCachedData() {
  if (!('caches' in window)) return false
  try {
    const cache = await caches.open(API_CACHE)
    return (await cache.keys()).length > 0
  } catch {
    return false
  }
}

// true quando não há conexão e também não há nada em cache para mostrar.
export function useOffline() {
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    let alive = true
    async function check() {
      const next = !navigator.onLine && !(await hasCachedData())
      if (alive) setOffline(next)
    }
    check()
    window.addEventListener('online', check)
    window.addEventListener('offline', check)
    return () => {
      alive = false
      window.removeEventListener('online', check)
      window.removeEventListener('offline', check)
    }
  }, [])

  return offline
}
