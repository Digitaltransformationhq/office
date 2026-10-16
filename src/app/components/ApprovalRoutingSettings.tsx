import React, { useEffect, useMemo, useState } from 'react';
import { clientApprovalsAPI, usersAPI } from '../services/api';
import { useToast } from './Toast';
import { ShieldCheck } from 'lucide-react';
import { isApproverRole } from '../utils/roles';

const NAVY = '#1b365d';

export function ApprovalRoutingSettings() {
  const [rules, setRules] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    Promise.all([clientApprovalsAPI.getSettings(), usersAPI.getAll()]).then(([r, u]) => {
      if (!r.success) throw new Error(r.error);
      setRules(r.data || []);
      setUsers(u.data || []);
    }).catch(e => showError(e?.message || 'Failed to load approval routing'))
      .finally(() => setLoading(false));
  }, []);

  const approvers = useMemo(() => users.filter(u => u.status === 'Active' && isApproverRole(u.role)), [users]);
  const patchRule = (actionKey: string, patch: any) =>
    setRules(rs => rs.map(r => r.action_key === actionKey ? { ...r, ...patch } : r));

  const save = async (rule: any) => {
    if (rule.enabled && !rule.approver_id) { showError('Choose an approver first'); return; }
    setSaving(rule.action_key);
    const r = await clientApprovalsAPI.updateSetting(rule.action_key, {
      enabled: !!rule.enabled, approverId: rule.approver_id || null,
    });
    setSaving(null);
    if (!r.success) { showError(r.error || 'Failed to save approval route'); return; }
    patchRule(rule.action_key, r.data);
    showSuccess(`${rule.label} approval route saved.`);
  };

  return (
    <section className="overflow-hidden rounded-xl border border-[#E7EDF4] bg-white lg:col-span-2">
      <div className="flex items-center gap-3 border-b border-[#E7EDF4] px-5 py-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#EEF4FF]" style={{ color: NAVY }}><ShieldCheck size={18} /></span>
        <div>
          <h2 className="text-sm font-semibold" style={{ color: NAVY }}>Approval Routing</h2>
          <p className="text-xs text-muted-foreground">Choose who approves each controlled action. Changes apply without a code deployment.</p>
        </div>
      </div>
      <div className="p-5">
        {loading ? <p className="text-sm text-muted-foreground">Loading approval routes…</p> : (
          <div className="space-y-3">
            {rules.map(rule => (
              <div key={rule.action_key} className="grid gap-3 rounded-xl border border-[#E7EDF4] p-4 md:grid-cols-[1fr_auto_minmax(220px,0.8fr)_auto] md:items-center">
                <div>
                  <p className="text-sm font-semibold" style={{ color: NAVY }}>{rule.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{rule.action_key}</p>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={!!rule.enabled} onChange={e => patchRule(rule.action_key, { enabled: e.target.checked })} />
                  Require approval
                </label>
                <select value={rule.approver_id || ''} disabled={!rule.enabled}
                  onChange={e => patchRule(rule.action_key, { approver_id: e.target.value })}
                  className="w-full rounded-lg border border-[#D9E2EC] bg-white px-3 py-2 text-sm disabled:bg-slate-50 disabled:text-slate-400">
                  <option value="">Select approver</option>
                  {approvers.map(a => <option key={a.id} value={a.id}>{a.name} — {a.role.replace('-', ' ')}</option>)}
                </select>
                <button onClick={() => save(rule)} disabled={saving === rule.action_key}
                  className="rounded-lg bg-[#1b365d] px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                  {saving === rule.action_key ? 'Saving…' : 'Save'}
                </button>
              </div>
            ))}
            {!rules.length && <p className="text-sm text-muted-foreground">No routes found. Run the configurable client approvals SQL migration first.</p>}
          </div>
        )}
      </div>
    </section>
  );
}

