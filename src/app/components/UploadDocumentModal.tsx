import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { Button } from './Button';
import { Input } from './Input';
import { useToast } from './Toast';

interface UploadDocumentModalProps {
  clientId: number;
  clientName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function UploadDocumentModal({
  clientId,
  clientName,
  onClose,
  onSuccess
}: UploadDocumentModalProps) {
  const [loading, setLoading] = useState(false);
  const { showSuccess, showError } = useToast();
  const [formData, setFormData] = useState({
    documentName: '',
    documentType: 'ITR',
    financialYear: '2025-26',
    filePath: '',
  });

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // In production, you would upload to cloud storage and get URL
      // For now, we'll just use the file name
      handleChange('filePath', `uploads/${clientName}/${file.name}`);
      if (!formData.documentName) {
        handleChange('documentName', file.name);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.documentName || !formData.filePath) {
      showError('Please fill in all required fields and select a file');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          documentName: formData.documentName,
          documentType: formData.documentType,
          financialYear: formData.financialYear,
          filePath: formData.filePath,
        }),
      });

      const result = await response.json();

      if (result.success) {
        showSuccess('Document uploaded successfully!');
        onSuccess();
        onClose();
      } else {
        showError(result.error || 'Failed to upload document');
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      showError('Failed to upload document. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Upload Document</CardTitle>
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
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Client Info */}
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-sm">
                <span className="text-muted-foreground">Client:</span>{' '}
                <span className="font-medium">{clientName}</span>
              </p>
            </div>

            {/* Document Name */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Document Name <span className="text-destructive">*</span>
              </label>
              <Input
                type="text"
                value={formData.documentName}
                onChange={(e) => handleChange('documentName', e.target.value)}
                placeholder="e.g., ITR FY 2025-26"
                required
              />
            </div>

            {/* Document Type */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Document Type <span className="text-destructive">*</span>
              </label>
              <select
                value={formData.documentType}
                onChange={(e) => handleChange('documentType', e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="ITR">Income Tax Return (ITR)</option>
                <option value="GST">GST Return</option>
                <option value="Balance Sheet">Balance Sheet</option>
                <option value="P&L Statement">P&L Statement</option>
                <option value="Audit Report">Audit Report</option>
                <option value="TDS Certificate">TDS Certificate</option>
                <option value="Invoice">Invoice</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Financial Year */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Financial Year
              </label>
              <select
                value={formData.financialYear}
                onChange={(e) => handleChange('financialYear', e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="2025-26">2025-26</option>
                <option value="2024-25">2024-25</option>
                <option value="2023-24">2023-24</option>
                <option value="2022-23">2022-23</option>
                <option value="2021-22">2021-22</option>
              </select>
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Select File <span className="text-destructive">*</span>
              </label>
              <input
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                className="w-full px-3 py-2 bg-background border border-border rounded focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Accepted formats: PDF, Word, Excel, Images (Max 10MB)
              </p>
            </div>

            {formData.filePath && (
              <div className="bg-success/10 border border-success/20 rounded-lg p-3">
                <p className="text-sm text-success">
                  ✓ File ready to upload: {formData.filePath.split('/').pop()}
                </p>
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
                {loading ? 'Uploading...' : 'Upload Document'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
