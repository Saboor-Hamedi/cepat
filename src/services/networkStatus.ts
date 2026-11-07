import { Platform } from 'react-native';

type NetworkChangeListener = (isOnline: boolean) => void;
type ReconnectListener = () => void;

let isOnlineState = true;
let isReconnectingState = false;
let monitorInterval: ReturnType<typeof setInterval> | null = null;

const changeListeners = new Set<NetworkChangeListener>();
const reconnectListeners = new Set<ReconnectListener>();

/**
 * Returns current cached network status
 */
export function getIsOnline(): boolean {
  return isOnlineState;
}

export function getIsReconnecting(): boolean {
  return isReconnectingState;
}

/**
 * Subscribes to network status transitions (online <-> offline)
 */
export function subscribeToNetworkChanges(listener: NetworkChangeListener): () => void {
  changeListeners.add(listener);
  return () => {
    changeListeners.delete(listener);
  };
}

/**
 * Subscribes specifically to graceful reconnect events (offline -> online)
 */
export function subscribeToReconnect(listener: ReconnectListener): () => void {
  reconnectListeners.add(listener);
  return () => {
    reconnectListeners.delete(listener);
  };
}

function emitStatusChange(nextOnline: boolean) {
  const previousOnline = isOnlineState;
  isOnlineState = nextOnline;

  if (previousOnline !== nextOnline) {
    for (const listener of changeListeners) {
      try {
        listener(nextOnline);
      } catch {
        // ignore callback error
      }
    }

    // If transitioned from offline to online, trigger reconnect callbacks
    if (!previousOnline && nextOnline) {
      isReconnectingState = true;
      for (const listener of reconnectListeners) {
        try {
          listener();
        } catch {
          // ignore callback error
        }
      }
      setTimeout(() => {
        isReconnectingState = false;
      }, 2500);
    }
  }
}

/**
 * Actively probes network connectivity with a lightweight HEAD/GET ping
 */
export async function checkNetworkConnectivity(): Promise<boolean> {
  // If running in browser and navigator reports offline, respect it immediately
  if (Platform.OS === 'web' && typeof navigator !== 'undefined' && !navigator.onLine) {
    emitStatusChange(false);
    return false;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    // Reliable no-content 204 endpoint for lightweight connectivity validation
    const response = await fetch('https://clients3.google.com/generate_204', {
      method: 'HEAD',
      headers: { 'Cache-Control': 'no-cache' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const reachable = response.status >= 200 && response.status < 400;
    emitStatusChange(reachable);
    return reachable;
  } catch {
    // If google ping fails, try Supabase or fallback
    try {
      const fallbackController = new AbortController();
      const fallbackTimeoutId = setTimeout(() => fallbackController.abort(), 2000);
      const res = await fetch('https://httpbin.org/status/200', {
        method: 'HEAD',
        signal: fallbackController.signal,
      });
      clearTimeout(fallbackTimeoutId);
      const reachable = res.status >= 200 && res.status < 400;
      emitStatusChange(reachable);
      return reachable;
    } catch {
      emitStatusChange(false);
      return false;
    }
  }
}

/**
 * Notifies the network engine that an outgoing network call failed due to connectivity
 */
export function notifyNetworkFailure() {
  emitStatusChange(false);
}

/**
 * Notifies the network engine that an outgoing network call succeeded
 */
export function notifyNetworkSuccess() {
  emitStatusChange(true);
}

/**
 * Starts periodic background heartbeat monitoring
 */
export function startNetworkMonitoring(): () => void {
  if (monitorInterval) {
    return () => {};
  }

  // Initial check
  void checkNetworkConnectivity();

  // Web event listeners
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const handleOnline = () => void checkNetworkConnectivity();
    const handleOffline = () => emitStatusChange(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
  }

  // Adaptive polling: checks every 12s when online, every 4s when offline for rapid reconnect detection
  monitorInterval = setInterval(() => {
    void checkNetworkConnectivity();
  }, isOnlineState ? 12000 : 4000);

  return () => {
    if (monitorInterval) {
      clearInterval(monitorInterval);
      monitorInterval = null;
    }
  };
}
