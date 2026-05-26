export const AUTH_ROLES = Object.freeze({
  ADMIN: 'admin',
  INFLUENCER: 'influencer',
});

export function normalizeRole(role) {
  return String(role || '').trim().toLowerCase();
}

export function isAdminRole(role) {
  return normalizeRole(role) === AUTH_ROLES.ADMIN;
}

export function isInfluencerRole(role) {
  return normalizeRole(role) === AUTH_ROLES.INFLUENCER;
}

export function getProfileRole(profile) {
  return normalizeRole(profile?.role) || '';
}

export function getUserRole(session, profile) {
  const metadataRole = normalizeRole(session?.user?.user_metadata?.role || session?.user?.app_metadata?.role);
  return getProfileRole(profile) || metadataRole || '';
}

export function isActiveProfile(profile) {
  return profile?.is_active !== false;
}

export function canAccessAdmin(profile) {
  return isActiveProfile(profile) && isAdminRole(profile?.role);
}

export function canAccessInfluencerArea(profile) {
  return isActiveProfile(profile) && (isInfluencerRole(profile?.role) || isAdminRole(profile?.role));
}
