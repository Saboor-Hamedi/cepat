import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAppearance } from '../../context/AppearanceContext';
import { useLanguage } from '../../i18n/locale';
import { radii, spacing } from '../../theme/tokens';
import type { ServiceCategory } from '../../types/marketplace';

interface DashboardCategoriesProps {
  categories: ServiceCategory[];
  onCreateCategory: (name: string, description: string) => Promise<void>;
}

export function DashboardCategories({
  categories,
  onCreateCategory,
}: DashboardCategoriesProps) {
  const { language } = useLanguage();
  const { palette } = useAppearance();

  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');

  const handleSubmit = async () => {
    if (!name.trim()) return;
    await onCreateCategory(name, desc);
    setName('');
    setDesc('');
  };

  return (
    <View style={styles.container} testID="admin-platform-section">
      <View
        style={[
          styles.card,
          { backgroundColor: palette.surface, borderColor: palette.border },
        ]}
      >
        <Text style={[styles.cardTitle, { color: palette.text }]}>
          {language === 'en'
            ? 'Add New Marketplace Category'
            : 'Tambah Kategori Layanan Baru'}
        </Text>
        <TextInput
          onChangeText={setName}
          placeholder={
            language === 'en'
              ? 'Category name (e.g., Solar Panel, CCTV)'
              : 'Nama kategori (cth: Panel Surya, CCTV)'
          }
          placeholderTextColor={palette.textMuted}
          style={[
            styles.input,
            {
              backgroundColor: palette.inputBg,
              borderColor: palette.border,
              color: palette.text,
              marginTop: spacing.sm,
            },
          ]}
          testID="admin-new-category-name"
          value={name}
        />
        <TextInput
          onChangeText={setDesc}
          placeholder={
            language === 'en'
              ? 'Category description...'
              : 'Deskripsi kategori layanan...'
          }
          placeholderTextColor={palette.textMuted}
          style={[
            styles.input,
            {
              backgroundColor: palette.inputBg,
              borderColor: palette.border,
              color: palette.text,
            },
          ]}
          testID="admin-new-category-desc"
          value={desc}
        />
        <Pressable
          accessibilityRole="button"
          onPress={() => void handleSubmit()}
          style={[
            styles.primaryBtn,
            { backgroundColor: palette.primary, marginTop: spacing.xs },
          ]}
          testID="admin-add-category-btn"
        >
          <Text style={styles.primaryBtnText}>
            {language === 'en' ? 'Publish Category' : 'Terbitkan Kategori'}
          </Text>
        </Pressable>
      </View>

      {categories.map((cat) => (
        <View
          key={cat.id}
          style={[
            styles.card,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}
        >
          <Text style={[styles.cardTitle, { color: palette.text }]}>{cat.name}</Text>
          <Text style={[styles.cardMeta, { color: palette.textMuted }]}>
            Slug: {cat.slug} · {cat.description}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  card: {
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  cardMeta: {
    fontSize: 12,
    marginTop: 4,
  },
  input: {
    borderRadius: radii.sm,
    borderWidth: 1,
    fontSize: 12,
    marginTop: spacing.xs,
    minHeight: 38,
    paddingHorizontal: spacing.md,
  },
  primaryBtn: {
    alignItems: 'center',
    borderRadius: radii.sm,
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
});
