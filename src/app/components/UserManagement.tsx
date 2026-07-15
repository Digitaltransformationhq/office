import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './Table';
import { Badge } from './Badge';
import { Button } from './Button';
import { usersAPI } from '../services/api';
import { AddUserModal } from './AddUserModal';
import { EditUserModal } from './EditUserModal';
import { ConfirmDialog } from './ConfirmDialog';
import { useToast } from './Toast';
import { UserPlus, Search, RotateCw, ChevronDown } from 'lucide-react';

const NAVY = '#1b365d';

export function UserManagement({ embedded = false }: { embedded?: boolean }) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [openCards, setOpenCards] = useState<Set<string>>(new Set());
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [showDelete, setShowDelete] = useState(false);
  const [toDelete, setToDelete] = useState<any>(null);
  const { showSuccess, showError } = useToast();

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      setLoading(true);
      const r = await usersAPI.getAll();
      setUsers(r.data || []);
    } catch {
      showError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const toggleCard = (id: string) => setOpenCards(prev => {
    const n = new Set(prev);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  const handleDelete = async () => {
    if (!toDelete) return;
    try {
      const r = await usersAPI.update(toDelete.id, { status: 'Inactive' });
      if (r.success) { showSuccess(`${toDelete.name} marked as inactive`); load(); }
      else showError(r.error || 'Failed to deactivate user');
    } catch {
      showError('Failed to deactivate user');
    } finally {
      setShowDelete(false);
      setToDelete(null);
    }
  };

  const q = search.trim().toLowerCase();
  const filtered = users.filter(u => !q ||
    (u.name || '').toLowerCase().includes(q) ||
    (u.email || '').toLowerCase().includes(q) ||
    (u.role || '').toLowerCase().includes(q));

  return (
    <div className="flex flex-col gap-6">
      {!embedded && (
        <div>
          <h1 className="text-[1.5rem] font-semibold tracking-tight" style={{ color: NAVY }}>Users</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Manage staff accounts and access</p>
        </div>
      )}

      {/* Section */}
      <section className="overflow-hidden rounded-xl border border-[#E7EDF4] bg-white">
        <div className="flex flex-col gap-3 border-b border-[#E7EDF4] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <h2 className="text-sm font-semibold" style={{ color: NAVY }}>All Users</h2>
            <span className="rounded-full bg-[#F4F6F9] px-2 py-0.5 text-xs font-medium text-muted-foreground">{filtered.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-[220px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, email, role…" className="w-full rounded-lg border border-[#E7EDF4] bg-white py-2 pl-9 pr-3 text-sm outline-none transition placeholder:text-muted-foreground/60 focus:border-[#1b365d] focus:ring-2 focus:ring-[#1b365d]/15" />
            </div>
            <button onClick={load} title="Refresh" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#E7EDF4] text-muted-foreground transition-colors hover:bg-[#F4F6F9]">
              <RotateCw size={15} />
            </button>
            <button onClick={() => setShowAdd(true)} className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-[#1b365d] px-3.5 py-2 text-sm font-medium text-white shadow-[0_8px_20px_-10px_rgba(27,54,93,0.6)] transition-all hover:bg-[#142a4a]">
              <UserPlus size={15} /> Add
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#1b365d] border-t-transparent" />
          </div>
        ) : (
          <>
            {/* Mobile: openable cards */}
            <div className="space-y-2.5 p-4 md:hidden">
              {filtered.map((user) => {
                const open = openCards.has(user.id);
                return (
                  <div key={user.id} className="overflow-hidden rounded-xl border border-[#E7EDF4]">
                    <button onClick={() => toggleCard(user.id)} className="flex w-full items-start gap-2.5 px-3.5 py-3 text-left">
                      <div className="min-w-0 flex-1">
                        <p className="text-[0.85rem] font-medium" style={{ color: NAVY }}>{user.name}</p>
                        <span className="mt-1.5 inline-block"><Badge variant="primary">{user.role}</Badge></span>
                      </div>
                      <ChevronDown size={16} className={`mt-0.5 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
                    </button>
                    {open && (
                      <dl className="divide-y divide-[#F1F4F8] border-t border-[#F1F4F8] px-3.5">
                        <CardRow label="Email"><span className="break-all">{user.email}</span></CardRow>
                        <CardRow label="Status"><Badge variant={user.status === 'Active' ? 'success' : 'default'}>{user.status}</Badge></CardRow>
                        <CardRow label="Last Login">{user.lastLogin ? new Date(user.lastLogin).toLocaleDateString('en-IN') : 'Never'}</CardRow>
                        <div className="flex items-center justify-end gap-2 py-2.5">
                          <Button size="sm" variant="secondary" onClick={() => { setSelected(user); setShowEdit(true); }}>Edit</Button>
                          <Button size="sm" variant="danger" onClick={() => { setToDelete(user); setShowDelete(true); }} disabled={user.status === 'Inactive'}>
                            {user.status === 'Inactive' ? 'Inactive' : 'Deactivate'}
                          </Button>
                        </div>
                      </dl>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.name}</TableCell>
                      <TableCell><Badge variant="primary">{user.role}</Badge></TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell><Badge variant={user.status === 'Active' ? 'success' : 'default'}>{user.status}</Badge></TableCell>
                      <TableCell>{user.lastLogin ? new Date(user.lastLogin).toLocaleDateString('en-IN') : 'Never'}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="secondary" onClick={() => { setSelected(user); setShowEdit(true); }}>Edit</Button>
                          <Button size="sm" variant="danger" onClick={() => { setToDelete(user); setShowDelete(true); }} disabled={user.status === 'Inactive'}>
                            {user.status === 'Inactive' ? 'Inactive' : 'Deactivate'}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </section>

      {showAdd && <AddUserModal onClose={() => setShowAdd(false)} onSuccess={() => { load(); setShowAdd(false); }} />}
      {showEdit && selected && (
        <EditUserModal user={selected} onClose={() => { setShowEdit(false); setSelected(null); }} onSuccess={() => { load(); setShowEdit(false); setSelected(null); }} />
      )}
      {showDelete && toDelete && (
        <ConfirmDialog
          title="Deactivate User"
          message={`Are you sure you want to deactivate ${toDelete.name}?\n\nThey will not be able to login, but their data will remain in the system.`}
          confirmLabel="Deactivate"
          variant="danger"
          onConfirm={handleDelete}
          onCancel={() => { setShowDelete(false); setToDelete(null); }}
        />
      )}
    </div>
  );
}

function CardRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <dt className="shrink-0 text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-right text-[0.8rem] font-medium text-foreground/80">{children}</dd>
    </div>
  );
}
