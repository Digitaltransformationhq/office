import { projectId, publicAnonKey } from '/utils/supabase/info';

const BASE = `https://${projectId}.supabase.co/functions/v1/make-server-0abfa7cf`;

function post(path: string, body: any) {
  return fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` },
    body: JSON.stringify(body),
  }).then(r => r.json());
}

function getVapidKey(): Promise<string> {
  return fetch(`${BASE}/push/vapid-public-key`, {
    headers: { Authorization: `Bearer ${publicAnonKey}` },
  }).then(r => r.json()).then(d => (d?.success ? d.key : ''));
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function pushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export function pushPermission(): NotificationPermission | 'unsupported' {
  if (!pushSupported()) return 'unsupported';
  return Notification.permission;
}

/** Register the SW, request permission, subscribe, and save the subscription. */
export async function enablePush(userId: string): Promise<{ ok: boolean; reason?: string }> {
  if (!pushSupported()) return { ok: false, reason: 'unsupported' };
  try {
    const reg = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return { ok: false, reason: permission };

    const key = await getVapidKey();
    if (!key) return { ok: false, reason: 'no-vapid-key' };

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      });
    }

    const res = await post('/push/subscribe', { userId, subscription: sub });
    return res?.success ? { ok: true } : { ok: false, reason: res?.error || 'save-failed' };
  } catch (e: any) {
    console.error('enablePush error', e);
    return { ok: false, reason: e?.message || 'error' };
  }
}
