// ═══ プッシュ通知 ═══
const VAPID_PUBLIC_KEY = 'BAtDbe-fCTuTmgSfL6P9pnyU2T7kAcCRqwHEnWMOIxYmxdJ63lr3ddYwzC9R2hM9U4HcdGjUXIzFQJcu_jpVVKQ';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

async function subscribePush() {
  if (!isPushSupported()) return null;
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    toast(LANG === 'vi' ? 'Bạn đã từ chối thông báo' : 'Benachrichtigungen abgelehnt', 'i');
    return null;
  }
  try {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });
    }
    await savePushSubscription(sub);
    return sub;
  } catch (e) {
    console.error('[Push]', e);
    return null;
  }
}

async function unsubscribePush() {
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await sub.unsubscribe();
      await sb.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
    }
  } catch (e) { console.error('[Push]', e); }
}

async function savePushSubscription(sub) {
  if (!U || !U.id) return;
  const { error } = await sb.from('push_subscriptions')
    .upsert({
      user_id: U.id,
      endpoint: sub.endpoint,
      keys: JSON.stringify(sub.toJSON().keys),
      user_role: U.role,
      user_standorte: U.standorte || ['all'],
      updated_at: new Date().toISOString()
    }, { onConflict: 'endpoint' });
  if (error) console.error('[Push]', error.message);
}

async function initPush() {
  if (!isPushSupported() || !U || !U.id) {
    console.log('[Push] Skip:', !isPushSupported() ? 'not supported' : 'no user');
    return;
  }
  console.log('[Push] Permission:', Notification.permission);
  if (Notification.permission === 'denied') {
    console.log('[Push] Blocked by user');
    return;
  }
  await subscribePush();
}

async function sendPushNotification(eventType, standortId, title, body, roles) {
  try {
    const { data, error } = await sb.functions.invoke('send-push', {
      body: { event_type: eventType, standort_id: standortId, title, body, roles: roles || ['admin', 'manager'] }
    });
    if (error) console.error('[Push]', error);
  } catch (e) { console.error('[Push]', e); }
}
