import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { font } from '../theme/typography';

import { ServiceCategoryGlyph } from '../components/marketplace-ui';
import { useAppearance } from '../context/AppearanceContext';
import { colors, radii, spacing } from '../theme/tokens';

export function SectionHeader({
  eyebrow,
  title,
  trailing,
  compact = false,
}: {
  eyebrow?: string;
  title: string;
  trailing?: string;
  compact?: boolean;
}) {
  const { palette } = useAppearance();

  return (
    <View style={[styles.sectionHeading, compact && styles.sectionHeadingCompact]}>
      <View>
        {eyebrow ? (
          <Text style={[styles.sectionEyebrow, { color: palette.primary }]}>
            {eyebrow}
          </Text>
        ) : null}
        <Text style={[styles.sectionTitle, { color: palette.text }]}>{title}</Text>
      </View>
      {trailing && (
        <Text style={[styles.sectionTrailing, { color: palette.textMuted }]}>
          {trailing}
        </Text>
      )}
    </View>
  );
}

export function PortfolioPhoto({
  uri,
  title,
  fallbackLabel,
  large,
}: {
  uri?: string;
  title: string;
  fallbackLabel: string;
  large?: boolean;
}) {
  const { palette } = useAppearance();
  const [failed, setFailed] = useState(!uri);
  return (
    <View
      style={[
        styles.portfolioImage,
        large && styles.portfolioImageLarge,
        { backgroundColor: palette.surfaceElevated },
      ]}
    >
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
          <Text style={[styles.portfolioFallbackLabel, { color: palette.textMuted }]}>
            {fallbackLabel}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeading: { alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md, marginTop: spacing.xxl },
  sectionHeadingCompact: { marginTop: 6, marginBottom: 8 },
  sectionEyebrow: { color: colors.green, fontSize: font.caption, fontWeight: '800', letterSpacing: 1.2, marginBottom: 4 },
  sectionTitle: { color: colors.ink, fontSize: font.section, fontWeight: '800', letterSpacing: -0.4 },
  sectionTrailing: { color: colors.muted, fontSize: font.body, paddingBottom: 2 },
  portfolioImage: { borderRadius: radii.md, height: 148, overflow: 'hidden', width: '100%' },
  portfolioImageLarge: { height: 240 },
  portfolioFallback: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  portfolioFallbackLabel: { color: colors.muted, fontSize: font.caption, marginTop: 4 },
});
