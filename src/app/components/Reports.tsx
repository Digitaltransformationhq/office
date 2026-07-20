import React, { useState, useEffect } from 'react';
import { KPICard } from './KPICard';
import { tasksAPI, clientsAPI, usersAPI, billingAPI } from '../services/api';
import { useToast } from './Toast';
import { ClipboardList, Wallet, BarChart3, Download, IndianRupee, Users, TrendingUp, ChevronDown, Receipt, Search, X, Clock } from 'lucide-react';
import { statusColor, statusLabel } from '../utils/taskStatus';

interface ReportsProps {
  user?: { id: string; name: string; email: string; role: string };
}

const NAVY = '#1b365d';


const inputCls =
  'rounded-lg border border-[#E7EDF4] bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-[#1b365d] focus:ring-2 focus:ring-[#1b365d]/15';
const thCls = 'px-3 py-2.5 text-left text-[0.64rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground';

export function Reports({ user }: ReportsProps) {
  const [activeReport, setActiveReport] = useState<'tasks' | 'billing' | 'billing-records' | 'performance'>('tasks');
  const [tasks, setTasks] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [billingRecords, setBillingRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  // Billing-records filters
  const [bSearch, setBSearch] = useState('');
  const [bClient, setBClient] = useState('all');
  const [bStaff, setBStaff] = useState('all');
  const [bFrom, setBFrom] = useState('');
  const [bTo, setBTo] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
  });
  const [openCards, setOpenCards] = useState<Set<string>>(new Set());
  const toggleCard = (id: string) => setOpenCards(prev => {
    const n = new Set(prev);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });
  const { showSuccess, showError } = useToast();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [tasksRes, clientsRes, usersRes, billingRes] = await Promise.all([
        tasksAPI.getAll(), clientsAPI.getAll(), usersAPI.getAll(), billingAPI.getAll().catch(() => ({ data: [] })),
      ]);
      setTasks(tasksRes.data || []);
      setClients(clientsRes.data || []);
      setUsers(usersRes.data || []);
      setBillingRecords(billingRes.data || []);
    } catch (error) {
      console.error('Error loading report data:', error);
      showError('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const generateCSV = (reportType: string): string => {
    if (reportType === 'tasks') {
      const headers = 'Client,Task,Category,Status,Assigned To,Target Date,Completion Date\n';
      const rows = tasks.map(t => `"${t.client}","${t.task}","${t.category || 'N/A'}","${t.status}","${t.assignedTo}","${t.targetDate || 'N/A'}","${t.completionDate || 'N/A'}"`).join('\n');
      return headers + rows;
    } else if (reportType === 'billing') {
      const headers = 'Client,ITR Fees,GST Fees,Total Fees,Status\n';
      const rows = clients.map(c => `"${c.name}","${c.itrFees || 0}","${c.gstFees || 0}","${c.totalFees || 0}","${c.status}"`).join('\n');
      return headers + rows;
    } else if (reportType === 'performance') {
      const headers = 'Team Member,Total Tasks,Completed,In Progress,Completion Rate\n';
      const rows = users.map(u => {
        const userTasks = tasks.filter(t => t.assignedToId === u.id);
        const completed = userTasks.filter(t => t.status === 'Completed').length;
        const rate = userTasks.length > 0 ? ((completed / userTasks.length) * 100).toFixed(1) : '0';
        return `"${u.name}","${userTasks.length}","${completed}","${userTasks.filter(t => t.status === 'In Progress').length}","${rate}%"`;
      }).join('\n');
      return headers + rows;
    }
    return '';
  };

  const exportToExcel = (reportType: string) => {
    showSuccess(`Exporting ${reportType} report…`);
    const csvContent = generateCSV(reportType);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${reportType}_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
  };

  const billingReport = clients.map(client => ({
    name: client.name, itrFees: client.itrFees || 0, gstFees: client.gstFees || 0,
    accountingFees: client.accountingFees || 0, totalFees: client.totalFees || 0, status: client.status,
  }));
  const totalRevenue = billingReport.reduce((sum, c) => sum + c.totalFees, 0);

  const performanceReport = users.map(u => {
    const userTasks = tasks.filter(t => t.assignedToId === u.id);
    const completed = userTasks.filter(t => t.status === 'Completed').length;
    const inProgress = userTasks.filter(t => t.status === 'In Progress').length;
    const completionRate = userTasks.length > 0 ? ((completed / userTasks.length) * 100).toFixed(1) : '0';
    return { name: u.name, role: u.role, totalTasks: userTasks.length, completed, inProgress, completionRate };
  });

  const hasBillingAccess = user?.role === 'admin' || user?.email === 'audit1@kapsca.in';
  const rupees = (n: number) => `₹${(n || 0).toLocaleString('en-IN')}`;
  const money = (n: number) => `₹${(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // ── Billing records (actual billed tasks) ──
  const bq = bSearch.trim().toLowerCase();
  const filteredRecords = billingRecords
    .filter(r => !bq || [r.clientName, r.taskName, r.billNumber, r.assignedTo].some((v: any) => (v || '').toLowerCase().includes(bq)))
    .filter(r => bClient === 'all' || r.clientName === bClient)
    .filter(r => bStaff === 'all' || r.assignedTo === bStaff)
    .filter(r => !bFrom || new Date(r.billDate) >= new Date(bFrom))
    .filter(r => !bTo || new Date(r.billDate) <= new Date(bTo));
  const bHasFilters = !!bq || bClient !== 'all' || bStaff !== 'all' || bFrom || bTo;
  const clearBFilters = () => { setBSearch(''); setBClient('all'); setBStaff('all'); setBFrom(''); setBTo(''); };
  const uniqueBClients = Array.from(new Set(billingRecords.map(r => r.clientName))).filter(Boolean).sort();
  const uniqueBStaff = Array.from(new Set(billingRecords.map(r => r.assignedTo))).filter(Boolean).sort();
  const totalBilled = filteredRecords.reduce((s, r) => s + (r.budgetedFee || 0), 0);
  const totalTaxable = filteredRecords.reduce((s, r) => s + (r.taxableAmount || 0), 0);
  const totalHours = filteredRecords.reduce((s, r) => s + (r.hoursLogged || 0), 0);
  const billedThisMonth = filteredRecords.filter(r => {
    const d = new Date(r.billDate); const n = new Date();
    return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
  }).length;

  const exportBilling = () => {
    if (filteredRecords.length === 0) { showError('No records to export'); return; }
    const headers = ['Bill Number', 'Bill Date', 'Client', 'Task', 'Category', 'Assigned Staff', 'Completion Date', 'Budgeted Fee', 'Taxable Amount', 'Hours', 'Billed By', 'Billed Date', 'Remarks'];
    const rows = filteredRecords.map(r => [
      r.billNumber, new Date(r.billDate).toLocaleDateString('en-IN'), r.clientName, r.taskName, r.category || '', r.assignedTo,
      r.completionDate ? new Date(r.completionDate).toLocaleDateString('en-IN') : '', r.budgetedFee || 0, r.taxableAmount || 0,
      r.hoursLogged || 0, r.billedBy, r.billedAt ? new Date(r.billedAt).toLocaleDateString('en-IN') : '', r.remarks || '',
    ]);
    const csv = [headers, ...rows].map(row => row.map((c: any) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `billing-records-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const TABS: { key: typeof activeReport; label: string; icon: React.ReactNode }[] = [
    { key: 'tasks', label: 'Task Completion', icon: <ClipboardList size={15} /> },
    ...(hasBillingAccess ? [{ key: 'billing' as const, label: 'Billing & Revenue', icon: <Wallet size={15} /> }] : []),
    ...(hasBillingAccess ? [{ key: 'billing-records' as const, label: 'Billing Records', icon: <Receipt size={15} /> }] : []),
    { key: 'performance', label: 'Team Performance', icon: <BarChart3 size={15} /> },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#1b365d] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-[1.6rem] font-semibold tracking-tight" style={{ color: NAVY }}>Reports &amp; Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">Generate and export comprehensive reports</p>
      </div>

      {/* Tabs + date range */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {TABS.map(t => {
            const active = activeReport === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setActiveReport(t.key)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${active ? 'bg-[#1b365d] text-white' : 'border border-[#E7EDF4] bg-white text-[#1b365d] hover:bg-[#F4F6F9]'}`}
              >
                {t.icon} {t.label}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input type="date" value={dateRange.from} onChange={e => setDateRange(p => ({ ...p, from: e.target.value }))} className={inputCls} />
          <span className="text-sm text-muted-foreground">to</span>
          <input type="date" value={dateRange.to} onChange={e => setDateRange(p => ({ ...p, to: e.target.value }))} className={inputCls} />
          <button onClick={loadData} className="rounded-full bg-[#1b365d] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#142a4a]">Apply</button>
        </div>
      </div>

      {/* Task Completion */}
      {activeReport === 'tasks' && (
        <ReportSection title="Task Completion Report" onExport={() => exportToExcel('tasks')}>
          {/* Mobile cards */}
          <div className="space-y-2.5 p-4 md:hidden">
            {tasks.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No tasks found for the selected period.</p>
            ) : tasks.map((task, i) => (
              <MobileCard
                key={i}
                title={task.client}
                badge={<span className={`inline-block rounded-md px-2 py-0.5 text-[0.66rem] font-medium ${statusColor(task.status)}`}>{statusLabel(task.status)}</span>}
                open={openCards.has(`t-${i}`)}
                onToggle={() => toggleCard(`t-${i}`)}
              >
                <CardRow label="Task"><span style={{ color: NAVY }}>{task.task}</span></CardRow>
                <CardRow label="Category"><Chip>{task.category || '—'}</Chip></CardRow>
                <CardRow label="Assigned To">{task.assignedTo}</CardRow>
                <CardRow label="Target Date">{task.targetDate ? new Date(task.targetDate).toLocaleDateString('en-IN') : '—'}</CardRow>
              </MobileCard>
            ))}
          </div>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[820px] border-collapse text-[0.8rem]">
            <thead>
              <tr className="border-b border-[#E7EDF4] bg-[#F9FAFB]">
                {['Client', 'Task', 'Category', 'Status', 'Assigned To', 'Target Date'].map(h => <th key={h} className={thCls}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {tasks.length === 0 ? (
                <tr><td colSpan={6} className="py-14 text-center text-sm text-muted-foreground">No tasks found for the selected period.</td></tr>
              ) : tasks.map((task, i) => (
                <tr key={i} className="border-b border-[#EFF3F8] transition-colors hover:bg-[#F9FBFD]">
                  <td className="px-3 py-3 font-medium" style={{ color: NAVY }}>{task.client}</td>
                  <td className="px-3 py-3 text-foreground/80">{task.task}</td>
                  <td className="px-3 py-3"><Chip>{task.category || '—'}</Chip></td>
                  <td className="px-3 py-3"><span className={`inline-block rounded-md px-2 py-0.5 text-[0.68rem] font-medium ${statusColor(task.status)}`}>{statusLabel(task.status)}</span></td>
                  <td className="px-3 py-3 text-muted-foreground">{task.assignedTo}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-xs text-muted-foreground">{task.targetDate ? new Date(task.targetDate).toLocaleDateString('en-IN') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </ReportSection>
      )}

      {/* Billing & Revenue */}
      {activeReport === 'billing' && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <KPICard title="Total Revenue" value={rupees(totalRevenue)} icon={<IndianRupee size={22} />} />
            <KPICard title="Active Clients" value={billingReport.filter(c => c.status === 'Active').length} icon={<Users size={22} />} variant="success" />
            <KPICard title="Average Fee" value={rupees(billingReport.length > 0 ? Math.round(totalRevenue / billingReport.length) : 0)} icon={<TrendingUp size={22} />} />
          </div>

          <ReportSection title="Client Billing Report" onExport={() => exportToExcel('billing')}>
            {/* Mobile cards */}
            <div className="space-y-2.5 p-4 md:hidden">
              {billingReport.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No billing data.</p>
              ) : billingReport.map((client, i) => (
                <MobileCard
                  key={i}
                  title={client.name}
                  badge={<span className="text-sm font-semibold" style={{ color: NAVY }}>{rupees(client.totalFees)}</span>}
                  open={openCards.has(`b-${i}`)}
                  onToggle={() => toggleCard(`b-${i}`)}
                >
                  <CardRow label="ITR Fees">{rupees(client.itrFees)}</CardRow>
                  <CardRow label="GST Fees">{rupees(client.gstFees)}</CardRow>
                  <CardRow label="Accounting">{rupees(client.accountingFees)}</CardRow>
                  <CardRow label="Total Annual"><span style={{ color: NAVY }}>{rupees(client.totalFees)}</span></CardRow>
                  <CardRow label="Status">
                    <span className={`inline-block rounded-md px-2 py-0.5 text-[0.66rem] font-medium ${client.status === 'Active' ? 'bg-[rgba(78,167,46,0.12)] text-[#3d8a22]' : 'bg-slate-100 text-slate-600'}`}>{client.status}</span>
                  </CardRow>
                </MobileCard>
              ))}
            </div>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[820px] border-collapse text-[0.8rem]">
              <thead>
                <tr className="border-b border-[#E7EDF4] bg-[#F9FAFB]">
                  {['Client', 'ITR Fees', 'GST Fees', 'Accounting', 'Total Annual', 'Status'].map(h => <th key={h} className={thCls}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {billingReport.length === 0 ? (
                  <tr><td colSpan={6} className="py-14 text-center text-sm text-muted-foreground">No billing data.</td></tr>
                ) : billingReport.map((client, i) => (
                  <tr key={i} className="border-b border-[#EFF3F8] transition-colors hover:bg-[#F9FBFD]">
                    <td className="px-3 py-3 font-medium" style={{ color: NAVY }}>{client.name}</td>
                    <td className="px-3 py-3 text-foreground/80">{rupees(client.itrFees)}</td>
                    <td className="px-3 py-3 text-foreground/80">{rupees(client.gstFees)}</td>
                    <td className="px-3 py-3 text-foreground/80">{rupees(client.accountingFees)}</td>
                    <td className="px-3 py-3 font-semibold" style={{ color: NAVY }}>{rupees(client.totalFees)}</td>
                    <td className="px-3 py-3"><span className={`inline-block rounded-md px-2 py-0.5 text-[0.68rem] font-medium ${client.status === 'Active' ? 'bg-[rgba(78,167,46,0.12)] text-[#3d8a22]' : 'bg-slate-100 text-slate-600'}`}>{client.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </ReportSection>
        </>
      )}

      {/* Team Performance */}
      {activeReport === 'performance' && (
        <ReportSection title="Team Performance Report" onExport={() => exportToExcel('performance')}>
          {/* Mobile cards */}
          <div className="space-y-2.5 p-4 md:hidden">
            {performanceReport.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No data.</p>
            ) : performanceReport.map((member, i) => {
              const rate = parseFloat(member.completionRate);
              const barColor = rate >= 80 ? '#4ea72e' : rate >= 50 ? '#f59e0b' : '#ef4444';
              return (
                <MobileCard
                  key={i}
                  title={member.name}
                  badge={<span className="text-xs font-medium" style={{ color: barColor }}>{member.completionRate}% complete</span>}
                  open={openCards.has(`p-${i}`)}
                  onToggle={() => toggleCard(`p-${i}`)}
                >
                  <CardRow label="Role"><Chip>{member.role}</Chip></CardRow>
                  <CardRow label="Total Tasks">{member.totalTasks}</CardRow>
                  <CardRow label="Completed"><span className="inline-block rounded-md bg-[rgba(78,167,46,0.12)] px-2 py-0.5 text-[0.66rem] font-medium text-[#3d8a22]">{member.completed}</span></CardRow>
                  <CardRow label="In Progress"><span className="inline-block rounded-md bg-blue-100 px-2 py-0.5 text-[0.66rem] font-medium text-blue-700">{member.inProgress}</span></CardRow>
                  <CardRow label="Completion">
                    <span className="flex items-center justify-end gap-2">
                      <span className="h-2 w-24 overflow-hidden rounded-full bg-[#EEF2F7]">
                        <span className="block h-2 rounded-full" style={{ width: `${member.completionRate}%`, backgroundColor: barColor }} />
                      </span>
                      <span style={{ color: NAVY }}>{member.completionRate}%</span>
                    </span>
                  </CardRow>
                </MobileCard>
              );
            })}
          </div>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[820px] border-collapse text-[0.8rem]">
            <thead>
              <tr className="border-b border-[#E7EDF4] bg-[#F9FAFB]">
                {['Team Member', 'Role', 'Total', 'Completed', 'In Progress', 'Completion Rate'].map(h => <th key={h} className={thCls}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {performanceReport.map((member, i) => {
                const rate = parseFloat(member.completionRate);
                const barColor = rate >= 80 ? '#4ea72e' : rate >= 50 ? '#f59e0b' : '#ef4444';
                return (
                  <tr key={i} className="border-b border-[#EFF3F8] transition-colors hover:bg-[#F9FBFD]">
                    <td className="px-3 py-3 font-medium" style={{ color: NAVY }}>{member.name}</td>
                    <td className="px-3 py-3"><Chip>{member.role}</Chip></td>
                    <td className="px-3 py-3 text-foreground/80">{member.totalTasks}</td>
                    <td className="px-3 py-3"><span className="inline-block rounded-md bg-[rgba(78,167,46,0.12)] px-2 py-0.5 text-[0.68rem] font-medium text-[#3d8a22]">{member.completed}</span></td>
                    <td className="px-3 py-3"><span className="inline-block rounded-md bg-blue-100 px-2 py-0.5 text-[0.68rem] font-medium text-blue-700">{member.inProgress}</span></td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-[#EEF2F7]">
                          <div className="h-2 rounded-full" style={{ width: `${member.completionRate}%`, backgroundColor: barColor }} />
                        </div>
                        <span className="text-xs font-medium" style={{ color: NAVY }}>{member.completionRate}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </ReportSection>
      )}

      {/* Billing Records */}
      {activeReport === 'billing-records' && (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <KPICard title="Billed Tasks" value={filteredRecords.length} />
            <KPICard title="Billed Amount" value={money(totalBilled)} variant="success" />
            <KPICard title="Taxable Amount" value={money(totalTaxable)} />
            <KPICard title="Hours Logged" value={totalHours} />
            <KPICard title="This Month" value={billedThisMonth} variant="warning" />
          </div>

          <section className="overflow-hidden rounded-xl border border-[#E7EDF4] bg-white">
            <div className="flex flex-col gap-3.5 border-b border-[#E7EDF4] px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <h2 className="text-sm font-semibold" style={{ color: NAVY }}>Billing Records</h2>
                  <span className="rounded-full bg-[#F4F6F9] px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    {filteredRecords.length}{bHasFilters ? ` of ${billingRecords.length}` : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {bHasFilters && (
                    <button onClick={clearBFilters} className="rounded-full border border-[#E7EDF4] px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-[#F4F6F9] hover:text-foreground">Clear filters</button>
                  )}
                  <button onClick={exportBilling} className="inline-flex items-center gap-1.5 rounded-full bg-[#1b365d] px-3.5 py-1.5 text-xs font-medium text-white shadow-[0_8px_20px_-10px_rgba(27,54,93,0.6)] transition-all hover:bg-[#142a4a]">
                    <Download size={14} /> Export
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-[200px] flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input value={bSearch} onChange={e => setBSearch(e.target.value)} placeholder="Search client, task, bill no, staff…" className="w-full rounded-lg border border-[#E7EDF4] bg-white py-2 pl-9 pr-3 text-sm outline-none transition placeholder:text-muted-foreground/60 focus:border-[#1b365d] focus:ring-2 focus:ring-[#1b365d]/15" />
                </div>
                <FilterSelect value={bClient} onChange={e => setBClient(e.target.value)}>
                  <option value="all">All clients</option>
                  {uniqueBClients.map(c => <option key={c} value={c}>{c}</option>)}
                </FilterSelect>
                <FilterSelect value={bStaff} onChange={e => setBStaff(e.target.value)}>
                  <option value="all">All staff</option>
                  {uniqueBStaff.map(s => <option key={s} value={s}>{s}</option>)}
                </FilterSelect>
                <input type="date" value={bFrom} onChange={e => setBFrom(e.target.value)} className={inputCls} />
                <span className="text-sm text-muted-foreground">to</span>
                <input type="date" value={bTo} onChange={e => setBTo(e.target.value)} className={inputCls} />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] border-collapse text-[0.8rem]">
                <thead>
                  <tr className="border-b border-[#E7EDF4] bg-[#F9FAFB]">
                    {['Bill No', 'Date', 'Client', 'Task', 'Category', 'Staff', 'Budgeted', 'Taxable', 'Hrs', ''].map((h, i) => (
                      <th key={i} className={`${thCls} ${i === 6 || i === 7 ? 'text-right' : ''}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.length === 0 ? (
                    <tr><td colSpan={10} className="py-14 text-center text-sm text-muted-foreground">{bHasFilters ? 'No records match your filters.' : 'No billing records yet.'}</td></tr>
                  ) : filteredRecords.map(r => (
                    <tr key={r.id} className="border-b border-[#EFF3F8] transition-colors hover:bg-[#F9FBFD]">
                      <td className="px-3 py-3 font-mono text-xs font-medium" style={{ color: NAVY }}>{r.billNumber}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-xs text-muted-foreground">{new Date(r.billDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}</td>
                      <td className="px-3 py-3 font-medium" style={{ color: NAVY }}>{r.clientName}</td>
                      <td className="px-3 py-3 text-foreground/80">{r.taskName}</td>
                      <td className="px-3 py-3"><Chip>{r.category || '—'}</Chip></td>
                      <td className="px-3 py-3 text-muted-foreground">{r.assignedTo}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-right font-mono text-foreground/80">{money(r.budgetedFee || 0)}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-right font-mono font-semibold" style={{ color: NAVY }}>{money(r.taxableAmount || 0)}</td>
                      <td className="px-3 py-3 text-right text-muted-foreground">{r.hoursLogged || 0}</td>
                      <td className="px-3 py-3 text-right">
                        <button onClick={() => setSelectedRecord(r)} className="rounded-full border border-[#E7EDF4] px-3 py-1.5 text-xs font-medium transition-colors hover:bg-[#F4F6F9]" style={{ color: NAVY }}>View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {/* Billing record detail */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a1728]/60 p-4 backdrop-blur-sm">
          <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-[0_40px_120px_-30px_rgba(10,23,40,0.8)]">
            <div className="flex items-start justify-between gap-4 border-b border-[#E7EDF4] px-6 py-5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: 'rgba(27,54,93,0.08)', color: NAVY }}>
                  <Receipt size={20} />
                </span>
                <div>
                  <h2 className="text-[1.05rem] font-semibold" style={{ color: NAVY }}>Billing Record</h2>
                  <p className="font-mono text-xs text-muted-foreground">{selectedRecord.billNumber}</p>
                </div>
              </div>
              <button onClick={() => setSelectedRecord(null)} className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-[#F4F6F9] hover:text-foreground" aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-[#E7EDF4] p-4">
                  <p className="text-[0.62rem] uppercase tracking-[0.08em] text-muted-foreground">Budgeted Fee</p>
                  <p className="mt-1 text-xl font-semibold" style={{ color: NAVY }}>{money(selectedRecord.budgetedFee || 0)}</p>
                </div>
                <div className="rounded-xl border p-4" style={{ borderColor: 'rgba(78,167,46,0.3)', backgroundColor: 'rgba(78,167,46,0.05)' }}>
                  <p className="text-[0.62rem] uppercase tracking-[0.08em] text-muted-foreground">Taxable Amount</p>
                  <p className="mt-1 text-xl font-semibold" style={{ color: '#3d8a22' }}>{money(selectedRecord.taxableAmount || 0)}</p>
                </div>
              </div>
              <div className="overflow-hidden rounded-xl border border-[#E7EDF4]">
                <dl className="divide-y divide-[#F1F4F8]">
                  <CardRow label="Bill date">{new Date(selectedRecord.billDate).toLocaleDateString('en-IN')}</CardRow>
                  <CardRow label="Client"><span style={{ color: NAVY }}>{selectedRecord.clientName}</span></CardRow>
                  <CardRow label="Task"><span style={{ color: NAVY }}>{selectedRecord.taskName}</span></CardRow>
                  <CardRow label="Category">{selectedRecord.category || 'N/A'}</CardRow>
                  <CardRow label="Assigned to">{selectedRecord.assignedTo}</CardRow>
                  <CardRow label="Completion">{selectedRecord.completionDate ? new Date(selectedRecord.completionDate).toLocaleDateString('en-IN') : 'N/A'}</CardRow>
                  <CardRow label="Hours">{selectedRecord.hoursLogged || 0}</CardRow>
                  <CardRow label="Billed by">{selectedRecord.billedBy}</CardRow>
                  <CardRow label="Billed at">{selectedRecord.billedAt ? new Date(selectedRecord.billedAt).toLocaleString('en-IN') : '—'}</CardRow>
                  {selectedRecord.remarks && <CardRow label="Remarks"><span className="text-foreground/80">{selectedRecord.remarks}</span></CardRow>}
                </dl>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterSelect({ value, onChange, children }: { value: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; children: React.ReactNode }) {
  return (
    <div className="relative inline-flex">
      <select value={value} onChange={onChange} className="appearance-none rounded-lg border border-[#E7EDF4] bg-white py-2 pl-3 pr-9 text-sm text-foreground/80 outline-none transition focus:border-[#1b365d] focus:ring-2 focus:ring-[#1b365d]/15">
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

function ReportSection({ title, onExport, children }: { title: string; onExport: () => void; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-xl border border-[#E7EDF4] bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-[#E7EDF4] px-5 py-4">
        <h2 className="text-sm font-semibold" style={{ color: NAVY }}>{title}</h2>
        <button
          onClick={onExport}
          className="inline-flex items-center gap-1.5 rounded-full bg-[#1b365d] px-3.5 py-1.5 text-xs font-medium text-white shadow-[0_8px_20px_-10px_rgba(27,54,93,0.6)] transition-all hover:bg-[#142a4a]"
        >
          <Download size={14} /> Export
        </button>
      </div>
      {children}
    </section>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block whitespace-nowrap rounded-md px-2 py-0.5 text-[0.7rem] font-medium" style={{ backgroundColor: 'rgba(27,54,93,0.06)', color: NAVY }}>
      {children}
    </span>
  );
}

function MobileCard({ title, badge, open, onToggle, children }: {
  title: React.ReactNode; badge?: React.ReactNode; open: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#E7EDF4]">
      <button onClick={onToggle} className="flex w-full items-start gap-2.5 px-3.5 py-3 text-left">
        <div className="min-w-0 flex-1">
          <p className="text-[0.85rem] font-medium" style={{ color: NAVY }}>{title}</p>
          {badge && <div className="mt-1.5">{badge}</div>}
        </div>
        <ChevronDown size={16} className={`mt-0.5 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <dl className="divide-y divide-[#F1F4F8] border-t border-[#F1F4F8] px-3.5">{children}</dl>}
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
