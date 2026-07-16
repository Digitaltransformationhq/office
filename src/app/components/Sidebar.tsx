import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, ClipboardList, Users, Inbox, Wallet, FileSpreadsheet,
  BarChart3, Settings as SettingsIcon, Building2, Calendar, Megaphone,
  FolderOpen, ClipboardCheck, CalendarDays, FileText, CalendarClock,
  MessageCircle, HelpCircle, Database, Menu,
  X, type LucideIcon,
} from 'lucide-react';
import { normalizeRole, roleLabel } from '../utils/roles';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface SidebarProps {
  activeRole: string;
  onRoleChange: (role: string) => void;
  user: User;
  onLogout: () => void;
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

const ACCENT = '#4f7cc4';

/** One line icon per menu id — a single, consistent stroke family (no emoji). */
const ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  tasks: ClipboardList,
  team: Users,
  users: Users,
  clients: Building2,
  inquiries: Inbox,
  billing: Wallet,
  'billing-reports': FileSpreadsheet,
  reports: BarChart3,
  settings: SettingsIcon,
  calendar: Calendar,
  announcements: Megaphone,
  categories: FolderOpen,
  approvals: ClipboardCheck,
  leave: CalendarDays,
  documents: FileText,
  'due-dates': CalendarClock,
  chat: MessageCircle,
  queries: HelpCircle,
  init: Database,
};

type MenuItem = { label: string; id: string };

