import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { Input } from './Input';
import { Button } from './Button';
import { clientsAPI } from '../services/api';
import { DuplicateWarning, type PossibleDuplicate } from './clientModalUI';

interface CreateClientModalProps {
  onClose: () => void;
  onClientCreated: (clientName: string) => void;
}

/**
 * The quick "new client" from the task form. It asks for no PAN — the client
 * master form does — so the server records it as "PAN awaited", and a match
 * against an existing client offers that client for the task instead.
 */
export function CreateClientModal({ onClose, onClientCreated }: CreateClientModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string; existingName?: string } | null>(null);
  const [duplicates, setDuplicates] = useState<PossibleDuplicate[] | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    industry: '',
    gst: '',
    contact: '',
    email: '',
  });

  const save = async (confirmNotDuplicate = false) => {
    setLoading(true);
    setError(null);
    try {
      // This used to call onClientCreated whatever the server said, so a refused
      // client was handed to the task as if it existed.
      const response = await clientsAPI.create({
        name: formData.name,
        industry: formData.industry,
        gst: formData.gst,
        contact: formData.contact,
        email: formData.email,
        status: 'Active',
        confirmNotDuplicate,
      });
      if (response.success) {
        onClientCreated(formData.name);
        onClose();
      } else if (response.code === 'POSSIBLE_DUPLICATE') {
        setDuplicates(response.duplicates || []);
      } else {
        setError({ message: response.error || 'Failed to create client', existingName: response.existingClientName });
      }
    } catch (e) {
      console.error('Error creating client:', e);
      setError({ message: 'Failed to create client. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); save(false); };
  const useExisting = (name: string) => { onClientCreated(name); onClose(); };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Create New Client</CardTitle>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {duplicates && (
            <div className="mb-4">
              <DuplicateWarning
                duplicates={duplicates}
                busy={loading}
                onOpen={d => useExisting(d.name)}
                onSaveAnyway={() => save(true)}
                onBack={() => setDuplicates(null)}
              />
              <p className="mt-2 text-xs text-muted-foreground">"Open this client" uses that client for the task.</p>
            </div>
          )}
          {error && (
            <div className="mb-4 rounded-lg border border-[#F5C6C6] bg-[#FDECEC] px-3 py-2 text-sm text-[#c0392b]">
              {error.message}
              {error.existingName && (
                <button type="button" onClick={() => useExisting(error.existingName!)} className="ml-2 font-medium underline">
                  Use {error.existingName}
                </button>
              )}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Client Name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter client name"
              required
            />

            <Input
              label="Industry"
              type="text"
              value={formData.industry}
              onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
              placeholder="e.g., Manufacturing, IT Services, Retail"
              required
            />

            <Input
              label="GST Number"
              type="text"
              value={formData.gst}
              onChange={(e) => setFormData({ ...formData, gst: e.target.value })}
              placeholder="e.g., 24XXXXX1234X1Z5"
            />

            <Input
              label="Contact Number"
              type="tel"
              value={formData.contact}
              onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
              placeholder="e.g., 9876543210"
              required
            />

            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="client@example.com"
              required
            />

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={loading || !!duplicates} className="flex-1">
                {loading ? 'Creating...' : 'Create Client'}
              </Button>
              <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
