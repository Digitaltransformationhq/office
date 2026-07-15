import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { Input } from './Input';
import { Button } from './Button';
import { projectId, publicAnonKey } from '/utils/supabase/info';

interface ForgotPasswordProps {
  onBack: () => void;
}

export function ForgotPassword({ onBack }: ForgotPasswordProps) {
  const [step, setStep] = useState<'email' | 'otp' | 'reset'>('email');
  const [method, setMethod] = useState<'email' | 'mobile'>('email');
  const [contact, setContact] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!contact) {
      setError(`Please enter your ${method}`);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-0abfa7cf/send-otp`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            method,
            contact,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setOtpSent(true);
        setSuccess(`OTP sent to your ${method}! Check your inbox.`);
        setStep('otp');
      } else {
        setError(data.error || 'Failed to send OTP');
      }
    } catch (err) {
      console.error('Send OTP error:', err);
      setError('Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-0abfa7cf/verify-otp`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            method,
            contact,
            otp,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setSuccess('OTP verified! Now set your new password.');
        setStep('reset');
      } else {
        setError(data.error || 'Invalid OTP');
      }
    } catch (err) {
      console.error('Verify OTP error:', err);
      setError('Failed to verify OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-0abfa7cf/reset-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            method,
            contact,
            otp,
            newPassword,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setSuccess('Password reset successfully! You can now login with your new password.');
        setTimeout(() => {
          onBack();
        }, 2000);
      } else {
        setError(data.error || 'Failed to reset password');
      }
    } catch (err) {
      console.error('Reset password error:', err);
      setError('Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl mb-2 text-primary">KAPS & Co.</h1>
          <p className="text-muted-foreground">Password Recovery</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {step === 'email' && 'Forgot Password'}
              {step === 'otp' && 'Verify OTP'}
              {step === 'reset' && 'Set New Password'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {step === 'email' && (
              <form onSubmit={handleSendOTP} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Recovery Method</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        value="email"
                        checked={method === 'email'}
                        onChange={(e) => setMethod(e.target.value as 'email' | 'mobile')}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">Email OTP</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        value="mobile"
                        checked={method === 'mobile'}
                        onChange={(e) => setMethod(e.target.value as 'email' | 'mobile')}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">Mobile OTP</span>
                    </label>
                  </div>
                </div>

                <Input
                  label={method === 'email' ? 'Email Address' : 'Mobile Number'}
                  type={method === 'email' ? 'email' : 'tel'}
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder={method === 'email' ? 'Enter your email' : 'Enter your mobile number'}
                  required
                />

                {error && (
                  <div className="p-3 bg-destructive/10 text-destructive rounded text-sm">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="p-3 bg-success/10 text-success rounded text-sm">
                    {success}
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Sending OTP...' : 'Send OTP'}
                </Button>

                <Button type="button" variant="secondary" className="w-full" onClick={onBack}>
                  Back to Login
                </Button>
              </form>
            )}

            {step === 'otp' && (
              <form onSubmit={handleVerifyOTP} className="space-y-4">
                <div className="p-3 bg-info/10 text-info rounded text-sm">
                  OTP sent to your {method}. Please check and enter the 6-digit code.
                </div>

                <Input
                  label="Enter OTP"
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  required
                />

                {error && (
                  <div className="p-3 bg-destructive/10 text-destructive rounded text-sm">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="p-3 bg-success/10 text-success rounded text-sm">
                    {success}
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Verifying...' : 'Verify OTP'}
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  onClick={() => {
                    setStep('email');
                    setOtp('');
                    setError('');
                  }}
                >
                  Resend OTP
                </Button>
              </form>
            )}

            {step === 'reset' && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <Input
                  label="New Password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                />
                <Input
                  label="Confirm New Password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                />

                {error && (
                  <div className="p-3 bg-destructive/10 text-destructive rounded text-sm">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="p-3 bg-success/10 text-success rounded text-sm">
                    {success}
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Resetting Password...' : 'Reset Password'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
