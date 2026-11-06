import {
  deriveMetadataRoles,
  ensureTechnicianApplicationRow,
  fetchAuthenticatedAccountState,
  normalizeApplicationStatus,
} from '../src/auth/technicianApplication';
import {
  loadAdminAccounts,
  loadAdminReports,
  updateAdminAccountModeration,
  updateAdminReportStatus,
} from '../src/data/adminStore';
import {
  createPost,
  deletePost,
  hasUserLikedPost,
  incrementPostShare,
  loadMarketplacePublishedPosts,
  loadPosts,
  recordPostView,
  togglePostLike,
  updatePost,
} from '../src/data/postsStore';
import { fixtureCategories, fixtureTechnicians, indonesianRegions } from '../src/data/fixtures';
import {
  filterTechnicians,
  formatRupiah,
  isSchemaPermissionError,
  isUuid,
  isValidSupabaseUrl,
  loadCategories,
  loadServiceAreas,
  loadTechnician,
  loadTechnicians,
  mapTechnician,
  resolveServiceAreaName,
} from '../src/data/marketplaceRepository';
import {
  containsBlockedUrl,
  createBookingRequest,
  deleteCustomerAddress,
  isAllowedBookingTransition,
  loadSavedAddresses,
  loadSelectedArea,
  saveCustomerAddress,
  saveSelectedArea,
  sendBookingMessage,
  submitBookingWorkForAcceptance,
  submitBookingReview,
  submitTechnicianReport,
  toggleSavedTechnicianId,
  transitionBookingStatus,
  updateBookingReview,
} from '../src/data/marketplaceStore';
import { getProfileTheme, normalizeProfileTheme } from '../src/theme/tokens';
import {
  buildPostSharePayload,
  buildSecurePostShareUrl,
  isSecureShareUrl,
  sanitizeShareImageUrl,
} from '../src/utils/postShare';
import {
  inspectImageMagicBytes,
  validateStrictImageAsset,
} from '../src/utils/imageValidator';

function createFakeQueryChain(result: { data: unknown; error: { message: string } | null }) {
  const chain = {
    select: () => chain,
    eq: () => chain,
    order: () => chain,
    limit: () => chain,
    maybeSingle: () => Promise.resolve(result),
    then: (resolve: (val: typeof result) => unknown) => Promise.resolve(result).then(resolve),
  };
  return chain;
}

