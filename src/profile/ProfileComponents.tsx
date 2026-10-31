import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { ServiceCategoryGlyph } from '../components/marketplace-ui';
import { colors, radii, spacing } from '../theme/tokens';

export function SectionHeader({
  eyebrow,
  title,
  trailing,
}: {
  eyebrow: string;
  title: string;
  trailing?: string;
}) {
  return (
    <View style={styles.sectionHeading}>
      <View>
        <Text style={styles.sectionEyebrow}>{eyebrow}</Text>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {trailing && <Text style={styles.sectionTrailing}>{trailing}</Text>}
    </View>
  );
}

export function PortfolioPhoto({
  uri,
  title,
  tint,
  fallbackLabel,
  large,
}: {
  uri?: string;
  title: string;
  tint: string;
  fallbackLabel: string;
  large?: boolean;
}) {
  const [failed, setFailed] = useState(!uri);
  return (
    <View style={[styles.portfolioImage, large && styles.portfolioImageLarge, { backgroundColor: tint }]}>
      {uri && !failed ? (
        <Image
          source={{ uri }}
          resizeMode="cover"
          style={StyleSheet.absoluteFill}
          accessibilityLabel={title}
          onError={() => setFailed(true)}
        />
      ) : (
        <View style={styles.portfolioFallback}>
          <ServiceCategoryGlyph iconKey="home-maintenance" size={34} />
          <Text style={styles.portfolioFallbackLabel}>{fallbackLabel}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeading: { alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md, marginTop: spacing.xxl },
  sectionEyebrow: { color: colors.green, fontSize: 9, fontWeight: '800', letterSpacing: 1.2, marginBottom: 4 },
  sectionTitle: { color: colors.ink, fontSize: 20, fontWeight: '800', letterSpacing: -0.4 },
  sectionTrailing: { color: colors.muted, fontSize: 12, paddingBottom: 2 },
  portfolioImage: { borderRadius: radii.md, height: 148, overflow: 'hidden', width: '100%' },
  portfolioImageLarge: { height: 240 },
  portfolioFallback: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  portfolioFallbackLabel: { color: colors.muted, fontSize: 10, marginTop: 4 },
});
