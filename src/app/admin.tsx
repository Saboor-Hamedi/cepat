import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../auth/AuthProvider';
import { AppNavigationBar } from '../components/marketplace-ui';
import { useAppearance } from '../context/AppearanceContext';
import { DashboardContainer } from '../dashboard/DashboardContainer';

export default function AdminConsoleScreen() {
  const { palette } = useAppearance();
  const { user, roles, effectiveRole } = useAuth();

  const isAdminAuthorized = Boolean(user) && roles.includes('admin');

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: palette.background }]}
      edges={['top', 'bottom']}
    >
      <DashboardContainer
        isAdminAuthorized={isAdminAuthorized}
        effectiveRole={effectiveRole}
      />
      <AppNavigationBar activeTab="admin" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
});
