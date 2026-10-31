import { fireEvent, render, screen } from '@testing-library/react-native';
import type { PropsWithChildren } from 'react';

import { ProfileAvatar } from '../src/profile/ProfileAvatar';
import { LanguageProvider } from '../src/i18n/locale';

function Wrapper({ children }: PropsWithChildren) {
  return <LanguageProvider>{children}</LanguageProvider>;
}

describe('ProfileAvatar Component (X.com / Twitter Style Popup)', () => {
  it('when editable={false}: purely display-only with no popup behavior', async () => {
    await render(
      <ProfileAvatar
        name="Rizky Pratama"
        editable={false}
        testID="test-avatar"
      />,
      { wrapper: Wrapper },
    );

    expect(screen.getByTestId('test-avatar')).toBeTruthy();
    expect(screen.queryByTestId('test-avatar-camera-badge')).toBeNull();

    // Tap on avatar -> modal should NOT open
    await fireEvent.press(screen.getByTestId('test-avatar-touch'));
    expect(screen.queryByTestId('avatar-take-photo-btn')).toBeNull();
    expect(screen.queryByTestId('avatar-choose-gallery-btn')).toBeNull();
  });

  it('when editable={true}: tapping opens sleek menu with Take Photo and Choose from Gallery', async () => {
    const handleSelected = jest.fn();
    const mockPicker = jest.fn().mockResolvedValue({
      uri: 'file:///photo-camera.jpg',
      fileName: 'photo-camera.jpg',
      mimeType: 'image/jpeg',
      fileSize: 1024 * 200,
    });

    await render(
      <ProfileAvatar
        name="Rizky Pratama"
        editable={true}
        onImageSelected={handleSelected}
        customPickerLauncher={mockPicker}
        testID="test-avatar"
      />,
      { wrapper: Wrapper },
    );

    // Camera badge is visible
    expect(screen.getByTestId('test-avatar-camera-badge')).toBeTruthy();

    // Tap on avatar -> opens popup menu
    await fireEvent.press(screen.getByTestId('test-avatar-touch'));
    expect(await screen.findByTestId('avatar-take-photo-btn')).toBeTruthy();
    expect(screen.getByTestId('avatar-choose-gallery-btn')).toBeTruthy();
    expect(screen.getByTestId('cancel-avatar-menu-btn')).toBeTruthy();

    // Tap Take Photo
    await fireEvent.press(screen.getByTestId('avatar-take-photo-btn'));
    expect(mockPicker).toHaveBeenCalledWith('camera');
    expect(handleSelected).toHaveBeenCalledWith('file:///photo-camera.jpg');
  });

  it('canceling closes the popup menu without triggering onImageSelected', async () => {
    const handleSelected = jest.fn();

    await render(
      <ProfileAvatar
        name="Rizky Pratama"
        editable={true}
        onImageSelected={handleSelected}
        testID="test-avatar"
      />,
      { wrapper: Wrapper },
    );

    await fireEvent.press(screen.getByTestId('test-avatar-touch'));
    expect(await screen.findByTestId('cancel-avatar-menu-btn')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('cancel-avatar-menu-btn'));
    expect(handleSelected).not.toHaveBeenCalled();
  });
});
