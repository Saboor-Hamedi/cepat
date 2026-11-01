import { Camera } from 'lucide-react-native';
import { useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { StrictImagePicker } from '../components/StrictImagePicker';
import { useLanguage } from '../i18n/locale';
import { colors, radii, spacing } from '../theme/tokens';
import type { PortfolioItem } from '../types/marketplace';

export interface PortfolioEditorProps {
  portfolio: PortfolioItem[];
  onAddPortfolio: (item: { title: string; imageUri?: string }) => Promise<void> | void;
  onRemovePortfolio?: (id: string) => Promise<void> | void;
}

export function PortfolioEditor({
  portfolio,
  onAddPortfolio,
  onRemovePortfolio,
}: PortfolioEditorProps) {
  const { language } = useLanguage();
  const [newTitle, setNewTitle] = useState('');
  const [newImageUri, setNewImageUri] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAdd = async () => {
    if (!newTitle.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onAddPortfolio({
        title: newTitle.trim(),
        imageUri: newImageUri,
      });
      setNewTitle('');
      setNewImageUri(undefined);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container} testID="profile-portfolio-editor">
      <Text style={styles.heading}>
        {language === 'en' ? 'Portfolio' : 'Portofolio'} ({portfolio.length})
      </Text>

      {portfolio.map((item) => (
        <View key={item.id} style={styles.portfolioRow} testID={`portfolio-item-${item.id}`}>
          {item.imageUri ? (
            <Image source={{ uri: item.imageUri }} style={styles.thumbnail} />
          ) : (
            <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
              <Camera color={colors.muted} size={20} />
            </View>
          )}
          <View style={styles.info}>
            <Text numberOfLines={1} style={styles.itemTitle}>
              {item.title}
            </Text>
          </View>
          {onRemovePortfolio && (
            <Pressable
              accessibilityRole="button"
              onPress={() => onRemovePortfolio(item.id)}
              style={styles.deleteBtn}
              testID={`delete-portfolio-${item.id}`}
            >
              <Text style={styles.deleteBtnText}>×</Text>
            </Pressable>
          )}
        </View>
      ))}

      <View style={styles.addCard}>
        <StrictImagePicker
          currentUri={newImageUri}
          onImageValidated={(uri) => setNewImageUri(uri)}
          testIDPrefix="workspace-portfolio-picker"
        />
        <View style={styles.inputRow}>
          <TextInput
            onChangeText={setNewTitle}
            placeholder={language === 'en' ? 'New portfolio work title' : 'Judul karya portofolio baru'}
            placeholderTextColor={colors.muted}
            style={styles.input}
            testID="workspace-new-portfolio-title"
            value={newTitle}
          />
          <Pressable
            accessibilityRole="button"
            disabled={!newTitle.trim() || isSubmitting}
            onPress={() => {
              void handleAdd();
            }}
            style={[styles.addBtn, (!newTitle.trim() || isSubmitting) && styles.disabledBtn]}
            testID="workspace-add-portfolio-btn"
          >
            <Text style={styles.addBtnText}>+</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
    marginTop: spacing.md,
    width: '100%',
  },
  heading: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: spacing.xs,
  },
  portfolioRow: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xs,
    padding: spacing.xs,
  },
  thumbnail: {
    borderRadius: radii.sm,
    height: 44,
    width: 44,
  },
  thumbnailPlaceholder: {
    alignItems: 'center',
    backgroundColor: colors.paper,
    justifyContent: 'center',
  },
  thumbnailText: {
    fontSize: 16,
  },
  info: {
    flex: 1,
  },
  itemTitle: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '700',
  },
  deleteBtn: {
    alignItems: 'center',
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  deleteBtnText: {
    color: colors.danger,
    fontSize: 18,
    fontWeight: '800',
  },
  addCard: {
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    marginTop: spacing.xs,
    padding: spacing.sm,
  },
  inputRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderColor: colors.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    color: colors.ink,
    flex: 1,
    fontSize: 13,
    minHeight: 40,
    paddingHorizontal: spacing.md,
  },
  addBtn: {
    alignItems: 'center',
    backgroundColor: colors.greenDark,
    borderRadius: radii.sm,
    height: 40,
    justifyContent: 'center',
    width: 44,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  disabledBtn: {
    opacity: 0.5,
  },
});
