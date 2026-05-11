import { supabase } from '../lib/supabase.js'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

function withTimeout(promise, ms, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      window.setTimeout(() => reject(new Error(message)), ms)
    }),
  ])
}

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
  if (!userId) throw new Error('You must be logged in to enable notifications.')
  if (!('Notification' in window)) {
    throw new Error('This browser does not support web notifications.')
  }
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Push notifications are only available from the installed app on this device.')
  }
  if (!VAPID_PUBLIC_KEY) {
    console.warn('[push] VITE_VAPID_PUBLIC_KEY is not set')
    throw new Error('Push is not configured on this deployment yet.')
  }

  if (Notification.permission === 'denied') {
    throw new Error('Notifications are blocked. Enable them in this app/site settings first.')
  }

  const permission = await withTimeout(
    Notification.requestPermission(),
    30000,
    'Notification permission prompt timed out. Try closing and reopening the installed app.',
  )
  if (permission !== 'granted') {
    throw new Error('Notification permission was not granted on this device.')
  }

  const registration = await withTimeout(
    navigator.serviceWorker.ready,
    10000,
    'The app service worker is not ready yet. Close and reopen the app, then try again.',
  )

  let sub = await registration.pushManager.getSubscription()
  if (!sub) {
    sub = await withTimeout(
      registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      }),
      10000,
      'Push subscription timed out. Close and reopen the installed app, then try again.',
    )
  }

  const endpoint = sub.endpoint
  const subscriptionJson = sub.toJSON()

  const { error } = await supabase.from('push_subscriptions').upsert(
    { user_id: userId, endpoint, subscription: subscriptionJson },
    { onConflict: 'user_id,endpoint' },
  )

  if (error) {
    console.error('[push] Failed to save subscription:', error.message)
    throw new Error(`Could not save this device for push notifications: ${error.message}`)
  }

  return true
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
