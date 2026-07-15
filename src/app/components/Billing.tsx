import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './Table';
import { Button } from './Button';
import { Input } from './Input';
import { clientsAPI } from '../services/api';

interface BillingProps {
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export function Billing({ user }: BillingProps) {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<any>(null);

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      setLoading(true);
      const response = await clientsAPI.getAll();
      setClients(response.data || []);
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = clients.filter(client =>
    client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.fileNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.pan?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.firmName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    if (!amount) return '₹0';
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-muted-foreground">Loading billing data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-foreground mb-2">Billing & Fee Management</h1>
          <p className="text-muted-foreground">Client fee structure and billing details</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={loadClients}>
            🔄 Refresh
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <Input
            type="text"
            placeholder="Search by Client Name, File Number, PAN, or Firm Name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </CardContent>
      </Card>

      {/* Client Fee Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl mb-2">👥</div>
              <div className="text-2xl font-bold text-foreground">{clients.length}</div>
              <div className="text-sm text-muted-foreground">Total Clients</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl mb-2">💰</div>
              <div className="text-2xl font-bold text-foreground">
                {formatCurrency(clients.reduce((sum, c) => sum + (c.totalFees || 0), 0))}
              </div>
              <div className="text-sm text-muted-foreground">Total Fee Structure</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl mb-2">📊</div>
              <div className="text-2xl font-bold text-foreground">
                {formatCurrency(clients.reduce((sum, c) => sum + (c.totalFees || 0), 0) / (clients.length || 1))}
              </div>
              <div className="text-sm text-muted-foreground">Average Per Client</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl mb-2">✅</div>
              <div className="text-2xl font-bold text-foreground">
                {clients.filter(c => c.status === 'Active').length}
              </div>
              <div className="text-sm text-muted-foreground">Active Clients</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Client Billing Table */}
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
                  <TableHead className="min-w-[120px] text-right bg-accent font-bold">Total Fees</TableHead>
                  <TableHead className="min-w-[120px]">Mobile</TableHead>
                  <TableHead className="min-w-[200px]">Email</TableHead>
                  <TableHead className="min-w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={18} className="text-center text-muted-foreground py-8">
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
                      <TableCell className="text-right font-mono text-sm">{formatCurrency(client.itrFees || 0)}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{formatCurrency(client.gstFees || 0)}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{formatCurrency(client.gstAnnualReturnFees || 0)}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{formatCurrency(client.accountingFees || 0)}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{formatCurrency(client.auditFees || 0)}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{formatCurrency(client.companyActFees || 0)}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{formatCurrency(client.tdsFees || 0)}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{formatCurrency(client.pfEsicPtLabourFees || 0)}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{formatCurrency(client.consultancyFees || 0)}</TableCell>
                      <TableCell className="text-right font-bold text-primary bg-accent/50">{formatCurrency(client.totalFees || 0)}</TableCell>
                      <TableCell>{client.mobileNumber || client.contact || '-'}</TableCell>
                      <TableCell className="text-sm">{client.emailId || client.email || '-'}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setSelectedClient(client)}
                        >
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

      {/* Client Detail Modal */}
      {selectedClient && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Client Billing Details</CardTitle>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setSelectedClient(null)}
                >
                  ✕ Close
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Client Info */}
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

              {/* Fee Breakdown */}
              <div>
                <h3 className="font-semibold mb-4">Fee Structure</h3>
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
                    <div key={idx} className="flex justify-between items-center py-2 border-b border-border">
                      <span className="text-sm">{fee.label}</span>
                      <span className="font-mono font-medium">{formatCurrency(fee.value || 0)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center py-3 bg-accent rounded px-3 mt-2">
                    <span className="font-bold">Total Fees</span>
                    <span className="font-mono font-bold text-lg text-primary">{formatCurrency(selectedClient.totalFees || 0)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
