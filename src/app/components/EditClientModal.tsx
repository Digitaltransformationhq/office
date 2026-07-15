import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { Button } from './Button';
import { Input } from './Input';
import { clientsAPI } from '../services/api';
import { useToast } from './Toast';

interface EditClientModalProps {
  client: any;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditClientModal({ client, onClose, onSuccess }: EditClientModalProps) {
  const [loading, setLoading] = useState(false);
  const { showSuccess, showError } = useToast();
  const [activeTab, setActiveTab] = useState<'basic' | 'billing'>('basic');
  const [formData, setFormData] = useState({
    name: client.name || '',
    pan: client.pan || '',
    gstin: client.gstin || client.gst || '',
    firmName: client.firmName || '',
    contact: client.contact || client.mobileNumber || '',
    email: client.email || client.emailId || '',
    industry: client.industry || '',
    status: client.status || 'Active',
    itrFees: client.itrFees || 0,
    gstFees: client.gstFees || 0,
    gstAnnualReturnFees: client.gstAnnualReturnFees || 0,
    accountingFees: client.accountingFees || 0,
    auditFees: client.auditFees || 0,
    companyActFees: client.companyActFees || 0,
    tdsFees: client.tdsFees || 0,
    pfEsicPtLabourFees: client.pfEsicPtLabourFees || 0,
    consultancyFees: client.consultancyFees || 0,
  });

  const handleChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const calculateTotal = () => {
    return formData.itrFees + formData.gstFees + formData.gstAnnualReturnFees +
           formData.accountingFees + formData.auditFees + formData.companyActFees +
           formData.tdsFees + formData.pfEsicPtLabourFees + formData.consultancyFees;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      showError('Client name is required');
      return;
    }

    setLoading(true);

    try {
      const clientData = {
        ...formData,
        totalFees: calculateTotal(),
      };

      const response = await clientsAPI.update(client.id, clientData);

      if (response.success) {
        showSuccess('Client updated successfully!');
        onSuccess();
        onClose();
      } else {
        showError(response.error || 'Failed to update client');
      }
    } catch (error) {
      console.error('Error updating client:', error);
      showError('Failed to update client. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <Card className="w-full max-w-3xl my-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Edit Client</CardTitle>
            <Button size="sm" variant="secondary" onClick={onClose} disabled={loading}>
              ✕
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b border-border">
            <button
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'basic'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setActiveTab('basic')}
            >
              Basic Information
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
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {activeTab === 'basic' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Client Name <span className="text-destructive">*</span>
                    </label>
                    <Input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Firm Name</label>
                    <Input
                      type="text"
                      value={formData.firmName}
                      onChange={(e) => handleChange('firmName', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">PAN</label>
                    <Input
                      type="text"
                      value={formData.pan}
                      onChange={(e) => handleChange('pan', e.target.value.toUpperCase())}
                      maxLength={10}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">GSTIN</label>
                    <Input
                      type="text"
                      value={formData.gstin}
                      onChange={(e) => handleChange('gstin', e.target.value.toUpperCase())}
                      maxLength={15}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Contact</label>
                    <Input
                      type="tel"
                      value={formData.contact}
                      onChange={(e) => handleChange('contact', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Email</label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Industry</label>
                    <Input
                      type="text"
                      value={formData.industry}
                      onChange={(e) => handleChange('industry', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => handleChange('status', e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-border rounded focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'billing' && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground mb-4">
                  Update annual fees for each service (₹)
                </p>

                <div className="grid grid-cols-2 gap-4">
                  {[
                    { key: 'itrFees', label: 'ITR Fees' },
                    { key: 'gstFees', label: 'GST Fees' },
                    { key: 'gstAnnualReturnFees', label: 'GST Annual Return' },
                    { key: 'accountingFees', label: 'Accounting Fees' },
                    { key: 'auditFees', label: 'Audit Fees' },
                    { key: 'companyActFees', label: 'Company Act Fees' },
                    { key: 'tdsFees', label: 'TDS Fees' },
                    { key: 'pfEsicPtLabourFees', label: 'PF, ESIC, PT, Labour' },
                    { key: 'consultancyFees', label: 'Consultancy Fees' },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <label className="block text-sm font-medium mb-2">{label}</label>
                      <Input
                        type="number"
                        value={(formData as any)[key]}
                        onChange={(e) => handleChange(key, parseFloat(e.target.value) || 0)}
                        min="0"
                        step="100"
                      />
                    </div>
                  ))}
                </div>

                <div className="bg-info/10 border border-info/20 rounded-lg p-4 mt-4">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Total Annual Fees:</span>
                    <span className="text-2xl font-bold text-primary">
                      ₹{calculateTotal().toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3 justify-end pt-4 border-t border-border">
              <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Updating...' : 'Update Client'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
