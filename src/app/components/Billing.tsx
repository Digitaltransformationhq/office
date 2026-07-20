import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { KPICard } from './KPICard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './Table';
import { Button } from './Button';
import { Input } from './Input';
import { billingAPI, clientsAPI, tasksAPI, usersAPI } from '../services/api';
import { RevenueBreakdownCard } from './RevenueBreakdown';
import {
  RANGE_OPTIONS, filterByRange, formatINR, formatINRCompact,
  monthOverMonth, padSlices, pendingBilling,
  revenueByCategory, revenueByClient, revenueByMonth, revenueByPerson, totals,
  type BillingRecord, type RangeId, type RevenueSlice,
} from '../utils/revenue';
import { TASK_CATEGORIES } from '../utils/taskCategories';
import { Loader2, RefreshCw, Download } from 'lucide-react';

const NAVY = '#1b365d';

interface BillingProps {
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

type TabId = 'revenue' | 'fees';

export function Billing({ user }: BillingProps) {
  const [records, setRecords] = useState<BillingRecord[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabId>('revenue');
  const [range, setRange] = useState<RangeId>('fy');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [billingResult, clientsResult, usersResult, tasksResult] = await Promise.allSettled([
        billingAPI.getAll(),
        clientsAPI.getAll(),
        usersAPI.getAll(),
        tasksAPI.getAll(),
      ]);
      if (tasksResult.status === 'fulfilled') setTasks(tasksResult.value.data || []);
      else console.error('Error loading tasks:', tasksResult.reason);
      if (billingResult.status === 'fulfilled') setRecords(billingResult.value.data || []);
      else console.error('Error loading billing records:', billingResult.reason);
      if (clientsResult.status === 'fulfilled') setClients(clientsResult.value.data || []);
      else console.error('Error loading clients:', clientsResult.reason);
      if (usersResult.status === 'fulfilled') setUsers(usersResult.value.data || []);
      else console.error('Error loading users:', usersResult.reason);
    } finally {
      setLoading(false);
    }
  };

  /* ── revenue roll-ups for the active range ── */
  // Revenue is recognised when the invoice is raised, so every billing record
  // counts. There is no separate payment step to wait on.
  const scoped = useMemo(() => filterByRange(records, range), [records, range]);
  const summary = useMemo(() => totals(scoped), [scoped]);
  const mom = useMemo(() => monthOverMonth(records), [records]);
  const pending = useMemo(() => pendingBilling(tasks), [tasks]);
  const byClient = useMemo(() => revenueByClient(scoped), [scoped]);

  // Pad against the full roster so everyone appears, even on ₹0 for this period.
  const activeUserNames = useMemo(
    () => users.filter(u => u.status === 'Active').map(u => u.name),
    [users],
  );
  const byPerson = useMemo(
    () => padSlices(revenueByPerson(scoped), activeUserNames),
    [scoped, activeUserNames],
  );
  const byCategory = useMemo(
    () => padSlices(revenueByCategory(scoped), TASK_CATEGORIES),
    [scoped],
  );

  const rangeLabel = RANGE_OPTIONS.find(o => o.id === range)?.label ?? '';
  const momTrend = mom.change === null
    ? undefined
    : { value: `${Math.abs(mom.change).toFixed(0)}% vs last month`, isPositive: mom.change >= 0 };

