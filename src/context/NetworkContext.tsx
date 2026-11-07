import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  checkNetworkConnectivity,
  getIsOnline,
  getIsReconnecting,
  startNetworkMonitoring,
  subscribeToNetworkChanges,
  subscribeToReconnect,
} from '../services/networkStatus';

interface NetworkContextValue {
  isOnline: boolean;
  isReconnecting: boolean;
  refreshConnectivity: () => Promise<boolean>;
}

const NetworkContext = createContext<NetworkContextValue>({
  isOnline: true,
  isReconnecting: false,
  refreshConnectivity: async () => true,
});

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(getIsOnline);
  const [isReconnecting, setIsReconnecting] = useState(getIsReconnecting);

  useEffect(() => {
    const stopMonitoring = startNetworkMonitoring();

    const unsubStatus = subscribeToNetworkChanges((online) => {
      setIsOnline(online);
    });

    const unsubReconnect = subscribeToReconnect(() => {
      setIsReconnecting(true);
      setTimeout(() => {
        setIsReconnecting(false);
      }, 2500);
    });

    return () => {
      stopMonitoring();
      unsubStatus();
      unsubReconnect();
    };
  }, []);

  return (
    <NetworkContext.Provider
      value={{
        isOnline,
        isReconnecting,
        refreshConnectivity: checkNetworkConnectivity,
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetworkStatus(): NetworkContextValue {
  return useContext(NetworkContext);
}
