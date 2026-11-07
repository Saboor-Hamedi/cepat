import { LogBox, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { router } from 'expo-router';

import { getStoredJson, setStoredJson } from '../storage/kvStorage';

try {
  LogBox.ignoreLogs([
    'expo-notifications',
    'Push notifications (remote notifications) are unavailable in Expo Go',
    'functionality is not fully supported in Expo Go',
  ]);
} catch {
  // Ignore if LogBox is unavailable in test runtime
}

const PUSH_TOKEN_STORAGE_KEY = '@cepat/push_token';
const IN_APP_PUSH_SETTING_KEY = '@cepat/settings:in_app_push_enabled';
let cachedPushToken: string | null = null;
let isInitialized = false;

async function isInAppPushEnabled(): Promise<boolean> {
  const val = await getStoredJson<boolean | null>(IN_APP_PUSH_SETTING_KEY, true);
  return val !== false;
}

// Configure global foreground notification behavior
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch {
  // Ignore in unsupported runtimes
}

/**
 * Initialize Expo Push Notifications:
 * 1. Configures Android notification channel (High importance with sound & vibration)
 * 2. Requests user permission
 * 3. Fetches device push token (on physical devices)
 * 4. Listens for user response/tap to deep link into relevant screen
 */
export async function initPushNotifications(): Promise<{
  granted: boolean;
  pushToken: string | null;
}> {
  if (isInitialized) {
    return {
      granted: true,
      pushToken: cachedPushToken,
    };
  }
  isInitialized = true;

  try {
    // 1. Setup Android Channel
    if (Platform.OS === 'android') {
      try {
        await Notifications.setNotificationChannelAsync('cepat-default', {
          name: 'Cepat Notifications',
          importance: AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#4EBA97',
          enableVibrate: true,
        });
      } catch {
        // Native channel setup skipped if unavailable in current runtime
      }
    }

    // 2. Request / verify permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    const granted = finalStatus === 'granted';
    if (!granted) {
      return { granted: false, pushToken: null };
    }

    // 3. Retrieve Push Token (skip remote token fetch on Android Expo Go where SDK 53+ disables remote push)
    try {
      if (Platform.OS === 'android' && !process.env.EXPO_PUBLIC_EAS_PROJECT_ID) {
        cachedPushToken = await getStoredJson<string | null>(PUSH_TOKEN_STORAGE_KEY, null);
      } else {
        const tokenResult = await Notifications.getExpoPushTokenAsync();
        cachedPushToken = tokenResult.data;
        await setStoredJson(PUSH_TOKEN_STORAGE_KEY, cachedPushToken);
      }
    } catch {
      // In simulator or environments without EAS project ID, fallback to stored token
      cachedPushToken = await getStoredJson<string | null>(PUSH_TOKEN_STORAGE_KEY, null);
    }

    // 4. Setup interaction / deep link listener
    Notifications.addNotificationResponseReceivedListener((response) => {
      try {
        const data = response.notification.request.content.data as Record<string, unknown> | undefined;
        if (!data) {
          router.navigate('/notifications' as never);
          return;
        }

        if (typeof data.bookingId === 'string' && data.bookingId) {
          router.navigate(`/booking/${data.bookingId}` as never);
          return;
        }

        if (typeof data.url === 'string' && data.url) {
          router.navigate(data.url as never);
          return;
        }

        router.navigate('/notifications' as never);
      } catch (err) {
        console.warn('[pushNotifications] Failed to handle notification tap navigation:', err);
      }
    });

    return { granted: true, pushToken: cachedPushToken };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes('ExpoNotificationChannelManager') && !message.includes('NullPointerException')) {
      console.warn('[pushNotifications] Initialization warning:', error);
    }
    return { granted: false, pushToken: null };
  }
}

/**
 * Returns the currently active Expo Push Token if registered
 */
export async function getActivePushToken(): Promise<string | null> {
  if (cachedPushToken) return cachedPushToken;
  cachedPushToken = await getStoredJson<string | null>(PUSH_TOKEN_STORAGE_KEY, null);
  return cachedPushToken;
}

/**
 * Triggers an immediate local system push notification (with native banner and sound)
 * Respects user's push notification preferences from Settings
 */
export async function triggerLocalPushNotification(options: {
  title: string;
  body?: string;
  data?: Record<string, unknown>;
  sound?: boolean;
}): Promise<string | null> {
  try {
    const isPushEnabled = await isInAppPushEnabled();
    if (!isPushEnabled) {
      return null;
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: options.title,
        body: options.body || '',
        data: options.data,
        sound: options.sound !== false ? 'default' : undefined,
      },
      trigger: null, // deliver immediately
    });

    return notificationId;
  } catch (error) {
    console.warn('[pushNotifications] Failed to schedule local push notification:', error);
    return null;
  }
}