describe('marketplace data, UUID guard, and map location resolution', () => {
  it('uses explicit preview fixtures only when Supabase is not configured', async () => {
    const [categories, page, areas] = await Promise.all([
      loadCategories(),
      loadTechnicians(),
      loadServiceAreas(),
    ]);
    expect(categories.source).toBe('fixtures');
    expect(categories.items).toEqual(fixtureCategories);
    expect(categories.items.every((cat) => /^[a-z-]+$/.test(cat.icon))).toBe(true);
    expect(page.source).toBe('fixtures');
    expect(page.items).toEqual(fixtureTechnicians);
    expect(page.hasMore).toBe(false);
    expect(areas.source).toBe('fixtures');
    expect(areas.items).toContain('Jakarta Selatan');
  });

  it('guards loadTechnician with isUuid so fixture IDs never hit Postgres uuid columns', async () => {
    expect(isUuid('demo-rizky')).toBe(false);
    expect(isUuid('550e8400-e29b-41d4-a716-446655440000')).toBe(true);

    const result = await loadTechnician('demo-rizky');
    expect(result.item?.id).toBe('demo-rizky');
    expect(result.item?.displayName).toBe('Rizky Pratama');
  });

  it('resolves districts and neighborhoods across Indonesia to their canonical service area', () => {
    expect(indonesianRegions.length).toBeGreaterThanOrEqual(16);
    expect(resolveServiceAreaName('Kebayoran Baru')).toBe('Jakarta Selatan');
    expect(resolveServiceAreaName('Tebet')).toBe('Jakarta Selatan');
    expect(resolveServiceAreaName('Menteng')).toBe('Jakarta Pusat');
    expect(resolveServiceAreaName('Coblong')).toBe('Bandung');
    expect(resolveServiceAreaName('Kuta Utara')).toBe('Denpasar & Badung');
  });

  it('matches services, technician names, category, and selected service area or neighborhood', () => {
    expect(
      filterTechnicians(fixtureTechnicians, 'pipa', 'Jakarta Selatan').map((item) => item.id),
    ).toEqual(['demo-rizky']);
    expect(
      filterTechnicians(fixtureTechnicians, 'pipa', 'Kebayoran Baru').map((item) => item.id),
    ).toEqual(['demo-rizky']);
    expect(
      filterTechnicians(fixtureTechnicians, 'sari', 'Semua area').map((item) => item.id),
    ).toEqual(['demo-sari']);
    expect(
      filterTechnicians(fixtureTechnicians, 'pipe repair', 'Semua area').map((item) => item.id),
    ).toEqual(['demo-rizky']);
    expect(
      filterTechnicians(fixtureTechnicians, '', 'Jakarta Selatan', 'electrical').map(
        (item) => item.id,
      ),
    ).toEqual(['demo-dimas']);
    expect(filterTechnicians(fixtureTechnicians, 'plumbing', 'Bandung')).toEqual([]);
  });

  it('formats Indonesian rupiah without decimals', () => {
    expect(formatRupiah(125000)).toContain('125.000');
    expect(formatRupiah(125000)).toContain('Rp');
  });

  it.each([
    ['https://project.supabase.co', true],
    ['http://localhost:54321', true],
    ['ftp://project.supabase.co', false],
    ['not-a-url', false],
    ['', false],
  ])('validates the Supabase URL format %p', (value, expected) => {
    expect(isValidSupabaseUrl(value)).toBe(expected);
  });

  it('maps public technician records and supplies safe values for optional fields', () => {
    const technician = mapTechnician(
      {
        user_id: 'tech-1',
        services: [
          {
            id: 'tech-service-1',
            starting_price: '125000',
            service: {
              id: 'service-1',
              name: 'Perbaikan pipa',
              slug: 'pipa',
              category: { name: 'Plumbing', slug: 'plumbing' },
            },
          },
        ],
        areas: [{ service_area: { name: 'Bandung' } }],
        profile_theme: { preset: 'not-a-preset' },
      },
      { display_name: 'Dewi', avatar_path: 'private/avatar.png' },
    );

    expect(technician).toMatchObject({
      id: 'tech-1',
      displayName: 'Dewi',
      verified: false,
      available: false,
      averageRating: 0,
      reviewCount: 0,
      completedJobsCount: 0,
      serviceAreas: ['Bandung'],
      theme: 'sand',
      services: [{ name: 'Perbaikan pipa', categorySlug: 'plumbing', startingPrice: 125000 }],
    });
    expect(technician.avatarUri).toBeUndefined();
  });
});

describe('technician account application status synchronization', () => {
  it('normalizes valid technician application statuses', () => {
    expect(normalizeApplicationStatus('submitted')).toBe('submitted');
    expect(normalizeApplicationStatus('pending_review')).toBe('pending_review');
    expect(normalizeApplicationStatus('under_review')).toBe('under_review');
    expect(normalizeApplicationStatus('approved')).toBe('approved');
    expect(normalizeApplicationStatus('rejected')).toBe('rejected');
    expect(normalizeApplicationStatus('unknown')).toBeNull();
  });

  it('resolves approved status when the user has the technician role even if application row is missing', async () => {
    const fakeClient = {
      from: (table: string) => {
        if (table === 'user_roles') {
          return createFakeQueryChain({ data: [{ role: 'technician' }], error: null });
        }
        return createFakeQueryChain({ data: null, error: null });
      },
    } as never;

    const state = await fetchAuthenticatedAccountState(fakeClient, {
      id: 'user-tech-1',
      user_metadata: { requested_account_type: 'technician' },
    } as never);

    expect(state.roles).toContain('technician');
    expect(state.applicationStatus).toBe('approved');
    expect(state.applicationError).toBeNull();
  });

  it('auto-synchronizes a missing technician_applications row via RPC or insert when requested_account_type is technician', async () => {
    const fakeClient = {
      rpc: () => Promise.resolve({ data: 'submitted', error: null }),
      from: (table: string) => {
        if (table === 'user_roles') {
          return createFakeQueryChain({ data: [{ role: 'customer' }], error: null });
        }
        return createFakeQueryChain({ data: null, error: null });
      },
    } as never;

    const fakeUser = {
      id: 'user-tech-2',
      user_metadata: { requested_account_type: 'technician' },
    } as never;

    const synced = await ensureTechnicianApplicationRow(fakeClient, fakeUser);
    expect(synced.status).toBe('submitted');
    expect(synced.error).toBeNull();

    const state = await fetchAuthenticatedAccountState(fakeClient, fakeUser);
    expect(state.applicationStatus).toBe('submitted');
    expect(state.applicationError).toBeNull();
  });

  it('surfaces real query errors so the UI can show Retry instead of silently masking the error', async () => {
    const fakeClient = {
      from: (table: string) => {
        if (table === 'user_roles') {
          return createFakeQueryChain({ data: [{ role: 'customer' }], error: null });
        }
        if (table === 'technician_applications') {
          return createFakeQueryChain({
            data: null,
            error: { message: 'Network connection timed out' },
          });
        }
        return createFakeQueryChain({ data: { status: 'active' }, error: null });
      },
    } as never;

    const state = await fetchAuthenticatedAccountState(fakeClient, {
      id: 'user-tech-3',
      user_metadata: { requested_account_type: 'technician' },
    } as never);
    expect(state.applicationError).toBe('Network connection timed out');
  });
});

