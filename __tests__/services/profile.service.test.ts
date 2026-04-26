import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ensureProfile } from '@/services/profile.service';
import type { ProfileRow } from '@/types/user';

const mockFrom = jest.fn();

jest.mock('@/utils/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

function createProfile(overrides: Partial<ProfileRow> = {}): ProfileRow {
  return {
    id: 'user-1',
    full_name: 'Siti Aminah',
    phone_number: null,
    avatar_url: null,
    role: 'customer',
    is_banned: false,
    created_at: '2026-04-26T00:00:00.000Z',
    updated_at: '2026-04-26T00:00:00.000Z',
    expo_push_token: null,
    expo_push_token_updated_at: null,
    ...overrides,
  };
}

function createGetProfileQuery(profile: ProfileRow | null) {
  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(async () => ({
      data: profile,
      error: profile ? null : new Error('not found'),
    })),
  };
}

function createUpdateProfileQuery(profile: ProfileRow | null) {
  return {
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    single: jest.fn(async () => ({ data: profile, error: null })),
  };
}

describe('ensureProfile', () => {
  beforeEach(() => {
    mockFrom.mockReset();
  });

  it('syncs the Google OAuth avatar into an existing profile that has no avatar', async () => {
    const googleAvatarUrl = 'https://lh3.googleusercontent.com/avatar.jpg';
    const existingProfile = createProfile({ avatar_url: null });
    const updatedProfile = createProfile({ avatar_url: googleAvatarUrl });
    const getQuery = createGetProfileQuery(existingProfile);
    const updateQuery = createUpdateProfileQuery(updatedProfile);

    mockFrom.mockReturnValueOnce(getQuery).mockReturnValueOnce(updateQuery);

    const result = await ensureProfile(
      'user-1',
      'siti@example.com',
      'Siti Aminah',
      googleAvatarUrl,
    );

    expect(result?.avatar_url).toBe(googleAvatarUrl);
    expect(updateQuery.update).toHaveBeenCalledWith({
      avatar_url: googleAvatarUrl,
      updated_at: expect.any(String),
    });
  });

  it('keeps a manually uploaded avatar instead of overwriting it with Google metadata', async () => {
    const manualAvatarUrl = 'https://cdn.example.com/manual-avatar.jpg';
    const getQuery = createGetProfileQuery(createProfile({ avatar_url: manualAvatarUrl }));

    mockFrom.mockReturnValueOnce(getQuery);

    const result = await ensureProfile(
      'user-1',
      'siti@example.com',
      'Siti Aminah',
      'https://lh3.googleusercontent.com/avatar.jpg',
    );

    expect(result?.avatar_url).toBe(manualAvatarUrl);
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });
});
