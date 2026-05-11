import { supabase } from '../lib/supabase.js'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

export function pushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

export function notificationPermission() {
  if (!('Notification' in window)) return 'unsupported'
  return Notification.permission
}

/**
 * Convert a base64url VAPID public key to the Uint8Array the browser expects.
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

/**
 * Request permission, subscribe to push, and save to Supabase.
 * Safe to call multiple times – will upsert the subscription.
 * Returns true if subscribed successfully.
 */
export async function subscribeToPush(userId) {
  if (!userId) return false
  if (!pushSupported()) return false
  if (!VAPID_PUBLIC_KEY) {
    console.warn('[push] VITE_VAPID_PUBLIC_KEY is not set')
    return false
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return false

  const registration = await navigator.serviceWorker.ready

  let sub = await registration.pushManager.getSubscription()
  if (!sub) {
    sub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })
  }

  const endpoint = sub.endpoint
  const subscriptionJson = sub.toJSON()

  const { error } = await supabase.from('push_subscriptions').upsert(
    { user_id: userId, endpoint, subscription: subscriptionJson },
    { onConflict: 'user_id,endpoint' },
  )

  if (error) console.error('[push] Failed to save subscription:', error.message)
  return !error
}

/**
 * Unsubscribe from push and remove from Supabase.
 */
export async function unsubscribeFromPush(userId) {
  if (!('serviceWorker' in navigator)) return

  const registration = await navigator.serviceWorker.ready
  const sub = await registration.pushManager.getSubscription()

  if (sub) {
    const endpoint = sub.endpoint
    await sub.unsubscribe()
    if (userId) {
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', userId)
        .eq('endpoint', endpoint)
    }
  }
}
