import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

/*
 * Native push for the mobile app.
 *
 * Browser Web Push does not exist inside the native WebView, so the shared
 * app's enablePush() hands over to this when it finds window.KapsNativePush.
 * The server stores the device token next to the browser subscriptions and
 * sends each notification to both, so a user gets the same notification on
 * the web and on their phone.
 */

const BASE = `https://${projectId}.supabase.co/functions/v1/make-server-0abfa7cf`;
const CHANNEL_ID = 'kaps-default';

let currentUserId = '';
let listenersAdded = false;

async function saveToken(token: string) {
  if (!currentUserId || !token) return;
  try {
    await fetch(`${BASE}/push/register-native`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` },
      body: JSON.stringify({ userId: currentUserId, token, platform: Capacitor.getPlatform() }),
    });
  } catch (e) {
    console.error('Saving the push token failed', e);
  }
}

async function addListeners() {
  if (listenersAdded) return;
  listenersAdded = true;

  await PushNotifications.addListener('registration', ({ value }) => { void saveToken(value); });
  await PushNotifications.addListener('registrationError', (e) => {
    console.error('Push registration failed', e);
  });

  // A tap on a notification: hand its destination to the running app, the
  // same message the web service worker sends on a notification click.
  await PushNotifications.addListener('pushNotificationActionPerformed', ({ notification }) => {
    const url = String(notification.data?.url || '/');
    window.dispatchEvent(new CustomEvent('kaps-notification-click', { detail: { url } }));
  });
}

// Kept in step with the OS so the shared app can read it synchronously, the
// way it reads Notification.permission on the web.
let state: 'granted' | 'denied' | 'default' = 'default';
function track(receive: string) {
  state = receive === 'granted' ? 'granted' : receive === 'denied' ? 'denied' : 'default';
}
function permission() {
  return state;
}

async function enable(userId: string): Promise<{ ok: boolean; reason?: string }> {
  currentUserId = userId;
  try {
    let status = await PushNotifications.checkPermissions();
    if (status.receive === 'prompt' || status.receive === 'prompt-with-rationale') {
      status = await PushNotifications.requestPermissions();
    }
    track(status.receive);
    if (status.receive !== 'granted') return { ok: false, reason: status.receive };

    if (Capacitor.getPlatform() === 'android') {
      await PushNotifications.createChannel({
        id: CHANNEL_ID,
        name: 'Notifications',
        description: 'Tasks, approvals and other KAPS & Co. updates',
        importance: 4,
        visibility: 1,
      });
    }

    await addListeners();
    // Fires 'registration' with the device token every launch, so a token the
    // OS rotated reaches the server without any extra bookkeeping.
    await PushNotifications.register();
    return { ok: true };
  } catch (e: any) {
    console.error('enable native push failed', e);
    return { ok: false, reason: e?.message || 'error' };
  }
}

declare const __ANDROID_PUSH_CONFIGURED__: boolean;

// Without Firebase configured, Android registration would crash the app, so
// the hook is left out and the app falls back to the in-app bell only.
const available = Capacitor.isNativePlatform()
  && (Capacitor.getPlatform() !== 'android' || __ANDROID_PUSH_CONFIGURED__);

if (available) {
  (window as any).KapsNativePush = { enable, permission };
  PushNotifications.checkPermissions().then(s => track(s.receive)).catch(() => {});
}