  const exportBreakdown = () => {
    const rows: string[][] = [['Dimension', 'Name', 'Revenue', 'Budgeted', 'Bills', 'Hours']];
    const push = (dimension: string, slices: RevenueSlice[]) =>
      slices.forEach(s => rows.push([
        dimension, s.label, String(Math.round(s.revenue)), String(Math.round(s.budgeted)),
        String(s.count), s.hours.toFixed(1),
      ]));
    push('Person', byPerson);
    push('Category', byCategory);
    push('Month', revenueByMonth(scoped));
    push('Client', byClient);

    const csv = rows.map(r => r.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `revenue-${range}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const filteredClients = clients.filter(client =>
    client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.fileNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.pan?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.firmName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-7 w-7 animate-spin" style={{ color: NAVY }} />
          <p className="text-sm">Loading billing data…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[1.6rem] font-semibold tracking-tight" style={{ color: NAVY }}>
            Billing &amp; Revenue
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Revenue by person and category — plus the client fee structure
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={exportBreakdown}>
            <Download size={14} className="mr-1.5 inline" /> Export CSV
          </Button>
          <Button size="sm" variant="secondary" onClick={loadData}>
            <RefreshCw size={14} className="mr-1.5 inline" /> Refresh
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#E7EDF4]">
        {([
          { id: 'revenue' as TabId, label: 'Revenue analytics' },
          { id: 'fees' as TabId, label: 'Client fee structure' },
        ]).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === t.id
                ? 'border-[#1b365d] text-[#1b365d]'
                : 'border-transparent text-muted-foreground hover:text-foreground/80'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'revenue' ? (
        <div className="space-y-4">
          {/* Range filter — one row above the charts */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs uppercase tracking-[0.1em] text-muted-foreground">Period</span>
            {RANGE_OPTIONS.map(opt => (
              <button
                key={opt.id}
                onClick={() => setRange(opt.id)}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                  range === opt.id
                    ? 'border-[#1b365d] bg-[#1b365d] text-white'
                    : 'border-[#E7EDF4] bg-white text-foreground/70 hover:bg-[#F4F6F9]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Headline numbers */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KPICard
              title={`Revenue · ${rangeLabel}`}
              value={formatINRCompact(summary.revenue)}
              variant="success"
              trend={range === 'month' ? momTrend : undefined}
              note="Invoices raised"
            />
            {/* Ignores the period filter — a backlog is a backlog. */}
            <KPICard
              title="Pending billing"
              value={formatINRCompact(pending.amount)}
              variant="warning"
              note={`${pending.count} task${pending.count === 1 ? '' : 's'} awaiting invoice`}
            />
            {/* On the month range the revenue tile above already IS this month. */}
            {range === 'month' ? (
              <KPICard title="Hours logged" value={summary.hours.toFixed(1)} />
            ) : (
              <KPICard title="Revenue this month" value={formatINRCompact(mom.current)} trend={momTrend} />
            )}
            <KPICard
              title="Average per bill"
              value={formatINRCompact(summary.average)}
              note={`${summary.count} bill${summary.count === 1 ? '' : 's'}`}
            />
          </div>


          {/* Revenue breakdown — person / category, toggled */}
          <RevenueBreakdownCard
            person={byPerson}
            category={byCategory}
            caption={rangeLabel}
            emptyMessage="No revenue billed in this period."
          />

          {/* Top clients */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Top clients by revenue</CardTitle>
                <span className="text-sm text-muted-foreground">
                  {byClient.length > 10 ? `Top 10 of ${byClient.length} · ` : ''}{rangeLabel}
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[220px]">Client</TableHead>
                      <TableHead className="text-right">Bills</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Share</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {byClient.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                          No revenue billed in this period.
                        </TableCell>
                      </TableRow>
                    ) : (
                      byClient.slice(0, 10).map(slice => (
                        <TableRow key={slice.key} className="hover:bg-muted/50">
                          <TableCell className="font-medium">{slice.label}</TableCell>
                          <TableCell className="text-right tabular-nums">{slice.count}</TableCell>
                          <TableCell className="text-right font-semibold tabular-nums" style={{ color: NAVY }}>
                            {formatINR(slice.revenue)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-muted-foreground">
                            {summary.revenue > 0 ? `${((slice.revenue / summary.revenue) * 100).toFixed(1)}%` : '—'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Contracted annual fees per client. This is the agreed fee structure, not billed revenue.
          </p>

          <Input
            type="text"
            placeholder="Search by Client Name, File Number, PAN, or Firm Name…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KPICard title="Total Clients" value={clients.length} />
            <KPICard
              title="Total Fee Structure"
              value={formatINRCompact(clients.reduce((sum, c) => sum + (c.totalFees || 0), 0))}
            />
            <KPICard
              title="Average Per Client"
              value={formatINRCompact(clients.reduce((sum, c) => sum + (c.totalFees || 0), 0) / (clients.length || 1))}
            />
            <KPICard
              title="Active Clients"
              value={clients.filter(c => c.status === 'Active').length}
              variant="success"
            />
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Client Fee Details</CardTitle>
                <span className="text-sm text-muted-foreground">
                  {filteredClients.length} client{filteredClients.length !== 1 ? 's' : ''}
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[80px]">File No.</TableHead>
                      <TableHead className="min-w-[200px]">Client Name</TableHead>
                      <TableHead className="min-w-[150px]">Firm Name</TableHead>
                      <TableHead className="min-w-[120px]">PAN</TableHead>
                      <TableHead className="min-w-[150px]">GSTIN</TableHead>
                      <TableHead className="min-w-[100px] text-right">ITR Fees</TableHead>
                      <TableHead className="min-w-[100px] text-right">GST Fees</TableHead>
                      <TableHead className="min-w-[120px] text-right">GST Annual</TableHead>
                      <TableHead className="min-w-[120px] text-right">Accounting</TableHead>
                      <TableHead className="min-w-[100px] text-right">Audit</TableHead>
                      <TableHead className="min-w-[120px] text-right">Company Act</TableHead>
                      <TableHead className="min-w-[100px] text-right">TDS</TableHead>
                      <TableHead className="min-w-[140px] text-right">PF/ESIC/PT</TableHead>
                      <TableHead className="min-w-[120px] text-right">Consultancy</TableHead>
                      <TableHead className="min-w-[120px] bg-accent text-right font-bold">Total Fees</TableHead>
                      <TableHead className="min-w-[120px]">Mobile</TableHead>
                      <TableHead className="min-w-[200px]">Email</TableHead>
                      <TableHead className="min-w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClients.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={18} className="py-8 text-center text-muted-foreground">
                          {searchTerm ? 'No clients found matching your search.' : 'No clients available.'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredClients.map((client) => (
                        <TableRow key={client.id} className="hover:bg-muted/50">
                          <TableCell className="font-mono text-xs">{client.fileNumber || '-'}</TableCell>
                          <TableCell className="font-medium">{client.name}</TableCell>
                          <TableCell>{client.firmName || '-'}</TableCell>
                          <TableCell className="font-mono text-xs">{client.pan || '-'}</TableCell>
                          <TableCell className="font-mono text-xs">{client.gst || '-'}</TableCell>
                          <TableCell className="text-right font-mono text-sm">{formatINR(client.itrFees || 0)}</TableCell>
                          <TableCell className="text-right font-mono text-sm">{formatINR(client.gstFees || 0)}</TableCell>
                          <TableCell className="text-right font-mono text-sm">{formatINR(client.gstAnnualReturnFees || 0)}</TableCell>
                          <TableCell className="text-right font-mono text-sm">{formatINR(client.accountingFees || 0)}</TableCell>
                          <TableCell className="text-right font-mono text-sm">{formatINR(client.auditFees || 0)}</TableCell>
                          <TableCell className="text-right font-mono text-sm">{formatINR(client.companyActFees || 0)}</TableCell>
                          <TableCell className="text-right font-mono text-sm">{formatINR(client.tdsFees || 0)}</TableCell>
                          <TableCell className="text-right font-mono text-sm">{formatINR(client.pfEsicPtLabourFees || 0)}</TableCell>
                          <TableCell className="text-right font-mono text-sm">{formatINR(client.consultancyFees || 0)}</TableCell>
                          <TableCell className="bg-accent/50 text-right font-bold text-primary">{formatINR(client.totalFees || 0)}</TableCell>
                          <TableCell>{client.mobileNumber || client.contact || '-'}</TableCell>
                          <TableCell className="text-sm">{client.emailId || client.email || '-'}</TableCell>
                          <TableCell>
                            <Button size="sm" variant="secondary" onClick={() => setSelectedClient(client)}>
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Record payment against an invoice */}

      {/* Client Detail Modal */}
      {selectedClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <Card className="max-h-[90vh] w-full max-w-3xl overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Client Billing Details</CardTitle>
                <Button size="sm" variant="secondary" onClick={() => setSelectedClient(null)}>
                  ✕ Close
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">File Number</div>
                  <div className="font-medium">{selectedClient.fileNumber || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Client Name</div>
                  <div className="font-medium">{selectedClient.name}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Firm Name</div>
                  <div className="font-medium">{selectedClient.firmName || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">PAN</div>
                  <div className="font-mono text-sm">{selectedClient.pan || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">GSTIN</div>
                  <div className="font-mono text-sm">{selectedClient.gst || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Industry</div>
                  <div className="font-medium">{selectedClient.industry || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Mobile</div>
                  <div className="font-medium">{selectedClient.mobileNumber || selectedClient.contact || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Email</div>
                  <div className="text-sm">{selectedClient.emailId || selectedClient.email || '-'}</div>
                </div>
              </div>

              {/* Contracted fee breakdown */}
              <div>
                <h3 className="mb-4 font-semibold">Fee Structure</h3>
                <div className="space-y-2">
                  {[
                    { label: 'ITR Fees', value: selectedClient.itrFees },
                    { label: 'GST Fees', value: selectedClient.gstFees },
                    { label: 'GST Annual Return Fees', value: selectedClient.gstAnnualReturnFees },
                    { label: 'Accounting Fees', value: selectedClient.accountingFees },
                    { label: 'Audit Fees', value: selectedClient.auditFees },
                    { label: 'Company Act Fees', value: selectedClient.companyActFees },
                    { label: 'TDS Fees', value: selectedClient.tdsFees },
                    { label: 'PF/ESIC/PT/Labour Fees', value: selectedClient.pfEsicPtLabourFees },
                    { label: 'Consultancy Fees', value: selectedClient.consultancyFees },
                  ].map((fee, idx) => (
                    <div key={idx} className="flex items-center justify-between border-b border-border py-2">
                      <span className="text-sm">{fee.label}</span>
                      <span className="font-mono font-medium">{formatINR(fee.value || 0)}</span>
                    </div>
                  ))}
                  <div className="mt-2 flex items-center justify-between rounded bg-accent px-3 py-3">
                    <span className="font-bold">Total Fees</span>
                    <span className="font-mono text-lg font-bold text-primary">{formatINR(selectedClient.totalFees || 0)}</span>
                  </div>
                </div>
              </div>

              {/* Actual billed revenue for this client */}
              <div>
                <h3 className="mb-4 font-semibold">Billed revenue ({rangeLabel})</h3>
                {(() => {
                  const slice = byClient.find(s => s.key === selectedClient.name);
                  if (!slice) {
                    return <p className="text-sm text-muted-foreground">No bills raised for this client in this period.</p>;
                  }
                  return (
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <div className="text-sm text-muted-foreground">Revenue</div>
                        <div className="font-semibold" style={{ color: NAVY }}>{formatINR(slice.revenue)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Bills</div>
                        <div className="font-semibold" style={{ color: NAVY }}>{slice.count}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Hours</div>
                        <div className="font-semibold" style={{ color: NAVY }}>{slice.hours.toFixed(1)}</div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
