import React, { useState } from 'react';
import { Button } from './Button';
import { usersAPI } from '../services/api';
import { useToast } from './Toast';
import { X, UserPlus, ChevronDown, Copy, Check, KeyRound } from 'lucide-react';

interface AddUserModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const NAVY = '#1b365d';
const inputCls =
  'w-full rounded-lg border border-[#E7EDF4] bg-white px-3.5 py-2.5 text-[0.92rem] text-foreground outline-none transition placeholder:text-muted-foreground/50 focus:border-[#1b365d] focus:ring-2 focus:ring-[#1b365d]/15';

export function AddUserModal({ onClose, onSuccess }: AddUserModalProps) {
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const { showSuccess, showError } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'team-member',
    password: 'Pass@2026',
  });

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.email) {
      showError('Please fill in all required fields');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      showError('Please enter a valid email address');
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
        showSuccess(`User created. Password: ${formData.password} — share it securely.`);
        onSuccess();
        onClose();
      } else {
        showError(response.error || 'Failed to create user');
      }
    } catch (error) {
      console.error('Error creating user:', error);
      showError('Failed to create user. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyPassword = () => {
    navigator.clipboard.writeText(formData.password);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a1728]/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-[0_40px_120px_-30px_rgba(10,23,40,0.8)]">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-[#E7EDF4] px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: 'rgba(27,54,93,0.08)', color: NAVY }}>
              <UserPlus size={20} />
            </span>
            <div>
              <h2 className="text-[1.05rem] font-semibold" style={{ color: NAVY }}>Add User</h2>
              <p className="text-xs text-muted-foreground">Create a new account with default credentials</p>
            </div>
          </div>
          <button onClick={onClose} disabled={loading} className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-[#F4F6F9] hover:text-foreground" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
            <Field label="Full name" required>
              <input className={inputCls} value={formData.name} onChange={e => handleChange('name', e.target.value)} placeholder="e.g., Rajesh Kumar" required />
            </Field>

            <Field label="Email" required>
              <input className={inputCls} type="email" value={formData.email} onChange={e => handleChange('email', e.target.value)} placeholder="e.g., rajesh@kapsca.in" required />
            </Field>

            <Field label="Role" required>
              <SelectField value={formData.role} onChange={e => handleChange('role', e.target.value)}>
                <option value="team-member">Staff</option>
                <option value="team-leader">Accounts</option>
                <option value="admin">Admin</option>
                <option value="partner">Partner</option>
              </SelectField>
            </Field>

            {/* Auto-generated password */}
            <div className="rounded-xl border border-[#E7EDF4] bg-[#F9FAFB] p-4">
              <div className="flex items-center gap-2">
                <KeyRound size={15} className="text-muted-foreground" />
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Default password</p>
              </div>
              <div className="mt-2.5 flex items-center gap-2">
                <code className="flex-1 rounded-lg border border-[#E7EDF4] bg-white px-3 py-2 font-mono text-sm" style={{ color: NAVY }}>
                  {formData.password}
                </code>
                <button
                  type="button"
                  onClick={copyPassword}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#E7EDF4] bg-white px-3 py-2 text-xs font-medium transition-colors hover:bg-[#F4F6F9]"
                  style={{ color: NAVY }}
                >
                  {copied ? <><Check size={14} style={{ color: '#4ea72e' }} /> Copied</> : <><Copy size={14} /> Copy</>}
                </button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Save this password and share it with the user securely.</p>
            </div>
          </div>

          <div className="flex gap-3 border-t border-[#E7EDF4] px-6 py-4">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1" disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? 'Creating…' : 'Create User'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium" style={{ color: NAVY }}>
        {label} {required && <span className="text-[#c0392b]">*</span>}
      </label>
      {children}
    </div>
  );
}

function SelectField({ value, onChange, children }: {
  value: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <select value={value} onChange={onChange} className={`${inputCls} appearance-none pr-9`}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}
