import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './Card';

export function InitializeData() {
  return (
    <Card className="max-w-2xl mx-auto mt-8">
      <CardHeader>
        <CardTitle>Database Setup Instructions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-accent/10 rounded-lg border border-accent/20">
          <p className="font-medium mb-2">⚠️ Database initialization has changed!</p>
          <p className="text-sm text-muted-foreground">
            We now use proper PostgreSQL tables instead of KV store.
          </p>
        </div>

        <div className="space-y-3">
          <h3 className="font-medium">Follow these steps:</h3>

          <div className="space-y-2">
            <div className="flex items-start gap-3 p-3 bg-muted rounded">
              <span className="flex items-center justify-center w-6 h-6 bg-primary text-primary-foreground rounded-full text-sm flex-shrink-0">1</span>
              <div>
                <p className="font-medium">Open Supabase Dashboard</p>
                <p className="text-sm text-muted-foreground">Go to your project → SQL Editor</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-muted rounded">
              <span className="flex items-center justify-center w-6 h-6 bg-primary text-primary-foreground rounded-full text-sm flex-shrink-0">2</span>
              <div>
                <p className="font-medium">Run the SQL Schema</p>
                <p className="text-sm text-muted-foreground">Copy ALL commands from <code className="bg-background px-1">database-schema.sql</code></p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-muted rounded">
              <span className="flex items-center justify-center w-6 h-6 bg-primary text-primary-foreground rounded-full text-sm flex-shrink-0">3</span>
              <div>
                <p className="font-medium">Verify Installation</p>
                <p className="text-sm text-muted-foreground">Check Table Editor for: users, clients, tasks tables</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 bg-success/10 rounded-lg border border-success/20">
          <p className="font-medium text-success mb-2">✅ What you'll get:</p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>12 KAPS & Co. users (1 Admin, 2 Partners, 9 Staff)</li>
            <li>3 Sample clients (ABC Enterprises, XYZ Corp, PQR Industries)</li>
            <li>5 Sample tasks with assignments</li>
            <li>Proper relational database with indexes and triggers</li>
          </ul>
        </div>

        <div className="text-sm text-muted-foreground bg-muted p-3 rounded">
          <p className="font-medium mb-1">📚 Need help?</p>
          <p>Check <code className="bg-background px-1">SETUP-INSTRUCTIONS.md</code> for detailed steps.</p>
          <p className="mt-1">Check <code className="bg-background px-1">TESTING-GUIDE.md</code> to test task creation.</p>
        </div>

        <div className="p-4 bg-warning/10 rounded-lg border border-warning/20">
          <p className="font-medium text-warning mb-2">⚠️ Getting "created_by column not found" error?</p>
          <p className="text-sm text-muted-foreground mb-2">
            After running the main schema, also run this migration:
          </p>
          <code className="text-xs bg-background px-2 py-1 rounded block">database-add-missing-columns.sql</code>
          <p className="text-sm text-muted-foreground mt-2">
            See <code className="bg-background px-1">QUICK-FIX.md</code> for instructions.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
