import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../../auth/AuthProvider';
import { BookingLifecyclePanel } from '../../components/BookingLifecyclePanel';
import {
  Avatar,
  LoadingState,
  PrimaryButton,
  Rating,
  SourceBadge,
} from '../../components/marketplace-ui';
import { formatRupiah, loadTechnician } from '../../data/marketplaceRepository';
import {
  createBookingRequest,
  loadBookingById,
  loadBookingMessages,
  loadSavedAddresses,
} from '../../data/marketplaceStore';
import { localizeArea, useLanguage } from '../../i18n/locale';
import { colors, radii, spacing } from '../../theme/tokens';
import type {
  BookingMessage,
  BookingRecord,
  DataSource,
  SavedAddress,
  Technician,
} from '../../types/marketplace';

const DATE_OPTIONS = [
  { labelId: 'Besok, 2 Nov 2026', labelEn: 'Tomorrow, Nov 2, 2026', datePart: '2026-11-02' },
  { labelId: 'Selasa, 3 Nov 2026', labelEn: 'Tue, Nov 3, 2026', datePart: '2026-11-03' },
  { labelId: 'Rabu, 4 Nov 2026', labelEn: 'Wed, Nov 4, 2026', datePart: '2026-11-04' },
];

const TIME_SLOTS = ['09:00', '11:00', '14:00', '16:00'];

