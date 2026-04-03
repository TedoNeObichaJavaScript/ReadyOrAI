// A relatively clean TypeScript file for testing

export interface UserProfile {
  id: string;
  name: string;
  email: string;
}

/** Validates a user profile has required fields. */
export function isValidProfile(profile: UserProfile): boolean {
  return Boolean(profile.id && profile.name && profile.email);
}

/** Formats a user's display name. */
export function formatDisplayName(profile: UserProfile): string {
  return profile.name.trim();
}
