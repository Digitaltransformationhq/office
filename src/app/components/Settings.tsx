import React from 'react';
import { ChangePassword } from './ChangePassword';
import { LoginHistory } from './LoginHistory';

interface SettingsProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

const NAVY = '#1b365d';
const GREEN = '#4ea72e';

function initials(name?: string) {
  if (!name) return '—';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '—';
}

export function Settings({ user }: SettingsProps) {
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-[1.6rem] font-semibold tracking-tight" style={{ color: NAVY }}>Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your account and security</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Account information */}
        <section className="overflow-hidden rounded-xl border border-[#E7EDF4] bg-white">
          <div className="border-b border-[#E7EDF4] px-5 py-4">
            <h2 className="text-sm font-semibold" style={{ color: NAVY }}>Account Information</h2>
          </div>
          <div className="p-5">
            <div className="flex items-center gap-3.5 border-b border-[#F1F4F8] pb-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-semibold text-white" style={{ backgroundColor: GREEN }}>
                {initials(user.name)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold" style={{ color: NAVY }}>{user.name}</p>
                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
              </div>
            </div>
            <dl className="divide-y divide-[#F1F4F8]">
              <Row label="Name" value={user.name} />
              <Row label="Email" value={user.email} />
              <Row label="Role">
                <span className="inline-block rounded-md px-2 py-0.5 text-[0.72rem] font-medium capitalize" style={{ backgroundColor: 'rgba(27,54,93,0.06)', color: NAVY, border: '1px solid rgba(27,54,93,0.18)' }}>
                  {user.role.replace('-', ' ')}
                </span>
              </Row>
            </dl>
          </div>
        </section>

        {/* Change password */}
        <ChangePassword userEmail={user.email} />
      </div>

      {/* Login history */}
      <LoginHistory userId={user.id} />
    </div>
  );
}

function Row({ label, value, children }: { label: string; value?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 py-2.5">
      <dt className="w-24 shrink-0 text-[0.64rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{label}</dt>
      <dd className="flex-1 truncate text-sm font-medium" style={{ color: NAVY }}>{children ?? value}</dd>
    </div>
  );
}