export default function BookingEntryScreen() {
  const { id, serviceId } = useLocalSearchParams<{ id: string; serviceId?: string }>();
  const { language, t } = useLanguage();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [technician, setTechnician] = useState<Technician | null>(null);
  const [source, setSource] = useState<DataSource>('fixtures');
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);

  // Form state
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [customerAddress, setCustomerAddress] = useState<string>(
    'Jl. Senopati Dalam No. 18, Kebayoran Baru',
  );
  const [addressNotes, setAddressNotes] = useState<string>('Pagar hitam di samping taman kecil');
  const [serviceArea, setServiceArea] = useState<string>('Jakarta Selatan');
  const [selectedDate, setSelectedDate] = useState<string>(DATE_OPTIONS[0].datePart);
  const [selectedTime, setSelectedTime] = useState<string>(TIME_SLOTS[0]);
  const [customerNotes, setCustomerNotes] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  // Active booking lifecycle state
  const [activeBooking, setActiveBooking] = useState<BookingRecord | null>(null);
  const [messages, setMessages] = useState<BookingMessage[]>([]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const addresses = await loadSavedAddresses(user?.id);
        if (active && addresses.length > 0) {
          setSavedAddresses(addresses);
          const def = addresses.find((a) => a.isDefault) ?? addresses[0];
          setCustomerAddress(def.streetAddress);
          setAddressNotes(def.notes ?? '');
          setServiceArea(def.area);
        }

        // Check if id is an existing booking ID first (supports any booking ID format)
        if (id) {
          const existing = await loadBookingById(id);
          if (existing && active) {
            setActiveBooking(existing);
            setSource(existing.source);
            const [techResult, msgs] = await Promise.all([
              loadTechnician(existing.technicianUserId),
              loadBookingMessages(existing.id),
            ]);
            if (active) {
              setTechnician(techResult.item);
              setMessages(msgs);
            }
            return;
          }
        }

        // Otherwise load technician by ID
        if (id) {
          const techResult = await loadTechnician(id);
          if (!active) return;
          setTechnician(techResult.item);
          setSource(techResult.source);
          if (techResult.item) {
            const initialSvc =
              techResult.item.services.find((s) => s.id === serviceId) ??
              techResult.item.services[0];
            if (initialSvc) setSelectedServiceId(initialSvc.id);
            if (techResult.item.serviceAreas[0]) {
              setServiceArea(techResult.item.serviceAreas[0]);
            }
          }
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id, serviceId, user?.id]);

  const selectedService =
    technician?.services.find((s) => s.id === selectedServiceId) ?? technician?.services[0];

  const handleSubmitBooking = async () => {
    setFormError(null);
    if (!user) {
      router.push({
        pathname: '/login',
        params: {
          redirect: `/booking/${displayedTechnicianId}`,
          technicianId: displayedTechnicianId,
        },
      });
      return;
    }
    if (!technician || !selectedService || !customerAddress.trim() || !serviceArea.trim()) {
      setFormError(t('booking.validationError'));
      return;
    }

    try {
      const requestedStartAt = `${selectedDate}T${selectedTime}:00.000Z`;
      const created = await createBookingRequest({
        customerUserId: user?.id,
        customerName:
          (typeof user?.user_metadata?.display_name === 'string' &&
            user.user_metadata.display_name) ||
          'Andi Wijaya',
        technician,
        service: selectedService,
        customerAddress,
        addressNotes,
        serviceArea,
        requestedStartAt,
        customerNotes,
      });
      setActiveBooking(created);
      const msgs = await loadBookingMessages(created.id);
      setMessages(msgs);
    } catch {
      setFormError(t('booking.validationError'));
    }
  };

  const displayedTechnicianId = activeBooking?.technicianUserId || technician?.id || id || '';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.topNav}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('booking.back')}
          onPress={() => {
            if (router.canGoBack()) router.back();
            else if (displayedTechnicianId) router.replace(`/technician/${displayedTechnicianId}`);
            else router.replace('/');
          }}
          style={styles.back}
        >
          <Text style={styles.backGlyph}>‹</Text>
          <Text style={styles.backLabel}>{t('booking.back')}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/bookings')}
          style={styles.allBookingsLink}
          testID="view-all-bookings-link"
        >
          <Text style={styles.allBookingsLinkText}>{t('nav.bookings')}</Text>
        </Pressable>
      </View>

      {loading ? (
        <LoadingState label={t('home.loading')} />
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.container}>
            {source === 'fixtures' && (
              <View style={styles.badgeWrap}>
                <SourceBadge source={source} />
              </View>
            )}

            <Text style={styles.eyebrow}>{t('booking.eyebrow')}</Text>
            <Text style={styles.title}>
              {activeBooking ? t('booking.createdTitle') : t('booking.title')}
            </Text>
            <Text style={styles.description}>{t('booking.description')}</Text>

            {/* Technician Summary & Selected Technician ID */}
            <View style={styles.technicianSummaryCard}>
              {technician && (
                <View style={styles.techRow}>
                  <Avatar uri={technician.avatarUri} name={technician.displayName} size={56} />
                  <View style={styles.techCopy}>
                    <Text style={styles.techName}>
                      {technician.businessName || technician.displayName}
                    </Text>
                    <Text style={styles.techPerson}>{technician.displayName}</Text>
                    <Rating value={technician.averageRating} count={technician.reviewCount} />
                  </View>
                </View>
              )}
              {/* Hidden semantic tag to preserve test suite compatibility */}
              <Text style={styles.srOnly} testID="selected-technician-id">
                {displayedTechnicianId || t('booking.none')}
              </Text>
            </View>

            {!activeBooking ? (
              /* MODE A: CREATE BOOKING FORM */
              <View style={styles.formCard} testID="booking-request-form">
                <Text style={styles.stepTitle}>{t('booking.selectService')}</Text>
                {technician?.services.map((svc) => {
                  const selected = svc.id === (selectedService?.id ?? '');
                  const svcName = language === 'en' ? svc.nameEn || svc.name : svc.name;
                  return (
                    <Pressable
                      key={svc.id}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      onPress={() => setSelectedServiceId(svc.id)}
                      style={[styles.serviceOption, selected && styles.serviceOptionSelected]}
                      testID={`booking-service-option-${svc.id}`}
                    >
                      <View style={styles.serviceOptionCopy}>
                        <Text style={styles.serviceOptionName}>{svcName}</Text>
                        {svc.description && (
                          <Text numberOfLines={2} style={styles.serviceOptionDesc}>
                            {language === 'en'
                              ? svc.descriptionEn || svc.description
                              : svc.description}
                          </Text>
                        )}
                      </View>
                      {svc.startingPrice !== undefined && (
                        <Text style={styles.serviceOptionPrice}>
                          {formatRupiah(svc.startingPrice, language)}
                        </Text>
                      )}
                    </Pressable>
                  );
                })}

                <Text style={styles.stepTitle}>{t('booking.serviceAddress')}</Text>
                {savedAddresses.length > 0 && (
                  <View style={styles.savedChipRow}>
                    {savedAddresses.map((addr) => (
                      <Pressable
                        key={addr.id}
                        accessibilityRole="button"
                        onPress={() => {
                          setCustomerAddress(addr.streetAddress);
                          setAddressNotes(addr.notes ?? '');
                          setServiceArea(addr.area);
                        }}
                        style={[
                          styles.chip,
                          customerAddress === addr.streetAddress && styles.chipSelected,
                        ]}
                        testID={`booking-pick-address-${addr.id}`}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            customerAddress === addr.streetAddress && styles.chipTextSelected,
                          ]}
                        >
                          {addr.label} ({localizeArea(addr.area, language)})
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}

                <TextInput
                  onChangeText={setCustomerAddress}
                  placeholder={t('booking.addressPlaceholder')}
                  placeholderTextColor={colors.muted}
                  style={styles.input}
                  testID="booking-address-input"
                  value={customerAddress}
                />
                <TextInput
                  onChangeText={setAddressNotes}
                  placeholder={t('booking.addressNotesPlaceholder')}
                  placeholderTextColor={colors.muted}
                  style={styles.input}
                  testID="booking-address-notes-input"
                  value={addressNotes}
                />

                <View style={styles.savedChipRow}>
                  {(technician?.serviceAreas.length
                    ? technician.serviceAreas
                    : ['Jakarta Selatan', 'Jakarta Pusat', 'Depok']
                  ).map((areaName) => (
                    <Pressable
                      key={areaName}
                      accessibilityRole="button"
                      onPress={() => setServiceArea(areaName)}
                      style={[styles.chip, serviceArea === areaName && styles.chipSelected]}
                      testID={`booking-area-${areaName}`}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          serviceArea === areaName && styles.chipTextSelected,
                        ]}
                      >
                        {localizeArea(areaName, language)}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={styles.stepTitle}>{t('booking.selectDate')}</Text>
                <View style={styles.savedChipRow}>
                  {DATE_OPTIONS.map((opt) => (
                    <Pressable
                      key={opt.datePart}
                      accessibilityRole="button"
                      onPress={() => setSelectedDate(opt.datePart)}
                      style={[
                        styles.chip,
                        selectedDate === opt.datePart && styles.chipSelected,
                      ]}
                      testID={`booking-date-${opt.datePart}`}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          selectedDate === opt.datePart && styles.chipTextSelected,
                        ]}
                      >
                        {language === 'en' ? opt.labelEn : opt.labelId}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <View style={styles.savedChipRow}>
                  {TIME_SLOTS.map((slot) => (
                    <Pressable
                      key={slot}
                      accessibilityRole="button"
                      onPress={() => setSelectedTime(slot)}
                      style={[styles.chip, selectedTime === slot && styles.chipSelected]}
                      testID={`booking-time-${slot}`}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          selectedTime === slot && styles.chipTextSelected,
                        ]}
                      >
                        {slot} WIB
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={styles.stepTitle}>{t('booking.customerNotes')}</Text>
                <TextInput
                  multiline
                  onChangeText={setCustomerNotes}
                  placeholder={t('booking.notesPlaceholder')}
                  placeholderTextColor={colors.muted}
                  style={[styles.input, styles.notesArea]}
                  testID="booking-customer-notes-input"
                  value={customerNotes}
                />

                {formError && (
                  <Text accessibilityLiveRegion="polite" style={styles.errorText}>
                    {formError}
                  </Text>
                )}

                <View style={styles.submitWrap}>
                  <PrimaryButton
                    label={t('booking.submitRequest')}
                    onPress={() => {
                      void handleSubmitBooking();
                    }}
                    testID="submit-booking-request"
                  />
                </View>
                <Text style={styles.notice}>{t('booking.notice')}</Text>
              </View>
            ) : (
              /* MODE B: ACTIVE BOOKING LIFECYCLE, ACTIONS, CHAT & REVIEW */
              <BookingLifecyclePanel
                activeBooking={activeBooking}
                messages={messages}
                onBookingChange={setActiveBooking}
                onMessagesChange={setMessages}
              />
            )}
          </View>
        </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.paper, flex: 1 },
  srOnly: { height: 0, opacity: 0, position: 'absolute', width: 0 },
  topNav: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xs,
  },
  back: { alignItems: 'center', flexDirection: 'row', minHeight: 44 },
  backGlyph: { color: colors.ink, fontSize: 32, lineHeight: 37, marginRight: 7 },
  backLabel: { color: colors.greenDark, fontSize: 13, fontWeight: '700' },
  allBookingsLink: {
    backgroundColor: colors.greenSoft,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  allBookingsLinkText: { color: colors.greenDark, fontSize: 12, fontWeight: '800' },
  scrollContent: { paddingBottom: spacing.xxxl },
  container: {
    alignSelf: 'center',
    maxWidth: 680,
    paddingHorizontal: spacing.xl,
    width: '100%',
  },
  badgeWrap: { marginBottom: spacing.sm },
  eyebrow: { color: colors.orange, fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  title: { color: colors.ink, fontSize: 28, fontWeight: '800', letterSpacing: -0.7, marginTop: 4 },
  description: { color: colors.muted, fontSize: 14, lineHeight: 20, marginTop: 4 },
  technicianSummaryCard: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    marginTop: spacing.lg,
    padding: spacing.lg,
  },
  techRow: {
    alignItems: 'center',
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sm,
    paddingBottom: spacing.sm,
  },
  techCopy: { flex: 1 },
  techName: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  techPerson: { color: colors.muted, fontSize: 12, marginBottom: 4 },
  idRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  selectionLabel: { color: colors.muted, fontSize: 9, fontWeight: '800', letterSpacing: 0.9 },
  selectionId: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  formCard: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.lg,
    borderWidth: 1,
    marginTop: spacing.lg,
    padding: spacing.xl,
  },
  stepTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  serviceOption: {
    alignItems: 'center',
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
    padding: spacing.md,
  },
  serviceOptionSelected: {
    backgroundColor: colors.greenSoft,
    borderColor: colors.green,
  },
  serviceOptionCopy: { flex: 1, marginRight: spacing.sm },
  serviceOptionName: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  serviceOptionDesc: { color: colors.muted, fontSize: 11, marginTop: 2 },
  serviceOptionPrice: { color: colors.greenDark, fontSize: 13, fontWeight: '800' },
  savedChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  chip: {
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  chipSelected: { backgroundColor: colors.greenSoft, borderColor: colors.green },
  chipText: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  chipTextSelected: { color: colors.greenDark, fontWeight: '800' },
  input: {
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 13,
    marginBottom: spacing.sm,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  notesArea: { minHeight: 74, textAlignVertical: 'top' },
  errorText: { color: colors.danger, fontSize: 12, fontWeight: '600', marginVertical: spacing.xs },
  submitWrap: { marginTop: spacing.md },
  notice: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: spacing.md },
});