export function Sidebar({ activeRole, onRoleChange, user, onLogout, isMobileOpen, onMobileClose }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const hasBillingAccess = user.role === 'admin' || user.email === 'audit1@kapsca.in';

  const menuItems: Record<string, MenuItem[]> = {
    initialize: [{ label: 'Initialize Database', id: 'init' }],
    partner: [
      { label: 'Dashboard', id: 'dashboard' },
      { label: 'Tasks', id: 'tasks' },
      { label: 'Team', id: 'team' },
      { label: 'Inquiries', id: 'inquiries' },
      { label: 'Billing', id: 'billing' },
      { label: 'Announcements', id: 'announcements' },
      { label: 'Reports', id: 'reports' },
      { label: 'Settings', id: 'settings' },
    ],
    admin: [
      { label: 'Dashboard', id: 'dashboard' },
      { label: 'Tasks', id: 'tasks' },
      { label: 'Team', id: 'team' },
      { label: 'Clients', id: 'clients' },
      { label: 'Inquiries', id: 'inquiries' },
      { label: 'Billing', id: 'billing' },
      { label: 'Calendar', id: 'calendar' },
      { label: 'Announcements', id: 'announcements' },
      { label: 'Reports', id: 'reports' },
      { label: 'Settings', id: 'settings' },
    ],
    'team-leader': [
      { label: 'Dashboard', id: 'dashboard' },
      { label: 'Tasks', id: 'tasks' },
      { label: 'Team', id: 'team' },
      { label: 'Inquiries', id: 'inquiries' },
      { label: 'Announcements', id: 'announcements' },
      { label: 'Approvals', id: 'approvals' },
      { label: 'Leave', id: 'leave' },
    ],
    'team-member': [
      { label: 'Dashboard', id: 'dashboard' },
      { label: 'Tasks', id: 'tasks' },
      { label: 'Team', id: 'team' },
      { label: 'Inquiries', id: 'inquiries' },
      { label: 'Announcements', id: 'announcements' },
      ...(user.email === 'audit1@kapsca.in' ? [{ label: 'Billing', id: 'billing' }] : []),
    ],
    client: [
      { label: 'Documents', id: 'documents' },
      { label: 'Due Dates', id: 'due-dates' },
      { label: 'Chat', id: 'chat' },
      { label: 'Queries', id: 'queries' },
    ],
  };

  // Fail closed: an unrecognized role gets the least-privileged menu, never the
  // partner menu it used to fall back to.
  const currentMenu = menuItems[normalizeRole(user.role) ?? ''] || menuItems['team-member'];
  const filteredMenu = currentMenu.filter((item) => {
    if (item.id === 'billing' || item.id === 'billing-reports') return hasBillingAccess;
    return true;
  });

  /** Mirror the routing in handleMenuClick so the current view lights up. */
  const isActive = (id: string) => {
    if (id === 'dashboard') return activeRole === user.role || activeRole === 'dashboard';
    if (id === 'tasks') return activeRole === 'task-mis';
    if (id === 'team') return activeRole === 'team-tasks';
    if (id === 'settings') return activeRole === 'settings';
    return activeRole === id;
  };

  const handleMenuClick = (item: MenuItem) => {
    if (item.id === 'settings') onRoleChange('settings');
    else if (item.id === 'dashboard') onRoleChange(user.role);
    else if (item.id === 'tasks') onRoleChange('task-mis');
    else if (item.id === 'team') onRoleChange('team-tasks');
    else onRoleChange(item.id);
    if (isMobile) onMobileClose();
  };

  const compact = isCollapsed && !isMobile;
  const displayRole = roleLabel(user.role);

  return (
    <>
      {isMobile && isMobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40" onClick={onMobileClose} />
      )}

      <div
        className={`
          h-screen flex flex-col text-white transition-all duration-300
          ${isMobile ? 'fixed top-0 left-0 z-50 w-64' : compact ? 'w-[76px]' : 'w-64'}
          ${isMobile && !isMobileOpen ? '-translate-x-full' : 'translate-x-0'}
        `}
        style={{ background: 'linear-gradient(180deg, #16305a 0%, #0f2039 55%, #0a1728 100%)' }}
      >
        {/* Brand */}
        <div className={`flex items-center gap-2.5 px-4 h-[68px] shrink-0 border-b border-white/[0.07] ${compact ? 'justify-center' : ''}`}>
          {!compact && (
          <span className="flex items-center justify-center rounded-lg bg-white px-1.5 py-1 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.5)] ring-1 ring-black/5 shrink-0">
            <img src="/ca-india-logo.png" alt="KAPS & Co." className="h-7 w-auto object-contain" />
          </span>
          )}
          {!compact && (
            <div className="flex min-w-0 flex-col items-start leading-none">
              {/* Wordmark + green rule share a width fitted to the text, so the
                  line ends exactly under the "Co." full stop (as on the site). */}
              <span className="flex w-fit flex-col items-stretch">
                <span className="font-jetbrains -mr-[0.28em] text-[1.05rem] font-normal leading-none tracking-[0.06em] whitespace-nowrap">
                  KAPS&nbsp;&amp;&nbsp;Co.
                </span>
                <span
                  className="my-[3px] h-[2px] w-full rounded-full"
                  style={{ background: 'linear-gradient(to right, transparent 0%, transparent 30%, #4ea72e 76%, #6bc047 100%)' }}
                />
              </span>
              <span className="font-jetbrains text-[0.5rem] uppercase tracking-[0.2em] text-white/45">
                Office Management
              </span>
            </div>
          )}
          {/* Burger — toggles the collapsed rail (desktop), sits right of the logo */}
          {!isMobile && (
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-white/70 transition-colors hover:bg-white/10 hover:text-white ${compact ? '' : 'ml-auto'}`}
            >
              <Menu size={18} />
            </button>
          )}
          {isMobile && (
            <button
              onClick={onMobileClose}
              className="ml-auto flex h-8 w-8 items-center justify-center rounded-md text-white/70 hover:bg-white/10 hover:text-white"
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className={`flex-1 overflow-y-auto pt-3 pb-2 ${compact ? 'px-2' : 'px-3'}`}>
          {filteredMenu.map((item) => {
            const Icon = ICONS[item.id] ?? LayoutDashboard;
            const active = isActive(item.id);
            return (
              <button
                key={item.id}
                onClick={() => handleMenuClick(item)}
                title={compact ? item.label : undefined}
                className={`
                  group relative mb-0.5 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors
                  ${compact ? 'justify-center' : ''}
                  ${active ? 'text-white' : 'text-white/65 hover:bg-white/[0.06] hover:text-white'}
                `}
                style={active ? { backgroundColor: 'rgba(79,124,196,0.20)' } : undefined}
              >
                {active && (
                  <span
                    className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full"
                    style={{ backgroundColor: ACCENT }}
                  />
                )}
                <Icon
                  size={18}
                  strokeWidth={active ? 2.4 : 2}
                  className="shrink-0"
                  style={active ? { color: '#9cbce6' } : undefined}
                />
                {!compact && <span className="truncate text-[0.9rem]">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* User */}
        <div className="border-t border-white/[0.07] p-3">
          {!compact ? (
            <div className="flex items-center gap-3 px-1">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-medium text-white"
                style={{ backgroundColor: ACCENT }}
              >
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-white/95">{user.name}</p>
                <p className="truncate text-xs text-white/45">{displayRole}</p>
              </div>
            </div>
          ) : (
            <div
              className="mx-auto flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium text-white"
              style={{ backgroundColor: ACCENT }}
              title={user.name}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
