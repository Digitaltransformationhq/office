import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { Badge } from './Badge';
import { Button } from './Button';
import { Input } from './Input';

export function ClientDashboard() {
  const [chatMessages, setChatMessages] = useState([
    { id: 1, sender: 'CA', message: 'Hello! Your GST return has been filed successfully.', time: '10:30 AM' },
    { id: 2, sender: 'You', message: 'Thank you! When can I expect the acknowledgment?', time: '10:32 AM' },
    { id: 3, sender: 'CA', message: 'You should receive it within 24 hours. I will share it with you.', time: '10:35 AM' },
  ]);

  const documents = [
    { id: 1, name: 'GST Return - March 2026', type: 'PDF', date: '2026-04-15', size: '245 KB' },
    { id: 2, name: 'Income Tax Return - FY 2025-26', type: 'PDF', date: '2026-04-10', size: '512 KB' },
    { id: 3, name: 'TDS Certificate - Q4', type: 'PDF', date: '2026-04-05', size: '128 KB' },
  ];

  const dueDates = [
    { id: 1, title: 'GST Return Filing', date: '2026-05-20', status: 'Upcoming' },
    { id: 2, title: 'Advance Tax Payment', date: '2026-06-15', status: 'Upcoming' },
    { id: 3, title: 'TDS Return', date: '2026-05-31', status: 'Upcoming' },
  ];

  const observations = [
    { id: 1, title: 'Input Tax Credit', message: 'Please ensure all invoices are uploaded for claiming ITC in next quarter.', date: '2026-04-20' },
    { id: 2, title: 'Expense Documentation', message: 'Some expenses need proper bills for tax deduction purposes.', date: '2026-04-18' },
  ];

  return (
    <div className="max-w-md mx-auto space-y-4 pb-20">
      <div className="bg-primary text-primary-foreground p-6 rounded-lg">
        <h1 className="mb-1">Welcome!</h1>
        <p className="text-sm opacity-90">ABC Enterprises Pvt. Ltd.</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>My Documents</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {documents.map((doc) => (
            <div key={doc.id} className="p-4 border-b border-border last:border-0 hover:bg-muted cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📄</span>
                  <div>
                    <p className="text-sm">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">{doc.size} • {new Date(doc.date).toLocaleDateString('en-IN')}</p>
                  </div>
                </div>
                <Button size="sm" variant="secondary">
                  <span>⬇</span>
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Upcoming Due Dates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {dueDates.map((item, index) => (
            <div key={item.id} className="relative pl-8">
              <div className="absolute left-0 top-0 w-6 h-6 bg-info text-info-foreground rounded-full flex items-center justify-center text-xs">
                {index + 1}
              </div>
              {index < dueDates.length - 1 && (
                <div className="absolute left-3 top-6 w-0.5 h-full bg-border"></div>
              )}
              <div className="pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm">{item.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(item.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                  <Badge variant="info">{item.status}</Badge>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>CA Observations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {observations.map((obs) => (
            <div key={obs.id} className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
              <div className="flex items-start gap-2">
                <span className="text-lg">💡</span>
                <div className="flex-1">
                  <p className="text-sm">{obs.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{obs.message}</p>
                  <p className="text-xs text-muted-foreground mt-2">{new Date(obs.date).toLocaleDateString('en-IN')}</p>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Chat with CA</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="h-64 overflow-y-auto space-y-3">
            {chatMessages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender === 'You' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-lg ${msg.sender === 'You' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  <p className="text-sm">{msg.message}</p>
                  <p className={`text-xs mt-1 ${msg.sender === 'You' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                    {msg.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input type="text" placeholder="Type your message..." className="flex-1" />
            <Button>Send</Button>
          </div>
        </CardContent>
      </Card>

      <button className="fixed bottom-6 right-6 w-14 h-14 bg-accent text-accent-foreground rounded-full shadow-lg flex items-center justify-center text-2xl hover:scale-110 transition-transform">
        ❓
      </button>
    </div>
  );
}