describe('profile theme validation', () => {
  it.each([
    [{ preset: 'sage' }, 'sage'],
    [{ preset: 'clay' }, 'clay'],
    [{ preset: 'custom-css' }, 'sand'],
    [null, 'sand'],
    ['sage', 'sand'],
  ])('normalizes %p to the supported preset %s', (value, expected) => {
    expect(normalizeProfileTheme(value)).toBe(expected);
  });

  it('returns only the fixed theme tokens for a supported preset', () => {
    expect(getProfileTheme('sage')).toMatchObject({ background: '#EAF2ED', accent: '#34715E' });
  });
});

describe('booking lifecycle, chat link blocking, and marketplace store', () => {
  it('enforces valid booking status transitions and rejects invalid jumps', () => {
    expect(isAllowedBookingTransition('requested', 'confirmed')).toBe(true);
    expect(isAllowedBookingTransition('requested', 'accepted')).toBe(true);
    expect(isAllowedBookingTransition('requested', 'declined')).toBe(true);
    expect(isAllowedBookingTransition('requested', 'alternative_proposed')).toBe(true);
    expect(isAllowedBookingTransition('requested', 'completed')).toBe(false);
    expect(isAllowedBookingTransition('confirmed', 'in_progress')).toBe(true);
    expect(isAllowedBookingTransition('in_progress', 'completed')).toBe(true);
    expect(isAllowedBookingTransition('completed', 'cancelled')).toBe(false);
  });

  it('blocks URLs in booking chat messages per security policy', () => {
    expect(containsBlockedUrl('Halo Pak, saya di lantai 2')).toBe(false);
    expect(containsBlockedUrl('Silakan klik https://phishing.example.com')).toBe(true);
    expect(containsBlockedUrl('Buka www.example.com untuk bayar')).toBe(true);
  });

  it('creates a booking, transitions through confirmation to completion, blocks links in chat, and submits a review', async () => {
    const tech = fixtureTechnicians[0];
    const booking = await createBookingRequest({
      customerUserId: 'demo-customer',
      customerName: 'Budi Santoso',
      technician: tech,
      service: tech.services[0],
      customerAddress: 'Jl. Kemang Raya No. 12',
      addressNotes: 'Gerbang hitam',
      serviceArea: 'Jakarta Selatan',
      requestedStartAt: '2026-11-05T10:00:00.000Z',
      customerNotes: 'Pipa wastafel dapur rembes',
    });

    expect(booking.status).toBe('requested');

    const confirmed = await transitionBookingStatus(booking.id, 'confirmed', 'technician');
    expect(confirmed.status).toBe('confirmed');

    await expect(
      sendBookingMessage({
        bookingId: booking.id,
        senderUserId: 'demo-customer',
        senderRole: 'customer',
        senderName: 'Budi Santoso',
        body: 'Transfer ke https://evil.example.com',
      }),
    ).rejects.toThrow('url_blocked');

    const msg = await sendBookingMessage({
      bookingId: booking.id,
      senderUserId: 'demo-customer',
      senderRole: 'customer',
      senderName: 'Budi Santoso',
      body: 'Tolong masuk lewat gerbang selatan ya Pak.',
    });
    expect(msg.body).toBe('Tolong masuk lewat gerbang selatan ya Pak.');

    const inProgress = await transitionBookingStatus(booking.id, 'in_progress', 'technician');
    expect(inProgress.status).toBe('in_progress');

    await expect(
      transitionBookingStatus(booking.id, 'completed', 'customer'),
    ).rejects.toThrow('invalid_status_transition');

    const submitted = await submitBookingWorkForAcceptance(booking.id);
    expect(submitted.workCompletedAt).toBeTruthy();

    const completed = await transitionBookingStatus(booking.id, 'completed', 'customer');
    expect(completed.status).toBe('completed');

    const review = await submitBookingReview({
      bookingId: booking.id,
      technicianId: tech.id,
      customerUserId: 'demo-customer',
      customerName: 'Budi Santoso',
      rating: 5,
      comment: 'Sangat rapi dan tepat waktu.',
    });
    expect(review.rating).toBe(5);
    expect(review.comment).toBe('Sangat rapi dan tepat waktu.');

    // Duplicate review submission on the same completed booking is blocked
    await expect(
      submitBookingReview({
        bookingId: booking.id,
        technicianId: tech.id,
        customerUserId: 'demo-customer',
        customerName: 'Budi Santoso',
        rating: 4,
        comment: 'Mencoba kirim ulasan kedua kali.',
      }),
    ).rejects.toThrow('review_already_submitted');

    // Admin or another user who did not complete this booking CANNOT edit the feedback
    await expect(
      updateBookingReview({
        bookingId: booking.id,
        reviewId: review.id,
        customerUserId: 'verified-admin-1',
        technicianId: tech.id,
        rating: 1,
        comment: 'Admin mencoba ubah ulasan pelanggan.',
      }),
    ).rejects.toThrow('unauthorized_review_actor');

    await expect(
      updateBookingReview({
        bookingId: booking.id,
        reviewId: review.id,
        customerUserId: 'unrelated-user-99',
        technicianId: tech.id,
        rating: 2,
        comment: 'Pengguna lain mencoba ubah ulasan.',
      }),
    ).rejects.toThrow('unauthorized_review_actor');

    // Technician themselves CANNOT edit the customer feedback
    await expect(
      updateBookingReview({
        bookingId: booking.id,
        reviewId: review.id,
        customerUserId: tech.id,
        technicianId: tech.id,
        rating: 5,
        comment: 'Teknisi mencoba ubah ulasan sendiri.',
      }),
    ).rejects.toThrow('cannot_review_self');

    // ONLY the customer who completed the booking with that technician can edit their feedback
    const editedReview = await updateBookingReview({
      bookingId: booking.id,
      reviewId: review.id,
      customerUserId: 'demo-customer',
      technicianId: tech.id,
      rating: 4,
      comment: 'Diperbarui oleh pelanggan: Pipa sangat rapi dan berfungsi baik.',
    });
    expect(editedReview.rating).toBe(4);
    expect(editedReview.comment).toBe(
      'Diperbarui oleh pelanggan: Pipa sangat rapi dan berfungsi baik.',
    );
  });

  it('persists selected area, saved addresses, saved technicians, and technician reports', async () => {
    await saveSelectedArea('Bandung');
    expect(await loadSelectedArea()).toBe('Bandung');
    await saveSelectedArea('Semua area');

    const initialAddresses = await loadSavedAddresses();
    const updatedAddresses = await saveCustomerAddress(undefined, {
      label: 'Apartemen',
      area: 'Jakarta Pusat',
      streetAddress: 'Jl. Thamrin No. 1',
      notes: 'Tower A',
    });
    expect(updatedAddresses.length).toBe(initialAddresses.length + 1);

    const createdAddress = updatedAddresses[0];
    const afterRemove = await deleteCustomerAddress(undefined, createdAddress.id);
    expect(afterRemove.some((item) => item.id === createdAddress.id)).toBe(false);

    const savedTechs = await toggleSavedTechnicianId(undefined, 'demo-sari');
    expect(savedTechs).toContain('demo-sari');

    const report = await submitTechnicianReport({
      reportedTechnicianId: 'demo-sari',
      technicianName: 'Sari Cool Air',
      category: 'quality',
      description: 'Terlambat 30 menit dari jadwal.',
    });
    expect(report.reportedTechnicianId).toBe('demo-sari');
  });
});

