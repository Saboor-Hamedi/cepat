import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';

import { supabase } from '../data/marketplaceRepository';
import { useAuth } from '../auth/AuthProvider';
import { getStoredItem, setStoredItem } from '../storage/kvStorage';

export type Language = 'id' | 'en';
export type LanguageSaveResult = 'account' | 'device' | 'failed';
type TranslationKey = keyof typeof messages.id;

const LANGUAGE_STORAGE_KEY = '@cepat/language';
const ACCOUNT_STORAGE_KEY = '@cepat/language:';

const messages = {
  id: {
    'app.tagline': 'LAYANAN RUMAH, LEBIH MUDAH',
    'nav.marketplace': 'Marketplace',
    'nav.bookings': 'Pesanan',
    'nav.workspace': 'Pekerjaan',
    'nav.settings': 'Akun & Pref',
    'home.title': 'Ada yang perlu\ndibantu di rumah?',
    'home.subtitle': 'Temukan tenaga profesional untuk kebutuhan rumahmu.',
    'home.previewNote': 'Contoh profil dan lokasi untuk pratinjau. Informasi ini bukan ketersediaan layanan langsung.',
    'home.search': 'Cari layanan atau teknisi',
    'home.searchScope': 'Pencarian memeriksa profil yang sudah dimuat. Muat halaman berikutnya untuk mencari lebih jauh.',
    'home.categoryEyebrow': 'CARI BERDASARKAN KEBUTUHAN',
    'home.categoryTitle': 'Layanan populer',
    'home.popularServicesEyebrow': 'ESTIMASI TRANSPARAN',
    'home.popularServicesTitle': 'Pilihan pekerjaan populer',
    'home.featuredProsEyebrow': 'REKAM JEJAK TERUJI',
    'home.featuredProsTitle': 'Profesional unggulan',
    'home.featuredEyebrow': 'PILIHAN PROFESIONAL',
    'home.areaEyebrow': 'MELAYANI {area}',
    'home.resultsTitle': 'Teknisi rekomendasi',
    'home.searchResultsTitle': 'Hasil pencarian',
    'home.savedSectionEyebrow': 'TERSIMPAN',
    'home.savedSectionTitle': 'Teknisi favoritmu',
    'home.profiles': 'profil',
    'home.noSearchTitle': 'Belum ada yang cocok',
    'home.noSearchMoreTitle': 'Belum ada yang cocok di daftar ini',
    'home.noSearchDescription': 'Coba kata lain, seperti plumbing, AC, atau kelistrikan.',
    'home.noSearchMoreDescription': 'Lanjutkan memuat daftar untuk mencari teknisi di halaman berikutnya.',
    'home.noAreaTitle': 'Belum ada teknisi di area ini',
    'home.noAreaMoreTitle': 'Belum ada teknisi di daftar ini',
    'home.noAreaDescription': 'Pilih area lain atau tampilkan semua area untuk melihat pilihan yang tersedia.',
    'home.noAreaMoreDescription': 'Muat halaman berikutnya untuk memeriksa teknisi di area ini.',
    'home.tryOtherWords': 'Coba kata lain, seperti plumbing, AC, atau kelistrikan.',
    'home.loadMore': 'Muat teknisi lainnya',
    'home.clearSearch': 'Hapus pencarian',
    'home.allAreas': 'Lihat semua area',
    'home.loadError': 'Daftar layanan belum dapat dimuat. Periksa koneksi lalu coba lagi.',
    'home.loadMoreError': 'Layanan lainnya belum dapat dimuat. Coba lagi sebentar.',
    'home.loading': 'Menyiapkan marketplace…',
    'home.loadingMore': 'Memuat pilihan lainnya…',
    'home.retry': 'Coba lagi',
    'home.clear': 'Hapus',
    'home.account': 'Pengaturan bahasa',
    'home.areaLabel': 'AREA LAYANAN',
    'home.pickArea': 'Pilih area',
    'home.areaSheetEyebrow': 'PENELUSURAN LAYANAN',
    'home.areaSheetTitle': 'Pilih area layanan',
    'home.areaSheetBody': 'Pilih wilayah layanan secara mandiri tanpa bergantung pada GPS perangkat.',
    'home.areaSearchPlaceholder': 'Cari kota, kabupaten, atau kecamatan…',
    'home.savedAddressesLabel': 'ALAMAT TERSIMPAN',
    'home.regionsLabel': 'WILAYAH ADMINISTRATIF INDONESIA',
    'home.mapPinLabel': 'TITIK KOORDINAT & LOKASI MANUAL',
    'home.gpsPrepareLabel': 'Gunakan titik area terdekat (Tanpa akses GPS otomatis)',
    'home.customPinApplied': 'Titik layanan diatur ke {area} ({lat}, {lng})',
    'home.allAreasOption': 'Semua area',
    'home.unknownArea': 'Area belum diatur',
    'home.noMatching': 'Belum ada teknisi di area ini',
    'category.back': 'Marketplace',
    'category.eyebrow': 'JELAJAHI LAYANAN',
    'category.description': 'Teknisi yang menawarkan layanan ini di area yang mereka pilih.',
    'category.results': 'Teknisi untuk layanan ini',
    'category.profiles': 'profil',
    'category.loading': 'Memuat informasi…',
    'category.loadErrorTitle': 'Belum bisa memuat',
    'category.loadError': 'Kategori belum dapat dimuat. Periksa koneksi lalu coba lagi.',
    'category.noTechnicians': 'Belum ada teknisi',
    'category.noTechniciansDescription': 'Belum ada teknisi yang menawarkan layanan ini. Coba jelajahi kategori lain.',
    'category.noTechniciansMore': 'Belum ada teknisi di daftar ini',
    'category.noTechniciansMoreDescription': 'Muat halaman berikutnya untuk memeriksa lebih banyak pilihan.',
    'profile.loading': 'Memuat profil…',
    'profile.navTitle': 'Profil',
    'profile.back': 'Kembali',
    'profile.loadErrorTitle': 'Profil belum dapat dimuat',
    'profile.loadError': 'Informasi teknisi belum dapat diambil. Periksa koneksi lalu coba lagi.',
    'profile.notFoundTitle': 'Profil tidak tersedia',
    'profile.notFound': 'Profil ini mungkin sudah tidak tersedia atau tautannya tidak lagi berlaku.',
    'profile.sampleNote': 'Profil ini berisi contoh pengembangan. Penilaian, layanan, dan ketersediaan bukan data nyata.',
    'profile.verified': '✓ Terverifikasi',
    'profile.unverifiedBadge': 'Mitra terdaftar',
    'profile.yearsExperience': '{years} tahun pengalaman',
    'profile.completedJobs': '{count} pekerjaan selesai',
    'profile.accepting': 'Menerima permintaan layanan',
    'profile.unavailable': 'Sedang tidak menerima permintaan',
    'profile.sampleAvailability': 'Status contoh · ketersediaan belum dikonfirmasi',
    'profile.saveTechnician': 'Simpan teknisi',
    'profile.savedTechnician': 'Tersimpan',
    'profile.reportTechnician': 'Laporkan kendala',
    'profile.reportTitle': 'Laporkan teknisi',
    'profile.reportDescription': 'Laporan bersifat rahasia dan ditinjau oleh administrator Cepat.',
    'profile.reportPlaceholder': 'Jelaskan kronologi atau kendala minimal 10 karakter…',
    'profile.reportSubmit': 'Kirim laporan',
    'profile.reportSuccess': 'Laporan diterima dan akan ditinjau tim admin.',
    'profile.aboutEyebrow': 'TENTANG',
    'profile.aboutTitle': 'Kenali teknisinya',
    'profile.fallbackBio': '{name} menawarkan layanan profesional untuk kebutuhan rumah. Hubungi melalui pemesanan untuk membahas kebutuhan pekerjaan.',
    'profile.servicesEyebrow': 'LAYANAN',
    'profile.servicesTitle': 'Yang bisa dibantu',
    'profile.serviceCount': '{count} layanan',
    'profile.noServices': 'Belum ada layanan yang dicantumkan.',
    'profile.duration': 'Sekitar {minutes} menit',
    'profile.startingPrice': 'Mulai {price}',
    'profile.selectServiceAction': 'Pilih layanan ini',
    'profile.areasEyebrow': 'CAKUPAN',
    'profile.areasTitle': 'Area layanan',
    'profile.noAreas': 'Area layanan belum dicantumkan.',
    'profile.scheduleEyebrow': 'JADWAL OPERASIONAL',
    'profile.scheduleTitle': 'Hari & jam kerja',
    'profile.closedDay': 'Tutup / Libur',
    'profile.portfolioEyebrow': 'HASIL KERJA',
    'profile.portfolioTitle': 'Portofolio',
    'profile.portfolioCount': '{count} contoh',
    'profile.noPortfolio': 'Belum ada foto portofolio yang dibagikan.',
    'profile.portfolioPhoto': 'Foto belum tersedia',
    'profile.reviewsEyebrow': 'PENGALAMAN PELANGGAN',
    'profile.reviewsTitle': 'Ulasan',
    'profile.reviewCount': '{count} ulasan',
    'profile.noReviews': 'Belum ada ulasan. Ulasan akan muncul setelah layanan selesai.',
    'profile.priceLabel': 'HARGA LAYANAN',
    'profile.discussPrice': 'Diskusikan kebutuhanmu',
    'profile.bookNow': 'Pesan layanan',
    'rating.none': 'Belum ada ulasan',
    'technician.serviceFallback': 'Layanan rumah',
    'technician.areaFallback': 'Area belum diatur',
    'technician.askPrice': 'Tanya harga',
    'technician.startingPrice': 'Mulai {price}',
    'technician.sampleAvailability': 'Status contoh · ketersediaan belum dikonfirmasi',
    'booking.back': 'Kembali ke profil',
    'booking.eyebrow': 'PERMINTAAN LAYANAN',
    'booking.title': 'Pesan jadwal teknisi',
    'booking.description': 'Pilih layanan, alamat pengerjaan, dan jadwal kunjungan yang diinginkan.',
    'booking.idLabel': 'ID TEKNISI TERPILIH',
    'booking.none': 'Tidak tersedia',
    'booking.notice': 'Pembayaran dilakukan langsung sesuai kesepakatan pekerjaan. Cepat tidak memproses pembayaran atau dompet digital saat ini.',
    'booking.selectService': '1. Pilih layanan',
    'booking.serviceAddress': '2. Alamat layanan',
    'booking.pickSavedAddress': 'Gunakan alamat tersimpan',
    'booking.addressPlaceholder': 'Nama jalan, nomor rumah, RT/RW, patokan…',
    'booking.addressNotesPlaceholder': 'Catatan lokasi (opsional, misal: pagar hitam)',
    'booking.selectDate': '3. Pilih tanggal & waktu kunjungan',
    'booking.customerNotes': '4. Detail keluhan / pekerjaan',
    'booking.notesPlaceholder': 'Jelaskan kondisi atau peralatan yang perlu diperbaiki…',
    'booking.submitRequest': 'Kirim permintaan pesanan',
    'booking.validationError': 'Lengkapi layanan, alamat lengkap, area layanan, dan jadwal kunjungan.',
    'booking.createdTitle': 'Permintaan pesanan terkirim',
    'booking.statusLabel': 'STATUS PESANAN',
    'booking.status.requested': 'Menunggu konfirmasi teknisi',
    'booking.status.alternative_proposed': 'Teknisi mengajukan jadwal alternatif',
    'booking.status.confirmed': 'Jadwal dikonfirmasi · Chat aktif',
    'booking.status.in_progress': 'Pekerjaan sedang berlangsung',
    'booking.status.completed': 'Pekerjaan selesai',
    'booking.status.cancelled': 'Dibatalkan',
    'booking.status.declined': 'Ditolak teknisi',
    'booking.actorModeLabel': 'MODE PERAN INTERAKSI',
    'booking.customerActions': 'Tindakan Pelanggan',
    'booking.technicianActions': 'Tindakan Teknisi',
    'booking.acceptRequest': 'Terima pesanan',
    'booking.declineRequest': 'Tolak pesanan',
    'booking.proposeTime': 'Ajukan waktu lain',
    'booking.acceptAlternative': 'Setujui jadwal alternatif',
    'booking.startJob': 'Mulai pengerjaan',
    'booking.completeJob': 'Tandai pekerjaan selesai',
    'booking.cancelBooking': 'Batalkan pesanan',
    'booking.chatTitle': 'Pesan Koordinasi Pekerjaan',
    'booking.chatLocked': 'Chat khusus pesanan akan terbuka otomatis setelah teknisi menerima permintaan ini.',
    'booking.chatInputPlaceholder': 'Tulis pesan koordinasi (tautan/URL diblokir)…',
    'booking.sendChat': 'Kirim',
    'booking.urlBlockedError': 'Demi keamanan, pesan yang mengandung tautan/URL atau link eksternal tidak diizinkan.',
    'booking.reviewTitle': 'Beri penilaian layanan',
    'booking.reviewPlaceholder': 'Bagikan pengalamanmu bersama teknisi ini…',
    'booking.submitReview': 'Kirim ulasan',
    'booking.reviewSubmitted': 'Terima kasih! Ulasanmu telah disimpan.',
    'dashboard.customerEyebrow': 'AKTIVITAS PELANGGAN',
    'dashboard.customerTitle': 'Pesanan & Pesan',
    'dashboard.customerSubtitle': 'Pantau pesanan aktif, riwayat pengerjaan, teknisi tersimpan, dan laporan.',
    'dashboard.techEyebrow': 'RUANG KERJA MITRA',
    'dashboard.techTitle': 'Dasbor Teknisi',
    'dashboard.techSubtitle': 'Kelola permintaan masuk, jadwal kerja, layanan, portofolio, dan ulasan.',
    'settings.back': 'Marketplace',
    'settings.eyebrow': 'PREFERENSI & AKUN',
    'settings.title': 'Pengaturan',
    'settings.subtitle': 'Kelola profil akun, bahasa, alamat layanan, dan pengaturan peranmu di Cepat.',
    'settings.languageTitle': 'Bahasa aplikasi',
    'settings.languageDescription': 'Pilihan bahasa berlaku untuk akunmu di semua peran.',
    'settings.indonesian': 'Bahasa Indonesia',
    'settings.english': 'English',
    'settings.deviceSaved': 'Bahasa tersimpan di perangkat ini.',
    'settings.accountSaved': 'Bahasa tersimpan di profil akunmu.',
    'settings.saveFailed': 'Bahasa belum dapat disimpan. Coba lagi.',
    'settings.syncFailed': 'Bahasa tersimpan di perangkat, tetapi belum tersinkron ke profil akun.',
    'settings.deviceOnly': 'Tanpa akun aktif, pilihan ini disimpan di perangkat.',
    'settings.loginNote': 'Masuk atau buat akun untuk mengelola akun Cepat.',
    'settings.personalInfoTitle': 'Informasi pribadi',
    'settings.phoneLabel': 'Nomor telepon',
    'settings.avatarLabel': 'URL foto profil (HTTPS)',
    'settings.saveProfile': 'Simpan profil',
    'settings.profileSaved': ' perubahan profil berhasil disimpan.',
    'settings.notificationsTitle': 'Preferensi notifikasi',
    'settings.AppearanceTitle': 'Tampilan & aksesibilitas',
    'settings.savedAddressesTitle': 'Alamat layanan tersimpan',
    'settings.bookingPrefsTitle': 'Preferensi pemesanan pelanggan',
    'settings.techProfileTitle': 'Pengaturan profil profesional teknisi',
    'settings.securityPrivacyTitle': 'Keamanan, privasi & ketentuan',
    'settings.passwordTitle': 'Ubah Kata Sandi',
    'settings.deleteAccountAction': 'Ajukan penghapusan akun',
    'auth.loginTitle': 'Selamat datang kembali',
    'auth.loginSubtitle': 'Masuk untuk mengelola akun dan layananmu.',
    'auth.registerTitle': 'Buat akun Cepat',
    'auth.registerSubtitle': 'Mulai sebagai pelanggan atau ajukan diri sebagai teknisi.',
    'auth.name': 'Nama lengkap',
    'auth.email': 'Email',
    'auth.password': 'Kata sandi',
    'auth.newPassword': 'Kata Sandi Baru',
    'auth.confirmPassword': 'Konfirmasi kata sandi',
    'auth.show': 'Tampilkan',
    'auth.hide': 'Sembunyikan',
    'auth.customer': 'Pelanggan',
    'auth.technician': 'Teknisi',
    'auth.admin': 'Admin',
    'auth.chooseRole': 'Saya ingin menggunakan Cepat sebagai',
    'auth.roleHint': 'Teknisi harus disetujui sebelum mendapat akses teknisi.',
    'auth.terms': 'Saya menyetujui syarat layanan dan kebijakan privasi Cepat.',
    'auth.submitLogin': 'Masuk',
    'auth.submitRegister': 'Buat akun',
    'auth.noAccount': 'Belum punya akun? Daftar',
    'auth.haveAccount': 'Sudah punya akun? Masuk',
    'auth.forgot': 'Lupa kata sandi?',
    'auth.forgotTitle': 'Atur ulang kata sandi',
    'auth.forgotSubtitle': 'Kami akan mengirim tautan pemulihan jika alamat email ini dapat menerima email.',
    'auth.sendRecovery': 'Kirim tautan pemulihan',
    'auth.recoverySent': 'Jika email dapat digunakan, tautan pemulihan akan segera dikirim.',
    'auth.resetTitle': 'Buat kata sandi baru',
    'auth.resetSubmit': 'Simpan kata sandi',
    'auth.emailInvalid': 'Masukkan alamat email yang valid.',
    'auth.required': 'Bagian ini wajib diisi.',
    'auth.nameTooLong': 'Nama maksimal 80 karakter.',
    'auth.passwordRule': 'Gunakan minimal 8 karakter, termasuk huruf dan angka.',
    'auth.passwordMismatch': 'Kata sandi tidak sama.',
    'auth.acceptTerms': 'Setujui syarat layanan dan kebijakan privasi untuk melanjutkan.',
    'auth.loginFailed': 'Email atau kata sandi tidak cocok. Periksa lalu coba lagi.',
    'auth.registerFailed': 'Akun belum dapat dibuat. Periksa isian atau coba masuk.',
    'auth.emailConfirmation': 'Akun dibuat. Periksa email untuk mengonfirmasi alamat sebelum masuk.',
    'auth.registered': 'Akun siap digunakan.',
    'auth.recoveryError': 'Tautan pemulihan belum dapat dikirim. Periksa koneksi lalu coba lagi.',
    'auth.resetUnavailable': 'Tautan ini tidak berlaku atau sesi pemulihan sudah berakhir. Minta tautan baru.',
    'auth.resetSuccess': 'Kata sandi diperbarui. Silakan masuk dengan kata sandi baru.',
    'auth.resetFailed': 'Kata sandi belum dapat diperbarui. Coba tautan pemulihan yang baru.',
    'auth.loading': 'Memeriksa sesi…',
    'auth.configuration': 'Layanan masuk sedang tidak tersedia. Coba lagi nanti.',
    'auth.serviceUnavailable': 'Layanan sedang mengalami gangguan. Data akunmu tetap aman. Coba lagi nanti.',
    'auth.back': 'Kembali',
    'auth.logout': 'Keluar',
    'auth.accountTitle': 'Akun Cepat',
    'auth.applicationPending': 'Pengajuan teknisi menunggu tinjauan admin. Kamu belum mendapat akses teknisi.',
    'auth.application.pending_review': 'Pengajuan teknisi menunggu tinjauan admin. Kamu belum mendapat akses teknisi.',
    'auth.application.under_review': 'Pengajuan teknisi sedang ditinjau admin. Akses teknisi belum diberikan.',
    'auth.application.changes_requested': 'Admin meminta informasi tambahan untuk pengajuan teknisi.',
    'auth.application.approved': 'Pengajuan disetujui. Akses teknisi menunggu aktivasi admin.',
    'auth.application.rejected': 'Pengajuan teknisi tidak disetujui.',
    'auth.application.suspended': 'Pengajuan atau akses teknisi ditangguhkan.',
    'auth.application.revoked': 'Akses teknisi telah dicabut.',
    'auth.application.draft': 'Pengajuan teknisi belum dikirim.',
    'auth.application.not_created': 'Status pengajuan belum tersedia. Coba lagi nanti atau hubungi dukungan.',
    'auth.accountRestricted': 'Akun dibatasi. Fitur tertentu tidak tersedia.',
    'auth.accountSuspended': 'Akun ditangguhkan. Hubungi dukungan untuk informasi lebih lanjut.',
    'auth.accountDisabled': 'Akun dinonaktifkan.',
    'data.previewTitle': 'Mode pratinjau',
    'data.previewBadge': 'PRATINJAU · DATA CONTOH',
    'data.previewInvalid': 'Konfigurasi Supabase belum valid. Yang tampil adalah data contoh, bukan data live.',
    'data.previewAbsent': 'Belum terhubung ke Supabase. Yang tampil adalah data contoh.',
    'data.remoteError': 'Data belum dapat dimuat. Periksa koneksi lalu coba lagi.',
    'category.plumbing': 'Plumbing',
    'category.ac-repair': 'AC & pendingin',
    'category.electrical': 'Kelistrikan',
    'category.appliance-repair': 'Perbaikan alat',
    'category.home-maintenance': 'Perawatan rumah',
  },
  en: {
    'app.tagline': 'HOME SERVICES, MADE EASIER',
    'nav.marketplace': 'Marketplace',
    'nav.bookings': 'Bookings',
    'nav.workspace': 'Jobs',
    'nav.settings': 'Account & Prefs',
    'home.title': 'Need a hand\naround the house?',
    'home.subtitle': 'Find a trusted professional for your home.',
    'home.previewNote': 'Sample profiles and areas for preview. Availability is not live.',
    'home.search': 'Search services or technicians',
    'home.searchScope': 'Search checks loaded profiles. Load another page to search further.',
    'home.categoryEyebrow': 'BROWSE BY NEED',
    'home.categoryTitle': 'Popular services',
    'home.popularServicesEyebrow': 'TRANSPARENT ESTIMATES',
    'home.popularServicesTitle': 'Popular home tasks',
    'home.featuredProsEyebrow': 'PROVEN TRACK RECORD',
    'home.featuredProsTitle': 'Featured professionals',
    'home.featuredEyebrow': 'PROFESSIONALS FOR YOU',
    'home.areaEyebrow': 'SERVING {area}',
    'home.resultsTitle': 'Recommended technicians',
    'home.searchResultsTitle': 'Search results',
    'home.savedSectionEyebrow': 'BOOKMARKED',
    'home.savedSectionTitle': 'Saved technicians',
    'home.profiles': 'profiles',
    'home.noSearchTitle': 'No matches yet',
    'home.noSearchMoreTitle': 'No matches on this page',
    'home.noSearchDescription': 'Try another term, like plumbing, AC, or electrical.',
    'home.noSearchMoreDescription': 'Load more profiles to continue your search.',
    'home.noAreaTitle': 'No technicians in this area',
    'home.noAreaMoreTitle': 'No technicians on this page',
    'home.noAreaDescription': 'Choose another area or show all areas to see available options.',
    'home.noAreaMoreDescription': 'Load another page to check for technicians in this area.',
    'home.tryOtherWords': 'Try another term, like plumbing, AC, or electrical.',
    'home.loadMore': 'Load more technicians',
    'home.clearSearch': 'Clear search',
    'home.allAreas': 'Show all areas',
    'home.loadError': 'Services could not be loaded. Check your connection and try again.',
    'home.loadMoreError': 'More services could not be loaded. Please try again.',
    'home.loading': 'Preparing the marketplace…',
    'home.loadingMore': 'Loading more options…',
    'home.retry': 'Try again',
    'home.clear': 'Clear',
    'home.account': 'Language settings',
    'home.areaLabel': 'SERVICE AREA',
    'home.pickArea': 'Choose area',
    'home.areaSheetEyebrow': 'SERVICE DISCOVERY',
    'home.areaSheetTitle': 'Choose a service area',
    'home.areaSheetBody': 'Select your service area independently without relying on device GPS.',
    'home.areaSearchPlaceholder': 'Search city, regency, or district…',
    'home.savedAddressesLabel': 'SAVED ADDRESSES',
    'home.regionsLabel': 'INDONESIAN ADMINISTRATIVE REGIONS',
    'home.mapPinLabel': 'MAP-PIN & MANUAL COORDINATES',
    'home.gpsPrepareLabel': 'Select nearest regional center (No automatic GPS tracking)',
    'home.customPinApplied': 'Service pin set to {area} ({lat}, {lng})',
    'home.allAreasOption': 'All areas',
    'home.unknownArea': 'Area not set',
    'home.noMatching': 'No technicians in this area',
    'category.back': 'Marketplace',
    'category.eyebrow': 'EXPLORE SERVICES',
    'category.description': 'Technicians offering this service in their selected areas.',
    'category.results': 'Technicians for this service',
    'category.profiles': 'profiles',
    'category.loading': 'Loading…',
    'category.loadErrorTitle': 'Could not load this page',
    'category.loadError': 'The category could not be loaded. Check your connection and try again.',
    'category.noTechnicians': 'No technicians yet',
    'category.noTechniciansDescription': 'No technicians offer this service yet. Explore another category.',
    'category.noTechniciansMore': 'No technicians on this page',
    'category.noTechniciansMoreDescription': 'Load another page to check more options.',
    'profile.loading': 'Loading profile…',
    'profile.navTitle': 'Profile',
    'profile.back': 'Back',
    'profile.loadErrorTitle': 'Profile could not be loaded',
    'profile.loadError': 'Technician details could not be retrieved. Check your connection and try again.',
    'profile.notFoundTitle': 'Profile unavailable',
    'profile.notFound': 'This profile may no longer be available, or the link may have expired.',
    'profile.sampleNote': 'This is a development example. Ratings, services, and availability are not real.',
    'profile.verified': '✓ Verified',
    'profile.unverifiedBadge': 'Registered partner',
    'profile.yearsExperience': '{years} years of experience',
    'profile.completedJobs': '{count} jobs completed',
    'profile.accepting': 'Accepting service requests',
    'profile.unavailable': 'Not accepting requests right now',
    'profile.sampleAvailability': 'Sample status · availability is not confirmed',
    'profile.saveTechnician': 'Save technician',
    'profile.savedTechnician': 'Saved',
    'profile.reportTechnician': 'Report concern',
    'profile.reportTitle': 'Report technician',
    'profile.reportDescription': 'Reports are confidential and reviewed by Cepat administrators.',
    'profile.reportPlaceholder': 'Describe the issue in at least 10 characters…',
    'profile.reportSubmit': 'Submit report',
    'profile.reportSuccess': 'Report submitted for administrator review.',
    'profile.aboutEyebrow': 'ABOUT',
    'profile.aboutTitle': 'Meet the technician',
    'profile.fallbackBio': '{name} offers professional home services. Use the booking flow to discuss your needs.',
    'profile.servicesEyebrow': 'SERVICES',
    'profile.servicesTitle': 'How they can help',
    'profile.serviceCount': '{count} services',
    'profile.noServices': 'No services have been listed yet.',
    'profile.duration': 'About {minutes} minutes',
    'profile.startingPrice': 'From {price}',
    'profile.selectServiceAction': 'Book this service',
    'profile.areasEyebrow': 'COVERAGE',
    'profile.areasTitle': 'Service areas',
    'profile.noAreas': 'No service areas have been listed yet.',
    'profile.scheduleEyebrow': 'WORKING HOURS',
    'profile.scheduleTitle': 'Days & availability',
    'profile.closedDay': 'Closed',
    'profile.portfolioEyebrow': 'PAST WORK',
    'profile.portfolioTitle': 'Portfolio',
    'profile.portfolioCount': '{count} examples',
    'profile.noPortfolio': 'No portfolio photos have been shared yet.',
    'profile.portfolioPhoto': 'Photo unavailable',
    'profile.reviewsEyebrow': 'CUSTOMER EXPERIENCE',
    'profile.reviewsTitle': 'Reviews',
    'profile.reviewCount': '{count} reviews',
    'profile.noReviews': 'No reviews yet. Reviews appear after a service is completed.',
    'profile.priceLabel': 'SERVICE PRICE',
    'profile.discussPrice': 'Discuss your needs',
    'profile.bookNow': 'Book Now',
    'rating.none': 'No reviews yet',
    'technician.serviceFallback': 'Home services',
    'technician.areaFallback': 'Area not set',
    'technician.askPrice': 'Ask for pricing',
    'technician.startingPrice': 'From {price}',
    'technician.sampleAvailability': 'Sample status · availability is not confirmed',
    'booking.back': 'Back to profile',
    'booking.eyebrow': 'SERVICE REQUEST',
    'booking.title': 'Schedule a service',
    'booking.description': 'Choose a service, provide your service address, and pick a preferred date and time.',
    'booking.idLabel': 'SELECTED TECHNICIAN ID',
    'booking.none': 'Unavailable',
    'booking.notice': 'Service settlement is arranged directly as agreed. Cepat does not process live payments or digital wallets.',
    'booking.selectService': '1. Select a service',
    'booking.serviceAddress': '2. Service address',
    'booking.pickSavedAddress': 'Use a saved address',
    'booking.addressPlaceholder': 'Street address, house number, district, landmark…',
    'booking.addressNotesPlaceholder': 'Access notes (optional, e.g. black gate)',
    'booking.selectDate': '3. Preferred date & time',
    'booking.customerNotes': '4. Job details & notes',
    'booking.notesPlaceholder': 'Describe the issue or equipment needing attention…',
    'booking.submitRequest': 'Submit booking request',
    'booking.validationError': 'Please select a service, enter a full service address, choose an area, and select a time.',
    'booking.createdTitle': 'Booking request submitted',
    'booking.statusLabel': 'BOOKING STATUS',
    'booking.status.requested': 'Awaiting technician response',
    'booking.status.alternative_proposed': 'Alternative time proposed',
    'booking.status.confirmed': 'Confirmed · Chat unlocked',
    'booking.status.in_progress': 'Service in progress',
    'booking.status.completed': 'Completed',
    'booking.status.cancelled': 'Cancelled',
    'booking.status.declined': 'Declined by technician',
    'booking.actorModeLabel': 'INTERACTION ROLE VIEW',
    'booking.customerActions': 'Customer Actions',
    'booking.technicianActions': 'Technician Actions',
    'booking.acceptRequest': 'Accept request',
    'booking.declineRequest': 'Decline request',
    'booking.proposeTime': 'Propose another time',
    'booking.acceptAlternative': 'Accept proposed time',
    'booking.startJob': 'Start service',
    'booking.completeJob': 'Mark completed',
    'booking.cancelBooking': 'Cancel booking',
    'booking.chatTitle': 'Booking Coordination Chat',
    'booking.chatLocked': 'Booking-specific messaging becomes available once the technician accepts the request.',
    'booking.chatInputPlaceholder': 'Write a message (URLs/links are blocked)…',
    'booking.sendChat': 'Send',
    'booking.urlBlockedError': 'For safety, messages containing URLs or external links are blocked.',
    'booking.reviewTitle': 'Rate this completed service',
    'booking.reviewPlaceholder': 'Share your experience with this technician…',
    'booking.submitReview': 'Submit review',
    'booking.reviewSubmitted': 'Thank you! Your review has been saved.',
    'dashboard.customerEyebrow': 'CUSTOMER ACTIVITY',
    'dashboard.customerTitle': 'Bookings & Messages',
    'dashboard.customerSubtitle': 'Track current requests, booking history, saved technicians, and reports.',
    'dashboard.techEyebrow': 'TECHNICIAN WORKSPACE',
    'dashboard.techTitle': 'Technician Dashboard',
    'dashboard.techSubtitle': 'Manage incoming requests, upcoming jobs, services, portfolio, and reviews.',
    'settings.back': 'Marketplace',
    'settings.eyebrow': 'PREFERENCES & ACCOUNT',
    'settings.title': 'Settings',
    'settings.subtitle': 'Manage your account profile, language, saved addresses, and role settings in Cepat.',
    'settings.languageTitle': 'App language',
    'settings.languageDescription': 'Your language preference applies to your account across all roles.',
    'settings.indonesian': 'Bahasa Indonesia',
    'settings.english': 'English',
    'settings.deviceSaved': 'Language saved on this device.',
    'settings.accountSaved': 'Language saved to your account profile.',
    'settings.saveFailed': 'Language could not be saved. Please try again.',
    'settings.syncFailed': 'Language is saved on this device but could not sync to your account profile.',
    'settings.deviceOnly': 'Without an active account, this choice is saved on this device.',
    'settings.loginNote': 'Sign in or create an account to manage your Cepat account.',
    'settings.personalInfoTitle': 'Personal information',
    'settings.phoneLabel': 'Phone number',
    'settings.avatarLabel': 'Profile photo URL (HTTPS)',
    'settings.saveProfile': 'Save profile',
    'settings.profileSaved': 'Profile updates saved.',
    'settings.notificationsTitle': 'Notification preferences',
    'settings.AppearanceTitle': 'Appearance & accessibility',
    'settings.savedAddressesTitle': 'Saved service addresses',
    'settings.bookingPrefsTitle': 'Customer booking preferences',
    'settings.techProfileTitle': 'Technician professional settings',
    'settings.securityPrivacyTitle': 'Security, privacy & terms',
    'settings.passwordTitle': 'Change Password',
    'settings.deleteAccountAction': 'Request account deletion',
    'auth.loginTitle': 'Welcome back',
    'auth.loginSubtitle': 'Sign in to manage your account and services.',
    'auth.registerTitle': 'Create your Cepat account',
    'auth.registerSubtitle': 'Join as a customer or apply to become a technician.',
    'auth.name': 'Full name',
    'auth.email': 'Email address',
    'auth.password': 'Password',
    'auth.newPassword': 'New Password',
    'auth.confirmPassword': 'Confirm password',
    'auth.show': 'Show',
    'auth.hide': 'Hide',
    'auth.customer': 'Customer',
    'auth.technician': 'Technician',
    'auth.admin': 'Admin',
    'auth.chooseRole': 'I want to use Cepat as a',
    'auth.roleHint': 'Technicians need approval before technician access is granted.',
    'auth.terms': 'I agree to Cepat’s terms of service and privacy policy.',
    'auth.submitLogin': 'Sign in',
    'auth.submitRegister': 'Create account',
    'auth.noAccount': 'New to Cepat? Create an account',
    'auth.haveAccount': 'Already have an account? Sign in',
    'auth.forgot': 'Forgot password?',
    'auth.forgotTitle': 'Reset your password',
    'auth.forgotSubtitle': 'We’ll send a recovery link if this address can receive email.',
    'auth.sendRecovery': 'Send recovery link',
    'auth.recoverySent': 'If the address can be used, a recovery link will arrive shortly.',
    'auth.resetTitle': 'Choose a new password',
    'auth.resetSubmit': 'Save new password',
    'auth.emailInvalid': 'Enter a valid email address.',
    'auth.required': 'This field is required.',
    'auth.nameTooLong': 'Name must be 80 characters or fewer.',
    'auth.passwordRule': 'Use at least 8 characters, including a letter and a number.',
    'auth.passwordMismatch': 'Passwords do not match.',
    'auth.acceptTerms': 'Accept the terms of service and privacy policy to continue.',
    'auth.loginFailed': 'Email or password is incorrect. Check your details and try again.',
    'auth.registerFailed': 'Could not create the account. Check your details or try signing in.',
    'auth.emailConfirmation': 'Account created. Check your email to confirm your address before signing in.',
    'auth.registered': 'Your account is ready.',
    'auth.recoveryError': 'Could not send the recovery link. Check your connection and try again.',
    'auth.resetUnavailable': 'This link is invalid or the recovery session expired. Request a new link.',
    'auth.resetSuccess': 'Password updated. Sign in with your new password.',
    'auth.resetFailed': 'Could not update the password. Try a new recovery link.',
    'auth.loading': 'Checking your session…',
    'auth.configuration': 'Sign-in is temporarily unavailable. Please try again later.',
    'auth.serviceUnavailable': 'The service is having trouble. Your account data is safe. Please try again later.',
    'auth.back': 'Back',
    'auth.logout': 'Sign out',
    'auth.accountTitle': 'Your Cepat account',
    'auth.applicationPending': 'Your technician application is awaiting admin review. Technician access is not granted yet.',
    'auth.application.pending_review': 'Your technician application is awaiting admin review. Technician access is not granted yet.',
    'auth.application.under_review': 'An admin is reviewing your technician application. Technician access is not granted yet.',
    'auth.application.changes_requested': 'An admin requested more information for your technician application.',
    'auth.application.approved': 'Your application was approved. Technician access still requires admin activation.',
    'auth.application.rejected': 'Your technician application was not approved.',
    'auth.application.suspended': 'Your technician application or access is suspended.',
    'auth.application.revoked': 'Technician access has been revoked.',
    'auth.application.draft': 'Your technician application has not been submitted.',
    'auth.application.not_created': 'Application status is unavailable. Try again later or contact support.',
    'auth.accountRestricted': 'This account is restricted. Some features are unavailable.',
    'auth.accountSuspended': 'This account is suspended. Contact support for more information.',
    'auth.accountDisabled': 'This account is disabled.',
    'data.previewTitle': 'Preview mode',
    'data.previewBadge': 'PREVIEW · SAMPLE DATA',
    'data.previewInvalid': 'Supabase configuration is invalid. These are sample records, not live data.',
    'data.previewAbsent': 'Supabase is not connected. These are sample records.',
    'data.remoteError': 'Data could not be loaded. Check your connection and try again.',
    'category.plumbing': 'Plumbing',
    'category.ac-repair': 'AC & cooling',
    'category.electrical': 'Electrical',
    'category.appliance-repair': 'Appliance repair',
    'category.home-maintenance': 'Home maintenance',
  },
} satisfies Record<Language, Record<string, string>>;

