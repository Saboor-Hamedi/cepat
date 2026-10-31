import { cleanup, fireEvent } from '@testing-library/react-native';
import { renderRouter, screen } from 'expo-router/testing-library';

import AccountEntryScreen from '../src/app/account';
import AdminConsoleScreen from '../src/app/admin';
import BookingEntryScreen from '../src/app/booking/[id]';
import BookingsScreen from '../src/app/bookings';
import CategoryScreen from '../src/app/category/[slug]';
import ForgotPasswordScreen from '../src/app/forgot-password';
import MarketplaceScreen from '../src/app/index';
import LoginScreen from '../src/app/login';
import RegisterScreen from '../src/app/register';
import ResetPasswordScreen from '../src/app/reset-password';
import TechnicianDashboardScreen from '../src/app/technician-dashboard';
import TechnicianProfileScreen from '../src/app/technician/[id]';
import { clearTestAuthSession, setTestAuthSession } from '../src/auth/AuthProvider';

const appRoutes = {
  index: MarketplaceScreen,
  account: AccountEntryScreen,
  admin: AdminConsoleScreen,
  bookings: BookingsScreen,
  'technician-dashboard': TechnicianDashboardScreen,
  'booking/[id]': BookingEntryScreen,
  'category/[slug]': CategoryScreen,
  'technician/[id]': TechnicianProfileScreen,
  login: LoginScreen,
  register: RegisterScreen,
  'forgot-password': ForgotPasswordScreen,
  'reset-password': ResetPasswordScreen,
};

afterEach(() => {
  clearTestAuthSession();
  cleanup();
});

