/**
 * Notifications Data Layer (Local Store & Supabase Sync)
 */

import { getStoredJson, setStoredJson } from '../storage/kvStorage';
import { shouldUseFixtures, supabase } from './marketplaceRepository';

const LOCAL_NOTIFICATIONS_KEY = '@cepat/notifications:';
const IN_APP_PUSH_SETTING_KEY = '@cepat/settings:in_app_push_enabled';
const MAX_NOTIFICATIONS = 100;
let realtimeChannelSequence = 0;

export async function getInAppPushEnabled(): Promise<boolean> {
  const val = await getStoredJson<boolean | null>(IN_APP_PUSH_SETTING_KEY, true);
  return val !== false;
}

export async function setInAppPushEnabled(enabled: boolean): Promise<void> {
  await setStoredJson(IN_APP_PUSH_SETTING_KEY, enabled);
}

type InAppNotificationListener = (notification: CepatNotification) => void;
const inAppListeners = new Set<InAppNotificationListener>();

export function subscribeToInAppBanner(listener: InAppNotificationListener): () => void {
  inAppListeners.add(listener);
  return () => {
    inAppListeners.delete(listener);
  };
}

export function dispatchInAppNotification(notification: CepatNotification) {
  for (const listener of inAppListeners) {
    try {
      listener(notification);
    } catch {
      // ignore listener error
    }
  }
}

// Global notification change listener for instant badge synchronization across components
const notificationChangeListeners = new Set<() => void>();

export function notifyNotificationChange() {
  for (const listener of notificationChangeListeners) {
    try {
      listener();
    } catch {
      // ignore listener error
    }
  }
}

export function subscribeToNotificationChanges(listener: () => void): () => void {
  notificationChangeListeners.add(listener);
  return () => {
    notificationChangeListeners.delete(listener);
  };
}

function nextRealtimeChannelSuffix(): string {
  realtimeChannelSequence += 1;
  return `${Date.now()}-${realtimeChannelSequence}`;
}

export interface CepatNotification {
  id: string;
  userId: string;
  type: 'booking' | 'message' | 'review' | 'report' | 'account' | 'system';
  title: string;
  body?: string;
  data: Record<string, unknown>;
  readAt?: string;
  createdAt: string;
}

function localKey(userId: string) {
  return `${LOCAL_NOTIFICATIONS_KEY}${userId}`;
}

