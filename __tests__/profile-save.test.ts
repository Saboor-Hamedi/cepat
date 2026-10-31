import { saveAccountProfileDetails } from '../src/data/marketplaceStore';

describe('account profile photo persistence', () => {
  it('preserves the stored photo when the editor submits an empty avatar value', async () => {
    const userId = `avatar-preservation-${Date.now()}`;
    const details = {
      displayName: 'Profile Owner',
      email: 'owner@example.test',
      phoneNumber: '',
      avatarUri: 'file:///profile-photo.jpg',
      addressNotes: '',
    };

    await saveAccountProfileDetails(userId, details);
    const updated = await saveAccountProfileDetails(userId, {
      ...details,
      avatarUri: '',
    });

    expect(updated.avatarUri).toBe(details.avatarUri);
  });
});
