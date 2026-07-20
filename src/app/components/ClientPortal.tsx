import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { Button } from './Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './Table';
import { Badge } from './Badge';
import { UploadDocumentModal } from './UploadDocumentModal';
import { CreateQueryModal } from './CreateQueryModal';
import { ViewQueryModal } from './ViewQueryModal';
import { useToast } from './Toast';
import { statusLabel, isFinishedTask } from '../utils/taskStatus';

interface ClientPortalProps {
  clientId: number;
  clientName: string;
}

export function ClientPortal({ clientId, clientName }: ClientPortalProps) {
  const [activeTab, setActiveTab] = useState<'documents' | 'queries' | 'due-dates'>('documents');
  const [documents, setDocuments] = useState<any[]>([]);
  const [queries, setQueries] = useState<any[]>([]);
  const [dueDates, setDueDates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadDocument, setShowUploadDocument] = useState(false);
  const [showCreateQuery, setShowCreateQuery] = useState(false);
  const [selectedQuery, setSelectedQuery] = useState<any>(null);
  const [showViewQuery, setShowViewQuery] = useState(false);
  const { showError } = useToast();

  useEffect(() => {
    loadData();
  }, [clientId, activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);

      if (activeTab === 'documents') {
        const response = await fetch(`/api/documents/client/${clientId}`);
        if (response.ok) {
          const data = await response.json();
          setDocuments(data.data || []);
        }
      } else if (activeTab === 'queries') {
        const response = await fetch(`/api/queries/client/${clientId}`);
        if (response.ok) {
          const data = await response.json();
          setQueries(data.data || []);
        }
      } else if (activeTab === 'due-dates') {
        const response = await fetch(`/api/tasks/client/${clientId}`);
        if (response.ok) {
          const data = await response.json();
          const tasksWithDueDates = (data.data || []).filter((task: any) => task.targetDate);
          setDueDates(tasksWithDueDates);
        }
      }
    } catch (error) {
      console.error('Error loading client portal data:', error);
      showError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleViewQuery = (query: any) => {
    setSelectedQuery(query);
    setShowViewQuery(true);
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
    <div className="space-y-6">
      <div>
        <h1 className="text-foreground mb-2">{clientName} - Client Portal</h1>
        <p className="text-muted-foreground">Manage documents, queries, and track due dates</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        <button
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'documents'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('documents')}
        >
          📄 Documents
        </button>
        <button
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'queries'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('queries')}
        >
          💬 Queries
        </button>
        <button
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'due-dates'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('due-dates')}
        >
          📅 Due Dates
        </button>
      </div>

      {/* Documents Tab */}
      {activeTab === 'documents' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Documents</CardTitle>
              <Button size="sm" onClick={() => setShowUploadDocument(true)}>
                📤 Upload Document
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Financial Year</TableHead>
                  <TableHead>Uploaded On</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Loading documents...
                    </TableCell>
                  </TableRow>
                ) : documents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No documents found. Upload your first document!
                    </TableCell>
                  </TableRow>
                ) : (
                  documents.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>{doc.documentName}</TableCell>
                      <TableCell>
                        <Badge variant="primary">{doc.documentType}</Badge>
                      </TableCell>
                      <TableCell>{doc.financialYear || 'N/A'}</TableCell>
                      <TableCell>
                        {new Date(doc.createdAt).toLocaleDateString('en-IN')}
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="secondary">Download</Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Queries Tab */}
      {activeTab === 'queries' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Queries & Support</CardTitle>
              <Button size="sm" onClick={() => setShowCreateQuery(true)}>
                ➕ Create Query
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created On</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Loading queries...
                    </TableCell>
                  </TableRow>
                ) : queries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No queries found. Create your first query!
                    </TableCell>
                  </TableRow>
                ) : (
                  queries.map((query) => (
                    <TableRow key={query.id}>
                      <TableCell>{query.subject}</TableCell>
                      <TableCell>
                        <Badge variant="primary">{query.queryType}</Badge>
                      </TableCell>
                      <TableCell>{getPriorityBadge(query.priority)}</TableCell>
                      <TableCell>{getStatusBadge(query.status)}</TableCell>
                      <TableCell>
                        {new Date(query.createdAt).toLocaleDateString('en-IN')}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleViewQuery(query)}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Due Dates Tab */}
      {activeTab === 'due-dates' && (
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Due Dates</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Days Remaining</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Loading due dates...
                    </TableCell>
                  </TableRow>
                ) : dueDates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No upcoming due dates
                    </TableCell>
                  </TableRow>
                ) : (
                  dueDates.map((task) => {
                    const daysRemaining = Math.ceil(
                      (new Date(task.targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                    );
                    return (
                      <TableRow key={task.id}>
                        <TableCell>{task.task}</TableCell>
                        <TableCell>
                          <Badge variant="primary">{task.category}</Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(task.targetDate).toLocaleDateString('en-IN')}
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            isFinishedTask(task.status) ? 'success' :
                            task.status === 'In Progress' ? 'info' :
                            'warning'
                          }>
                            {statusLabel(task.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            daysRemaining < 0 ? 'danger' :
                            daysRemaining <= 3 ? 'warning' :
                            'default'
                          }>
                            {daysRemaining < 0
                              ? `${Math.abs(daysRemaining)} days overdue`
                              : `${daysRemaining} days`}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      {showUploadDocument && (
        <UploadDocumentModal
          clientId={clientId}
          clientName={clientName}
          onClose={() => setShowUploadDocument(false)}
          onSuccess={() => {
            loadData();
            setShowUploadDocument(false);
          }}
        />
      )}

      {showCreateQuery && (
        <CreateQueryModal
          clientId={clientId}
          clientName={clientName}
          onClose={() => setShowCreateQuery(false)}
          onSuccess={() => {
            loadData();
            setShowCreateQuery(false);
          }}
        />
      )}

      {showViewQuery && selectedQuery && (
        <ViewQueryModal
          query={selectedQuery}
          onClose={() => {
            setShowViewQuery(false);
            setSelectedQuery(null);
          }}
          onUpdate={() => {
            loadData();
          }}
        />
      )}
    </div>
  );
}
