import React, { useState } from 'react';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { Lock, Eye, EyeOff, ShieldCheck, Check } from 'lucide-react';

interface ChangePasswordProps {
  userEmail: string;
  onSuccess?: () => void;
}

const NAVY = '#1b365d';

export function ChangePassword({ userEmail, onSuccess }: ChangePasswordProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!currentPassword || !newPassword || !confirmPassword) { setError('All fields are required'); return; }
    if (newPassword.length < 8) { setError('New password must be at least 8 characters long'); return; }
    if (newPassword !== confirmPassword) { setError('New passwords do not match'); return; }
    if (currentPassword === newPassword) { setError('New password must be different from current password'); return; }

    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-0abfa7cf/change-password`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${publicAnonKey}` },
          body: JSON.stringify({ email: userEmail, currentPassword, newPassword }),
        }
      );

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text);
        setError('Server error. Please ensure you have run the database migration (database-password-features.sql)');
        return;
      }

      const data = await response.json();
      if (data.success) {
        setSuccess('Password changed successfully!');
        setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
        if (onSuccess) onSuccess();
      } else {
        setError(data.error || 'Failed to change password');
      }
    } catch (err) {
      console.error('Change password error:', err);
      setError('Failed to change password. Please ensure you have run the database migration first.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-xl border border-[#E7EDF4] bg-white">
      <div className="flex items-center gap-2.5 border-b border-[#E7EDF4] px-5 py-4">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: 'rgba(27,54,93,0.08)', color: NAVY }}>
          <Lock size={16} />
        </span>
        <h2 className="text-sm font-semibold" style={{ color: NAVY }}>Change Password</h2>
      </div>

      <div className="p-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <PasswordField label="Current password" value={currentPassword} onChange={setCurrentPassword} placeholder="Enter current password" />
          <PasswordField label="New password" value={newPassword} onChange={setNewPassword} placeholder="Enter new password" />
          <PasswordField label="Confirm new password" value={confirmPassword} onChange={setConfirmPassword} placeholder="Re-enter new password" />

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3.5 py-2.5 text-sm text-destructive">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-destructive" />{error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 rounded-lg px-3.5 py-2.5 text-sm" style={{ backgroundColor: 'rgba(78,167,46,0.1)', color: '#3d8a22' }}>
              <Check size={16} /> {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-[#1b365d] px-4 py-2.5 text-sm font-medium text-white shadow-[0_8px_20px_-10px_rgba(27,54,93,0.6)] transition-all hover:bg-[#142a4a] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Changing password…' : 'Change Password'}
          </button>
        </form>

        <div className="mt-4 flex gap-2.5 rounded-lg border border-[#E7EDF4] bg-[#F9FAFB] p-3.5">
          <ShieldCheck size={16} className="mt-0.5 shrink-0 text-muted-foreground" />
          <div className="text-xs text-muted-foreground">
            <p className="mb-1 font-medium" style={{ color: NAVY }}>Password requirements</p>
            <ul className="list-inside list-disc space-y-0.5">
              <li>Minimum 8 characters</li>
              <li>Must be different from the current password</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function PasswordField({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium" style={{ color: NAVY }}>{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          required
          className="w-full rounded-lg border border-[#E7EDF4] bg-white px-3.5 py-2.5 pr-11 text-[0.92rem] text-foreground outline-none transition placeholder:text-muted-foreground/50 focus:border-[#1b365d] focus:ring-2 focus:ring-[#1b365d]/15"
        />
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          aria-label={show ? 'Hide password' : 'Show password'}
          className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-[#F4F6F9] hover:text-foreground"
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
}
