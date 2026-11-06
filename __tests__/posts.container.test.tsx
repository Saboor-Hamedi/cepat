import { fireEvent, render, screen } from '@testing-library/react-native';
import type { PropsWithChildren } from 'react';

import { clearTestAuthSession } from '../src/auth/AuthProvider';
import { Post } from '../src/components/posts/Post';
import { PostContainer } from '../src/components/posts/PostContainer';
import { sanitizeMediaUris } from '../src/components/posts/PostMediaCarousel';
import { LanguageProvider } from '../src/i18n/locale';
import type { Post as PostType } from '../src/types/post';

function Wrapper({ children }: PropsWithChildren) {
  return <LanguageProvider>{children}</LanguageProvider>;
}

afterEach(() => {
  clearTestAuthSession();
});

describe('PostContainer (X/Twitter style)', () => {
  it('Post button is disabled when input is empty and no images are selected', async () => {
    const handleCreate = jest.fn();
    await render(<PostContainer onCreatePost={handleCreate} />, {
      wrapper: Wrapper,
    });

    const submitBtn = screen.getByTestId('submit-new-post-btn');
    expect(submitBtn.props.accessibilityState?.disabled).toBe(true);
    await fireEvent.press(submitBtn);
    expect(handleCreate).not.toHaveBeenCalled();
  });

  it('Typing valid text enables the Post button', async () => {
    const handleCreate = jest.fn();
    await render(<PostContainer onCreatePost={handleCreate} />, {
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
        isServicePost: false,
      }),
    );
  });

  it('Only marks a post bookable when the author opts in', async () => {
    const handleCreate = jest.fn();
    await render(<PostContainer onCreatePost={handleCreate} />, {
      wrapper: Wrapper,
    });

    await fireEvent.changeText(
      screen.getByTestId('create-post-caption-input'),
      'AC selesai dibersihkan.',
    );
    await fireEvent.press(screen.getByTestId('service-post-toggle'));
    expect(
      screen.getByTestId('service-post-toggle').props.accessibilityState.checked,
    ).toBe(true);

    await fireEvent.press(screen.getByTestId('submit-new-post-btn'));
    expect(handleCreate).toHaveBeenCalledWith(
      expect.objectContaining({ isServicePost: true }),
    );
  });

  it('Selecting an image enables the Post button even with empty text', async () => {
    const handleCreate = jest.fn();
    const mockImageLauncher = jest.fn().mockResolvedValue('file:///test-ac-repair.jpg');

    await render(
      <PostContainer
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

  it('opens the compact themed photo action sheet without a profile-photo control', async () => {
    await render(<PostContainer onCreatePost={jest.fn()} />, {
      wrapper: Wrapper,
    });

    await fireEvent.press(screen.getByTestId('add-image-btn'));
    expect(await screen.findByTestId('composer-image-picker-wrap')).toBeTruthy();
    expect(screen.getByTestId('post-image-picker-gallery-btn')).toBeTruthy();
    expect(screen.getByTestId('post-image-picker-camera-btn')).toBeTruthy();
    expect(screen.queryByTestId('post-image-picker-avatar')).toBeNull();
  });

  it('Removing an image updates preview state correctly', async () => {
    const handleCreate = jest.fn();
    const mockImageLauncher = jest.fn().mockResolvedValue('file:///sample-water-pump.jpg');

    await render(
      <PostContainer
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
    await render(<PostContainer onCreatePost={handleCreate} />, {
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
    await render(<PostContainer onCreatePost={handleCreate} />, {
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

  it('renders an Instagram-style multi-image carousel with counter and dots without cluttering arrow or zoom icons', async () => {
    const multiImagePost: PostType = {
      id: 'post-multi-1',
      technicianId: 'demo-rizky',
      technicianName: 'Rizky Pratama',
      technicianVerified: true,
      categorySlug: 'plumbing',
      serviceArea: 'Jakarta Selatan',
      caption: 'Pemasangan pipa air panas & dingin 3 titik selesai.',
      imageUri: 'file:///photo-1.jpg',
      mediaUrls: [
        'file:///photo-1.jpg',
        'file:///photo-2.jpg',
        'file:///photo-3.jpg',
      ],
      isServicePost: true,
      published: true,
      accountStatus: 'active',
      createdAt: new Date().toISOString(),
    };

    await render(<Post post={multiImagePost} />, { wrapper: Wrapper });

    expect(screen.getByTestId('post-media-carousel-post-multi-1')).toBeTruthy();
    expect(screen.getByTestId('post-carousel-counter-post-multi-1')).toBeTruthy();
    expect(screen.getByText('1/3')).toBeTruthy();
    expect(screen.getByTestId('post-carousel-dots-post-multi-1')).toBeTruthy();

    // No left/right arrow buttons, expand buttons, or popup preview modals
    expect(screen.queryByTestId('post-carousel-next-post-multi-1')).toBeNull();
    expect(screen.queryByTestId('post-carousel-prev-post-multi-1')).toBeNull();
    expect(screen.queryByTestId('post-carousel-expand-post-multi-1')).toBeNull();
    expect(screen.queryByTestId('post-zoom-modal-post-multi-1')).toBeNull();
  });

  it('preserves all multiple images and reuses the exact Create Post composer when editing a post', async () => {
    const handleEdit = jest.fn().mockResolvedValue(undefined);
    const multiImagePost: PostType = {
      id: 'post-edit-multi',
      technicianId: 'demo-rizky',
      technicianName: 'Rizky Pratama',
      technicianVerified: true,
      categorySlug: 'plumbing',
      serviceArea: 'Jakarta Selatan',
      caption: 'Instalasi pompa pendorong 3 lantai.',
      imageUri: 'file:///pump-1.jpg',
      mediaUrls: [
        'file:///pump-1.jpg',
        'file:///pump-2.jpg',
        'file:///pump-3.jpg',
      ],
      isServicePost: true,
      published: true,
      accountStatus: 'active',
      createdAt: new Date().toISOString(),
    };

    await render(<Post isOwner onEdit={handleEdit} post={multiImagePost} />, {
      wrapper: Wrapper,
    });

    await fireEvent.press(screen.getByTestId('post-actions-post-edit-multi'));
    await fireEvent.press(screen.getByTestId('edit-post-btn-post-edit-multi'));

    expect(screen.getByTestId('edit-post-form-post-edit-multi')).toBeTruthy();
    // All 3 images are shown in the PostFooter multi-image strip
    expect(screen.getByTestId('preview-image-0')).toBeTruthy();
    expect(screen.getByTestId('preview-image-1')).toBeTruthy();
    expect(screen.getByTestId('preview-image-2')).toBeTruthy();

    // Remove the middle image (index 1) and update caption
    await fireEvent.press(screen.getByTestId('remove-image-1'));
    expect(screen.queryByTestId('preview-image-2')).toBeNull();

    await fireEvent.changeText(
      screen.getByTestId('edit-post-caption-input-post-edit-multi'),
      'Instalasi pompa pendorong 3 lantai selesai rapi.',
    );

    await fireEvent.press(screen.getByTestId('save-edited-post-btn-post-edit-multi'));

    expect(handleEdit).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'post-edit-multi' }),
      'Instalasi pompa pendorong 3 lantai selesai rapi.',
      'file:///pump-1.jpg',
      expect.objectContaining({
        caption: 'Instalasi pompa pendorong 3 lantai selesai rapi.',
        imageUri: 'file:///pump-1.jpg',
        mediaUrls: ['file:///pump-1.jpg', 'file:///pump-3.jpg'],
        isServicePost: true,
      }),
    );
  });

  it('sanitizes media URIs and rejects unsafe schemes', () => {
    const cleaned = sanitizeMediaUris([
      'https://example.com/photo1.jpg',
      'javascript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      'file:///local/photo2.png',
    ]);
    expect(cleaned).toEqual([
      'https://example.com/photo1.jpg',
      'file:///local/photo2.png',
    ]);
  });
});
