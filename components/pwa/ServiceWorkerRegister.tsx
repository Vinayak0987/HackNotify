"use client"

import { useEffect } from "react"

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return
    if (!("serviceWorker" in navigator)) return

    // Register service worker for offline caching.
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // ignore
    })
  }, [])

  return null
}
