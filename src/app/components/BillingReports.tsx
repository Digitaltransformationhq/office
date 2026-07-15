import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './Table';
import { Button } from './Button';
import { Input } from './Input';
import { Badge } from './Badge';
import { billingAPI, clientsAPI, usersAPI } from '../services/api';
import { AnnouncementBar } from './AnnouncementBar';

interface BillingReportsProps {
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export function BillingReports({ user }: BillingReportsProps) {
  const [billingRecords, setBillingRecords] = useState<any[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState('all');
  const [selectedStaff, setSelectedStaff] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [billingRecords, searchTerm, selectedClient, selectedStaff, startDate, endDate]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [billingRes, clientsRes, usersRes] = await Promise.all([
        billingAPI.getAll(),
        clientsAPI.getAll(),
        usersAPI.getAll(),
      ]);

      setBillingRecords(billingRes.data || []);
      setClients(clientsRes.data || []);
      setUsers(usersRes.data || []);
    } catch (error) {
      console.error('Error loading billing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...billingRecords];

    // Text search
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (record) =>
          record.clientName?.toLowerCase().includes(search) ||
          record.taskName?.toLowerCase().includes(search) ||
          record.billNumber?.toLowerCase().includes(search) ||
          record.assignedTo?.toLowerCase().includes(search)
      );
    }

    // Client filter
    if (selectedClient !== 'all') {
      filtered = filtered.filter((record) => record.clientName === selectedClient);
    }

    // Staff filter
    if (selectedStaff !== 'all') {
      filtered = filtered.filter((record) => record.assignedTo === selectedStaff);
    }

    // Date range filter
    if (startDate) {
      filtered = filtered.filter(
        (record) => new Date(record.billDate) >= new Date(startDate)
      );
    }
    if (endDate) {
      filtered = filtered.filter(
        (record) => new Date(record.billDate) <= new Date(endDate)
      );
    }

    setFilteredRecords(filtered);
  };

