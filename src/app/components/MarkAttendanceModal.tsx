import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { Button } from './Button';
import { Input } from './Input';
import { useToast } from './Toast';

interface MarkAttendanceModalProps {
  userId: number;
  userName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function MarkAttendanceModal({ userId, userName, onClose, onSuccess }: MarkAttendanceModalProps) {
  const [loading, setLoading] = useState(false);
  const { showSuccess, showError } = useToast();
  const [formData, setFormData] = useState({
    attendanceDate: new Date().toISOString().split('T')[0],
    status: 'Present',
    checkInTime: new Date().toTimeString().slice(0, 5),
    checkOutTime: '',
    location: 'Office',
  });

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const calculateHours = () => {
    if (!formData.checkInTime || !formData.checkOutTime) return 0;
    const [inHour, inMin] = formData.checkInTime.split(':').map(Number);
    const [outHour, outMin] = formData.checkOutTime.split(':').map(Number);
    const inMinutes = inHour * 60 + inMin;
    const outMinutes = outHour * 60 + outMin;
    return ((outMinutes - inMinutes) / 60).toFixed(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.attendanceDate || !formData.checkInTime) {
      showError('Please fill in required fields');
      return;
    }

    if (formData.status === 'Present' && formData.checkOutTime) {
      const hours = parseFloat(calculateHours());
      if (hours < 0) {
        showError('Check-out time must be after check-in time');
        return;
      }
    }

    setLoading(true);

    try {
      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          attendanceDate: formData.attendanceDate,
          status: formData.status,
          checkInTime: formData.status === 'Present' ? formData.checkInTime : null,
          checkOutTime: formData.status === 'Present' && formData.checkOutTime ? formData.checkOutTime : null,
          totalHours: formData.status === 'Present' && formData.checkOutTime ? parseFloat(calculateHours()) : 0,
          location: formData.status === 'Present' ? formData.location : null,
        }),
      });

      const result = await response.json();

      if (result.success) {
        showSuccess('Attendance marked successfully!');
        onSuccess();
        onClose();
      } else {
        showError(result.error || 'Failed to mark attendance');
      }
    } catch (error) {
      console.error('Error marking attendance:', error);
      showError('Failed to mark attendance. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Mark Attendance</CardTitle>
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
            {/* Date */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Date <span className="text-destructive">*</span>
              </label>
              <Input
                type="date"
                value={formData.attendanceDate}
                onChange={(e) => handleChange('attendanceDate', e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                required
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Status <span className="text-destructive">*</span>
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="Present">Present</option>
                <option value="Absent">Absent</option>
                <option value="Half Day">Half Day</option>
                <option value="Leave">Leave</option>
              </select>
            </div>

            {/* Check In/Out Times (only for Present/Half Day) */}
            {(formData.status === 'Present' || formData.status === 'Half Day') && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Check-In Time <span className="text-destructive">*</span>
                    </label>
                    <Input
                      type="time"
                      value={formData.checkInTime}
                      onChange={(e) => handleChange('checkInTime', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Check-Out Time
                    </label>
                    <Input
                      type="time"
                      value={formData.checkOutTime}
                      onChange={(e) => handleChange('checkOutTime', e.target.value)}
                    />
                  </div>
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Location
                  </label>
                  <select
                    value={formData.location}
                    onChange={(e) => handleChange('location', e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="Office">Office</option>
                    <option value="Work From Home">Work From Home</option>
                    <option value="Client Site">Client Site</option>
                  </select>
                </div>

                {/* Calculated Hours */}
                {formData.checkInTime && formData.checkOutTime && (
                  <div className="bg-info/10 border border-info/20 rounded-lg p-3">
                    <p className="text-sm">
                      <span className="font-medium">Total Hours:</span> {calculateHours()} hours
                    </p>
                  </div>
                )}
              </>
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
                {loading ? 'Marking...' : 'Mark Attendance'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
