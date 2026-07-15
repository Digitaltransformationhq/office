import React, { useState, useEffect } from 'react';
import { KPICard } from './KPICard';
import { ReviewInquiryModalEnhanced } from './ReviewInquiryModalEnhanced';
import { useToast } from './Toast';
import { inquiriesAPI } from '../services/api';
import {
  Search, RotateCw, ChevronDown, ArrowUp, ArrowDown,
  Inbox, Clock, CheckCircle2, PauseCircle, XCircle, Mail, Phone,
} from 'lucide-react';

interface InquiryManagementProps {
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

function initials(name?: string) {
  if (!name) return '—';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '—';
}

export function InquiryManagement({ userId, userName }: InquiryManagementProps) {
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInquiry, setSelectedInquiry] = useState<any>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [openCards, setOpenCards] = useState<Set<string>>(new Set());
  const toggleCard = (id: string) => setOpenCards(prev => {
    const n = new Set(prev);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterWorkType, setFilterWorkType] = useState('all');
  const [filterSubmitter, setFilterSubmitter] = useState('all');
  const [sortBy, setSortBy] = useState<'date' | 'client' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const { showError } = useToast();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await inquiriesAPI.getAll();
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

  const handleReview = (inquiry: any) => {
    setSelectedInquiry(inquiry);
    setShowReviewModal(true);
  };

  const uniqueSubmitters = Array.from(new Set(inquiries.map(i => i.submitted_by))).filter(Boolean);
  const uniqueWorkTypes = Array.from(new Set(inquiries.map(i => i.work_type))).filter(Boolean);

  const hasFilters = searchTerm || filterStatus !== 'all' || filterWorkType !== 'all' || filterSubmitter !== 'all';
  const clearFilters = () => { setSearchTerm(''); setFilterStatus('all'); setFilterWorkType('all'); setFilterSubmitter('all'); };

  const filteredInquiries = inquiries
    .filter(inquiry => {
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesSearch =
          inquiry.client_name?.toLowerCase().includes(search) ||
          inquiry.company_name?.toLowerCase().includes(search) ||
          inquiry.mobile_number?.includes(search) ||
          inquiry.email?.toLowerCase().includes(search);
        if (!matchesSearch) return false;
      }
      if (filterStatus !== 'all' && inquiry.status !== filterStatus) return false;
      if (filterWorkType !== 'all' && inquiry.work_type !== filterWorkType) return false;
      if (filterSubmitter !== 'all' && inquiry.submitted_by !== filterSubmitter) return false;
      return true;
    })
    .sort((a, b) => {
      let compareA, compareB;
      switch (sortBy) {
        case 'client': compareA = a.client_name || ''; compareB = b.client_name || ''; break;
        case 'status': compareA = a.status || ''; compareB = b.status || ''; break;
        case 'date':
        default:
          compareA = new Date(a.created_at || 0).getTime();
          compareB = new Date(b.created_at || 0).getTime();
      }
      if (sortOrder === 'asc') return compareA > compareB ? 1 : -1;
      return compareA < compareB ? 1 : -1;
    });

  const count = (s: string) => inquiries.filter(i => i.status === s).length;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-[1.6rem] font-semibold tracking-tight" style={{ color: NAVY }}>Client Inquiry Management</h1>
        <p className="mt-1 text-sm text-muted-foreground">Review, manage, and convert client inquiries</p>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        <KPICard title="Total" value={inquiries.length} icon={<Inbox size={22} />} />
        <KPICard title="Pending" value={count('Pending Review')} icon={<Clock size={22} />} variant="warning" />
        <KPICard title="Converted" value={count('Converted to Client')} icon={<CheckCircle2 size={22} />} variant="success" />
        <KPICard title="On Hold" value={count('On Hold')} icon={<PauseCircle size={22} />} />
        <KPICard title="Rejected" value={count('Rejected')} icon={<XCircle size={22} />} variant="danger" />
      </div>

