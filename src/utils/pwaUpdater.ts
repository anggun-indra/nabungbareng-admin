import { APP_VERSION, BUILD_NUMBER } from '../version'

export interface VersionInfo {
  version: string
  build: number
  updatedAt?: string
  releaseNotes?: string
  force?: boolean
}

export interface UpdateCheckResult {
  hasUpdate: boolean
  forceUpdate?: boolean
  currentVersion: string
  currentBuild: number
  serverVersion?: string
  serverBuild?: number
  releaseNotes?: string
  error?: string
}

let swRegistration: ServiceWorkerRegistration | null = null
let waitingWorker: ServiceWorker | null = null
const updateListeners = new Set<(info: UpdateCheckResult) => void>()

function notifyListeners(info: UpdateCheckResult) {
  updateListeners.forEach((fn) => {
    try {
      fn(info)
    } catch (e) {
      console.warn('Error in update listener:', e)
    }
  })
}

/**
 * Register Service Worker with updateViaCache: 'none'
 */
export function registerAdminServiceWorker(onUpdateFound?: (info: UpdateCheckResult) => void) {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return
  }

  if (onUpdateFound) {
    updateListeners.add(onUpdateFound)
  }

  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js', {
        updateViaCache: 'none',
      })
      swRegistration = reg
      console.log('[Admin PWA] Service Worker registered with scope:', reg.scope)

      // 1. If a worker is already waiting in background
      if (reg.waiting) {
        waitingWorker = reg.waiting
        notifyListeners({
          hasUpdate: true,
          currentVersion: APP_VERSION,
          currentBuild: BUILD_NUMBER,
          serverVersion: 'Versi Baru',
          releaseNotes: 'Pembaruan aplikasi admin telah siap.',
        })
      }

      // 2. Listen for newly installing worker
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing
        if (!newWorker) return

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              waitingWorker = newWorker
              console.log('[Admin PWA] New version installed and waiting!')
              notifyListeners({
                hasUpdate: true,
                currentVersion: APP_VERSION,
                currentBuild: BUILD_NUMBER,
                serverVersion: 'Versi Baru',
                releaseNotes: 'Pembaruan aplikasi admin siap dipasang.',
              })
            }
          }
        })
      })

      // 3. Immediate check on startup
      setTimeout(() => {
        checkForAdminUpdate().catch(() => {})
      }, 1000)

      // 4. Check on app resume / window focus
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          checkForAdminUpdate().catch(() => {})
        }
      })

      window.addEventListener('focus', () => {
        checkForAdminUpdate().catch(() => {})
      })

      // 5. Periodic check every 5 minutes when online
      setInterval(() => {
        if (navigator.onLine) {
          checkForAdminUpdate().catch(() => {})
        }
      }, 5 * 60 * 1000)
    } catch (err) {
      console.error('[Admin PWA] Service Worker registration failed:', err)
    }
  })

  // Listen for controller changes (Smooth reload when new SW takes control)
  let refreshing = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true
      console.log('[Admin PWA] Controller changed, reloading page to apply update...')
      window.location.reload()
    }
  })
}

/**
 * Compare two semver/build versions
 */
function isServerVersionNewer(serverVer: string, serverBuild?: number): boolean {
  if (serverBuild && serverBuild > BUILD_NUMBER) {
    return true
  }

  const currentParts = APP_VERSION.split('.').map((p) => parseInt(p, 10) || 0)
  const serverParts = serverVer.split('.').map((p) => parseInt(p, 10) || 0)

  for (let i = 0; i < Math.max(currentParts.length, serverParts.length); i++) {
    const c = currentParts[i] || 0
    const s = serverParts[i] || 0
    if (s > c) return true
    if (s < c) return false
  }

  return false
}

/**
 * Actively check for updates with fast timeout
 */
export async function checkForAdminUpdate(): Promise<UpdateCheckResult> {
  // 1. Kick off Service Worker update in parallel
  if (swRegistration) {
    swRegistration
      .update()
      .then((reg) => {
        if (reg?.waiting) {
          waitingWorker = reg.waiting
        }
      })
      .catch((swErr) => {
        console.warn('[Admin PWA] swRegistration.update notice:', swErr)
      })
  }

  // 2. Fetch fresh version.json with 2.5s timeout
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 2500)

  try {
    const res = await fetch(`/version.json?_t=${Date.now()}`, {
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
      },
    })

    clearTimeout(timeoutId)

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`)
    }

    const data: VersionInfo = await res.json()
    const hasUpdate = isServerVersionNewer(data.version, data.build) || !!waitingWorker

    const result: UpdateCheckResult = {
      hasUpdate,
      forceUpdate: data.force === true,
      currentVersion: APP_VERSION,
      currentBuild: BUILD_NUMBER,
      serverVersion: data.version,
      serverBuild: data.build,
      releaseNotes: data.releaseNotes,
    }

    if (hasUpdate) {
      notifyListeners(result)
    }

    return result
  } catch (err: any) {
    clearTimeout(timeoutId)
    console.warn('[Admin PWA] Check version.json notice:', err)
    const result: UpdateCheckResult = {
      hasUpdate: !!waitingWorker,
      currentVersion: APP_VERSION,
      currentBuild: BUILD_NUMBER,
      error: err?.message || 'Tidak dapat terhubung ke server',
    }
    return result
  }
}

/**
 * Execute hard update & invalidate caches
 */
export async function forceAdminUpdate(): Promise<void> {
  console.log('[Admin PWA] Executing Force Update & Cache Invalidation...')

  try {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' })
      waitingWorker.postMessage({ type: 'FORCE_REFRESH' })
    } else if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'FORCE_REFRESH' })
      navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' })
    }

    if ('caches' in window) {
      const keys = await caches.keys()
      await Promise.all(keys.map((key) => caches.delete(key)))
      console.log('[Admin PWA] All CacheStorage caches purged successfully.')
    }
  } catch (e) {
    console.warn('[Admin PWA] Cache purge notice:', e)
  }

  setTimeout(() => {
    window.location.reload()
  }, 150)
}

export function subscribeToAdminUpdates(listener: (info: UpdateCheckResult) => void): () => void {
  updateListeners.add(listener)
  return () => {
    updateListeners.delete(listener)
  }
}
