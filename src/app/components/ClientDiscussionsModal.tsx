import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, MessageSquareText, Plus, Trash2, Copy, Check, CalendarDays } from 'lucide-react';
import { Button } from './Button';
import { ConfirmDialog } from './ConfirmDialog';
import { useToast } from './Toast';
import { NAVY, inputCls, overlayCls, panelCls } from './clientModalUI';
import { discussionsAPI, type ClientDiscussion } from '../services/api';
import { today } from '../utils/gst';

const MODES = ['In person', 'Phone', 'WhatsApp', 'Email', 'Video call', 'Other'] as const;

/** Muted chips rather than colour-coded ones: how a conversation happened is
 *  context, not status, and should not compete with the note itself. */
const MODE_CLS: Record<string, string> = {
  'In person': 'border-[#C7D7EC] bg-[#EEF4FC] text-[#1b365d]',
  Phone: 'border-[#E7EDF4] bg-[#F4F6F9] text-muted-foreground',
  WhatsApp: 'border-[#BBF7D0] bg-[#F0FDF4] text-[#166534]',
  Email: 'border-[#E7EDF4] bg-[#F4F6F9] text-muted-foreground',
  'Video call': 'border-[#E7EDF4] bg-[#F4F6F9] text-muted-foreground',
  Other: 'border-[#E7EDF4] bg-[#F4F6F9] text-muted-foreground',
};

const longDate = (d: string) =>
  new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

const daysBetween = (from: string, to: string) =>
  Math.round((new Date(`${to}T00:00:00`).getTime() - new Date(`${from}T00:00:00`).getTime()) / 86400000);

interface ClientDiscussionsModalProps {
  client: { id: string; name: string; pan?: string | null; fileNumber?: string | null };
  currentUser: { id: string; name: string; role?: string } | null;
  onClose: () => void;
  /** So a register showing "last discussed" can move without a full refetch. */
  onRecorded?: (clientId: string, discussedOn: string) => void;
}

/**
 * The discussion log for one client.
 *
 * The firm's reason for wanting this is specific: a client says "I never told
 * you that", or "you never told me that", and the office needs to be able to
 * answer with a date. Everything here follows from that.
 *
 * Entries cannot be edited — only added, and only deleted by an admin. That is
 * not an oversight to be fixed later. A note anyone can rewrite after an
 * argument starts proves nothing about what was said before it; the log is worth
 * something precisely because the office cannot tidy it up afterwards. A
 * correction is a new entry saying what was got wrong.
 *
 * Each entry carries two dates and shows both. When the discussion happened is
 * what the client is disputing. When it was written down is what makes the
 * answer credible: a note made the same afternoon is a contemporaneous record,
 * the same note typed up three weeks later, once the disagreement was already
 * running, is a much weaker thing. Collapsing them into one date would quietly
 * make the second look like the first.
 */
