import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { Button } from './Button';
import { Badge } from './Badge';
import { useToast } from './Toast';
import { inquiriesAPI } from '../services/api';

interface ViewInquiryModalProps {
  inquiry: any;
  userId: number;
  userName: string;
  onClose: () => void;
  onUpdate: () => void;
}

export function ViewInquiryModal({ inquiry, userId, userName, onClose, onUpdate }: ViewInquiryModalProps) {
  const [communications, setCommunications] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingComms, setLoadingComms] = useState(true);
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    loadCommunications();
  }, [inquiry.id]);

  const loadCommunications = async () => {
    try {
      setLoadingComms(true);
      const response = await inquiriesAPI.getCommunications(inquiry.id);
      
      if (response.success) {
        setCommunications(response.data || []);
      } else {
        console.error('Failed to load communications:', response.error);
      }
    } catch (error) {
      console.error('Error loading communications:', error);
    } finally {
      setLoadingComms(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) {
      showError('Please enter a message');
      return;
    }

    setLoading(true);
    try {
      const response = await inquiriesAPI.addCommunication(inquiry.id, {
        message: newMessage,
        senderId: userId.toString(),
        senderName: userName,
        senderRole: 'user',
      });

      if (response.success) {
        showSuccess('Message sent successfully');
        setNewMessage('');
        loadCommunications();
      } else {
        showError(response.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      showError('Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pending Review':
        return <Badge variant="warning">⏳ Pending Review</Badge>;
      case 'Approved':
        return <Badge variant="success">✅ Approved</Badge>;
      case 'Converted to Client':
        return <Badge variant="success">🎉 Converted to Client</Badge>;
      case 'Rejected':
        return <Badge variant="danger">❌ Rejected</Badge>;
      case 'On Hold':
        return <Badge variant="secondary">⏸️ On Hold</Badge>;
      default:
        return <Badge variant="primary">{status}</Badge>;
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <Card className="w-full max-w-4xl my-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Inquiry Details</CardTitle>
            <Button
              size="sm"
              variant="secondary"
              onClick={onClose}
            >
              ✕
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Inquiry Details */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Inquiry Information</h3>
              {getStatusBadge(inquiry.status)}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Client Name</p>
                <p className="text-sm font-medium">{inquiry.client_name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Company Name</p>
                <p className="text-sm font-medium">{inquiry.company_name || '-'}</p>
              </div>
            </div>

            {inquiry.contact_person && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Contact Person</p>
                <p className="text-sm font-medium">{inquiry.contact_person}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Mobile Number</p>
                <p className="text-sm font-medium">{inquiry.mobile_number}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Email ID</p>
                <p className="text-sm font-medium">{inquiry.email || '-'}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Work Type</p>
                <Badge variant="primary">{inquiry.work_type}</Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Submitted By</p>
                <p className="text-sm font-medium">{inquiry.submitted_by}</p>
              </div>
            </div>

            {inquiry.expected_timeline && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Expected Timeline</p>
                <p className="text-sm font-medium">{inquiry.expected_timeline}</p>
              </div>
            )}

            {inquiry.source_of_inquiry && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Source of Inquiry</p>
                <p className="text-sm font-medium">{inquiry.source_of_inquiry}</p>
              </div>
            )}

            {inquiry.notes && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Notes</p>
                <p className="text-sm">{inquiry.notes}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-border">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Submitted On</p>
                <p className="text-sm">
                  {inquiry.created_at
                    ? new Date(inquiry.created_at).toLocaleString('en-IN')
                    : 'N/A'}
                </p>
              </div>
              {inquiry.reviewed_at && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Last Reviewed</p>
                  <p className="text-sm">
                    {new Date(inquiry.reviewed_at).toLocaleString('en-IN')}
                  </p>
                  {inquiry.reviewed_by && (
                    <p className="text-xs text-muted-foreground">by {inquiry.reviewed_by}</p>
                  )}
                </div>
              )}
            </div>

            {inquiry.rejection_reason && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">Rejection Reason</p>
                <p className="text-sm text-destructive">{inquiry.rejection_reason}</p>
              </div>
            )}
          </div>

          {/* Communication Thread */}
          <div className="border-t border-border pt-6">
            <h3 className="text-lg font-medium mb-4">Communication Thread</h3>
            
            {/* Messages */}
            <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
              {loadingComms ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading messages...
                </div>
              ) : communications.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground bg-muted/30 rounded-lg">
                  No messages yet. Send a message to communicate with the partner.
                </div>
              ) : (
                communications.map((comm) => (
                  <div
                    key={comm.id}
                    className={`flex ${comm.sender_role === 'partner' ? 'justify-start' : 'justify-end'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg p-3 ${
                        comm.sender_role === 'partner'
                          ? 'bg-primary/10 border border-primary/20'
                          : 'bg-muted border border-border'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-xs font-medium">{comm.sender_name}</p>
                        <Badge
                          variant={comm.sender_role === 'partner' ? 'primary' : 'secondary'}
                          className="text-xs"
                        >
                          {comm.sender_role === 'partner' ? 'Partner' : 'You'}
                        </Badge>
                      </div>
                      <p className="text-sm">{comm.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {comm.created_at
                          ? new Date(comm.created_at).toLocaleString('en-IN', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })
                          : ''}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Only allow sending messages if inquiry is not converted or rejected */}
            {inquiry.status !== 'Converted to Client' && inquiry.status !== 'Rejected' && (
              <div className="flex gap-2">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message to partner..."
                  className="flex-1 px-3 py-2 bg-background border border-border rounded focus:outline-none focus:ring-2 focus:ring-ring min-h-[80px]"
                  disabled={loading}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={loading || !newMessage.trim()}
                >
                  {loading ? 'Sending...' : 'Send'}
                </Button>
              </div>
            )}

            {(inquiry.status === 'Converted to Client' || inquiry.status === 'Rejected') && (
              <div className="bg-muted/50 border border-border rounded-lg p-3 text-center text-sm text-muted-foreground">
                This inquiry has been {inquiry.status.toLowerCase()}. Communication is now closed.
              </div>
            )}
          </div>

          {/* Close Button */}
          <div className="flex justify-end pt-4 border-t border-border">
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
