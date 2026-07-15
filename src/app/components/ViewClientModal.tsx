import React, { useState, useEffect } from 'react';
import { tasksAPI } from '../services/api';
import { X, Building2, Pencil } from 'lucide-react';
import { NAVY, rupees, FEE_FIELDS, ModalTabs, overlayCls, panelCls } from './clientModalUI';

interface ViewClientModalProps {
  client: any;
  onClose: () => void;
  onEdit?: () => void;
}

const TASK_STATUS: Record<string, string> = {
  'Completed': 'bg-[rgba(78,167,46,0.12)] text-[#3d8a22]',
  'In Progress': 'bg-blue-100 text-blue-700',
  'Pending': 'bg-[#FEF4E6] text-[#b7791f]',
  'Overdue': 'bg-[#FDECEC] text-[#c0392b]',
};

export function ViewClientModal({ client, onClose, onEdit }: ViewClientModalProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'billing' | 'tasks'>('details');
  const [clientTasks, setClientTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'tasks') loadClientTasks();
  }, [activeTab, client.id]);

  const loadClientTasks = async () => {
    setLoading(true);
    try {
      const response = await tasksAPI.getAll();
      setClientTasks((response.data || []).filter((task: any) => task.client === client.name));
    } catch (error) {
      console.error('Error loading client tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const details: [string, React.ReactNode, boolean][] = [
    ['Client name', client.name || 'N/A', false],
    ['Firm name', client.firmName || 'N/A', false],
    ['PAN', client.pan || 'N/A', true],
    ['GSTIN', client.gstin || client.gst || 'N/A', true],
    ['Contact', client.contact || client.mobileNumber || 'N/A', false],
    ['Email', client.email || client.emailId || 'N/A', false],
    ['Industry', client.industry || 'N/A', false],
  ];

  return (
    <div className={overlayCls}>
      <div className={`${panelCls} max-w-2xl`}>
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-[#E7EDF4] px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: 'rgba(27,54,93,0.08)', color: NAVY }}>
              <Building2 size={20} />
            </span>
            <div>
              <h2 className="text-[1.05rem] font-semibold" style={{ color: NAVY }}>{client.name}</h2>
              <p className="text-xs text-muted-foreground">{client.industry || 'Client record'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onEdit && (
              <button onClick={onEdit} className="inline-flex items-center gap-1.5 rounded-full border border-[#E7EDF4] px-3 py-1.5 text-xs font-medium transition-colors hover:bg-[#F4F6F9]" style={{ color: NAVY }}>
                <Pencil size={14} /> Edit
              </button>
            )}
            <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-[#F4F6F9] hover:text-foreground" aria-label="Close">
              <X size={18} />
            </button>
          </div>
        </div>

        <ModalTabs
          tabs={[{ key: 'details', label: 'Client Details' }, { key: 'billing', label: 'Billing & Fees' }, { key: 'tasks', label: `Tasks (${clientTasks.length})` }]}
          active={activeTab}
          onChange={setActiveTab}
        />

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {/* Details */}
          {activeTab === 'details' && (
            <div className="overflow-hidden rounded-xl border border-[#E7EDF4]">
              <dl className="divide-y divide-[#F1F4F8]">
                {details.map(([label, value, mono]) => (
                  <div key={label} className="flex items-start gap-4 px-4 py-2.5">
                    <dt className="w-28 shrink-0 pt-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{label}</dt>
                    <dd className={`flex-1 text-sm font-medium ${mono ? 'font-mono' : ''}`} style={{ color: NAVY }}>{value}</dd>
                  </div>
                ))}
                <div className="flex items-center gap-4 px-4 py-2.5">
                  <dt className="w-28 shrink-0 text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Status</dt>
                  <dd className="flex-1">
                    <span className={`inline-block rounded-md px-2 py-0.5 text-[0.72rem] font-medium ${client.status === 'Active' ? 'bg-[rgba(78,167,46,0.12)] text-[#3d8a22]' : 'bg-slate-100 text-slate-600'}`}>
                      {client.status || 'Active'}
                    </span>
                  </dd>
                </div>
              </dl>
            </div>
          )}

          {/* Billing */}
          {activeTab === 'billing' && (
            <div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {FEE_FIELDS.map(f => (
                  <div key={f.key} className="rounded-xl border border-[#E7EDF4] p-3.5">
                    <p className="text-[0.62rem] uppercase tracking-[0.08em] text-muted-foreground">{f.label}</p>
                    <p className="mt-1 text-[0.95rem] font-semibold" style={{ color: NAVY }}>{rupees(client[f.key] || 0)}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between rounded-xl border p-4" style={{ borderColor: 'rgba(27,54,93,0.2)', backgroundColor: 'rgba(27,54,93,0.04)' }}>
                <span className="text-sm font-medium" style={{ color: NAVY }}>Total annual fees</span>
                <span className="text-2xl font-semibold" style={{ color: NAVY }}>{rupees(client.totalFees || 0)}</span>
              </div>
            </div>
          )}

          {/* Tasks */}
          {activeTab === 'tasks' && (
            loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#1b365d] border-t-transparent" />
              </div>
            ) : clientTasks.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">No tasks found for this client.</p>
            ) : (
              <div className="space-y-2.5">
                {clientTasks.map(task => (
                  <div key={task.id} className="rounded-xl border border-[#E7EDF4] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold" style={{ color: NAVY }}>{task.task}</p>
                        <p className="truncate text-xs text-muted-foreground">{task.category}</p>
                      </div>
                      <span className={`shrink-0 rounded-md px-2 py-0.5 text-[0.68rem] font-medium ${TASK_STATUS[task.status] || 'bg-slate-100 text-slate-600'}`}>{task.status}</span>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-3 border-t border-[#F1F4F8] pt-3 text-xs">
                      <div><p className="text-[0.6rem] uppercase tracking-[0.08em] text-muted-foreground">Assigned</p><p className="mt-0.5 truncate font-medium" style={{ color: NAVY }}>{task.assignedTo}</p></div>
                      <div><p className="text-[0.6rem] uppercase tracking-[0.08em] text-muted-foreground">Priority</p><p className="mt-0.5 font-medium" style={{ color: NAVY }}>{task.priority}</p></div>
                      <div><p className="text-[0.6rem] uppercase tracking-[0.08em] text-muted-foreground">Target</p><p className="mt-0.5 font-medium" style={{ color: NAVY }}>{task.targetDate ? new Date(task.targetDate).toLocaleDateString('en-IN') : 'N/A'}</p></div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
