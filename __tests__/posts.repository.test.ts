import {
  createTechnicianPost,
  deleteTechnicianPost,
  fetchTechnicianPosts,
  uploadPostMedia,
} from '../src/data/postRepository';

describe('posts repository & storage integration (quick.md)', () => {
  it('createTechnicianPost calls insert with proper technician UUID and media URLs', async () => {
    const techId = 'a0000000-0000-0000-0000-000000000001';
    const post = await createTechnicianPost({
      actorUserId: techId,
      technicianId: techId,
      technicianName: 'Budi Santoso',
      categorySlug: 'ac-service',
      serviceArea: 'Jakarta Selatan',
      caption: 'Servis AC Daikin 2 PK selesai.',
      mediaUrls: ['file:///img1.jpg', 'file:///img2.jpg'],
    });

    expect(post).toBeTruthy();
    expect(post.technicianId).toBe(techId);
    expect(post.caption).toBe('Servis AC Daikin 2 PK selesai.');
    expect(post.mediaUrls).toEqual(['file:///img1.jpg', 'file:///img2.jpg']);
    expect(post.imageUri).toBe('file:///img1.jpg');
  });

  it('Mocked upload failure prevents post record creation and returns an actionable error', async () => {
    const techId = 'a0000000-0000-0000-0000-000000000001';

    // File exceeding 5 MB limit
    const oversizedFile = {
      uri: 'file:///huge-photo.jpg',
      fileName: 'huge-photo.jpg',
      fileSize: 6 * 1024 * 1024, // 6 MB
      mimeType: 'image/jpeg',
    };

    await expect(
      uploadPostMedia(techId, 'post-temp-1', oversizedFile),
    ).rejects.toThrow('file_too_large');

    // Invalid non-image extension
    const invalidFile = {
      uri: 'file:///malicious.pdf',
      fileName: 'malicious.pdf',
      fileSize: 1024,
      mimeType: 'application/pdf',
    };

    await expect(
      uploadPostMedia(techId, 'post-temp-1', invalidFile),
    ).rejects.toThrow();
  });

  it('fetchTechnicianPosts retrieves posts ordered by created_at DESC with pagination', async () => {
    const techId = 'a0000000-0000-0000-0000-000000000002';

    // Seed multiple posts
    await createTechnicianPost({
      actorUserId: techId,
      technicianId: techId,
      technicianName: 'Joko AC',
      categorySlug: 'ac-service',
      serviceArea: 'Bandung',
      caption: 'Post number 1',
    });

    await createTechnicianPost({
      actorUserId: techId,
      technicianId: techId,
      technicianName: 'Joko AC',
      categorySlug: 'ac-service',
      serviceArea: 'Bandung',
      caption: 'Post number 2',
    });

    const page1 = await fetchTechnicianPosts({
      technicianId: techId,
      page: 1,
      pageSize: 1,
    });

    expect(page1.items.length).toBe(1);
    expect(page1.page).toBe(1);
    expect(page1.pageSize).toBe(1);
    expect(page1.hasMore).toBe(true);

    const page2 = await fetchTechnicianPosts({
      technicianId: techId,
      page: 2,
      pageSize: 1,
    });

    expect(page2.items.length).toBe(1);
    expect(page2.page).toBe(2);
  });

  it('Unauthorized user delete request is rejected by RLS policy', async () => {
    const ownerId = 'a0000000-0000-0000-0000-000000000003';
    const intruderId = 'a0000000-0000-0000-0000-000000000099';

    const post = await createTechnicianPost({
      actorUserId: ownerId,
      technicianId: ownerId,
      technicianName: 'Ahmad Teknik',
      categorySlug: 'plumbing',
      serviceArea: 'Surabaya',
      caption: 'Perbaikan saluran air mampet lancar kembali.',
    });

    // Intruder attempts to delete post
    await expect(
      deleteTechnicianPost({
        actorUserId: intruderId,
        postId: post.id,
      }),
    ).rejects.toThrow('unauthorized_post_owner');

    // Owner can delete post
    const remaining = await deleteTechnicianPost({
      actorUserId: ownerId,
      postId: post.id,
    });
    expect(remaining.find((p) => p.id === post.id)).toBeUndefined();
  });
});
