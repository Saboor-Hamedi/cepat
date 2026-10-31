import { fireEvent, render, screen } from '@testing-library/react-native';
import type { PropsWithChildren } from 'react';

import { clearTestAuthSession } from '../src/auth/AuthProvider';
import { TechnicianPostComposer } from '../src/components/posts/TechnicianPostComposer';
import { LanguageProvider } from '../src/i18n/locale';

function Wrapper({ children }: PropsWithChildren) {
  return <LanguageProvider>{children}</LanguageProvider>;
}

afterEach(() => {
  clearTestAuthSession();
});

describe('TechnicianPostComposer (X/Twitter style)', () => {
  it('Post button is disabled when input is empty and no images are selected', async () => {
    const handleCreate = jest.fn();
    await render(<TechnicianPostComposer onCreatePost={handleCreate} />, {
      wrapper: Wrapper,
    });

    const submitBtn = screen.getByTestId('submit-new-post-btn');
    expect(submitBtn.props.accessibilityState?.disabled).toBe(true);
    await fireEvent.press(submitBtn);
    expect(handleCreate).not.toHaveBeenCalled();
  });

  it('Typing valid text enables the Post button', async () => {
    const handleCreate = jest.fn();
    await render(<TechnicianPostComposer onCreatePost={handleCreate} />, {
      wrapper: Wrapper,
    });

    const input = screen.getByTestId('create-post-caption-input');
    await fireEvent.changeText(
      input,
      'Selesai servis AC Panasonic 1 PK di BSD. Dingin maksimal!',
    );

    const submitBtn = screen.getByTestId('submit-new-post-btn');
    expect(submitBtn.props.accessibilityState?.disabled).toBe(false);

    await fireEvent.press(submitBtn);
    expect(handleCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        caption: 'Selesai servis AC Panasonic 1 PK di BSD. Dingin maksimal!',
      }),
    );
  });

  it('Selecting an image enables the Post button even with empty text', async () => {
    const handleCreate = jest.fn();
    const mockImageLauncher = jest.fn().mockResolvedValue('file:///test-ac-repair.jpg');

    await render(
      <TechnicianPostComposer
        onCreatePost={handleCreate}
        customImageLauncher={mockImageLauncher}
      />,
      { wrapper: Wrapper },
    );

    const submitBtn = screen.getByTestId('submit-new-post-btn');
    expect(submitBtn.props.accessibilityState?.disabled).toBe(true);

    // Pick image via custom launcher
    const addImgBtn = screen.getByTestId('add-image-btn');
    await fireEvent.press(addImgBtn);

    // Post button is now enabled despite empty caption
    expect(screen.getByTestId('preview-image-0')).toBeTruthy();
    expect(submitBtn.props.accessibilityState?.disabled).toBe(false);

    await fireEvent.press(submitBtn);
    expect(handleCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        caption: '',
        imageUri: 'file:///test-ac-repair.jpg',
        mediaUrls: ['file:///test-ac-repair.jpg'],
      }),
    );
  });

  it('Removing an image updates preview state correctly', async () => {
    const handleCreate = jest.fn();
    const mockImageLauncher = jest.fn().mockResolvedValue('file:///sample-water-pump.jpg');

    await render(
      <TechnicianPostComposer
        onCreatePost={handleCreate}
        customImageLauncher={mockImageLauncher}
      />,
      { wrapper: Wrapper },
    );

    const addImgBtn = screen.getByTestId('add-image-btn');
    await fireEvent.press(addImgBtn);
    expect(screen.getByTestId('preview-image-0')).toBeTruthy();

    // Tap remove button (×)
    const removeBtn = screen.getByTestId('remove-image-0');
    await fireEvent.press(removeBtn);

    expect(screen.queryByTestId('preview-image-0')).toBeNull();
    // Post button becomes disabled again
    const submitBtn = screen.getByTestId('submit-new-post-btn');
    expect(submitBtn.props.accessibilityState?.disabled).toBe(true);
  });

  it('Link-blocking validator triggers an error message if a URL is pasted', async () => {
    const handleCreate = jest.fn();
    await render(<TechnicianPostComposer onCreatePost={handleCreate} />, {
      wrapper: Wrapper,
    });

    const input = screen.getByTestId('create-post-caption-input');
    await fireEvent.changeText(
      input,
      'Check out my external portfolio at https://instagram.com/ac_repair or wa.me/62812345678',
    );

    expect(screen.getByTestId('create-post-error')).toBeTruthy();
    const submitBtn = screen.getByTestId('submit-new-post-btn');
    expect(submitBtn.props.accessibilityState?.disabled).toBe(true);
    await fireEvent.press(submitBtn);
    expect(handleCreate).not.toHaveBeenCalled();
  });

  it('Character limit displays a warning when exceeded', async () => {
    const handleCreate = jest.fn();
    await render(<TechnicianPostComposer onCreatePost={handleCreate} />, {
      wrapper: Wrapper,
    });

    const longText = 'A'.repeat(1005);
    const input = screen.getByTestId('create-post-caption-input');
    await fireEvent.changeText(input, longText);

    expect(screen.getByTestId('char-count-warning')).toBeTruthy();
    const submitBtn = screen.getByTestId('submit-new-post-btn');
    expect(submitBtn.props.accessibilityState?.disabled).toBe(true);
    await fireEvent.press(submitBtn);
    expect(handleCreate).not.toHaveBeenCalled();
  });
});
