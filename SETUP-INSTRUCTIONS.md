# KAPS & Co. Office Management System - Setup Instructions

## Step 1: Create Database Tables in Supabase

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **SQL Editor** from the left sidebar
4. Click **New Query**
5. Open the file `database-schema.sql` in this project
6. Copy ALL the SQL commands from that file
7. Paste them into the Supabase SQL Editor
8. Click **RUN** to execute

This will:
- Create 3 main tables: `users`, `clients`, and `tasks`
- Add proper indexes for performance
- Insert all 12 KAPS & Co. users (Admin, Partners, Staff)
- Insert 3 sample clients
- Insert 5 sample tasks
- Set up auto-update triggers

## Step 2: Verify Data Installation

After running the SQL, verify the data was inserted:

1. In Supabase Dashboard, go to **Table Editor**
2. Check each table:
   - `users` - Should have 12 users
   - `clients` - Should have 3 clients
   - `tasks` - Should have 5 tasks

## Step 3: Deploy the Updated Backend

The backend has been updated to use real Supabase PostgreSQL database instead of KV store.

Your backend will automatically deploy when you save changes.

## Step 4: Test the Application

1. Login to the application
2. Try creating a new task as Partner
3. Switch to Team Member dashboard - the task should appear immediately
4. Update task status - changes should reflect in real-time
5. Create a new client - it should be available in the dropdown immediately

## What Changed?

### Before (KV Store):
- All data stored in a single `kv_store_0abfa7cf` table as JSON
- No schema validation
- No relationships between data
- Slower queries

### After (PostgreSQL Tables):
- Proper relational database with 3 tables
- Schema validation with CHECK constraints
- Foreign key relationships
- Faster queries with indexes
- Real-time updates
- Industry-standard SQL database

## Database Schema

### Users Table
- id, name, email, role, status
- Roles: Admin, Partner, Staff, Team Member

### Clients Table
- id, name, industry, gst, contact, email, status

### Tasks Table
- id, client, task, category, assigned_to, assigned_to_id
- priority, status, dates, hours, fees, comments
- Foreign key to users table

## Common Login Credentials

All users have the same password: **Pass@2026**

**Admin:**
- office@kapsca.in

**Partners:**
- apm@kapsca.in (Abhishek Patel)
- brijesh@kapsca.in (Brijesh Pitroda)

**Staff:** (9 team members - check Login page for all emails)

## Troubleshooting

### "Failed to fetch tasks/users/clients"
- Make sure you ran ALL SQL commands from database-schema.sql
- Check Supabase Dashboard > Table Editor to verify tables exist

### "No data showing"
- Verify sample data was inserted by checking Table Editor
- Check browser console for error messages

### "Foreign key constraint error"
- When creating tasks, make sure the assigned user exists in users table
- Use valid user IDs from the users table

## Need Help?

Check the browser console (F12) for detailed error messages. The backend logs errors with full details.
