import React, { useState, useEffect } from 'react';
import { KPICard } from './KPICard';
import { CreateInquiryModal } from './CreateInquiryModal';
import { ViewInquiryModal } from './ViewInquiryModal';
import { useToast } from './Toast';
import { inquiriesAPI } from '../services/api';
import { Plus, Inbox, Clock, CheckCircle2, XCircle, ChevronDown } from 'lucide-react';

interface MyInquiriesProps {
  userId: number;
  userName: string;
}

const NAVY = '#1b365d';

const STATUS_STYLE: Record<string, string> = {
  'Pending Review': 'bg-[#FEF4E6] text-[#b7791f]',
  'Approved': 'bg-[rgba(78,167,46,0.12)] text-[#3d8a22]',
  'Converted to Client': 'bg-teal-100 text-teal-700',
  'Rejected': 'bg-[#FDECEC] text-[#c0392b]',
  'On Hold': 'bg-slate-100 text-slate-600',
};

export function MyInquiries({ userId, userName }: MyInquiriesProps) {
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState<any>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [openCards, setOpenCards] = useState<Set<string>>(new Set());
  const toggleCard = (id: string) => setOpenCards(prev => {
    const n = new Set(prev);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });
  const { showError } = useToast();

  useEffect(() => { loadData(); }, [userId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await inquiriesAPI.getByUser(userId.toString());
      if (response.success) {
        setInquiries(response.data || []);
      } else {
        showError(response.error || 'Failed to load inquiries');
      }
    } catch (error) {
      console.error('Error loading inquiries:', error);
      showError('Failed to load inquiries');
    } finally {
      setLoading(false);
    }
  };

  const handleViewInquiry = (inquiry: any) => {
    setSelectedInquiry(inquiry);
    setShowViewModal(true);
  };

  const count = (s: string) => inquiries.filter(i => i.status === s).length;
  const filteredInquiries = inquiries.filter(i => filterStatus === 'all' || i.status === filterStatus);

  const tabs = [
    { key: 'all', label: 'All', n: inquiries.length },
    { key: 'Pending Review', label: 'Pending', n: count('Pending Review') },
    { key: 'Approved', label: 'Approved', n: count('Approved') },
    { key: 'Converted to Client', label: 'Converted', n: count('Converted to Client') },
    { key: 'Rejected', label: 'Rejected', n: count('Rejected') },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[1.6rem] font-semibold tracking-tight" style={{ color: NAVY }}>My Client Inquiries</h1>
          <p className="mt-1 text-sm text-muted-foreground">Track your submitted client inquiries</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[#1b365d] px-4 py-2.5 text-sm font-medium text-white shadow-[0_8px_20px_-10px_rgba(27,54,93,0.6)] transition-all hover:bg-[#142a4a] hover:shadow-[0_12px_26px_-10px_rgba(27,54,93,0.7)]"
        >
          <Plus size={16} /> New Inquiry
        </button>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPICard title="Total" value={inquiries.length} icon={<Inbox size={22} />} />
        <KPICard title="Pending" value={count('Pending Review')} icon={<Clock size={22} />} variant="warning" />
        <KPICard title="Approved" value={count('Approved') + count('Converted to Client')} icon={<CheckCircle2 size={22} />} variant="success" />
        <KPICard title="Rejected / Hold" value={count('Rejected') + count('On Hold')} icon={<XCircle size={22} />} variant="danger" />
      </div>

      {/* Status tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map(t => {
          const active = filterStatus === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setFilterStatus(t.key)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${active ? 'bg-[#1b365d] text-white' : 'border border-[#E7EDF4] bg-white text-[#1b365d] hover:bg-[#F4F6F9]'}`}
            >
              {t.label}
              <span className={`text-xs ${active ? 'text-white/70' : 'text-muted-foreground'}`}>{t.n}</span>
            </button>
          );
        })}
      </div>

      {/* Table */}
      <section className="overflow-hidden rounded-xl border border-[#E7EDF4] bg-white">
        <div className="border-b border-[#E7EDF4] px-5 py-4">
          <h2 className="text-sm font-semibold" style={{ color: NAVY }}>Inquiry History</h2>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#1b365d] border-t-transparent" />
          </div>
        ) : (
          <>
          {/* Mobile: expandable cards */}
          <div className="space-y-2.5 p-4 md:hidden">
            {filteredInquiries.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {filterStatus === 'all' ? 'No inquiries yet.' : `No inquiries with status "${filterStatus}".`}
              </p>
            ) : filteredInquiries.map((inquiry) => {
              const open = openCards.has(inquiry.id);
              return (
                <div key={inquiry.id} className="overflow-hidden rounded-xl border border-[#E7EDF4]">
                  <button onClick={() => toggleCard(inquiry.id)} className="flex w-full items-start gap-2.5 px-3.5 py-3 text-left">
                    <div className="min-w-0 flex-1">
                      <p className="text-[0.85rem] font-medium" style={{ color: NAVY }}>{inquiry.client_name || '—'}</p>
                      <span className={`mt-1.5 inline-block whitespace-nowrap rounded-md px-2 py-0.5 text-[0.66rem] font-medium ${STATUS_STYLE[inquiry.status] || 'bg-slate-100 text-slate-600'}`}>{inquiry.status || '—'}</span>
                    </div>
                    <ChevronDown size={16} className={`mt-0.5 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
                  </button>
                  {open && (
                    <dl className="divide-y divide-[#F1F4F8] border-t border-[#F1F4F8] px-3.5">
                      {inquiry.company_name && <CardRow label="Company">{inquiry.company_name}</CardRow>}
                      <CardRow label="Work Type">
                        <span className="inline-block whitespace-nowrap rounded-md px-2 py-0.5 text-[0.7rem] font-medium" style={{ backgroundColor: 'rgba(27,54,93,0.06)', color: NAVY }}>{inquiry.work_type || '—'}</span>
                      </CardRow>
                      <CardRow label="Submitted">{inquiry.created_at ? new Date(inquiry.created_at).toLocaleDateString('en-IN') : '—'}</CardRow>
                      <CardRow label="Updated">{inquiry.reviewed_at ? new Date(inquiry.reviewed_at).toLocaleDateString('en-IN') : '—'}</CardRow>
                      <CardRow label="Action">
                        <button onClick={() => handleViewInquiry(inquiry)} className="rounded-full border border-[#E7EDF4] px-3 py-1.5 text-xs font-medium transition-colors hover:bg-[#F4F6F9]" style={{ color: NAVY }}>View</button>
                      </CardRow>
                    </dl>
                  )}
                </div>
              );
            })}
          </div>

          {/* Desktop: table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[820px] table-fixed border-collapse text-[0.8rem]">
              <colgroup>
                <col style={{ width: '28%' }} /><col style={{ width: '16%' }} />
                <col style={{ width: '18%' }} /><col style={{ width: '13%' }} />
                <col style={{ width: '13%' }} /><col style={{ width: '12%' }} />
              </colgroup>
              <thead>
                <tr className="border-b border-[#E7EDF4] bg-[#F9FAFB]">
                  {['Client', 'Work Type', 'Status', 'Submitted', 'Updated', ''].map((h, i) => (
                    <th key={i} className="px-3 py-2.5 text-left text-[0.64rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredInquiries.length === 0 ? (
                  <tr><td colSpan={6} className="py-14 text-center text-sm text-muted-foreground">
                    {filterStatus === 'all' ? 'No inquiries yet. Click "New Inquiry" to get started.' : `No inquiries with status "${filterStatus}".`}
                  </td></tr>
                ) : filteredInquiries.map((inquiry) => (
                  <tr key={inquiry.id} className="border-b border-[#EFF3F8] transition-colors hover:bg-[#F9FBFD]">
                    <td className="px-3 py-3">
                      <p className="truncate text-[0.82rem] font-medium" style={{ color: NAVY }} title={inquiry.client_name}>{inquiry.client_name || '—'}</p>
                      {inquiry.company_name && <p className="truncate text-xs text-muted-foreground">{inquiry.company_name}</p>}
                    </td>
                    <td className="px-3 py-3">
                      <span className="inline-block truncate rounded-md px-2 py-0.5 text-[0.7rem] font-medium" style={{ backgroundColor: 'rgba(27,54,93,0.06)', color: NAVY }}>{inquiry.work_type || '—'}</span>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`inline-block rounded-md px-2 py-0.5 text-[0.68rem] font-medium ${STATUS_STYLE[inquiry.status] || 'bg-slate-100 text-slate-600'}`}>{inquiry.status || '—'}</span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-xs text-muted-foreground">
                      {inquiry.created_at ? new Date(inquiry.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-xs text-muted-foreground">
                      {inquiry.reviewed_at ? new Date(inquiry.reviewed_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <button
                        onClick={() => handleViewInquiry(inquiry)}
                        className="rounded-full border border-[#E7EDF4] px-3 py-1.5 text-xs font-medium transition-colors hover:bg-[#F4F6F9]"
                        style={{ color: NAVY }}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </section>

      {showCreateModal && (
        <CreateInquiryModal
          currentUserId={userId}
          currentUserName={userName}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => { loadData(); setShowCreateModal(false); }}
        />
      )}

      {showViewModal && selectedInquiry && (
        <ViewInquiryModal
          inquiry={selectedInquiry}
          userId={userId}
          userName={userName}
          onClose={() => { setShowViewModal(false); setSelectedInquiry(null); }}
          onUpdate={loadData}
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
