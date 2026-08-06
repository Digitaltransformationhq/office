import React, { useEffect, useState } from 'react';
import { Button } from './Button';
import { useToast } from './Toast';
import { X, Check, AlertTriangle, CalendarCheck } from 'lucide-react';
import { itrAPI, ITR_FORMS, ITR_DATA_MEDIUMS, ITR_DATA_MEDIUM_HINTS,
  type ItrFiling, type ItrStatus, type ItrDataMedium } from '../services/api';
import { NAVY, SelectField, inputCls, overlayCls, panelCls } from './clientModalUI';
import { ITR_STATUS_META, ITR_STATUS_GROUPS, ITR_CHECKLIST, itrDueDate, itrIsOverdue } from '../utils/itr';
import { dueNote, formatDate, today } from '../utils/gst';

interface ITRFilingModalProps {
  filing: ItrFiling;
  currentUser: { id: string; name: string } | null;
  onClose: () => void;
  onSaved: (filing: ItrFiling) => void;
}

/**
 * One client's return for one year, opened for editing.
 *
 * Laid out like the GST cell editor, for the same reason: almost every visit is
 * to move a return one step along, so the status and the filing date are the
 * screen, and the paperwork checklist folds away until it is wanted.
 *
 * The one difference is the pair of notes at the bottom. The control list's DATA
 * and STATUS columns are free text that the import could only partly interpret,
 * so the original wording is shown rather than hidden — it is often the only
 * record of why a return is where it is.
 */