  const exportToCSV = () => {
    if (filteredRecords.length === 0) {
      alert('No records to export');
      return;
    }

    const headers = [
      'Bill Number',
      'Bill Date',
      'Client Name',
      'Task Name',
      'Category',
      'Assigned Staff',
      'Completion Date',
      'Budgeted Fee',
      'Taxable Amount',
      'Hours Logged',
      'Billed By',
      'Billed Date',
      'Remarks',
    ];

    const csvData = filteredRecords.map((record) => [
      record.billNumber,
      new Date(record.billDate).toLocaleDateString('en-IN'),
      record.clientName,
      record.taskName,
      record.category || '',
      record.assignedTo,
      record.completionDate ? new Date(record.completionDate).toLocaleDateString('en-IN') : '',
      `₹${record.budgetedFee || 0}`,
      `₹${record.taxableAmount || 0}`,
      record.hoursLogged || 0,
      record.billedBy,
      new Date(record.billedAt).toLocaleDateString('en-IN'),
      record.remarks || '',
    ]);

    const csv = [headers, ...csvData].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `billing-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const formatCurrency = (amount: number) => {
    if (!amount) return '₹0';
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const totalBilledAmount = filteredRecords.reduce(
    (sum, record) => sum + (record.budgetedFee || 0),
    0
  );

  const totalTaxableAmount = filteredRecords.reduce(
    (sum, record) => sum + (record.taxableAmount || 0),
    0
  );

  const totalHours = filteredRecords.reduce(
    (sum, record) => sum + (record.hoursLogged || 0),
    0
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-muted-foreground">Loading billing reports...</p>
        </div>
      </div>
    );
  }

  // Get unique client names for filter
  const uniqueClients = Array.from(new Set(billingRecords.map((r) => r.clientName))).sort();

  // Get unique staff names for filter
  const uniqueStaff = Array.from(new Set(billingRecords.map((r) => r.assignedTo))).sort();

  return (
    <div className="space-y-0">
      <AnnouncementBar />

      <div className="space-y-6 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-foreground mb-2">Billing Reports</h1>
            <p className="text-muted-foreground">
              View and export all billed task records
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={loadData}>
              🔄 Refresh
            </Button>
            <Button
              size="sm"
              onClick={exportToCSV}
              disabled={filteredRecords.length === 0}
            >
              📊 Export to Excel
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl mb-2">📋</div>
                <div className="text-2xl font-bold text-foreground">
                  {filteredRecords.length}
                </div>
                <div className="text-sm text-muted-foreground">Total Billed Tasks</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl mb-2">💰</div>
                <div className="text-2xl font-bold text-foreground">
                  {formatCurrency(totalBilledAmount)}
                </div>
                <div className="text-sm text-muted-foreground">Total Billed Amount</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl mb-2">💵</div>
                <div className="text-2xl font-bold text-foreground">
                  {formatCurrency(totalTaxableAmount)}
                </div>
                <div className="text-sm text-muted-foreground">Total Taxable Amount</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl mb-2">⏱️</div>
                <div className="text-2xl font-bold text-foreground">{totalHours}</div>
                <div className="text-sm text-muted-foreground">Total Hours Logged</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl mb-2">📅</div>
                <div className="text-2xl font-bold text-foreground">
                  {filteredRecords.filter(r => {
                    const billDate = new Date(r.billDate);
                    const now = new Date();
                    return billDate.getMonth() === now.getMonth() && 
                           billDate.getFullYear() === now.getFullYear();
                  }).length}
                </div>
                <div className="text-sm text-muted-foreground">Billed This Month</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {/* Search */}
              <div className="md:col-span-2">
                <Input
                  type="text"
                  placeholder="Search by client, task, bill number, or staff..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>

              {/* Client Filter */}
              <div>
                <select
                  value={selectedClient}
                  onChange={(e) => setSelectedClient(e.target.value)}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="all">All Clients</option>
                  {uniqueClients.map((client) => (
                    <option key={client} value={client}>
                      {client}
                    </option>
                  ))}
                </select>
              </div>

              {/* Staff Filter */}
              <div>
                <select
                  value={selectedStaff}
                  onChange={(e) => setSelectedStaff(e.target.value)}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="all">All Staff</option>
                  {uniqueStaff.map((staff) => (
                    <option key={staff} value={staff}>
                      {staff}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Range */}
              <div className="flex gap-2 md:col-span-3 lg:col-span-1">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  placeholder="From"
                  className="flex-1"
                />
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  placeholder="To"
                  className="flex-1"
                />
              </div>
            </div>

            {/* Clear Filters */}
            {(searchTerm || selectedClient !== 'all' || selectedStaff !== 'all' || startDate || endDate) && (
              <div className="mt-3">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedClient('all');
                    setSelectedStaff('all');
                    setStartDate('');
                    setEndDate('');
                  }}
                >
                  ✕ Clear Filters
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Billing Records Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Billing Records</CardTitle>
              <span className="text-sm text-muted-foreground">
                {filteredRecords.length} record{filteredRecords.length !== 1 ? 's' : ''}
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[120px]">Bill Number</TableHead>
                    <TableHead className="min-w-[100px]">Bill Date</TableHead>
                    <TableHead className="min-w-[180px]">Client Name</TableHead>
                    <TableHead className="min-w-[200px]">Task Name</TableHead>
                    <TableHead className="min-w-[120px]">Category</TableHead>
                    <TableHead className="min-w-[150px]">Assigned Staff</TableHead>
                    <TableHead className="min-w-[120px]">Completion Date</TableHead>
                    <TableHead className="min-w-[120px] text-right">Budgeted Fee</TableHead>
                    <TableHead className="min-w-[130px] text-right bg-accent font-bold">Taxable Amount</TableHead>
                    <TableHead className="min-w-[100px] text-right">Hours</TableHead>
                    <TableHead className="min-w-[150px]">Billed By</TableHead>
                    <TableHead className="min-w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={12} className="text-center text-muted-foreground py-8">
                        {searchTerm || selectedClient !== 'all' || selectedStaff !== 'all' || startDate || endDate
                          ? 'No billing records found matching your filters.'
                          : 'No billing records available yet.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRecords.map((record) => (
                      <TableRow key={record.id} className="hover:bg-muted/50">
                        <TableCell className="font-mono font-medium">
                          {record.billNumber}
                        </TableCell>
                        <TableCell>
                          {new Date(record.billDate).toLocaleDateString('en-IN')}
                        </TableCell>
                        <TableCell className="font-medium">{record.clientName}</TableCell>
                        <TableCell>{record.taskName}</TableCell>
                        <TableCell>
                          <Badge variant="info">{record.category || 'N/A'}</Badge>
                        </TableCell>
                        <TableCell>{record.assignedTo}</TableCell>
                        <TableCell>
                          {record.completionDate
                            ? new Date(record.completionDate).toLocaleDateString('en-IN')
                            : 'N/A'}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(record.budgetedFee || 0)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-primary bg-accent/50">
                          {formatCurrency(record.taxableAmount || 0)}
                        </TableCell>
                        <TableCell className="text-right">{record.hoursLogged || 0}</TableCell>
                        <TableCell>{record.billedBy}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setSelectedRecord(record)}
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
      </div>

      {/* Record Detail Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Billing Record Details</CardTitle>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setSelectedRecord(null)}
                >
                  ✕ Close
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Billing Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Bill Number</div>
                  <div className="font-mono font-bold text-lg">{selectedRecord.billNumber}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Bill Date</div>
                  <div className="font-medium">
                    {new Date(selectedRecord.billDate).toLocaleDateString('en-IN')}
                  </div>
                </div>
              </div>

              {/* Task Info */}
              <div>
                <h3 className="font-semibold mb-3 text-foreground">Task Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Client Name</div>
                    <div className="font-medium">{selectedRecord.clientName}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Task Name</div>
                    <div className="font-medium">{selectedRecord.taskName}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Category</div>
                    <div className="font-medium">{selectedRecord.category || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Assigned To</div>
                    <div className="font-medium">{selectedRecord.assignedTo}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Completion Date</div>
                    <div className="font-medium">
                      {selectedRecord.completionDate
                        ? new Date(selectedRecord.completionDate).toLocaleDateString('en-IN')
                        : 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Hours Logged</div>
                    <div className="font-medium">{selectedRecord.hoursLogged || 0} hours</div>
                  </div>
                </div>
              </div>

              {/* Financial Info */}
              <div>
                <h3 className="font-semibold mb-3 text-foreground">Financial Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-accent rounded-lg p-4">
                    <div className="text-sm text-muted-foreground mb-1">Budgeted Fee</div>
                    <div className="text-2xl font-bold text-primary">
                      {formatCurrency(selectedRecord.budgetedFee || 0)}
                    </div>
                  </div>
                  <div className="bg-success/10 border-2 border-success rounded-lg p-4">
                    <div className="text-sm text-muted-foreground mb-1">Taxable Amount</div>
                    <div className="text-2xl font-bold text-success">
                      {formatCurrency(selectedRecord.taxableAmount || 0)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Audit Info */}
              <div>
                <h3 className="font-semibold mb-3 text-foreground">Audit Trail</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Billed By</div>
                    <div className="font-medium">{selectedRecord.billedBy}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Billed At</div>
                    <div className="font-medium">
                      {new Date(selectedRecord.billedAt).toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>
              </div>

              {/* Remarks */}
              {selectedRecord.remarks && (
                <div>
                  <h3 className="font-semibold mb-2 text-foreground">Remarks</h3>
                  <div className="bg-muted p-3 rounded-lg text-sm">
                    {selectedRecord.remarks}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}