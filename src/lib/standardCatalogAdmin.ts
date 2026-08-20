export const DEFAULT_STANDARD_CATALOG_ADMIN_EMAIL = 'twxyforl@gmail.com';

export function catalogAdminEmails(fromEnv?: string) {
  const configured = (fromEnv ?? '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return configured.length > 0 ? configured : [DEFAULT_STANDARD_CATALOG_ADMIN_EMAIL];
}

export function canManageStandardCatalog(email?: string | null, fromEnv?: string) {
  return Boolean(email && catalogAdminEmails(fromEnv).includes(email.trim().toLowerCase()));
}
