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

export type Role = 'admin' | 'partner' | 'director' | 'team-leader' | 'team-member' | 'client';

export const ROLES: Role[] = ['admin', 'partner', 'director', 'team-leader', 'team-member', 'client'];

/** Legacy/display spellings → canonical. Keys are compared lowercased. */
const ALIASES: Record<string, Role> = {
  'admin': 'admin',
  'partner': 'partner',
  'director': 'director',
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
  'director': 'Director',
  'team-leader': 'Accounts',
  'team-member': 'Staff',
  'client': 'Client',
};

export function roleLabel(role: string | null | undefined): string {
  const r = normalizeRole(role);
  return r ? LABELS[r] : 'Unknown';
}

/**
 * Section access.
 *
 * Most sections are gated by role. These three are also gated by desk: the GST
 * register and the income-tax list are each run by one staff member, who needs
 * them without being made a partner. Same shape as the existing Billing rule,
 * which lets audit1@kapsca.in in.
 *
 * Defined here, not in Sidebar, because the menu and the route in App.tsx must
 * agree. Anywhere they differ produces either an item that is visible and then
 * refuses to open, or a section hidden from the menu but still reachable by a
 * typed view or a stale link.
 */
const GST_DESK = 'gst1@kapsca.in';
const ITR_DESK = 'caoffice@kapsca.in';

/** What every access check needs to know about the signed-in user. */
export interface AccessUser {
  role?: string | null;
  email?: string | null;
}

/** Stored addresses vary in case and carry stray whitespace; compare normalised. */
function emailOf(user: AccessUser | null | undefined): string {
  return (user?.email || '').trim().toLowerCase();
}

/**
 * The roles that run the firm: admin, partner, director.
 *
 * A director is a partner in everything this system decides — approvals,
 * access, what the sidebar offers. The role exists because the firm
 * distinguishes the two and because the billing is divided between them, not
 * because either can do something the other cannot.
 */
export const PARTNER_LEVEL: Role[] = ['admin', 'partner', 'director'];

/**
 * Can this person sign work off?
 *
 * Takes a raw role string and normalises it, so the six copies of
 * ['partner','admin','Partner','Admin'] scattered through the task screens have
 * one definition between them. Those copies were the reason adding a role meant
 * editing six files — and finding the sixth by accident.
 */
export function isApproverRole(role: string | null | undefined): boolean {
  const r = normalizeRole(role);
  return r !== null && PARTNER_LEVEL.includes(r);
}

function isPartnerOrAdmin(user: AccessUser | null | undefined): boolean {
  return isApproverRole(user?.role);
}

/** The client master. Both desks need it — each keeps its own list current. */
export function canAccessClients(user: AccessUser | null | undefined): boolean {
  if (!user) return false;
  return isPartnerOrAdmin(user) || emailOf(user) === GST_DESK || emailOf(user) === ITR_DESK;
}

export function canAccessGstCompliance(user: AccessUser | null | undefined): boolean {
  if (!user) return false;
  return isPartnerOrAdmin(user) || emailOf(user) === GST_DESK;
}

export function canAccessIncomeTax(user: AccessUser | null | undefined): boolean {
  if (!user) return false;
  return isPartnerOrAdmin(user) || emailOf(user) === ITR_DESK;
}
