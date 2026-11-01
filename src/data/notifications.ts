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
    type: row.type,
    title: String(row.title),
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
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  if (shouldUseFixtures()) {
    const notifications = await getStoredJson<CepatNotification[]>(localKey(userId), []);
    const readAt = new Date().toISOString();
    await setStoredJson(
      localKey(userId),
      notifications.map((item) => (item.readAt ? item : { ...item, readAt })),
    );
    return;
  }
  if (!supabase) throw new Error('supabase_unavailable');

  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('read_at', null);
  if (error) throw new Error(`notifications_mark_all_read_failed: ${error.message}`);
}

export async function recordLocalBookingNotification(
  userId: string,
  event: string,
  bookingId: string,
  serviceName: string,
): Promise<void> {
  if (!userId) return;
  const notifications = await getStoredJson<CepatNotification[]>(localKey(userId), []);
  const dedupeKey = `${bookingId}:${event}`;
  if (notifications.some((item) => item.data.dedupeKey === dedupeKey)) return;

  const createdAt = new Date().toISOString();
  const isBookingAccepted = event === 'booking_accepted';
  const isScheduleConfirmed = event === 'booking_schedule_confirmed';
  const isWorkCompleted = event === 'booking_work_completed';
  const notification: CepatNotification = {
    id: `local-${dedupeKey}`,
    userId,
    type: 'booking',
    title: isBookingAccepted
      ? 'Booking accepted'
      : isScheduleConfirmed
        ? 'Schedule confirmed'
        : isWorkCompleted
          ? 'Work ready for confirmation'
          : 'New booking request',
    body: isBookingAccepted
      ? `The technician accepted ${serviceName}.`
      : isScheduleConfirmed
        ? `The customer accepted the proposed schedule for ${serviceName}.`
        : isWorkCompleted
          ? `The technician marked ${serviceName} as complete. Please review and confirm.`
          : `A customer requested ${serviceName}.`,
    data: {
      event,
      bookingId,
      booking_id: bookingId,
      serviceName,
      dedupeKey,
      target_route: `/booking/${bookingId}`,
    },
    createdAt,
  };
  await setStoredJson(
    localKey(userId),
    [notification, ...notifications].slice(0, MAX_NOTIFICATIONS),
  );
  dispatchInAppNotification(notification);
}

export async function recordLocalMessageNotification(
  recipientUserId: string,
  senderName: string,
  messageBody: string,
  bookingId: string,
): Promise<void> {
  if (!recipientUserId) return;
  const notifications = await getStoredJson<CepatNotification[]>(localKey(recipientUserId), []);
  const notificationId = `local-msg-${Date.now()}`;
  const notification: CepatNotification = {
    id: notificationId,
    userId: recipientUserId,
    type: 'message',
    title: senderName || 'Pesan Baru',
    body: messageBody.slice(0, 100),
    data: {
      event: 'chat_message',
      bookingId,
      booking_id: bookingId,
      target_route: `/booking/${bookingId}`,
    },
    createdAt: new Date().toISOString(),
  };
  await setStoredJson(
    localKey(recipientUserId),
    [notification, ...notifications].slice(0, MAX_NOTIFICATIONS),
  );
  dispatchInAppNotification(notification);
}

export function subscribeToNotifications(
  userId: string,
  onChange: () => void,
): () => void {
  if (!userId || shouldUseFixtures() || !supabase) return () => {};

  const channel = supabase
    .channel(`notifications:${userId}:${nextRealtimeChannelSuffix()}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        if (payload.eventType === 'INSERT') {
          const row = payload.new as Record<string, unknown>;
          const notif: CepatNotification = {
            id: String(row.id),
            userId: String(row.user_id),
            type: row.type as CepatNotification['type'],
            title: String(row.title),
            body: row.body ? String(row.body) : undefined,
            data:
              typeof row.data === 'object' && row.data !== null && !Array.isArray(row.data)
                ? (row.data as Record<string, unknown>)
                : {},
            readAt: row.read_at ? String(row.read_at) : undefined,
            createdAt: String(row.created_at),
          };
          dispatchInAppNotification(notif);
        }
        onChange();
      },
    )
    .subscribe();

  return () => {
    void supabase?.removeChannel(channel);
  };
}