interface LanguageContextValue {
  language: Language;
  t: (key: TranslationKey | string, values?: Record<string, string | number>) => string;
  setLanguage: (language: Language) => Promise<LanguageSaveResult>;
  syncNote: 'accountSaved' | 'deviceSaved' | 'syncFailed' | 'saveFailed' | null;
  accountLinked: boolean;
}

function translateWithLanguage(
  language: Language,
  key: TranslationKey | string,
  values?: Record<string, string | number>,
): string {
  const raw = messages[language][key as TranslationKey] ?? key;
  if (!values) return raw;
  return Object.entries(values).reduce(
    (result, [name, value]) => result.replaceAll(`{${name}}`, String(value)),
    raw,
  );
}

let sharedFallbackLanguage: Language = 'id';
const fallbackListeners = new Set<(lang: Language) => void>();

const fallbackContext: LanguageContextValue = {
  language: 'id',
  t: (key, values) => translateWithLanguage(sharedFallbackLanguage, key, values),
  setLanguage: async (nextLanguage: Language) => {
    sharedFallbackLanguage = nextLanguage;
    fallbackListeners.forEach((listener) => listener(nextLanguage));
    const saved = await setStoredItem(LANGUAGE_STORAGE_KEY, nextLanguage);
    return saved ? 'device' : 'failed';
  },
  syncNote: null,
  accountLinked: false,
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function parseLanguage(value: string | null | undefined): Language | undefined {
  if (value === 'id' || value === 'id-ID') return 'id';
  if (value === 'en' || value === 'en-US') return 'en';
  return undefined;
}

function databaseLocale(language: Language): string {
  return language === 'id' ? 'id-ID' : 'en-US';
}

export function LanguageProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const accountId = user?.id;
  const [language, setLanguageState] = useState<Language>('id');
  const [accountLinked, setAccountLinked] = useState(false);
  const [syncNote, setSyncNote] = useState<LanguageContextValue['syncNote']>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const deviceLanguage = parseLanguage(await getStoredItem(LANGUAGE_STORAGE_KEY));
        if (deviceLanguage && active) {
          sharedFallbackLanguage = deviceLanguage;
          setLanguageState(deviceLanguage);
        }

        if (!supabase || !accountId) {
          if (active) setAccountLinked(false);
          return;
        }

        const accountLanguage = parseLanguage(await getStoredItem(`${ACCOUNT_STORAGE_KEY}${accountId}`));
        if (accountLanguage && active) {
          sharedFallbackLanguage = accountLanguage;
          setLanguageState(accountLanguage);
        }

        const { data, error: profileError } = await supabase
          .from('profiles')
          .select('locale')
          .eq('id', accountId)
          .maybeSingle();

        if (!active) return;
        setAccountLinked(true);
        if (profileError) {
          setSyncNote('syncFailed');
          return;
        }
        const profileLanguage = parseLanguage(data?.locale);
        const selected = profileLanguage ?? accountLanguage ?? deviceLanguage;
        if (selected) {
          sharedFallbackLanguage = selected;
          setLanguageState(selected);
          await setStoredItem(`${ACCOUNT_STORAGE_KEY}${accountId}`, selected);
          await setStoredItem(LANGUAGE_STORAGE_KEY, selected);
        }
      } catch {
        if (active) setSyncNote('syncFailed');
      }
    })();
    return () => {
      active = false;
    };
  }, [accountId]);

  const setLanguage = useCallback(
    async (nextLanguage: Language): Promise<LanguageSaveResult> => {
      sharedFallbackLanguage = nextLanguage;
      setLanguageState(nextLanguage);
      setSyncNote(null);

      const deviceSaved = await setStoredItem(LANGUAGE_STORAGE_KEY, nextLanguage);
      if (!deviceSaved) {
        setSyncNote('saveFailed');
        return 'failed';
      }

      if (supabase && user) {
        await setStoredItem(`${ACCOUNT_STORAGE_KEY}${user.id}`, nextLanguage);
        try {
          const { data: updatedRows, error } = await supabase
            .from('profiles')
            .update({ locale: databaseLocale(nextLanguage) })
            .eq('id', user.id)
            .select('id');

          if (error) {
            setSyncNote('syncFailed');
            return 'device';
          }

          if (!updatedRows || updatedRows.length === 0) {
            const fallbackDisplayName =
              (typeof user.user_metadata?.display_name === 'string' && user.user_metadata.display_name.trim()) ||
              user.email?.split('@')[0] ||
              'Cepat User';
            const { error: upsertError } = await supabase.from('profiles').upsert({
              id: user.id,
              display_name: fallbackDisplayName.slice(0, 80),
              locale: databaseLocale(nextLanguage),
            });
            if (upsertError) {
              setSyncNote('syncFailed');
              return 'device';
            }
          }

          setAccountLinked(true);
          setSyncNote('accountSaved');
          return 'account';
        } catch {
          setSyncNote('syncFailed');
          return 'device';
        }
      }

      setSyncNote('deviceSaved');
      return 'device';
    },
    [user],
  );

  const t = useCallback(
    (key: TranslationKey | string, values?: Record<string, string | number>) =>
      translateWithLanguage(language, key, values),
    [language],
  );

  const value = useMemo(
    () => ({ language, t, setLanguage, syncNote, accountLinked }),
    [accountLinked, language, setLanguage, syncNote, t],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  const [fallbackLang, setFallbackLang] = useState<Language>(sharedFallbackLanguage);
  const [fallbackSyncNote, setFallbackSyncNote] = useState<LanguageContextValue['syncNote']>(null);

  useEffect(() => {
    if (context) return;
    const listener = (next: Language) => setFallbackLang(next);
    fallbackListeners.add(listener);
    return () => {
      fallbackListeners.delete(listener);
    };
  }, [context]);

  if (context) return context;

  return {
    language: fallbackLang,
    t: (key, values) => translateWithLanguage(fallbackLang, key, values),
    setLanguage: async (nextLanguage: Language) => {
      const result = await fallbackContext.setLanguage(nextLanguage);
      setFallbackSyncNote(result === 'device' ? 'deviceSaved' : 'saveFailed');
      return result;
    },
    syncNote: fallbackSyncNote,
    accountLinked: false,
  };
}

export function categoryName(slug: string, fallback: string, t: LanguageContextValue['t']): string {
  const key = `category.${slug}`;
  return key in messages.id ? t(key) : fallback;
}

export function localizeArea(name: string, language: Language): string {
  if (language === 'id') return name;
  const englishNames: Record<string, string> = {
    'Jakarta Selatan': 'South Jakarta',
    'Jakarta Pusat': 'Central Jakarta',
    'Jakarta Timur': 'East Jakarta',
    'Jakarta Barat': 'West Jakarta',
    'Jakarta Utara': 'North Jakarta',
    'Tangerang Selatan': 'South Tangerang',
  };
  return englishNames[name] ?? name;
}