export function ITRFilingModal({ filing, currentUser, onClose, onSaved }: ITRFilingModalProps) {
  const { showSuccess, showError } = useToast();
  const [saving, setSaving] = useState(false);

  const [status, setStatus] = useState<ItrStatus>(filing.status);
  const [itrForm, setItrForm] = useState(filing.itrForm || '');
  const [filedOn, setFiledOn] = useState(filing.filedOn || '');
  const [dataMedium, setDataMedium] = useState<string>(filing.dataMedium || '');
  const [businessIncome, setBusinessIncome] = useState(filing.businessIncome);
  const [isAudit, setIsAudit] = useState(filing.isAudit);
  const [checks, setChecks] = useState({
    cpc: filing.cpc, itrV: filing.itrV, computation: filing.computation,
    financialStatement: filing.financialStatement, challan: filing.challan,
  });

  /*
   * What the paperwork section is for, and when it applies.
   *
   * None of it exists before the return is ready: there is no acknowledgement
   * until it is filed, and no documents to tick off until there is a filing to
   * collect them for. Showing empty boxes through the weeks of chasing a client
   * for data is asking a question that has no answer yet.
   *
   * The one exception is a return that already carries some of it — a bill
   * raised early, a remark left months ago. Hiding a filled field would lose
   * information rather than tidy the screen, so anything already recorded keeps
   * its section visible whatever the status says.
   */
  const hasChecklist = filing.cpc || filing.itrV || filing.computation
    || filing.financialStatement || filing.challan;

  /*
   * The form, the business-income question and the audit flag are decisions
   * taken when the return is being prepared to go in — not while the client is
   * still being chased for papers. They appear at Ready to File and stay.
   *
   * Nothing is lost by hiding them earlier: the due-date banner at the top
   * already names its own reason ("audit case", "business income"), so a return
   * whose deadline is 31 October still says why, even with the checkbox out of
   * sight.
   */
  const showFilingDetails = status === 'Ready to File' || status === 'Filed';

  // The documents are collected after the event, so they only make sense once
  // the return is actually filed.
  const showChecklist = status === 'Filed' || hasChecklist;

  /*
   * How the data arrived, asked at the moment it arrives.
   *
   * Shown from Data received onwards rather than at that status alone: a return
   * often goes straight on to In preparation in the same sitting, and a field
   * that vanishes the moment you move the status along can never be filled in
   * afterwards. It stays visible so it can still be answered late.
   *
   * Required only at Data received — the point at which someone is standing
   * there with the papers and knows. The 208 returns already past that stage
   * came in from the control list with no medium on record and nobody now knows
   * what it was; demanding one would only get a guess written down as fact.
   */
  const showDataMedium = status === 'Data Received' || status === 'In Preparation'
    || status === 'Ready to File' || status === 'Filed' || !!filing.dataMedium;
  const mediumRequired = status === 'Data Received';

  /*
   * Filed can only be reached through Ready to File.
   *
   * The form, the business-income answer and the audit flag are entered at Ready
   * to File, which means they are already filled in by the time the return is
   * marked filed — leaving only the documents to tick off. Allow the jump and
   * that whole step is skipped: the return goes to Accounts with no form
   * recorded and, because the deadline is derived from those same answers, quite
   * possibly the wrong due date behind it.
   *
   * A return that arrived already filed — 67 came in from the control list that
   * way — keeps Filed available, or it could never be edited without first being
   * un-filed.
   *
   * Read from filing.status, the SAVED value, not from the selection being made
   * now. Off the local state, picking Ready to file would light Filed up in the
   * same breath and both could be clicked before anything was written — which is
   * the skip this is here to prevent, just performed a little more slowly. The
   * step has to be committed before the next one opens.
   */
  const canFile = filing.status === 'Ready to File' || filing.status === 'Filed';


  const dueDate = itrDueDate(filing.financialYear, isAudit, businessIncome);
  const note = dueNote(dueDate);
  const done = !ITR_STATUS_META[status].open;
  const todayIso = today();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !saving) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, saving]);

  const handleStatus = (next: ItrStatus) => {
    setStatus(next);
    if (next === 'Filed' && !filedOn) setFiledOn(todayIso);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mediumRequired && !dataMedium) {
      showError('Say how the data was received');
      return;
    }
    setSaving(true);
    try {
      const response = await itrAPI.saveFiling({
        clientId: filing.clientId,
        financialYear: filing.financialYear,
        itrForm: itrForm || null,
        status,
        dataMedium: (dataMedium || null) as ItrDataMedium | null,
        // Unlike GST this may stay empty: the office has filed returns whose
        // date was never written down, and refusing to save one would mean
        // either losing the fact or inventing a date.
        filedOn: status === 'Filed' ? (filedOn || null) : null,
        isAudit,
        businessIncome,
        dueDate,
        ...checks,
        updatedById: currentUser?.id,
        updatedByName: currentUser?.name,
      });

      if (response.success && response.data) {
        showSuccess(`${filing.clientName} — ${ITR_STATUS_META[status].label.toLowerCase()}`);
        onSaved(response.data);
        onClose();
      } else {
        showError(response.error || 'Failed to save');
      }
    } catch (error) {
      console.error('Error saving ITR filing:', error);
      showError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={overlayCls} onMouseDown={e => { if (e.target === e.currentTarget && !saving) onClose(); }}>
      <div className={`${panelCls} max-w-lg`}>
        <div className="border-b border-[#E7EDF4] px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-[1.05rem] font-semibold" style={{ color: NAVY }}>
                  {filing.clientName}
                </h2>
                <span className="rounded-md bg-[#F4F6F9] px-2 py-0.5 text-[0.72rem] font-medium text-muted-foreground">
                  F.Y. {filing.financialYear}
                </span>
              </div>
              <p className="mt-1 truncate identifier text-[0.76rem] text-muted-foreground">
                {filing.pan || 'No PAN'}
                {filing.fileNumber && ` · file ${filing.fileNumber}`}
                {filing.responsiblePersonName && ` · ${filing.responsiblePersonName}`}
              </p>
            </div>
            <button onClick={onClose} disabled={saving} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-[#F4F6F9] hover:text-foreground" aria-label="Close">
              <X size={18} />
            </button>
          </div>

          {done && filing.filedOn ? (
            <Banner tone="good" icon={CalendarCheck}>Filed on {formatDate(filing.filedOn)}</Banner>
          ) : done ? (
            <Banner tone="good" icon={CalendarCheck}>Filed — no date on record</Banner>
          ) : note ? (
            <Banner tone={note.late ? 'bad' : note.soon ? 'warn' : 'plain'} icon={note.late ? AlertTriangle : undefined}>
              Due {formatDate(dueDate)} · <strong className="font-semibold">{note.text}</strong>
              {isAudit
                ? <span className="ml-1 opacity-70">(audit case)</span>
                : businessIncome ? <span className="ml-1 opacity-70">(business income)</span> : null}
            </Banner>
          ) : null}
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <div className="space-y-3.5">
              {ITR_STATUS_GROUPS.map(group => (
                <div key={group.label}>
                  <p className="mb-1.5 text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                    {group.label}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {group.statuses.map(s => {
                      const meta = ITR_STATUS_META[s];
                      const on = status === s;
                      const blocked = s === 'Filed' && !canFile;
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => handleStatus(s)}
                          disabled={blocked}
                          aria-pressed={on}
                          title={blocked ? 'Save this as Ready to file first' : undefined}
                          className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium transition-all sm:min-h-0 sm:py-1.5 ${
                            blocked ? 'cursor-not-allowed border-[#F1F4F8] bg-white text-slate-300'
                            : on ? `${meta.className} ring-2 ring-[#1b365d] ring-offset-1`
                                 : 'border-[#E7EDF4] bg-white text-foreground/70 hover:border-[#C7D3E2] hover:bg-[#F9FAFB]'
                          }`}
                        >
                          {on ? <Check size={13} strokeWidth={3} />
                              : <span className={`h-2 w-2 rounded-full ${blocked ? 'opacity-30' : ''}`} style={{ backgroundColor: meta.color }} />}
                          {meta.label}
                        </button>
                      );
                    })}
                    {/* Says why rather than leaving a dead button to be puzzled over. */}
                    {group.statuses.includes('Filed') && !canFile && (
                      <p className="mt-1 w-full text-[0.7rem] text-muted-foreground">
                        {status === 'Ready to File'
                          ? <><span className="font-medium">Save</span> this first — filing opens once Ready to
                             file is recorded, with the details below carried over.</>
                          : <>Set it to <span className="font-medium">Ready to file</span> and save — the form and
                             due-date details are entered there, and carry over to filing.</>}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/*
              How the papers came in.
              
              Given the same treatment as "Filed on" — a tinted panel in the
              status's own colour — while it is the question being asked, and
              dropped back to a plain field once the return has moved on and it
              is only being carried along.
            */}
            {showDataMedium && (
              mediumRequired ? (
                <div className="mt-5 rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] p-4">
                  <label className="mb-1.5 block text-sm font-medium text-[#1E40AF]">
                    How was the data received? <span className="text-[#c0392b]">*</span>
                  </label>
                  <MediumSelect value={dataMedium} onChange={setDataMedium} tone="blue" />
                  <p className="mt-1.5 text-[0.7rem] text-[#1E40AF]/70">
                    Recorded now, while whoever took it in still knows.
                  </p>
                </div>
              ) : (
                <div className="mt-5">
                  <label className="mb-1.5 block text-sm font-medium" style={{ color: NAVY }}>
                    How the data was received
                  </label>
                  <MediumSelect value={dataMedium} onChange={setDataMedium} />
                  {!dataMedium && (
                    <p className="mt-1.5 text-[0.7rem] text-muted-foreground">
                      Never recorded for this return. Leave it blank rather than guess.
                    </p>
                  )}
                </div>
              )
            )}

            {showFilingDetails && (
              <>
                <div className="mt-5">
                  <label className="mb-1.5 block text-sm font-medium" style={{ color: NAVY }}>ITR form</label>
                  <SelectField value={itrForm} onChange={e => setItrForm(e.target.value)}>
                    <option value="">Not decided</option>
                    {ITR_FORMS.map(f => <option key={f} value={f}>{f}</option>)}
                  </SelectField>
                </div>

                {/* Both of these move the deadline, so each option says which
                    date it means rather than leaving it to be worked out. */}
                <div className="mt-4">
                  <label className="mb-1.5 block text-sm font-medium" style={{ color: NAVY }}>
                    Business income other than speculation or F&amp;O
                  </label>
                  <SelectField
                    value={businessIncome ? 'yes' : 'no'}
                    onChange={e => setBusinessIncome(e.target.value === 'yes')}
                  >
                    <option value="no">No — due 31 July</option>
                    <option value="yes">Yes — due 31 August</option>
                  </SelectField>
                </div>

                <label className="mt-3 flex cursor-pointer items-center gap-2 rounded-lg border border-[#E7EDF4] px-3.5 py-2.5 text-sm">
                  <input type="checkbox" checked={isAudit} onChange={e => setIsAudit(e.target.checked)} className="accent-[#1b365d]" />
                  <span style={{ color: NAVY }}>Audit case</span>
                  <span className="text-xs text-muted-foreground">— 31 October, whichever the answer above</span>
                </label>
              </>
            )}

            {status === 'Filed' && (
              <div className="mt-5 rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] p-4">
                <label className="mb-1.5 block text-sm font-medium text-[#166534]">Filed on</label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input type="date" className={`${inputCls} flex-1 border-[#BBF7D0] bg-white`} value={filedOn} max={todayIso} onChange={e => setFiledOn(e.target.value)} />
                  <button type="button" onClick={() => setFiledOn(todayIso)} className="shrink-0 rounded-lg border border-[#BBF7D0] bg-white px-3.5 py-2.5 text-sm font-medium text-[#166534] transition-colors hover:bg-[#DCFCE7] sm:py-0">
                    Today
                  </button>
                </div>
                <p className="mt-1.5 text-[0.7rem] text-[#166534]/70">Optional — leave empty if the date was never recorded.</p>
              </div>
            )}

            {/*
              What went in with the return, ticked off after the event. No
              disclosure any more: the acknowledgement, bill number and remarks
              moved to Accounts, so this is the only thing left and hiding one
              short row behind a toggle is a click for nothing.
            */}
            {showChecklist && (
              <div className="mt-5">
                <p className="mb-1 text-sm font-medium" style={{ color: NAVY }}>On file</p>
                <p className="mb-2 text-xs text-muted-foreground">Tick what was filed with the return.</p>
                <div className="flex flex-wrap gap-1.5">
                  {[{ key: 'cpc' as const, label: 'CPC', hint: 'Processed by CPC' }, ...ITR_CHECKLIST].map(item => {
                    const on = checks[item.key];
                    return (
                      <button
                        key={item.key}
                        type="button"
                        title={item.hint}
                        onClick={() => setChecks(c => ({ ...c, [item.key]: !c[item.key] }))}
                        aria-pressed={on}
                        className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                          on ? 'border-[#BBF7D0] bg-[#DCFCE7] text-[#166534]'
                             : 'border-[#E7EDF4] bg-white text-muted-foreground hover:border-[#C7D3E2]'
                        }`}
                      >
                        {on && <Check size={12} strokeWidth={3} />}
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/*
              Where the invoice has got to. Read-only here — Accounts owns it —
              but a return that has been sent back must say so, and say why, to
              the person who has to fix it. Marking it filed again puts it back
              in the Accounts queue.
            */}
            {filing.billingStatus === 'Returned' && filing.returnedReason && (
              <div className="mt-5 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] p-3.5">
                <p className="flex items-center gap-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-[#92400E]">
                  <AlertTriangle size={12} /> Sent back by Accounts
                  {filing.returnCount > 1 && <span className="font-normal normal-case tracking-normal opacity-70">· {filing.returnCount} times</span>}
                </p>
                <p className="mt-1.5 text-[0.8rem] leading-snug text-[#92400E]">{filing.returnedReason}</p>
                <p className="mt-1.5 text-[0.68rem] text-[#92400E]/70">
                  {filing.returnedByName || 'Accounts'}
                  {filing.returnedAt && ` · ${formatDate(filing.returnedAt)}`}
                  {' — correct it and mark the return filed again to send it back for billing.'}
                </p>
              </div>
            )}

            {filing.billingStatus === 'Pending' && (
              <p className="mt-5 rounded-lg border border-[#E7EDF4] bg-[#F9FAFB] px-3 py-2 text-[0.74rem] text-muted-foreground">
                With Accounts for billing.
              </p>
            )}

            {filing.billingStatus === 'Billed' && (
              <p className="mt-5 rounded-lg border border-[#BBF7D0] bg-[#F0FDF4] px-3 py-2 text-[0.74rem] text-[#166534]">
                Billed{filing.billNumber && ` — ${filing.billNumber}`}
                {filing.billDate && ` on ${formatDate(filing.billDate)}`}
                {filing.billedByName && ` by ${filing.billedByName}`}
              </p>
            )}

            {/*
              What the control list actually said. The import mapped these to a
              status where the meaning was unambiguous and left the rest alone —
              "MORE THAN 50 LKH CREDIT IN BANKS" is not a status, but it is the
              reason this return is where it is, and it would be lost if only the
              derived value survived.
            */}
            {(filing.dataNote || filing.statusNote || filing.partnerRemark) && (
              <div className="mt-5 space-y-2 rounded-xl border border-[#E7EDF4] bg-[#FAFBFD] p-3.5">
                <p className="text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  From the control list
                </p>
                {filing.dataNote && <NoteLine label="Data">{filing.dataNote}</NoteLine>}
                {filing.statusNote && <NoteLine label="Status">{filing.statusNote}</NoteLine>}
                {filing.partnerRemark && <NoteLine label="Partner">{filing.partnerRemark}</NoteLine>}
                {filing.wpGroup && <NoteLine label="Group">{filing.wpGroup}</NoteLine>}
              </div>
            )}

            {filing.updatedByName && (
              <p className="mt-4 text-[0.7rem] text-muted-foreground">Last updated by {filing.updatedByName}</p>
            )}
          </div>

          <div className="flex gap-3 border-t border-[#E7EDF4] px-6 py-4">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1" disabled={saving}>Cancel</Button>
            <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * The medium dropdown.
 *
 * Its own component rather than the shared SelectField because inside the blue
 * panel it has to take the panel's border, and because each option carries the
 * half-line of explanation that stops "In person" and "Collected from client"
 * being read as the same thing.
 */
function MediumSelect({ value, onChange, tone }: {
  value: string; onChange: (v: string) => void; tone?: 'blue';
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`${inputCls} appearance-none pr-9 ${tone === 'blue' ? 'border-[#BFDBFE] bg-white' : ''}`}
      >
        <option value="">Not recorded</option>
        {ITR_DATA_MEDIUMS.map(m => (
          <option key={m} value={m}>
            {m}{ITR_DATA_MEDIUM_HINTS[m] ? ` — ${ITR_DATA_MEDIUM_HINTS[m]}` : ''}
          </option>
        ))}
      </select>
      <svg className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9l6 6 6-6" />
      </svg>
    </div>
  );
}

function NoteLine({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <p className="text-[0.76rem] leading-snug">
      <span className="text-muted-foreground">{label}: </span>
      <span className="font-medium text-foreground/80">{children}</span>
    </p>
  );
}

function Banner({ tone, icon: Icon, children }: {
  tone: 'good' | 'warn' | 'bad' | 'plain'; icon?: React.ElementType; children: React.ReactNode;
}) {
  const styles = {
    good: 'border-[#BBF7D0] bg-[#F0FDF4] text-[#166534]',
    warn: 'border-[#FDE68A] bg-[#FFFBEB] text-[#92400E]',
    bad: 'border-[#FECACA] bg-[#FEF2F2] text-[#991B1B]',
    plain: 'border-[#E7EDF4] bg-[#F9FAFB] text-muted-foreground',
  }[tone];
  return (
    <div className={`mt-3.5 flex items-center gap-2 rounded-lg border px-3 py-2 text-[0.78rem] ${styles}`}>
      {Icon && <Icon size={14} className="shrink-0" />}
      <span>{children}</span>
    </div>
  );
}
