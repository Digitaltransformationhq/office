import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { Button } from './Button';

interface DatabaseSetupModalProps {
  onClose: () => void;
}

export function DatabaseSetupModal({ onClose }: DatabaseSetupModalProps) {
  const [copied, setCopied] = useState(false);

  const sqlQuery = `-- Drop the existing check constraint
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;

-- Add the new check constraint with "Pending for Billing" and "Billed" included
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check 
  CHECK (status IN (
    'Pending', 
    'In Progress', 
    'Completed', 
    'Overdue', 
    'Pending Approval', 
    'Pending for Billing', 
    'Billed'
  ));

-- Verify the constraint was added successfully
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conname = 'tasks_status_check';`;

  const handleCopy = () => {
    navigator.clipboard.writeText(sqlQuery);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
      <Card className="w-full max-w-4xl my-8 border-2 border-warning">
        <CardHeader className="bg-warning/10">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <span className="text-4xl">⚠️</span>
              <div>
                <CardTitle className="text-warning text-xl mb-2">
                  Database Setup Required
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  The billing feature requires a one-time database update
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={onClose}
            >
              ✕
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {/* Error Explanation */}
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <h3 className="font-semibold text-destructive mb-2">❌ What's the problem?</h3>
            <p className="text-sm text-muted-foreground">
              The database currently blocks the "Billed" status. You're seeing error code <code className="bg-background px-1 rounded">23514</code> 
              which means a constraint violation.
            </p>
          </div>

          {/* Solution Steps */}
          <div className="bg-success/10 border border-success/20 rounded-lg p-4">
            <h3 className="font-semibold text-success mb-3">✅ How to fix it (3 easy steps)</h3>
            <div className="space-y-4">
              {/* Step 1 */}
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-success text-success-foreground rounded-full flex items-center justify-center font-bold">
                  1
                </div>
                <div>
                  <p className="font-medium mb-1">Open Supabase SQL Editor</p>
                  <p className="text-sm text-muted-foreground">
                    Go to your Supabase Dashboard → Click <strong>SQL Editor</strong> → Click <strong>New Query</strong>
                  </p>
                  <a 
                    href="https://supabase.com/dashboard/project/_/sql" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline inline-flex items-center gap-1 mt-1"
                  >
                    🔗 Open SQL Editor
                  </a>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-success text-success-foreground rounded-full flex items-center justify-center font-bold">
                  2
                </div>
                <div className="flex-1">
                  <p className="font-medium mb-2">Copy and paste this SQL query</p>
                  <div className="relative">
                    <pre className="bg-background border rounded-lg p-4 text-xs overflow-x-auto max-h-64">
                      <code>{sqlQuery}</code>
                    </pre>
                    <Button
                      size="sm"
                      onClick={handleCopy}
                      className="absolute top-2 right-2"
                    >
                      {copied ? '✓ Copied!' : '📋 Copy SQL'}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-success text-success-foreground rounded-full flex items-center justify-center font-bold">
                  3
                </div>
                <div>
                  <p className="font-medium mb-1">Run the query</p>
                  <p className="text-sm text-muted-foreground">
                    Click <strong>Run</strong> button or press <kbd className="px-2 py-0.5 bg-background border rounded text-xs">Ctrl+Enter</kbd> (or <kbd className="px-2 py-0.5 bg-background border rounded text-xs">Cmd+Enter</kbd> on Mac)
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Expected Result */}
          <div className="bg-info/10 border border-info/20 rounded-lg p-4">
            <h3 className="font-semibold text-info mb-2">📊 Expected Result</h3>
            <p className="text-sm text-muted-foreground mb-2">
              After running the SQL, you should see a success message and a verification table showing:
            </p>
            <div className="bg-background rounded border p-3 text-xs font-mono">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-1">constraint_name</th>
                    <th className="text-left py-1">constraint_definition</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-1">tasks_status_check</td>
                    <td className="py-1">CHECK (status = ANY (ARRAY[...7 values...]))</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* What This Does */}
          <div className="bg-muted rounded-lg p-4">
            <h3 className="font-semibold mb-2">🔧 What does this do?</h3>
            <p className="text-sm text-muted-foreground mb-2">
              This SQL updates the database to allow two new task statuses:
            </p>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4">
              <li>✓ <strong>"Pending for Billing"</strong> - Tasks completed and ready to invoice</li>
              <li>✓ <strong>"Billed"</strong> - Tasks that have been invoiced to clients</li>
            </ul>
          </div>

          {/* After Running */}
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
            <h3 className="font-semibold text-primary mb-2">🎉 After running the SQL</h3>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal ml-4">
              <li>Close this dialog and refresh the page</li>
              <li>Try marking a task as "Billed" again</li>
              <li>It should work without errors! 🎊</li>
            </ol>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-4 border-t">
            <Button
              onClick={handleCopy}
              className="flex-1"
            >
              {copied ? '✓ SQL Copied to Clipboard!' : '📋 Copy SQL Query'}
            </Button>
            <Button
              variant="secondary"
              onClick={onClose}
              className="flex-1"
            >
              I'll do this later
            </Button>
          </div>

          {/* Help Note */}
          <p className="text-xs text-center text-muted-foreground">
            💡 This is a one-time setup. Once done, billing will work for all users.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
