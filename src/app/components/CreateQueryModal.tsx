import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { Button } from './Button';
import { Input } from './Input';
import { useToast } from './Toast';

interface CreateQueryModalProps {
  clientId: number;
  clientName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateQueryModal({
  clientId,
  clientName,
  onClose,
  onSuccess
}: CreateQueryModalProps) {
  const [loading, setLoading] = useState(false);
  const { showSuccess, showError } = useToast();
  const [formData, setFormData] = useState({
    queryType: 'General',
    subject: '',
    description: '',
    priority: 'Medium',
  });

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.subject || !formData.description) {
      showError('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/queries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          queryType: formData.queryType,
          subject: formData.subject,
          description: formData.description,
          priority: formData.priority,
          status: 'Open',
        }),
      });

      const result = await response.json();

      if (result.success) {
        showSuccess('Query created successfully!');
        onSuccess();
        onClose();
      } else {
        showError(result.error || 'Failed to create query');
      }
    } catch (error) {
      console.error('Error creating query:', error);
      showError('Failed to create query. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Create Query</CardTitle>
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

            {/* Query Type */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Query Type <span className="text-destructive">*</span>
              </label>
              <select
                value={formData.queryType}
                onChange={(e) => handleChange('queryType', e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="General">General</option>
                <option value="ITR">Income Tax Return</option>
                <option value="GST">GST</option>
                <option value="Accounting">Accounting</option>
                <option value="Audit">Audit</option>
                <option value="TDS">TDS</option>
                <option value="Compliance">Compliance</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Subject <span className="text-destructive">*</span>
              </label>
              <Input
                type="text"
                value={formData.subject}
                onChange={(e) => handleChange('subject', e.target.value)}
                placeholder="Brief summary of your query"
                required
              />
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Priority <span className="text-destructive">*</span>
              </label>
              <select
                value={formData.priority}
                onChange={(e) => handleChange('priority', e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Description <span className="text-destructive">*</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Provide detailed information about your query..."
                className="w-full px-3 py-2 bg-background border border-border rounded focus:outline-none focus:ring-2 focus:ring-ring min-h-[150px]"
                required
              />
            </div>

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
                {loading ? 'Creating...' : 'Create Query'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
