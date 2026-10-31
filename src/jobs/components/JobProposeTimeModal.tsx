import { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAppearance } from '../../context/AppearanceContext';
import { useLanguage } from '../../i18n/locale';
import { colors, radii, spacing } from '../../theme/tokens';
import type { BookingRecord } from '../../types/marketplace';

export interface JobProposeTimeModalProps {
  visible: boolean;
  request: BookingRecord | null;
  onClose: () => void;
  onSubmit: (bookingId: string, proposedTime: string) => void;
}

export function JobProposeTimeModal({
  visible,
  request,
  onClose,
  onSubmit,
}: JobProposeTimeModalProps) {
  const { language } = useLanguage();
  const { palette, reduceMotion } = useAppearance();
  const [proposedTime, setProposedTime] = useState('2026-11-05 10:00 WIB');

  if (!request) return null;

  return (
    <Modal
      animationType={reduceMotion ? 'none' : 'fade'}
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[
            styles.modalContent,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}
          onPress={(e) => e.stopPropagation()}
          testID="dashboard-propose-modal"
        >
          <Text style={[styles.title, { color: palette.text }]}>
            {language === 'en' ? 'Propose Alternative Time' : 'Ajukan Jadwal Alternatif'}
          </Text>
          <Text style={[styles.subtitle, { color: palette.textMuted }]}>
            {language === 'en'
              ? `Current requested start: ${request.requestedStartAt.slice(0, 16).replace('T', ' ')} WIB`
              : `Jadwal diminta saat ini: ${request.requestedStartAt.slice(0, 16).replace('T', ' ')} WIB`}
          </Text>

          <TextInput
            onChangeText={setProposedTime}
            placeholder="YYYY-MM-DD HH:MM WIB"
            placeholderTextColor={palette.textMuted}
            style={[
              styles.input,
              {
                backgroundColor: palette.inputBg,
                borderColor: palette.border,
                color: palette.text,
              },
            ]}
            testID={`dashboard-propose-input-${request.id}`}
            value={proposedTime}
          />

          <View style={styles.btnRow}>
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              style={[styles.cancelBtn, { borderColor: palette.border }]}
            >
              <Text style={[styles.cancelBtnText, { color: palette.text }]}>
                {language === 'en' ? 'Cancel' : 'Batal'}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                onSubmit(request.id, proposedTime);
                onClose();
              }}
              style={styles.submitBtn}
              testID={`dashboard-submit-propose-${request.id}`}
            >
              <Text style={styles.submitBtnText}>
                {language === 'en' ? 'Send Proposal' : 'Kirim Pengajuan'}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    borderRadius: radii.md,
    borderWidth: 1,
    maxWidth: 400,
    padding: spacing.lg,
    width: '100%',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    marginBottom: spacing.md,
  },
  input: {
    borderRadius: radii.sm,
    borderWidth: 1,
    fontSize: 13,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  btnRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'flex-end',
  },
  cancelBtn: {
    borderRadius: radii.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  submitBtn: {
    backgroundColor: colors.greenDark,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
});
