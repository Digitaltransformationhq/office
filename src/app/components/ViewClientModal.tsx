import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { Button } from './Button';
import { Badge } from './Badge';
import { tasksAPI } from '../services/api';

interface ViewClientModalProps {
  client: any;
  onClose: () => void;
  onEdit?: () => void;
}

export function ViewClientModal({ client, onClose, onEdit }: ViewClientModalProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'billing' | 'tasks'>('details');
  const [clientTasks, setClientTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'tasks') {
      loadClientTasks();
    }
  }, [activeTab, client.id]);

  const loadClientTasks = async () => {
    setLoading(true);
    try {
      const response = await tasksAPI.getAll();
      const filtered = response.data.filter((task: any) => task.client === client.name);
      setClientTasks(filtered);
    } catch (error) {
      console.error('Error loading client tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <Card className="w-full max-w-4xl my-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{client.name}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{client.industry || 'N/A'}</p>
            </div>
            <div className="flex gap-2">
              {onEdit && (
                <Button size="sm" variant="secondary" onClick={onEdit}>
                  ✏️ Edit
                </Button>
              )}
              <Button size="sm" variant="secondary" onClick={onClose}>
                ✕
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b border-border">
            <button
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'details'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setActiveTab('details')}
            >
              Client Details
            </button>
            <button
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'billing'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setActiveTab('billing')}
            >
              Billing & Fees
            </button>
            <button
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'tasks'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setActiveTab('tasks')}
            >
              Tasks ({clientTasks.length})
            </button>
          </div>

          {/* Details Tab */}
          {activeTab === 'details' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-sm text-muted-foreground">Client Name</label>
                  <p className="font-medium">{client.name || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Firm Name</label>
                  <p className="font-medium">{client.firmName || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">PAN</label>
                  <p className="font-mono text-sm">{client.pan || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">GSTIN</label>
                  <p className="font-mono text-sm">{client.gstin || client.gst || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Contact</label>
                  <p className="font-medium">{client.contact || client.mobileNumber || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Email</label>
                  <p className="font-medium">{client.email || client.emailId || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Industry</label>
                  <p className="font-medium">{client.industry || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Status</label>
                  <div>
                    <Badge variant={client.status === 'Active' ? 'success' : 'default'}>
                      {client.status || 'Active'}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Billing Tab */}
          {activeTab === 'billing' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="border border-border rounded-lg p-4">
                  <label className="text-sm text-muted-foreground">ITR Fees</label>
                  <p className="text-lg font-semibold">{formatCurrency(client.itrFees || 0)}</p>
                </div>
                <div className="border border-border rounded-lg p-4">
                  <label className="text-sm text-muted-foreground">GST Fees</label>
                  <p className="text-lg font-semibold">{formatCurrency(client.gstFees || 0)}</p>
                </div>
                <div className="border border-border rounded-lg p-4">
                  <label className="text-sm text-muted-foreground">GST Annual Return</label>
                  <p className="text-lg font-semibold">{formatCurrency(client.gstAnnualReturnFees || 0)}</p>
                </div>
                <div className="border border-border rounded-lg p-4">
                  <label className="text-sm text-muted-foreground">Accounting Fees</label>
                  <p className="text-lg font-semibold">{formatCurrency(client.accountingFees || 0)}</p>
                </div>
                <div className="border border-border rounded-lg p-4">
                  <label className="text-sm text-muted-foreground">Audit Fees</label>
                  <p className="text-lg font-semibold">{formatCurrency(client.auditFees || 0)}</p>
                </div>
                <div className="border border-border rounded-lg p-4">
                  <label className="text-sm text-muted-foreground">Company Act Fees</label>
                  <p className="text-lg font-semibold">{formatCurrency(client.companyActFees || 0)}</p>
                </div>
                <div className="border border-border rounded-lg p-4">
                  <label className="text-sm text-muted-foreground">TDS Fees</label>
                  <p className="text-lg font-semibold">{formatCurrency(client.tdsFees || 0)}</p>
                </div>
                <div className="border border-border rounded-lg p-4">
                  <label className="text-sm text-muted-foreground">PF, ESIC, PT, Labour</label>
                  <p className="text-lg font-semibold">{formatCurrency(client.pfEsicPtLabourFees || 0)}</p>
                </div>
                <div className="border border-border rounded-lg p-4">
                  <label className="text-sm text-muted-foreground">Consultancy Fees</label>
                  <p className="text-lg font-semibold">{formatCurrency(client.consultancyFees || 0)}</p>
                </div>
              </div>

              <div className="bg-primary/10 border-2 border-primary rounded-lg p-6 mt-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Total Annual Fees:</span>
                  <span className="text-3xl font-bold text-primary">
                    {formatCurrency(client.totalFees || 0)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Tasks Tab */}
          {activeTab === 'tasks' && (
            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Loading tasks...</p>
                </div>
              ) : clientTasks.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No tasks found for this client</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {clientTasks.map((task) => (
                    <div key={task.id} className="border border-border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium">{task.task}</h4>
                          <p className="text-sm text-muted-foreground">{task.category}</p>
                        </div>
                        <Badge variant={
                          task.status === 'Completed' ? 'success' :
                          task.status === 'In Progress' ? 'info' :
                          'warning'
                        }>
                          {task.status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm mt-3">
                        <div>
                          <span className="text-muted-foreground">Assigned To:</span>
                          <p className="font-medium">{task.assignedTo}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Priority:</span>
                          <p className="font-medium">{task.priority}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Target Date:</span>
                          <p className="font-medium">
                            {task.targetDate ? new Date(task.targetDate).toLocaleDateString('en-IN') : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