describe('marketplace, auth-gated booking, social technician profile, and sidebar journeys', () => {
  it('lets a logged-out visitor browse a read-only technician profile, redirects Book Now to login, returns to the intended technician booking after login, and submits a booking request', async () => {
    await renderRouter(appRoutes);

    expect(await screen.findByTestId('marketplace-heading')).toBeTruthy();
    expect(screen.getByText('Teknisi rekomendasi')).toBeTruthy();
    // Technician posts feed is visible on marketplace discovery
    expect(await screen.findByTestId('marketplace-posts-section')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('technician-card-demo-rizky'));
    expect(await screen.findByText('Kenali teknisinya')).toBeTruthy();
    expect(screen.getByText('Rizky Pratama')).toBeTruthy();
    expect(screen.getByText('Instalasi pipa dapur')).toBeTruthy();
    expect(screen.getByText('Hari & jam kerja')).toBeTruthy();
    // Read-only for logged-out visitors: no owner edit button and no private email/phone
    expect(screen.queryByTestId('owner-edit-profile-btn')).toBeNull();
    expect(screen.queryByText(/@/)).toBeNull();
    expect(screen.queryByText(/\+62/)).toBeNull();
    expect(screen).toHavePathname('/technician/demo-rizky');

    // Logged-out visitor presses Book Now -> redirected to /login preserving target
    await fireEvent.press(screen.getByTestId('book-now'));
    expect(await screen.findByTestId('login-booking-redirect-notice')).toBeTruthy();
    expect(screen).toHavePathname('/login');

    // User signs in -> automatically redirected back to /booking/demo-rizky
    await fireEvent.changeText(screen.getByTestId('login-email'), 'andi@cepat.id');
    await fireEvent.changeText(screen.getByTestId('login-password'), 'password123');
    await fireEvent.press(screen.getByTestId('login-submit'));

    expect(await screen.findByText('Pesan jadwal teknisi')).toBeTruthy();
    expect(screen.getByTestId('selected-technician-id')).toBeTruthy();
    expect(screen).toHavePathname('/booking/demo-rizky');

    await fireEvent.press(screen.getByTestId('submit-booking-request'));
    expect(await screen.findByTestId('booking-status-view')).toBeTruthy();
    expect(screen.getByTestId('booking-current-status')).toBeTruthy();
  });

  it('selects a location independently of GPS and searches neighborhoods from the interactive map location modal', async () => {
    await renderRouter(appRoutes);
    await screen.findByTestId('marketplace-heading');

    await fireEvent.press(screen.getByTestId('area-picker-trigger'));
    expect(await screen.findByTestId('location-picker-modal')).toBeTruthy();

    await fireEvent.changeText(screen.getByTestId('area-search-input'), 'Tebet');
    expect(await screen.findByTestId('region-option-reg-jaksel')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('region-option-reg-jaksel'));
    expect(await screen.findByTestId('technician-card-demo-rizky')).toBeTruthy();
  });

  it('opens customer bookings hub and social-style technician profile from shared navigation without a "Technicians Dashboard" heading', async () => {
    await renderRouter(appRoutes);
    await screen.findByTestId('marketplace-heading');

    await fireEvent.press(screen.getByTestId('nav-bookings'));
    expect(await screen.findByTestId('bookings-heading')).toBeTruthy();
    expect(screen).toHavePathname('/bookings');

    await fireEvent.press(screen.getByTestId('nav-workspace'));
    expect(await screen.findByTestId('technician-social-profile-card')).toBeTruthy();
    expect(screen.queryByText(/Technicians Dashboard/i)).toBeNull();
    expect(screen.queryByText(/Dashboard Teknisi/i)).toBeNull();
    expect(screen).toHavePathname('/technician-dashboard');
  });

  it('masks private customer street address on incoming requests until accepted, opens customer profile modal, unlocks address and chat after acceptance, and creates a technician post', async () => {
    await renderRouter(appRoutes, { initialUrl: '/technician-dashboard' });
    expect(await screen.findByTestId('technician-social-profile-card')).toBeTruthy();

    // Incoming request card hides exact street address before acceptance
    expect(await screen.findByTestId('incoming-request-card-booking-demo-2')).toBeTruthy();
    expect(screen.getByTestId('masked-address-notice-booking-demo-2')).toBeTruthy();

    // Open customer profile modal
    await fireEvent.press(screen.getByTestId('dashboard-view-customer-booking-demo-2'));
    expect(await screen.findByTestId('customer-profile-modal')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('close-customer-profile-modal'));

    // Accept the incoming request -> moves to Accepted Jobs with unlocked street address and chat button
    await fireEvent.press(screen.getByTestId('dashboard-accept-booking-demo-2'));
    await fireEvent.press(screen.getByTestId('tech-tab-upcoming'));
    expect(await screen.findByTestId('upcoming-job-card-booking-demo-2')).toBeTruthy();
    expect(screen.getByTestId('unlocked-customer-address-booking-demo-2')).toBeTruthy();
    expect(screen.getByTestId('dashboard-open-chat-booking-demo-2')).toBeTruthy();

    // Switch to Posts tab and publish a new work post
    await fireEvent.press(screen.getByTestId('tech-tab-posts'));
    expect(await screen.findByTestId('technician-post-composer')).toBeTruthy();
    await fireEvent.changeText(
      screen.getByTestId('create-post-caption-input'),
      'Selesai perbaikan pompa booster rumah 2 lantai di Kemang.',
    );
    await fireEvent.press(screen.getByTestId('submit-new-post-btn'));
    expect(
      await screen.findByText('Selesai perbaikan pompa booster rumah 2 lantai di Kemang.'),
    ).toBeTruthy();
  });

  it('filters the current results and clears the search input', async () => {
    await renderRouter(appRoutes);
    await screen.findByTestId('marketplace-heading');

    await fireEvent.changeText(screen.getByTestId('marketplace-search'), 'tidak ada layanan ini');
    expect(await screen.findByText('Belum ada yang cocok')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('clear-search'));
    expect(await screen.findByTestId('technician-card-demo-rizky')).toBeTruthy();
  });

  it('opens category-specific discovery', async () => {
    await renderRouter(appRoutes);
    await screen.findByTestId('marketplace-heading');

    await fireEvent.press(screen.getByTestId('category-plumbing'));
    expect(await screen.findByText('Plumbing')).toBeTruthy();
    expect(await screen.findByTestId('technician-card-demo-rizky')).toBeTruthy();
    expect(screen).toHavePathname('/category/plumbing');
  });

  it('opens the slide-in Profile Sidebar from the header avatar, navigates to modular Settings, and hides personal info when logged out', async () => {
    await renderRouter(appRoutes);
    await screen.findByTestId('marketplace-heading');

    await fireEvent.press(screen.getByTestId('account-entry'));
    expect(await screen.findByTestId('profile-sidebar-modal')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('sidebar-settings'));

    expect(await screen.findByText('Pengaturan')).toBeTruthy();
    expect(screen.queryByTestId('setting-tab-all')).toBeNull();
    expect(screen.getByTestId('setting-section-account')).toBeTruthy();
    expect(screen.getByTestId('account-session-card')).toBeTruthy();
    expect(screen.queryByTestId('private-email-input')).toBeNull();
    expect(screen.queryByTestId('private-phone-input')).toBeNull();

    await fireEvent.press(screen.getByTestId('setting-tab-language'));
    expect(await screen.findByTestId('setting-section-language')).toBeTruthy();
    expect(screen.getByTestId('language-id')).toBeTruthy();
    expect(screen.getByTestId('language-en')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('setting-tab-appearance'));
    expect(await screen.findByTestId('setting-section-appearance')).toBeTruthy();
  });

  it('blocks unauthenticated and non-admin users from Admin Console and grants access only when authenticated with a verified admin role', async () => {
    // Logged-out visitor cannot see nav-admin and cannot use /admin tools
    await renderRouter(appRoutes, { initialUrl: '/admin' });
    expect(await screen.findByTestId('admin-console-heading')).toBeTruthy();
    expect(screen.queryByTestId('admin-reports-section')).toBeNull();

    // Verified admin role grants access to Admin Console and sidebar Admin link
    setTestAuthSession({
      user: {
        id: 'verified-admin-1',
        email: 'ops@cepat.id',
        user_metadata: { display_name: 'Admin Cepat' },
      } as never,
      roles: ['admin'],
    });

    expect(await screen.findByTestId('admin-reports-section')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('admin-tab-accounts'));
    expect(await screen.findByTestId('admin-accounts-section')).toBeTruthy();
  });

  it('opens registration from the profile sidebar', async () => {
    await renderRouter(appRoutes);
    await screen.findByTestId('marketplace-heading');
    await fireEvent.press(screen.getByTestId('account-entry'));
    expect(await screen.findByTestId('profile-sidebar-modal')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('sidebar-register'));
    expect(await screen.findByText('Buat akun Cepat')).toBeTruthy();
    expect(screen).toHavePathname('/register');
  });

  it('falls back to the marketplace when settings has no back history', async () => {
    const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await renderRouter(appRoutes, { initialUrl: '/account' });
    await screen.findByText('Pengaturan');
    await fireEvent.press(screen.getByLabelText('Marketplace'));
    expect(screen).toHavePathname('/');
    expect(warning.mock.calls.flat().join(' ')).not.toContain('GO_BACK');
    warning.mockRestore();
  });
});
