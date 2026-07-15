import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { Button } from './Button';
import { Input } from './Input';
import { useToast } from './Toast';

interface LogTimeModalProps {
  userId: number;
  userName: string;
  taskId?: number;
  taskName?: string;
  clientName?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function LogTimeModal({
  userId,
  userName,
  taskId,
  taskName,
  clientName,
  onClose,
  onSuccess
}: LogTimeModalProps) {
  const [loading, setLoading] = useState(false);
  const { showSuccess, showError } = useToast();
  const [formData, setFormData] = useState({
    taskName: taskName || '',
    clientName: clientName || '',
    hours: '',
    description: '',
    logDate: new Date().toISOString().split('T')[0],
  });

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.taskName || !formData.hours || !formData.logDate) {
      showError('Please fill in all required fields');
      return;
    }

    const hours = parseFloat(formData.hours);
    if (isNaN(hours) || hours <= 0 || hours > 24) {
      showError('Please enter valid hours (0-24)');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/timelog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          taskId: taskId || null,
          taskName: formData.taskName,
          clientName: formData.clientName || 'N/A',
          hours,
          description: formData.description,
          logDate: formData.logDate,
        }),
      });

      const result = await response.json();

      if (result.success) {
        showSuccess(`Time logged: ${hours} hours`);
        onSuccess();
        onClose();
      } else {
        showError(result.error || 'Failed to log time');
      }
    } catch (error) {
      console.error('Error logging time:', error);
      showError('Failed to log time. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Log Work Time</CardTitle>
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
            {/* Task Name */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Task Name <span className="text-destructive">*</span>
              </label>
              <Input
                type="text"
                value={formData.taskName}
                onChange={(e) => handleChange('taskName', e.target.value)}
                placeholder="e.g., GST Return Filing"
                required
                disabled={!!taskName}
              />
            </div>

            {/* Client Name */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Client Name
              </label>
              <Input
                type="text"
                value={formData.clientName}
                onChange={(e) => handleChange('clientName', e.target.value)}
                placeholder="e.g., ABC Enterprises"
                disabled={!!clientName}
              />
            </div>

            {/* Date and Hours */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Date <span className="text-destructive">*</span>
                </label>
                <Input
                  type="date"
                  value={formData.logDate}
                  onChange={(e) => handleChange('logDate', e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Hours <span className="text-destructive">*</span>
                </label>
                <Input
                  type="number"
                  value={formData.hours}
                  onChange={(e) => handleChange('hours', e.target.value)}
                  placeholder="e.g., 2.5"
                  min="0.5"
                  max="24"
                  step="0.5"
                  required
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Work Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Brief description of work done..."
                className="w-full px-3 py-2 bg-background border border-border rounded focus:outline-none focus:ring-2 focus:ring-ring min-h-[100px]"
              />
            </div>

            {/* Summary */}
            {formData.hours && (
              <div className="bg-info/10 border border-info/20 rounded-lg p-3">
                <p className="text-sm">
                  <span className="font-medium">Summary:</span> {formData.hours} hours on {formData.taskName || 'task'}
                  {formData.clientName && ` for ${formData.clientName}`}
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
                {loading ? 'Logging...' : 'Log Time'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