      {/* Inquiries */}
      <section className="overflow-hidden rounded-xl border border-[#E7EDF4] bg-white">
        {/* Toolbar */}
        <div className="flex flex-col gap-3.5 border-b border-[#E7EDF4] px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <h2 className="text-sm font-semibold" style={{ color: NAVY }}>Inquiries</h2>
              <span className="rounded-full bg-[#F4F6F9] px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {filteredInquiries.length}{hasFilters ? ` of ${inquiries.length}` : ''}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {hasFilters && (
                <button onClick={clearFilters} className="rounded-full border border-[#E7EDF4] px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-[#F4F6F9] hover:text-foreground">
                  Clear filters
                </button>
              )}
              <button onClick={loadData} title="Refresh" className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E7EDF4] text-muted-foreground transition-colors hover:bg-[#F4F6F9]">
                <RotateCw size={15} />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search client, company, mobile or email…"
                className="w-full rounded-lg border border-[#E7EDF4] bg-white py-2 pl-9 pr-3 text-sm outline-none transition placeholder:text-muted-foreground/60 focus:border-[#1b365d] focus:ring-2 focus:ring-[#1b365d]/15"
              />
            </div>
            <FilterSelect value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="all">All status</option>
              {['Pending Review', 'Approved', 'Converted to Client', 'On Hold', 'Rejected'].map(s => <option key={s} value={s}>{s}</option>)}
            </FilterSelect>
            <FilterSelect value={filterWorkType} onChange={e => setFilterWorkType(e.target.value)}>
              <option value="all">All work types</option>
              {uniqueWorkTypes.map(type => <option key={type} value={type}>{type}</option>)}
            </FilterSelect>
            <FilterSelect value={filterSubmitter} onChange={e => setFilterSubmitter(e.target.value)}>
              <option value="all">All users</option>
              {uniqueSubmitters.map(s => <option key={s} value={s}>{s}</option>)}
            </FilterSelect>
            <div className="flex items-center gap-1.5">
              <FilterSelect value={sortBy} onChange={e => setSortBy(e.target.value as any)}>
                <option value="date">Sort: Date</option>
                <option value="client">Sort: Client</option>
                <option value="status">Sort: Status</option>
              </FilterSelect>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E7EDF4] text-muted-foreground transition-colors hover:bg-[#F4F6F9]"
              >
                {sortOrder === 'asc' ? <ArrowUp size={15} /> : <ArrowDown size={15} />}
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#1b365d] border-t-transparent" />
          </div>
        ) : (
          <>
          {/* Mobile: expandable cards */}
          <div className="space-y-2.5 p-4 md:hidden">
            {filteredInquiries.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No inquiries found matching your filters.</p>
            ) : filteredInquiries.map((inquiry) => {
              const open = openCards.has(inquiry.id);
              return (
                <div key={inquiry.id} className="overflow-hidden rounded-xl border border-[#E7EDF4]">
                  <button onClick={() => toggleCard(inquiry.id)} className="flex w-full items-start gap-2.5 px-3.5 py-3 text-left">
                    <div className="min-w-0 flex-1">
                      <p className="text-[0.85rem] font-medium" style={{ color: NAVY }}>{inquiry.client_name || inquiry.company_name || 'Inquiry'}</p>
                      <span className={`mt-1.5 inline-block whitespace-nowrap rounded-md px-2 py-0.5 text-[0.66rem] font-medium ${STATUS_STYLE[inquiry.status] || 'bg-slate-100 text-slate-600'}`}>{inquiry.status || '—'}</span>
                    </div>
                    <ChevronDown size={16} className={`mt-0.5 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
                  </button>
                  {open && (
                    <dl className="divide-y divide-[#F1F4F8] border-t border-[#F1F4F8] px-3.5">
                      {inquiry.company_name && <CardRow label="Company">{inquiry.company_name}</CardRow>}
                      {inquiry.mobile_number && <CardRow label="Mobile">{inquiry.mobile_number}</CardRow>}
                      {inquiry.email && <CardRow label="Email"><span className="break-all">{inquiry.email}</span></CardRow>}
                      <CardRow label="Work Type">
                        <span className="inline-block whitespace-nowrap rounded-md px-2 py-0.5 text-[0.7rem] font-medium" style={{ backgroundColor: 'rgba(27,54,93,0.06)', color: NAVY }}>{inquiry.work_type || '—'}</span>
                      </CardRow>
                      <CardRow label="Submitted By">{inquiry.submitted_by || '—'}</CardRow>
                      <CardRow label="Date">{inquiry.created_at ? new Date(inquiry.created_at).toLocaleDateString('en-IN') : '—'}</CardRow>
                      <CardRow label="Action">
                        <button onClick={() => handleReview(inquiry)} className="rounded-full bg-[#1b365d] px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#142a4a]">Review</button>
                      </CardRow>
                    </dl>
                  )}
                </div>
              );
            })}
          </div>

          {/* Desktop: table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[900px] table-fixed border-collapse text-[0.8rem]">
              <colgroup>
                <col style={{ width: '22%' }} /><col style={{ width: '18%' }} />
                <col style={{ width: '13%' }} /><col style={{ width: '15%' }} />
                <col style={{ width: '14%' }} /><col style={{ width: '10%' }} /><col style={{ width: '8%' }} />
              </colgroup>
              <thead>
                <tr className="border-b border-[#E7EDF4] bg-[#F9FAFB]">
                  {['Client', 'Contact', 'Work Type', 'Status', 'Submitted By', 'Date', ''].map((h, i) => (
                    <th key={i} className="px-3 py-2.5 text-left text-[0.64rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredInquiries.length === 0 ? (
                  <tr><td colSpan={7} className="py-14 text-center text-sm text-muted-foreground">No inquiries found matching your filters.</td></tr>
                ) : filteredInquiries.map((inquiry) => (
                  <tr key={inquiry.id} className="border-b border-[#EFF3F8] transition-colors hover:bg-[#F9FBFD]">
                    <td className="px-3 py-3">
                      <p className="truncate text-[0.82rem] font-medium" style={{ color: NAVY }} title={inquiry.client_name}>{inquiry.client_name || '—'}</p>
                      {inquiry.company_name && <p className="truncate text-xs text-muted-foreground">{inquiry.company_name}</p>}
                    </td>
                    <td className="px-3 py-3">
                      <div className="space-y-0.5 text-xs text-muted-foreground">
                        {inquiry.mobile_number && <p className="flex items-center gap-1.5"><Phone size={11} />{inquiry.mobile_number}</p>}
                        {inquiry.email && <p className="flex items-center gap-1.5 truncate" title={inquiry.email}><Mail size={11} />{inquiry.email}</p>}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className="inline-block truncate rounded-md px-2 py-0.5 text-[0.7rem] font-medium" style={{ backgroundColor: 'rgba(27,54,93,0.06)', color: NAVY }}>{inquiry.work_type || '—'}</span>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`inline-block rounded-md px-2 py-0.5 text-[0.68rem] font-medium ${STATUS_STYLE[inquiry.status] || 'bg-slate-100 text-slate-600'}`}>{inquiry.status || '—'}</span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[0.55rem] font-semibold" style={{ backgroundColor: 'rgba(27,54,93,0.08)', color: NAVY }}>{initials(inquiry.submitted_by)}</span>
                        <span className="truncate text-[0.78rem] text-foreground/75" title={inquiry.submitted_by}>{inquiry.submitted_by || '—'}</span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-xs text-muted-foreground">
                      {inquiry.created_at ? new Date(inquiry.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <button
                        onClick={() => handleReview(inquiry)}
                        className="rounded-full bg-[#1b365d] px-3.5 py-1.5 text-xs font-medium text-white shadow-[0_8px_20px_-10px_rgba(27,54,93,0.6)] transition-all hover:bg-[#142a4a]"
                      >
                        Review
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

      {showReviewModal && selectedInquiry && (
        <ReviewInquiryModalEnhanced
          inquiry={selectedInquiry}
          reviewerId={userId}
          reviewerName={userName}
          onClose={() => { setShowReviewModal(false); setSelectedInquiry(null); }}
          onSuccess={() => { loadData(); setShowReviewModal(false); setSelectedInquiry(null); }}
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

function FilterSelect({ value, onChange, children }: {
  value: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; children: React.ReactNode;
}) {
  return (
    <div className="relative inline-flex">
      <select
        value={value}
        onChange={onChange}
        className="appearance-none rounded-lg border border-[#E7EDF4] bg-white py-2 pl-3 pr-9 text-sm text-foreground/80 outline-none transition focus:border-[#1b365d] focus:ring-2 focus:ring-[#1b365d]/15"
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}