describe('strict image validation, schema permission fallback, and admin moderation', () => {
  it('validates genuine image magic bytes and rejects spoofed PDF/EXE/double-extension files', () => {
    expect(
      inspectImageMagicBytes(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])),
    ).toBe('jpeg');
    expect(
      inspectImageMagicBytes(
        new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]),
      ),
    ).toBe('png');
    expect(
      inspectImageMagicBytes(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31])),
    ).toBeNull();

    // Valid JPEG passes
    const valid = validateStrictImageAsset({
      uri: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800',
      fileName: 'profile_photo.jpg',
      mimeType: 'image/jpeg',
      fileSize: 250000,
      width: 600,
      height: 600,
      headerBytes: new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]),
    });
    expect(valid.valid).toBe(true);

    // Double extension invoice.pdf.jpg is rejected even with valid JPEG header
    const doubleExt = validateStrictImageAsset({
      uri: 'file:///local/invoice.pdf.jpg',
      fileName: 'invoice.pdf.jpg',
      mimeType: 'image/jpeg',
      fileSize: 250000,
      width: 600,
      height: 600,
      headerBytes: new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]),
    });
    expect(doubleExt.valid).toBe(false);
    expect(doubleExt.errorCode).toBe('DOUBLE_EXTENSION_DETECTED');

    // PDF header bytes disguised as .jpg is rejected
    const spoofedPdf = validateStrictImageAsset({
      uri: 'file:///local/avatar.jpg',
      fileName: 'avatar.jpg',
      mimeType: 'image/jpeg',
      fileSize: 250000,
      width: 600,
      height: 600,
      headerBytes: new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]),
    });
    expect(spoofedPdf.valid).toBe(false);
    expect(spoofedPdf.errorCode).toBe('SPOOFED_MAGIC_BYTES');
  });

  it('gracefully handles "permission denied for schema public" without crashing or losing technician metadata role', async () => {
    expect(isSchemaPermissionError({ message: 'permission denied for schema public' })).toBe(true);

    const fakeClient = {
      from: () =>
        createFakeQueryChain({
          data: null,
          error: { message: 'permission denied for schema public' },
        }),
    } as never;

    const state = await fetchAuthenticatedAccountState(fakeClient, {
      id: 'user-tech-schema-err',
      user_metadata: { requested_account_type: 'technician' },
    } as never);

    expect(state.roles).toContain('technician');
    expect(state.applicationStatus).toBe('approved');
    expect(state.applicationError).toBeNull();
  });

  it('allows Admin to review/resolve reports and block/reactivate customer and technician accounts', async () => {
    const reports = await loadAdminReports();
    expect(reports.length).toBeGreaterThan(0);

    const updatedReports = await updateAdminReportStatus(
      reports[0].id,
      'resolved',
      'Investigated and resolved by Admin.',
    );
    expect(updatedReports.find((r) => r.id === reports[0].id)?.status).toBe('resolved');

    const accounts = await loadAdminAccounts();
    const targetAccount = accounts[0];
    const afterBlock = await updateAdminAccountModeration(
      targetAccount.id,
      'blocked',
      'Violation of marketplace policy',
    );
    expect(afterBlock.find((a) => a.id === targetAccount.id)?.status).toBe('blocked');

    const afterReactivate = await updateAdminAccountModeration(targetAccount.id, 'active');
    expect(afterReactivate.find((a) => a.id === targetAccount.id)?.status).toBe('active');
  });

  it('prevents client metadata self-promotion to admin and requires verified user_roles for admin access', async () => {
    const spoofedAdminUser = {
      id: 'user-spoof-admin',
      email: 'admin@evil.example.com',
      user_metadata: { requested_account_type: 'admin' },
    } as never;

    expect(deriveMetadataRoles(spoofedAdminUser)).not.toContain('admin');
    expect(deriveMetadataRoles(spoofedAdminUser)).toEqual(['customer']);

    const fakeClient = {
      from: (table: string) => {
        if (table === 'user_roles') {
          return createFakeQueryChain({ data: [{ role: 'customer' }], error: null });
        }
        return createFakeQueryChain({ data: null, error: null });
      },
    } as never;

    const state = await fetchAuthenticatedAccountState(fakeClient, spoofedAdminUser);
    expect(state.roles).not.toContain('admin');
  });

  it('creates, edits, deletes technician posts with strict ownership checks and filters blocked/unpublished posts from marketplace feed', async () => {
    const created = await createPost({
      actorUserId: 'demo-rizky',
      technicianId: 'demo-rizky',
      technicianName: fixtureTechnicians[0].displayName,
      technicianBusinessName: fixtureTechnicians[0].businessName,
      technicianVerified: fixtureTechnicians[0].verified,
      caption: 'Baru selesai pemasangan water heater hemat listrik di Kemang.',
      serviceArea: 'Jakarta Selatan',
      categorySlug: 'plumbing',
      published: true,
    });
    expect(created.caption).toContain('water heater');

    const marketFeed = await loadMarketplacePublishedPosts({ area: 'Jakarta Selatan' });
    expect(marketFeed.some((p) => p.id === created.id)).toBe(true);

    // Another user cannot edit or delete Rizky's post
    await expect(
      updatePost({
        actorUserId: 'intruder-user',
        postId: created.id,
        caption: 'Hacked caption',
      }),
    ).rejects.toThrow('unauthorized_post_owner');

    await expect(
      deletePost({ actorUserId: 'intruder-user', postId: created.id }),
    ).rejects.toThrow('unauthorized_post_owner');

    // Owner can edit and delete their own post
    const updated = await updatePost({
      actorUserId: 'demo-rizky',
      postId: created.id,
      caption: 'Update: Pemasangan water heater dan uji tekanan pipa selesai.',
    });
    expect(updated.caption).toContain('uji tekanan pipa');

    // Blocking a technician hides their posts from the public marketplace feed
    await updateAdminAccountModeration('demo-rizky', 'blocked', 'Moderation test');
    const feedWhileBlocked = await loadMarketplacePublishedPosts();
    expect(feedWhileBlocked.some((p) => p.technicianId === 'demo-rizky')).toBe(false);
    await updateAdminAccountModeration('demo-rizky', 'active');

    await deletePost({ actorUserId: 'demo-rizky', postId: created.id });
    const remaining = await loadPosts('demo-rizky', true);
    expect(remaining.some((p) => p.id === created.id)).toBe(false);
  });

  it('supports authenticated post likes, unique post view tracking, share counting, and clean secure social share links', async () => {
    const post = await createPost({
      actorUserId: 'demo-rizky',
      technicianId: 'demo-rizky',
      technicianName: 'Rizky Pratama',
      technicianBusinessName: 'Rizky Plumbing',
      caption: 'Instalasi pompa pendorong air selesai.',
      imageUri: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&token=secret123&utm_source=tracker',
      serviceArea: 'Jakarta Selatan',
      categorySlug: 'plumbing',
      published: true,
    });

    // Unauthenticated like is rejected
    await expect(togglePostLike(post.id, '')).rejects.toThrow('auth_required_for_like');

    // Any logged-in user can like and unlike a post
    const like1 = await togglePostLike(post.id, 'user-customer-1');
    expect(like1).toEqual({ liked: true, likeCount: 1 });
    expect(await hasUserLikedPost(post.id, 'user-customer-1')).toBe(true);

    const like2 = await togglePostLike(post.id, 'user-customer-2');
    expect(like2).toEqual({ liked: true, likeCount: 2 });

    const unlike1 = await togglePostLike(post.id, 'user-customer-1');
    expect(unlike1).toEqual({ liked: false, likeCount: 1 });
    expect(await hasUserLikedPost(post.id, 'user-customer-1')).toBe(false);

    // Unique post views per viewer
    const v1 = await recordPostView(post.id, 'user-customer-1');
    const v1Duplicate = await recordPostView(post.id, 'user-customer-1');
    const v2 = await recordPostView(post.id, 'user-customer-2');
    expect(v1).toBe(1);
    expect(v1Duplicate).toBe(1);
    expect(v2).toBe(2);

    // Share counter increments
    const s1 = await incrementPostShare(post.id);
    expect(s1).toBe(1);

    // Clean & secure link generation strips tokens/tracking and blocks unsafe schemes
    const cleanUrl = buildSecurePostShareUrl(`${post.id}?token=abc#frag`);
    expect(cleanUrl).toBe(`https://cepat.id/post/${post.id}tokenabcfrag`);
    expect(isSecureShareUrl(cleanUrl)).toBe(true);
    expect(isSecureShareUrl('http://cepat.id/post/123')).toBe(false);
    expect(isSecureShareUrl('https://cepat.id/post/123?access_token=leak')).toBe(false);
    expect(sanitizeShareImageUrl('javascript:alert(1)')).toBeUndefined();

    const payload = buildPostSharePayload(post, 'en', 'Rp 150.000');
    expect(payload.cleanUrl).toBe(`https://cepat.id/post/${post.id}`);
    expect(payload.cleanImageUrl).toBe(
      'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800',
    );
    expect(payload.cleanImageUrl).not.toContain('token=');
    expect(payload.cleanImageUrl).not.toContain('utm_source=');
    expect(payload.whatsappUrl).toContain('https://wa.me/?text=');
    expect(payload.facebookUrl).toContain('https://www.facebook.com/sharer/sharer.php');

    await deletePost({ actorUserId: 'demo-rizky', postId: post.id });
  });
});