export async function loadNotifications(userId: string): Promise<CepatNotification[]> {
  if (!userId) throw new Error('authentication_required');
  if (shouldUseFixtures()) {
    return getStoredJson<CepatNotification[]>(localKey(userId), []);
  }
  if (!supabase) throw new Error('supabase_unavailable');

  const { data, error } = await supabase
    .from('notifications')
    .select('id, user_id, type, title, body, data, read_at, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(MAX_NOTIFICATIONS);
  if (error) throw new Error(`notifications_load_failed: ${error.message}`);

  return (data ?? []).map((row) => ({
    id: String(row.id),
    userId: String(row.user_id),
    type: (row.type as CepatNotification['type']) ?? 'system',
    title: String(row.title ?? ''),
    body: row.body ? String(row.body) : undefined,
    data:
      typeof row.data === 'object' && row.data !== null && !Array.isArray(row.data)
        ? (row.data as Record<string, unknown>)
        : {},
    readAt: row.read_at ? String(row.read_at) : undefined,
    createdAt: String(row.created_at),
  }));
}

export async function markNotificationRead(
  userId: string,
  notificationId: string,
): Promise<void> {
  if (shouldUseFixtures()) {
    const notifications = await getStoredJson<CepatNotification[]>(localKey(userId), []);
    await setStoredJson(
      localKey(userId),
      notifications.map((item) =>
        item.id === notificationId && !item.readAt
          ? { ...item, readAt: new Date().toISOString() }
          : item,
      ),
    );
    notifyNotificationChange();
    return;
  }
  if (!supabase) throw new Error('supabase_unavailable');

  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .eq('user_id', userId)
    .is('read_at', null);
  if (error) throw new Error(`notification_mark_read_failed: ${error.message}`);
  notifyNotificationChange();
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  if (shouldUseFixtures()) {
    const notifications = await getStoredJson<CepatNotification[]>(localKey(userId), []);
    const readAt = new Date().toISOString();
    await setStoredJson(
      localKey(userId),
      notifications.map((item) => (item.readAt ? item : { ...item, readAt })),
    );
    notifyNotificationChange();
    return;
  }
  if (!supabase) throw new Error('supabase_unavailable');

  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('read_at', null);
  if (error) throw new Error(`notifications_mark_all_read_failed: ${error.message}`);
  notifyNotificationChange();
}

export async function markBookingNotificationsRead(
  userId: string,
  bookingId: string,
): Promise<void> {
  if (!userId || !bookingId) return;
  const readAt = new Date().toISOString();
  try {
    const notifications = await getStoredJson<CepatNotification[]>(localKey(userId), []);
    let hasChanges = false;
    const updated = notifications.map((item) => {
      const itemBookingId = item.data.bookingId ?? item.data.booking_id;
      if (itemBookingId === bookingId && !item.readAt) {
        hasChanges = true;
        return { ...item, readAt };
      }
      return item;
    });
    if (hasChanges) {
      await setStoredJson(localKey(userId), updated);
    }
  } catch {
    // ignore local storage error
  }

  if (supabase && !shouldUseFixtures()) {
    try {
      await supabase
        .from('notifications')
        .update({ read_at: readAt })
        .eq('user_id', userId)
        .is('read_at', null)
        .or(`data->>bookingId.eq.${bookingId},data->>booking_id.eq.${bookingId}`);
    } catch {
      // ignore supabase error
    }
  }
  notifyNotificationChange();
}

export async function deleteNotification(
  userId: string,
  notificationId: string,
): Promise<void> {
  if (!userId || !notificationId) return;
  try {
    const notifications = await getStoredJson<CepatNotification[]>(localKey(userId), []);
    const filtered = notifications.filter((item) => item.id !== notificationId);
    await setStoredJson(localKey(userId), filtered);
  } catch {
    // ignore local storage error
  }

  if (supabase && !shouldUseFixtures()) {
    try {
      await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', userId);
    } catch {
      // ignore supabase delete error
    }
  }
  notifyNotificationChange();
}

export async function recordLocalBookingNotification(
  userId: string,
  event: string,
  bookingId: string,
  serviceName: string,
  actorName?: string,
  actorRole?: 'customer' | 'technician',
): Promise<void> {
  if (!userId) return;
  const notifications = await getStoredJson<CepatNotification[]>(localKey(userId), []);
  const dedupeKey = `${bookingId}:${event}`;
  if (notifications.some((item) => item.data.dedupeKey === dedupeKey)) return;

  const createdAt = new Date().toISOString();
  const isBookingAccepted = event === 'booking_accepted';
  const isScheduleConfirmed = event === 'booking_schedule_confirmed';
  const isWorkCompleted = event === 'booking_work_completed';

  const roleLabel =
    actorRole === 'technician' ? 'Teknisi' : actorRole === 'customer' ? 'Pelanggan' : '';
  const actorWithRole = actorName
    ? roleLabel
      ? `${actorName} (${roleLabel})`
      : actorName
    : roleLabel || 'Pengguna';

  const title = actorName || (
    isBookingAccepted
      ? 'Pesanan diterima'
      : isScheduleConfirmed
        ? 'Jadwal dikonfirmasi'
        : isWorkCompleted
          ? 'Pekerjaan selesai'
          : 'Permintaan pesanan baru'
  );

  const body = isBookingAccepted
    ? `${actorWithRole} telah menerima pesanan ${serviceName}.`
    : isScheduleConfirmed
      ? `${actorWithRole} telah menyetujui jadwal untuk ${serviceName}.`
      : isWorkCompleted
        ? `${actorWithRole} menandai ${serviceName} telah selesai. Silakan periksa.`
        : `${actorWithRole} memesan layanan ${serviceName}.`;

  const notification: CepatNotification = {
    id: `local-${dedupeKey}`,
    userId,
    type: 'booking',
    title,
    body,
    data: {
      event,
      bookingId,
      booking_id: bookingId,
      serviceName,
      actorName,
      actorRole,
      dedupeKey,
      target_route: `/booking/${bookingId}`,
    },
    createdAt,
  };
  await setStoredJson(
    localKey(userId),
    [notification, ...notifications].slice(0, MAX_NOTIFICATIONS),
  );
  notifyNotificationChange();
  dispatchInAppNotification(notification);
}

export async function recordLocalMessageNotification(
  recipientUserId: string,
  senderName: string,
  messageBody: string,
  bookingId: string,
  senderRole?: 'customer' | 'technician',
): Promise<void> {
  if (!recipientUserId) return;
  const notifications = await getStoredJson<CepatNotification[]>(localKey(recipientUserId), []);
  const notificationId = `local-msg-${Date.now()}`;
  const roleLabel =
    senderRole === 'technician' ? 'Teknisi' : senderRole === 'customer' ? 'Pelanggan' : '';
  const senderWithRole = roleLabel ? `${senderName} (${roleLabel})` : senderName;

  const notification: CepatNotification = {
    id: notificationId,
    userId: recipientUserId,
    type: 'message',
    title: senderWithRole || 'Pesan Baru',
    body: messageBody.slice(0, 100),
    data: {
      event: 'chat_message',
      bookingId,
      booking_id: bookingId,
      actorName: senderName,
      actorRole: senderRole,
      senderName,
      senderRole,
      target_route: `/booking/${bookingId}`,
    },
    createdAt: new Date().toISOString(),
  };
  await setStoredJson(
    localKey(recipientUserId),
    [notification, ...notifications].slice(0, MAX_NOTIFICATIONS),
  );
  notifyNotificationChange();
  dispatchInAppNotification(notification);
}

export function subscribeToNotifications(
  userId: string,
  onNotification: (notification: CepatNotification) => void,
  onError?: (message: string) => void,
): () => void {
  if (!userId) {
    return () => {};
  }
  if (shouldUseFixtures()) {
    let lastTopId: string | null = null;
    const checkTimer = setInterval(async () => {
      try {
        const notifs = await getStoredJson<CepatNotification[]>(localKey(userId), []);
        if (notifs[0] && notifs[0].id !== lastTopId) {
          lastTopId = notifs[0].id;
          onNotification(notifs[0]);
        }
      } catch {
        // ignore polling error
      }
    }, 4000);
    return () => clearInterval(checkTimer);
  }
  if (!supabase) {
    return () => {};
  }

  const channel = supabase
    .channel(`notifications-${userId}-${nextRealtimeChannelSuffix()}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const row = payload.new as Record<string, unknown>;
        const mapped: CepatNotification = {
          id: String(row.id),
          userId: String(row.user_id),
          type: (row.type as CepatNotification['type']) ?? 'system',
          title: String(row.title ?? ''),
          body: row.body ? String(row.body) : undefined,
          data:
            typeof row.data === 'object' && row.data !== null && !Array.isArray(row.data)
              ? (row.data as Record<string, unknown>)
              : {},
          readAt: row.read_at ? String(row.read_at) : undefined,
          createdAt: String(row.created_at),
        };
        onNotification(mapped);
      },
    )
    .subscribe((status, err) => {
      if (err) onError?.(`notifications_subscribe_error: ${err.message}`);
    });

  return () => {
    void supabase?.removeChannel(channel);
  };
}
