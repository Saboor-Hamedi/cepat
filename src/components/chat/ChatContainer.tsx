import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../../auth/AuthProvider';
import { LoadingState } from '../marketplace-ui';
import { useAppearance } from '../../context/AppearanceContext';
import { fixtureTechnicians } from '../../data/fixtures';
import {
  loadBookingById,
  loadBookingMessages,
  maskBlockedContactOrUrl,
  sendBookingMessage,
  subscribeToBookingMessages,
} from '../../data/marketplaceStore';
import { markBookingNotificationsRead } from '../../data/notifications';
import { useUserAvatar } from '../../hooks/useUserAvatar';
import { useLanguage } from '../../i18n/locale';
import type { BookingMessage, BookingRecord } from '../../types/marketplace';

import { ChatHeader } from './ChatHeader';
import { ChatContent } from './ChatContent';
import { ChatComposer } from './ChatComposer';

export interface ChatContainerProps {
  bookingId: string;
  onClose?: () => void;
  initialBooking?: BookingRecord;
  testIDPrefix?: string;
}

export function ChatContainer({
  bookingId,
  onClose,
  initialBooking,
}: ChatContainerProps) {
  const { language, t } = useLanguage();
  const { user, effectiveRole } = useAuth();
  const { palette } = useAppearance();

  const [booking, setBooking] = useState<BookingRecord | null>(initialBooking ?? null);
  const [messages, setMessages] = useState<BookingMessage[]>([]);
  const [loading, setLoading] = useState(!initialBooking);
  const [chatInput, setChatInput] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [historyCleared, setHistoryCleared] = useState(false);

  const isTechnician =
    effectiveRole === 'technician' ||
    (Boolean(user && booking) && user?.id === booking?.technicianUserId);
  const chatSenderRole: 'customer' | 'technician' = isTechnician ? 'technician' : 'customer';

  // Load booking if not provided
  useEffect(() => {
    let active = true;
    if (!booking) {
      void loadBookingById(bookingId)
        .then((found) => {
          if (active && found) setBooking(found);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }
    return () => {
      active = false;
    };
  }, [booking, bookingId]);

  // Load and subscribe to real-time chat messages
  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;

    const refreshMessages = () => {
      void loadBookingMessages(bookingId)
        .then((loaded) => {
          if (active) setMessages(loaded);
          if (user?.id) void markBookingNotificationsRead(user.id, bookingId);
        })
        .catch((err: unknown) => {
          if (active) {
            setChatError(err instanceof Error ? err.message : 'booking_messages_load_failed');
          }
        });
    };

    if (user?.id) void markBookingNotificationsRead(user.id, bookingId);
    refreshMessages();
    void subscribeToBookingMessages(
      bookingId,
      refreshMessages,
      (errMessage) => setChatError(errMessage),
    )
      .then((stop) => {
        if (active) unsubscribe = stop;
        else stop();
      })
      .catch((err: unknown) => {
        if (active) {
          setChatError(err instanceof Error ? err.message : 'booking_messages_realtime_failed');
        }
      });

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [bookingId, user?.id]);

  const partnerName = useMemo(() => {
    if (!booking) return language === 'en' ? 'User' : 'Pengguna';
    return isTechnician ? booking.customerName : booking.technicianName;
  }, [booking, isTechnician, language]);

  const partnerRoleLabel = useMemo(() => {
    if (isTechnician) return language === 'en' ? 'Customer' : 'Pelanggan';
    return language === 'en' ? 'Verified Technician' : 'Teknisi Terverifikasi';
  }, [isTechnician, language]);

  const partnerUserId = booking
    ? isTechnician
      ? booking.customerUserId
      : booking.technicianUserId
    : undefined;

  const fallbackAvatarUri = useMemo(() => {
    if (isTechnician || !booking) return undefined;
    return fixtureTechnicians.find(
      (tech) => tech.id === booking.technicianUserId,
    )?.avatarUri;
  }, [booking, isTechnician]);

  const remotePartnerAvatarUri = useUserAvatar(partnerUserId, partnerName);
  const partnerAvatarUri = remotePartnerAvatarUri || fallbackAvatarUri;

  const metadataAvatarUri =
    typeof user?.user_metadata?.avatar_url === 'string'
      ? user.user_metadata.avatar_url
      : undefined;
  const senderAvatarUri = useUserAvatar(user?.id) || metadataAvatarUri;

  const handleBookAgain = useCallback(() => {
    if (onClose) onClose();
    if (booking) {
      const techId = booking.technicianUserId || booking.id;
      const svcId = booking.technicianServiceId || booking.serviceId || '';
      const svcName = encodeURIComponent(booking.serviceNameSnapshot || '');
      router.push(`/booking/${techId}?serviceId=${svcId}&serviceName=${svcName}`);
    }
  }, [booking, onClose]);

  const isChatClosed =
    booking?.status === 'completed' ||
    booking?.status === 'cancelled' ||
    booking?.status === 'declined';

  const handleBack = useCallback(() => {
    if (onClose) {
      onClose();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/bookings');
    }
  }, [onClose]);

  const handleSendMessage = async () => {
    if (sendingChat || !booking || !chatInput.trim()) return;
    setChatError(null);
    const clientMessageId = `${user?.id ?? booking.id}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 10)}`;
    setSendingChat(true);

    try {
      const sanitizedBody = maskBlockedContactOrUrl(chatInput.trim());
      const sent = await sendBookingMessage({
        bookingId: booking.id,
        senderUserId:
          chatSenderRole === 'customer' ? booking.customerUserId : booking.technicianUserId,
        senderRole: chatSenderRole,
        senderName:
          chatSenderRole === 'customer' ? booking.customerName : booking.technicianName,
        body: sanitizedBody,
        clientMessageId,
      });

      setMessages((current) =>
        current.some((m) => m.id === sent.id) ? current : [...current, sent],
      );
      setChatInput('');
    } catch (err) {
      if (
        err instanceof Error &&
        (err.message === 'url_blocked' ||
          err.message === 'contact_blocked' ||
          err.message.includes('contact_sharing_blocked'))
      ) {
        setChatError(
          language === 'en'
            ? 'Sharing phone numbers, WhatsApp, emails, or links is prohibited for security.'
            : 'Berbagi nomor telepon/WhatsApp, email, atau tautan dilarang demi keamanan bersama.',
        );
      } else {
        setChatError(err instanceof Error ? err.message : t('booking.chatLocked'));
      }
    } finally {
      setSendingChat(false);
    }
  };

  const handleSendPhotoAttachment = async () => {
    if (sendingChat || !booking) return;
    setChatError(null);
    setSendingChat(true);
    try {
      const clientMessageId = `${user?.id ?? booking.id}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 10)}`;
      const sent = await sendBookingMessage({
        bookingId: booking.id,
        senderUserId:
          chatSenderRole === 'customer' ? booking.customerUserId : booking.technicianUserId,
        senderRole: chatSenderRole,
        senderName:
          chatSenderRole === 'customer' ? booking.customerName : booking.technicianName,
        body: '[Foto Pekerjaan / Perangkat Dilampirkan]',
        clientMessageId,
      });
      setMessages((current) =>
        current.some((m) => m.id === sent.id) ? current : [...current, sent],
      );
    } catch (err) {
      setChatError(err instanceof Error ? err.message : 'upload_failed');
    } finally {
      setSendingChat(false);
    }
  };

  const handleClearHistory = () => {
    Alert.alert(
      language === 'en' ? 'Delete Chat History?' : 'Hapus Riwayat Chat?',
      language === 'en'
        ? 'Are you sure you want to clear this conversation from your screen?'
        : 'Apakah Anda yakin ingin menghapus riwayat percakapan ini dari layar Anda?',
      [
        { text: language === 'en' ? 'Cancel' : 'Batal', style: 'cancel' },
        {
          text: language === 'en' ? 'Delete' : 'Hapus',
          style: 'destructive',
          onPress: () => setHistoryCleared(true),
        },
      ],
    );
  };

  if (loading || !booking) {
    return (
      <SafeAreaView
        edges={['top', 'bottom']}
        style={[styles.safeArea, { backgroundColor: palette.background }]}
      >
        <LoadingState label={t('booking.chatHeader')} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={[styles.safeArea, { backgroundColor: palette.background }]}
      testID="booking-chat-section"
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
        style={styles.keyboardContainer}
      >
        <View
          style={[
            styles.chatResponsiveCard,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
            },
          ]}
        >
          <ChatHeader
            booking={booking}
            onBack={handleBack}
            onClearHistory={handleClearHistory}
            partnerAvatarUri={partnerAvatarUri}
            partnerName={partnerName}
            partnerRoleLabel={partnerRoleLabel}
          />

          <ChatContent
            chatError={chatError}
            chatSenderRole={chatSenderRole}
            historyCleared={historyCleared}
            isChatClosed={Boolean(isChatClosed)}
            messages={messages}
            onUndoClear={() => setHistoryCleared(false)}
            partnerAvatarUri={partnerAvatarUri}
            partnerName={partnerName}
            senderAvatarUri={senderAvatarUri}
          />

          <ChatComposer
            chatInput={chatInput}
            disabled={Boolean(isChatClosed && booking.status !== 'completed')}
            isCompleted={booking.status === 'completed'}
            onAttachPhoto={() => void handleSendPhotoAttachment()}
            onBookAgain={!isTechnician ? handleBookAgain : undefined}
            onChangeChatInput={setChatInput}
            onSend={() => void handleSendMessage()}
            partnerName={partnerName}
            sendingChat={sendingChat}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  chatResponsiveCard: {
    alignSelf: 'center',
    flex: 1,
    maxWidth: 780,
    paddingHorizontal: 5,
    position: 'relative',
    width: '100%',
    zIndex: 1,
  },
  keyboardContainer: {
    alignItems: 'center',
    flex: 1,
    width: '100%',
  },
  safeArea: {
    flex: 1,
  },
});
