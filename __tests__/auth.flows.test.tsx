import { fireEvent, render, screen } from '@testing-library/react-native';

import ForgotPasswordScreen from '../src/app/forgot-password';
import LoginScreen from '../src/app/login';
import RegisterScreen from '../src/app/register';
import {
  getEmailVerificationRedirectUrl,
  getPasswordResetRedirectUrl,
  handleIncomingAuthDeepLink,
  parseAuthDeepLink,
} from '../src/auth/deepLinking';

describe('authentication screens and mobile deep links', () => {
  it('shows accessible login and registration entry points without leaking personal info when logged out', async () => {
    await render(<LoginScreen />);
    expect(screen.getByTestId('login-email')).toBeTruthy();
    expect(screen.getByTestId('login-password')).toBeTruthy();
    expect(screen.getByTestId('login-submit')).toBeTruthy();
    expect(screen.getByTestId('register-link')).toBeTruthy();
    expect(screen.getByTestId('forgot-password-link')).toBeTruthy();
    // Ensure no personal information is shown under login
    expect(screen.queryByTestId('private-email-input')).toBeNull();
    expect(screen.queryByTestId('private-phone-input')).toBeNull();
  });

  it('shows field-specific required validation on registration', async () => {
    await render(<RegisterScreen />);
    await fireEvent.press(screen.getByTestId('register-submit'));
    expect(screen.getAllByText('Bagian ini wajib diisi.')).toHaveLength(4);
    expect(screen.getByTestId('register-name')).toBeTruthy();
    expect(screen.getByTestId('register-email')).toBeTruthy();
  });

  it('lets applicants select only customer or technician roles on registration and never exposes an admin self-selection button', async () => {
    await render(<RegisterScreen />);
    const customer = screen.getByTestId('role-customer');
    const technician = screen.getByTestId('role-technician');
    expect(screen.queryByTestId('role-admin')).toBeNull();
    expect(customer.props.accessibilityState.selected).toBe(true);
    await fireEvent.press(technician);
    expect(technician.props.accessibilityState.selected).toBe(true);
    expect(
      screen.getByText('Teknisi harus disetujui sebelum mendapat akses teknisi.'),
    ).toBeTruthy();
  });

  it('reports mismatched passwords beside the confirmation field', async () => {
    await render(<RegisterScreen />);
    await fireEvent.changeText(screen.getByTestId('register-name'), 'Dewi');
    await fireEvent.changeText(screen.getByTestId('register-email'), 'dewi@example.test');
    await fireEvent.changeText(screen.getByTestId('register-password'), 'password123');
    await fireEvent.changeText(screen.getByTestId('register-confirm-password'), 'password456');
    await fireEvent.press(screen.getByTestId('accept-terms'));
    await fireEvent.press(screen.getByTestId('register-submit'));
    expect(await screen.findByText('Kata sandi tidak sama.')).toBeTruthy();
  });

  it('sends an email verification code with a 1-minute (60s) countdown timer and unlocks password change after verification', async () => {
    await render(<ForgotPasswordScreen />);
    await fireEvent.changeText(screen.getByTestId('recovery-email'), 'teknisi@cepat.id');
    await fireEvent.press(screen.getByTestId('recovery-submit'));

    // Step 2: 60s countdown timer and OTP input appear
    expect(await screen.findByTestId('otp-countdown-timer')).toBeTruthy();
    expect(screen.getByTestId('recovery-code-input')).toBeTruthy();

    await fireEvent.changeText(screen.getByTestId('recovery-code-input'), '482910');
    await fireEvent.press(screen.getByTestId('verify-code-submit'));

    // Step 3: Password change form unlocks
    expect(await screen.findByTestId('recovery-password-step')).toBeTruthy();
    await fireEvent.changeText(screen.getByTestId('reset-password'), 'newPassword123');
    await fireEvent.changeText(screen.getByTestId('reset-confirm-password'), 'newPassword123');
    await fireEvent.press(screen.getByTestId('reset-submit'));
    expect(await screen.findByTestId('reset-login-link')).toBeTruthy();
  });

  it('generates cepat:// mobile deep links without localhost:3000 and handles recovery/verification links cleanly', async () => {
    const resetRedirect = getPasswordResetRedirectUrl();
    const verifyRedirect = getEmailVerificationRedirectUrl();

    expect(resetRedirect).toBe('cepat://reset-password');
    expect(verifyRedirect).toBe('cepat://login');
    expect(resetRedirect).not.toContain('localhost:3000');
    expect(verifyRedirect).not.toContain('localhost:3000');

    const parsedRecovery = parseAuthDeepLink(
      'cepat://reset-password?code=pkce-code-123&type=recovery',
    );
    expect(parsedRecovery?.type).toBe('recovery');
    expect(parsedRecovery?.code).toBe('pkce-code-123');

    const fakeClient = {
      auth: {
        exchangeCodeForSession: jest.fn().mockResolvedValue({ error: null }),
        verifyOtp: jest.fn().mockResolvedValue({ error: null }),
      },
    } as never;

    const handled = await handleIncomingAuthDeepLink(
      fakeClient,
      'cepat://reset-password?code=pkce-code-123&type=recovery',
    );
    expect(handled).toEqual({
      handled: true,
      isRecovery: true,
      error: undefined,
    });
  });
});
