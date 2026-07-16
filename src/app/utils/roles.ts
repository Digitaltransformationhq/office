/**
 * Canonical role handling.
 *
 * The database has carried role values in two shapes: the original TitleCase
 * seeds from database-schema.sql ('Staff', 'Team Member', 'Partner', 'Admin')
 * and the kebab-case values that database-add-staff-FIXED.sql migrates them to.
 * The app compares kebab-case only, so any un-migrated row used to fall through
 * every role guard and land on the default branch.
 *
 * Every role value entering the app is normalized here so the rest of the code
 * can compare against Role without defensive multi-string checks.
 */

export type Role = 'admin' | 'partner' | 'team-leader' | 'team-member' | 'client';

export const ROLES: Role[] = ['admin', 'partner', 'team-leader', 'team-member', 'client'];

/** Legacy/display spellings → canonical. Keys are compared lowercased. */
const ALIASES: Record<string, Role> = {
  'admin': 'admin',
  'partner': 'partner',
  'team-leader': 'team-leader',
  'team leader': 'team-leader',
  'accounts': 'team-leader',
  'team-member': 'team-member',
  'team member': 'team-member',
  'staff': 'team-member',
  'client': 'client',
};

/**
 * Map any stored/legacy role spelling to its canonical form.
 * Returns null for unrecognized input — callers must fail closed rather than
 * assume a privilege level.
 */
export function normalizeRole(role: string | null | undefined): Role | null {
  if (!role) return null;
  return ALIASES[role.trim().toLowerCase()] ?? null;
}

/** Human-readable label for a canonical role, as used throughout the UI. */
const LABELS: Record<Role, string> = {
  'admin': 'Admin',
  'partner': 'Partner',
  'team-leader': 'Accounts',
  'team-member': 'Staff',
  'client': 'Client',
};

export function roleLabel(role: string | null | undefined): string {
  const r = normalizeRole(role);
  return r ? LABELS[r] : 'Unknown';
}
