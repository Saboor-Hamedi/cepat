import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { RefreshCw, Wifi, WifiOff } from 'lucide-react-native';

import { useNetworkStatus } from '../context/NetworkContext';
import { useAppearance } from '../context/AppearanceContext';
import { useLanguage } from '../i18n/locale';
import { spacing } from '../theme/tokens';
import { font } from '../theme/typography';

export function OfflineBanner() {
  const { isOnline, isReconnecting, refreshConnectivity } = useNetworkStatus();
  const { palette } = useAppearance();
  const { language } = useLanguage();

  const [isRetrying, setIsRetrying] = useState(false);

  // If online and not in the brief reconnect grace period, don't occupy any layout space
  if (isOnline && !isReconnecting) {
    return null;
  }

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await refreshConnectivity();
    } finally {
      setIsRetrying(false);
    }
  };

  const isBackOnline = isOnline && isReconnecting;

  return (
    <View
      style={[
        styles.container,
        isBackOnline
          ? [styles.containerOnline, { backgroundColor: 'rgba(16, 185, 129, 0.12)', borderColor: '#10B981' }]
          : [styles.containerOffline, { backgroundColor: palette.surfaceElevated, borderColor: palette.border }],
      ]}
      testID="offline-status-banner"
    >
      <View style={styles.leftRow}>
        <View style={styles.iconWrap}>
          {isBackOnline ? (
            <Wifi color="#10B981" size={15} strokeWidth={2.4} />
          ) : (
            <WifiOff color="#F59E0B" size={15} strokeWidth={2.4} />
          )}
        </View>

        <Text
          numberOfLines={1}
          style={[
            styles.statusText,
            { color: isBackOnline ? '#10B981' : palette.text },
          ]}
        >
          {isBackOnline
            ? language === 'en'
              ? 'Connected · We are back online'
              : 'Terhubung · Kembali online'
            : language === 'en'
              ? 'Disconnected · Showing cached data'
              : 'Terputus · Menampilkan data tersimpan'}
        </Text>
      </View>

      {!isBackOnline && (
        <Pressable
          accessibilityLabel={language === 'en' ? 'Retry connection' : 'Coba lagi'}
          accessibilityRole="button"
          disabled={isRetrying}
          hitSlop={6}
          onPress={() => void handleRetry()}
          style={({ pressed }) => [
            styles.retryBtn,
            { backgroundColor: palette.primarySoft, borderColor: palette.primary },
            pressed && styles.retryBtnPressed,
          ]}
          testID="offline-retry-btn"
        >
          <RefreshCw
            color={palette.primary}
            size={12}
            strokeWidth={2.2}
            style={isRetrying ? styles.rotating : undefined}
          />
          <Text style={[styles.retryText, { color: palette.primary }]}>
            {language === 'en' ? 'Retry' : 'Ulangi'}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    width: '100%',
  },
  containerOffline: {},
  containerOnline: {},
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  leftRow: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
  },
  retryBtn: {
    alignItems: 'center',
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  retryBtnPressed: {
    opacity: 0.7,
  },
  retryText: {
    fontSize: font.caption,
    fontWeight: '700',
  },
  rotating: {
    opacity: 0.6,
  },
  statusText: {
    flex: 1,
    fontSize: font.caption,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
});
