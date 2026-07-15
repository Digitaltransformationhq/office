import React, { useState } from 'react';
import { Button } from './Button';
import { usersAPI } from '../services/api';
import { X, UserPlus, Copy, Check, ChevronDown, CheckCircle2, Info } from 'lucide-react';

interface AddStaffModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const NAVY = '#1b365d';
const GREEN = '#4ea72e';
const inputCls =
  'w-full rounded-lg border border-[#E7EDF4] bg-white px-3.5 py-2.5 text-[0.92rem] text-foreground outline-none transition placeholder:text-muted-foreground/50 focus:border-[#1b365d] focus:ring-2 focus:ring-[#1b365d]/15';

const ROLE_HELP: Record<string, string> = {
  'team-member': 'Regular staff member with limited access',
  'team-leader': 'Can manage team and approve tasks',
  'partner': 'Full access to partner features',
  'admin': 'Full system administration access',
};

export function AddStaffModal({ onClose, onSuccess }: AddStaffModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'team-member',
    password: 'Pass@2026',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<any>(null);
  const [copied, setCopied] = useState('');

  const copy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 1500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name || !formData.email) {
      setError('Name and Email are required');
      return;
    }
    if (!formData.email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      const response = await usersAPI.create({
        name: formData.name,
        email: formData.email,
        role: formData.role,
        password: formData.password,
        status: 'Active',
      });

      if (response.success) {
        setCreatedCredentials({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.role,
        });
        setSuccess(true);
        onSuccess();
      } else {
        const errorMsg = response.details
          ? `${response.error}: ${response.details}`
          : response.error || 'Failed to create staff member';
        setError(errorMsg);
      }
    } catch (err: any) {
      let errorMsg = 'Failed to create staff member.';
      if (err?.message && err.message !== 'Failed to create user') {
        errorMsg = err.message;
      } else {
        errorMsg = 'Database error. The password column may be missing. Check URGENT-FIX-ADD-STAFF.md';
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const overlay = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a1728]/60 backdrop-blur-sm';
  const panel = 'flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-[0_40px_120px_-30px_rgba(10,23,40,0.8)]';

  // ── Success view ──────────────────────────────────────────────
  if (success && createdCredentials) {
    const rows: [string, string, boolean][] = [
      ['Name', createdCredentials.name, false],
      ['Email (username)', createdCredentials.email, true],
      ['Password', createdCredentials.password, true],
      ['Role', createdCredentials.role.replace('-', ' '), false],
    ];
    const allText = `KAPS & Co. Login Credentials\n\nName: ${createdCredentials.name}\nEmail: ${createdCredentials.email}\nPassword: ${createdCredentials.password}\nRole: ${createdCredentials.role}\n\nPlease change your password after first login from Settings.`;

    return (
      <div className={overlay}>
        <div className={panel}>
          <div className="flex items-start justify-between gap-4 border-b border-[#E7EDF4] px-6 py-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: 'rgba(78,167,46,0.12)', color: GREEN }}>
                <CheckCircle2 size={20} />
              </span>
              <div>
                <h2 className="text-[1.05rem] font-semibold" style={{ color: NAVY }}>Staff member created</h2>
                <p className="text-xs text-muted-foreground">Share these credentials securely</p>
              </div>
            </div>
            <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-[#F4F6F9] hover:text-foreground" aria-label="Close">
              <X size={18} />
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
            <div className="overflow-hidden rounded-xl border border-[#E7EDF4]">
              {rows.map(([label, value, mono], i) => (
                <div key={label} className={`flex items-center justify-between gap-3 px-4 py-3 ${i > 0 ? 'border-t border-[#EFF3F8]' : ''}`}>
                  <div className="min-w-0">
                    <p className="text-[0.7rem] uppercase tracking-[0.1em] text-muted-foreground">{label}</p>
                    <p className={`truncate text-sm ${mono ? 'font-mono' : 'capitalize'} font-medium`} style={{ color: NAVY }}>{value}</p>
                  </div>
                  <button
                    onClick={() => copy(label, value)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-[#F4F6F9] hover:text-foreground"
                    title="Copy"
                  >
                    {copied === label ? <Check size={16} style={{ color: GREEN }} /> : <Copy size={16} />}
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2.5 rounded-xl border border-[#E7EDF4] bg-[#F9FAFB] p-4">
              <Info size={18} className="mt-0.5 shrink-0 text-muted-foreground" />
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                <li>Share these credentials with the staff member securely.</li>
                <li>Ask them to change the password after first login.</li>
                <li>Save these details before closing this window.</li>
              </ul>
            </div>
          </div>

          <div className="flex gap-3 border-t border-[#E7EDF4] px-6 py-4">
            <Button variant="secondary" onClick={() => copy('all', allText)} className="flex-1">
              {copied === 'all' ? <><Check size={16} /> Copied</> : <><Copy size={16} /> Copy all</>}
            </Button>
            <Button onClick={onClose} className="flex-1">Done</Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Form view ─────────────────────────────────────────────────
  return (
    <div className={overlay}>
      <div className={panel}>
        <div className="flex items-start justify-between gap-4 border-b border-[#E7EDF4] px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: 'rgba(27,54,93,0.08)', color: NAVY }}>
              <UserPlus size={20} />
            </span>
            <div>
              <h2 className="text-[1.05rem] font-semibold" style={{ color: NAVY }}>Add staff member</h2>
              <p className="text-xs text-muted-foreground">Create a new account for your team</p>
            </div>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-[#F4F6F9] hover:text-foreground" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
            <Field label="Full name" required>
              <input className={inputCls} value={formData.name} onChange={e => handleChange('name', e.target.value)} placeholder="Enter staff member's full name" required />
            </Field>

            <Field label="Email address" required>
              <input className={inputCls} type="email" value={formData.email} onChange={e => handleChange('email', e.target.value)} placeholder="staff@kapsca.in" required />
            </Field>

            <Field label="Role" required hint={ROLE_HELP[formData.role]}>
              <div className="relative">
                <select
                  value={formData.role}
                  onChange={e => handleChange('role', e.target.value)}
                  className={`${inputCls} appearance-none pr-9`}
                  required
                >
                  <option value="team-member">Team Member (Staff)</option>
                  <option value="team-leader">Accounts</option>
                  <option value="partner">Partner</option>
                  <option value="admin">Admin</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>
            </Field>

            <Field label="Initial password" required hint="Default: Pass@2026 — staff can change it after first login.">
              <div className="relative">
                <input className={`${inputCls} pr-11 font-mono`} type="text" value={formData.password} onChange={e => handleChange('password', e.target.value)} required />
                <button
                  type="button"
                  onClick={() => copy('pw', formData.password)}
                  className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-[#F4F6F9] hover:text-foreground"
                  title="Copy password"
                >
                  {copied === 'pw' ? <Check size={16} style={{ color: GREEN }} /> : <Copy size={16} />}
                </button>
              </div>
            </Field>

            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3.5 py-2.5 text-sm text-destructive">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-destructive" />
                {error}
              </div>
            )}
          </div>

          <div className="flex gap-3 border-t border-[#E7EDF4] px-6 py-4">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1" disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? 'Creating…' : 'Create staff member'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium" style={{ color: NAVY }}>
        {label} {required && <span className="text-[#c0392b]">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
