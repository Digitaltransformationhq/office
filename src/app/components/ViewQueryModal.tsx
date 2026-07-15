import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { Button } from './Button';
import { Badge } from './Badge';
import { useToast } from './Toast';

interface ViewQueryModalProps {
  query: any;
  onClose: () => void;
  onUpdate: () => void;
}

export function ViewQueryModal({ query, onClose, onUpdate }: ViewQueryModalProps) {
  const [responses, setResponses] = useState<any[]>([]);
  const [newResponse, setNewResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    loadResponses();
  }, [query.id]);

  const loadResponses = async () => {
    try {
      const response = await fetch(`/api/queries/${query.id}/responses`);
      if (response.ok) {
        const data = await response.json();
        setResponses(data.data || []);
      }
    } catch (error) {
      console.error('Error loading responses:', error);
    }
  };

  const handleAddResponse = async () => {
    if (!newResponse.trim()) {
      showError('Please enter a response');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/queries/${query.id}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responseText: newResponse,
          isInternal: false,
        }),
      });

      const result = await response.json();

      if (result.success) {
        showSuccess('Response added successfully!');
        setNewResponse('');
        loadResponses();
        onUpdate();
      } else {
        showError(result.error || 'Failed to add response');
      }
    } catch (error) {
      console.error('Error adding response:', error);
      showError('Failed to add response. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    setLoading(true);

    try {
      const response = await fetch(`/api/queries/${query.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const result = await response.json();

      if (result.success) {
        showSuccess(`Query status updated to ${newStatus}`);
        onUpdate();
      } else {
        showError(result.error || 'Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      showError('Failed to update status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Open':
        return <Badge variant="warning">Open</Badge>;
      case 'In Progress':
        return <Badge variant="info">In Progress</Badge>;
      case 'Resolved':
        return <Badge variant="success">Resolved</Badge>;
      case 'Closed':
        return <Badge variant="default">Closed</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'High':
        return <Badge variant="danger">High</Badge>;
      case 'Medium':
        return <Badge variant="warning">Medium</Badge>;
      case 'Low':
        return <Badge variant="default">Low</Badge>;
      default:
        return <Badge variant="default">{priority}</Badge>;
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <Card className="w-full max-w-3xl my-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Query Details</CardTitle>
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
          {/* Query Info */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-medium mb-2">{query.subject}</h3>
                <p className="text-sm text-muted-foreground">{query.description}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t border-border">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Type</p>
                <Badge variant="primary">{query.queryType}</Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Priority</p>
                {getPriorityBadge(query.priority)}
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Status</p>
                {getStatusBadge(query.status)}
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Created</p>
                <p className="text-sm">{new Date(query.createdAt).toLocaleDateString('en-IN')}</p>
              </div>
            </div>
          </div>

          {/* Status Update Buttons */}
          {query.status !== 'Closed' && (
            <div className="flex gap-2 flex-wrap">
              <p className="text-sm text-muted-foreground w-full mb-2">Update Status:</p>
              {query.status !== 'In Progress' && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleUpdateStatus('In Progress')}
                  disabled={loading}
                >
                  Mark In Progress
                </Button>
              )}
              {query.status !== 'Resolved' && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleUpdateStatus('Resolved')}
                  disabled={loading}
                >
                  Mark Resolved
                </Button>
              )}
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleUpdateStatus('Closed')}
                disabled={loading}
              >
                Close Query
              </Button>
            </div>
          )}

          {/* Responses */}
          <div>
            <h4 className="font-medium mb-3">Conversation</h4>
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {responses.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No responses yet. Be the first to respond!
                </p>
              ) : (
                responses.map((resp) => (
                  <div
                    key={resp.id}
                    className={`p-3 rounded-lg ${
                      resp.isInternal ? 'bg-warning/10' : 'bg-muted/50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <p className="text-sm font-medium">{resp.respondedBy}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(resp.createdAt).toLocaleString('en-IN')}
                      </p>
                    </div>
                    <p className="text-sm">{resp.responseText}</p>
                    {resp.isInternal && (
                      <Badge variant="warning" className="mt-2">Internal Note</Badge>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Add Response */}
          {query.status !== 'Closed' && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Add Response
              </label>
              <textarea
                value={newResponse}
                onChange={(e) => setNewResponse(e.target.value)}
                placeholder="Type your response..."
                className="w-full px-3 py-2 bg-background border border-border rounded focus:outline-none focus:ring-2 focus:ring-ring min-h-[100px] mb-3"
              />
              <Button
                onClick={handleAddResponse}
                disabled={loading || !newResponse.trim()}
                size="sm"
              >
                {loading ? 'Sending...' : 'Send Response'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