export function ClientDiscussionsModal({ client, currentUser, onClose, onRecorded }: ClientDiscussionsModalProps) {
  const { showSuccess, showError } = useToast();

  const [entries, setEntries] = useState<ClientDiscussion[]>([]);
  const [loading, setLoading] = useState(true);
  const [composing, setComposing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<ClientDiscussion | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const [discussedOn, setDiscussedOn] = useState(today());
  const [mode, setMode] = useState<string>('In person');
  const [note, setNote] = useState('');
  const [participants, setParticipants] = useState('');
  const [followUp, setFollowUp] = useState('');

  const noteRef = useRef<HTMLTextAreaElement>(null);

  const canDelete = currentUser?.role === 'admin';

  useEffect(() => { load(); }, [client.id]);

  // Escape closes, unless a confirmation is already on top of this.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !deleting) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, deleting]);

  useEffect(() => { if (composing) noteRef.current?.focus(); }, [composing]);

  const load = async () => {
    try {
      setLoading(true);
      const r = await discussionsAPI.getForClient(client.id);
      if (r.success) setEntries(r.data);
      else showError(r.error || 'Failed to load the discussion history');
    } catch {
      showError('Failed to load the discussion history');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setDiscussedOn(today());
    setMode('In person');
    setNote('');
    setParticipants('');
    setFollowUp('');
  };

  const save = async () => {
    if (!note.trim()) {
      showError('Write down what was discussed');
      return;
    }
    if (!currentUser) {
      showError('Sign in again before recording a discussion');
      return;
    }
    setSaving(true);
    try {
      const r = await discussionsAPI.record(client.id, {
        discussedOn,
        mode,
        note: note.trim(),
        participants: participants.trim() || undefined,
        followUp: followUp.trim() || undefined,
        recordedById: currentUser.id,
        recordedByName: currentUser.name,
      });
      if (r.success && r.data) {
        setEntries(prev => [r.data as ClientDiscussion, ...prev]);
        onRecorded?.(client.id, r.data.discussedOn);
        showSuccess('Discussion recorded');
        reset();
        setComposing(false);
      } else {
        showError(r.error || 'Failed to record the discussion');
      }
    } catch {
      showError('Failed to record the discussion. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!deleting) return;
    try {
      const r = await discussionsAPI.delete(deleting.id);
      if (r.success) {
        setEntries(prev => prev.filter(e => e.id !== deleting.id));
        showSuccess('Entry removed');
        setDeleting(null);
      } else {
        showError(r.error || 'Failed to remove the entry');
      }
    } catch {
      showError('Failed to remove the entry. Please try again.');
    }
  };

  /*
   * The entry as a line of prose, for pasting into a reply to the client.
   *
   * This is the log actually being used for what it is for — "our record shows
   * that on 12 August, in person, we discussed…" — so it copies out in the form
   * it would be quoted in rather than as a dump of fields.
   */
  const copyEntry = async (e: ClientDiscussion) => {
    const parts = [
      `${longDate(e.discussedOn)} — ${e.mode.toLowerCase()} — recorded by ${e.recordedByName}`,
      e.participants ? `Present: ${e.participants}` : '',
      '',
      e.note,
      e.followUp ? `\nAgreed follow-up: ${e.followUp}` : '',
    ].filter(Boolean).join('\n');
    try {
      await navigator.clipboard.writeText(`${client.name}\n${parts}`);
      setCopied(e.id);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      showError('Could not copy to the clipboard');
    }
  };

  const lastDiscussed = entries[0]?.discussedOn;
  const sinceLast = lastDiscussed ? daysBetween(lastDiscussed, today()) : null;

  /** Newest first, split by year once the log runs past one. */
  const grouped = useMemo(() => {
    const out: { year: string; items: ClientDiscussion[] }[] = [];
    for (const e of entries) {
      const year = e.discussedOn.slice(0, 4);
      const last = out[out.length - 1];
      if (last && last.year === year) last.items.push(e);
      else out.push({ year, items: [e] });
    }
    return out;
  }, [entries]);

  return (
    <div
      className={overlayCls}
      onMouseDown={e => { if (e.target === e.currentTarget && !deleting) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label={`Discussion history for ${client.name}`}
    >
      <div className={`${panelCls} max-w-2xl`}>
        <div className="flex items-start justify-between gap-4 border-b border-[#E7EDF4] px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-start gap-3">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              style={{ backgroundColor: 'rgba(27,54,93,0.08)', color: NAVY }}
            >
              <MessageSquareText size={19} />
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-[1.05rem] font-semibold" style={{ color: NAVY }}>{client.name}</h2>
              <p className="identifier truncate text-[0.72rem] text-muted-foreground">
                {client.pan || 'No PAN'}
                {client.fileNumber && ` · ${client.fileNumber}`}
                {entries.length > 0 && ` · ${entries.length} discussion${entries.length === 1 ? '' : 's'} on record`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-[#F4F6F9] hover:text-foreground"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* What the desk wants at a glance before picking up the phone. */}
        {!loading && lastDiscussed && (
          <div className="flex items-center gap-2 border-b border-[#E7EDF4] bg-[#FAFBFD] px-5 py-2.5 sm:px-6">
            <CalendarDays size={13} className="shrink-0 text-muted-foreground" />
            <p className="text-[0.74rem] text-muted-foreground">
              Last spoken to on <span className="font-medium" style={{ color: NAVY }}>{longDate(lastDiscussed)}</span>
              {sinceLast !== null && sinceLast > 0 && ` · ${sinceLast} day${sinceLast === 1 ? '' : 's'} ago`}
              {sinceLast === 0 && ' · today'}
            </p>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {composing ? (
            <div className="rounded-xl border border-[#C7D7EC] bg-[#F8FBFF] p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium" style={{ color: NAVY }}>
                    Date of discussion <span className="text-[#c0392b]">*</span>
                  </label>
                  <input
                    type="date"
                    value={discussedOn}
                    max={today()}
                    onChange={e => setDiscussedOn(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium" style={{ color: NAVY }}>How</label>
                  <div className="relative">
                    <select
                      value={mode}
                      onChange={e => setMode(e.target.value)}
                      className={`${inputCls} appearance-none pr-9`}
                    >
                      {MODES.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <svg className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="mt-3">
                <label className="mb-1.5 block text-sm font-medium" style={{ color: NAVY }}>
                  What was discussed <span className="text-[#c0392b]">*</span>
                </label>
                <textarea
                  ref={noteRef}
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  rows={5}
                  placeholder="Write it as it was said — what the client asked, what they were told, what they said they would send. Specific beats short."
                  className={`${inputCls} resize-y leading-relaxed`}
                />
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium" style={{ color: NAVY }}>Who was there</label>
                  <input
                    value={participants}
                    onChange={e => setParticipants(e.target.value)}
                    placeholder="If someone came in their place"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium" style={{ color: NAVY }}>Agreed follow-up</label>
                  <input
                    value={followUp}
                    onChange={e => setFollowUp(e.target.value)}
                    placeholder="What either side is to do next"
                    className={inputCls}
                  />
                </div>
              </div>

              <p className="mt-3 text-[0.72rem] leading-relaxed text-muted-foreground">
                Once saved this cannot be edited — that is what makes it worth
                quoting back. It will be stamped with today's date as the day it
                was written, alongside the date of the discussion above.
              </p>

              <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button variant="secondary" onClick={() => { setComposing(false); reset(); }} disabled={saving}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={save} disabled={saving || !note.trim()}>
                  {saving ? 'Recording…' : 'Record discussion'}
                </Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setComposing(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#C7D7EC] bg-[#F8FBFF] px-4 py-3 text-sm font-medium transition-colors hover:border-[#1b365d] hover:bg-[#EEF4FC]"
              style={{ color: NAVY }}
            >
              <Plus size={16} /> Record a discussion
            </button>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#1b365d] border-t-transparent" />
            </div>
          ) : entries.length === 0 ? (
            <div className="py-14 text-center">
              <p className="text-sm text-muted-foreground">Nothing recorded for this client yet.</p>
              <p className="mx-auto mt-1.5 max-w-sm text-[0.76rem] leading-relaxed text-muted-foreground/80">
                Note discussions as they happen. The record is only worth
                something if it was written before there was a disagreement about
                it.
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-5">
              {grouped.map(group => (
                <div key={group.year}>
                  {grouped.length > 1 && (
                    <p className="mb-2.5 text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      {group.year}
                    </p>
                  )}
                  <div className="space-y-2.5">
                    {group.items.map(e => (
                      <Entry
                        key={e.id}
                        entry={e}
                        copied={copied === e.id}
                        onCopy={() => copyEntry(e)}
                        onDelete={canDelete ? () => setDeleting(e) : undefined}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-[#E7EDF4] px-5 py-3.5 sm:px-6">
          <p className="text-[0.7rem] text-muted-foreground">Entries cannot be edited once saved</p>
          <Button variant="secondary" onClick={onClose}>Close</Button>
        </div>
      </div>

      {deleting && (
        <ConfirmDialog
          title="Remove this entry?"
          message={
            `${longDate(deleting.discussedOn)} — recorded by ${deleting.recordedByName}.\n\n` +
            'This deletes the record of that discussion permanently. If the entry is wrong, ' +
            'consider adding a new one that corrects it instead — a log with a correction in it ' +
            'is stronger evidence than one with a gap.\n\n' +
            'This cannot be undone.'
          }
          confirmLabel="Remove entry"
          variant="danger"
          onConfirm={remove}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}

function Entry({ entry, copied, onCopy, onDelete }: {
  entry: ClientDiscussion; copied: boolean; onCopy: () => void; onDelete?: () => void;
}) {
  const recordedOn = entry.createdAt?.slice(0, 10) || entry.discussedOn;
  const lag = daysBetween(entry.discussedOn, recordedOn);

  /*
   * How contemporaneous the note is, said plainly.
   *
   * Same day is the strong case and is worth stating rather than leaving to be
   * inferred from two matching dates. A long lag is not hidden either: better
   * the office knows a note is weak before it quotes it at somebody.
   */
  const lagNote =
    lag <= 0 ? 'written up the same day'
      : lag === 1 ? 'written up the next day'
        : `written up ${lag} days later`;

  return (
    <article className="rounded-xl border border-[#E7EDF4] bg-white px-4 py-3.5 transition-colors hover:border-[#C7D7EC]">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[0.82rem] font-semibold" style={{ color: NAVY }}>
          {longDate(entry.discussedOn)}
        </span>
        <span className={`rounded-md border px-1.5 py-0.5 text-[0.62rem] font-medium ${MODE_CLS[entry.mode] || MODE_CLS.Other}`}>
          {entry.mode}
        </span>

        <div className="ml-auto flex shrink-0 items-center gap-1">
          <button
            onClick={onCopy}
            title="Copy this entry as text"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-[#F4F6F9] hover:text-foreground"
          >
            {copied ? <Check size={13} className="text-[#166534]" /> : <Copy size={13} />}
          </button>
          {onDelete && (
            <button
              onClick={onDelete}
              title="Remove this entry"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-[#FEF2F2] hover:text-[#991B1B]"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      <p className="mt-2 whitespace-pre-line text-[0.84rem] leading-relaxed text-foreground">{entry.note}</p>

      {entry.followUp && (
        <p className="mt-2.5 rounded-lg border border-[#FDE68A] bg-[#FFFBEB] px-3 py-2 text-[0.78rem] leading-relaxed text-[#92400E]">
          <span className="font-medium">Follow-up:</span> {entry.followUp}
        </p>
      )}

      <p className="mt-2.5 text-[0.68rem] text-muted-foreground/80">
        {entry.recordedByName}
        {entry.participants && ` · with ${entry.participants}`}
        {' · '}
        <span className={lag > 7 ? 'text-[#92400E]' : undefined}>{lagNote}</span>
      </p>
    </article>
  );
}
