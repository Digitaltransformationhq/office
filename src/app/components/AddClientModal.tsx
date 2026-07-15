import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { Button } from './Button';
import { Input } from './Input';
import { clientsAPI } from '../services/api';
import { useToast } from './Toast';

interface AddClientModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function AddClientModal({ onClose, onSuccess }: AddClientModalProps) {
  const [loading, setLoading] = useState(false);
  const { showSuccess, showError } = useToast();
  const [activeTab, setActiveTab] = useState<'basic' | 'billing'>('basic');
  const [formData, setFormData] = useState({
    // Basic Info
    name: '',
    pan: '',
    gstin: '',
    firmName: '',
    contact: '',
    email: '',
    industry: '',
    status: 'Active',
    // Billing Info
    itrFees: 0,
    gstFees: 0,
    gstAnnualReturnFees: 0,
    accountingFees: 0,
    auditFees: 0,
    companyActFees: 0,
    tdsFees: 0,
    pfEsicPtLabourFees: 0,
    consultancyFees: 0,
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

      const response = await clientsAPI.create(clientData);

      if (response.success) {
        showSuccess('Client created successfully!');
        onSuccess();
        onClose();
      } else {
        showError(response.error || 'Failed to create client');
      }
    } catch (error) {
      console.error('Error creating client:', error);
      showError('Failed to create client. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <Card className="w-full max-w-3xl my-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Add New Client</CardTitle>
            <Button
              size="sm"
              variant="secondary"
              onClick={onClose}
              disabled={loading}
            >
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
                      placeholder="ABC Enterprises"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Firm Name
                    </label>
                    <Input
                      type="text"
                      value={formData.firmName}
                      onChange={(e) => handleChange('firmName', e.target.value)}
                      placeholder="ABC Private Limited"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      PAN
                    </label>
                    <Input
                      type="text"
                      value={formData.pan}
                      onChange={(e) => handleChange('pan', e.target.value.toUpperCase())}
                      placeholder="ABCDE1234F"
                      maxLength={10}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      GSTIN
                    </label>
                    <Input
                      type="text"
                      value={formData.gstin}
                      onChange={(e) => handleChange('gstin', e.target.value.toUpperCase())}
                      placeholder="22ABCDE1234F1Z5"
                      maxLength={15}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Contact Number
                    </label>
                    <Input
                      type="tel"
                      value={formData.contact}
                      onChange={(e) => handleChange('contact', e.target.value)}
                      placeholder="+91 98765 43210"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Email
                    </label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      placeholder="contact@abcenterprises.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Industry
                    </label>
                    <Input
                      type="text"
                      value={formData.industry}
                      onChange={(e) => handleChange('industry', e.target.value)}
                      placeholder="Manufacturing, Trading, Services, etc."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Status
                    </label>
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
                  Enter annual fees for each service (₹)
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      ITR Fees
                    </label>
                    <Input
                      type="number"
                      value={formData.itrFees}
                      onChange={(e) => handleChange('itrFees', parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      min="0"
                      step="100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      GST Fees
                    </label>
                    <Input
                      type="number"
                      value={formData.gstFees}
                      onChange={(e) => handleChange('gstFees', parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      min="0"
                      step="100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      GST Annual Return Fees
                    </label>
                    <Input
                      type="number"
                      value={formData.gstAnnualReturnFees}
                      onChange={(e) => handleChange('gstAnnualReturnFees', parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      min="0"
                      step="100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Accounting Fees
                    </label>
                    <Input
                      type="number"
                      value={formData.accountingFees}
                      onChange={(e) => handleChange('accountingFees', parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      min="0"
                      step="100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Audit Fees
                    </label>
                    <Input
                      type="number"
                      value={formData.auditFees}
                      onChange={(e) => handleChange('auditFees', parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      min="0"
                      step="100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Company Act Fees
                    </label>
                    <Input
                      type="number"
                      value={formData.companyActFees}
                      onChange={(e) => handleChange('companyActFees', parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      min="0"
                      step="100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      TDS Fees
                    </label>
                    <Input
                      type="number"
                      value={formData.tdsFees}
                      onChange={(e) => handleChange('tdsFees', parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      min="0"
                      step="100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      PF, ESIC, PT, Labour Fees
                    </label>
                    <Input
                      type="number"
                      value={formData.pfEsicPtLabourFees}
                      onChange={(e) => handleChange('pfEsicPtLabourFees', parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      min="0"
                      step="100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Consultancy Fees
                    </label>
                    <Input
                      type="number"
                      value={formData.consultancyFees}
                      onChange={(e) => handleChange('consultancyFees', parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      min="0"
                      step="100"
                    />
                  </div>
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

            {/* Buttons */}
            <div className="flex gap-3 justify-end pt-4 border-t border-border">
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Create Client'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
