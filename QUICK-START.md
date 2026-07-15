# Quick Start - Database Initialization

## ⚠️ You're seeing "Invalid email or password" because the database is empty!

Follow these steps to initialize the database:

---

## Step 1: Open Supabase Dashboard

1. Go to: https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** in the left sidebar

---

## Step 2: Run Database Schema

1. In this project, open the file: `database-schema.sql`
2. **Copy ALL the SQL code** (the entire file)
3. In Supabase SQL Editor:
   - Click **"New query"**
   - Paste all the SQL code
   - Click **"Run"** (or press F5)

You should see success messages like:
```
✅ Users table created
✅ 12 users inserted
✅ Clients table created
✅ Tasks table created
```

---

## Step 3: Verify Tables Created

In Supabase Dashboard:
1. Click **"Table Editor"** in left sidebar
2. You should see these tables:
   - ✅ `users` (12 rows)
   - ✅ `clients` (3 rows)
   - ✅ `tasks` (5 rows)

---

## Step 4: Login to the Application

Now you can login with any of these accounts:

### **Partners:**
- Email: `apm@kapsca.in`
- Password: `Pass@2026`

OR

- Email: `brijesh@kapsca.in`
- Password: `Pass@2026`

### **Admin:**
- Email: `office@kapsca.in`
- Password: `Pass@2026`

### **Staff Members:**
- Email: `caoffice@kapsca.in`
- Password: `Pass@2026`

OR

- Email: `audit1@kapsca.in` (Anjali Vasava - has billing access)
- Password: `Pass@2026`

**All users have the same default password:** `Pass@2026`

---

## Step 5: Run Additional Migrations (Optional)

If you want the billing and task reassignment features:

### For Billing System:
1. Open: `database-client-fees-update.sql`
2. Copy all SQL code
3. Run in Supabase SQL Editor

### For Task Reassignment:
1. Open: `database-task-reassignment-update.sql`
2. Copy all SQL code
3. Run in Supabase SQL Editor

---

## Troubleshooting

### Still getting login error?

**Check in Supabase:**
1. Go to SQL Editor
2. Run this query:
```sql
SELECT id, name, email, role FROM users;
```

3. If it returns "relation users does not exist" → You need to run `database-schema.sql`
4. If it returns 0 rows → The users weren't inserted, run the schema again
5. If it returns 12 rows → Database is set up! Try logging in again

### Can't find SQL Editor?

- Make sure you're in the correct Supabase project
- SQL Editor is in the left sidebar of the Supabase Dashboard
- If you don't see it, check your Supabase project permissions

---

## What Gets Created

### 12 Users:
- 1 Admin: `office@kapsca.in`
- 2 Partners: `apm@kapsca.in`, `brijesh@kapsca.in`
- 9 Staff Members: Various emails (see database-schema.sql)

### 3 Sample Clients:
- ABC Enterprises
- XYZ Corporation
- PQR Industries

### 5 Sample Tasks:
- ITR Filing tasks
- GST Return tasks
- Audit tasks

All with proper relationships and foreign keys.

---

## Next Steps

After successful login:

1. ✅ **View Dashboard** - See your role-specific dashboard
2. ✅ **Check Tasks** - Go to "Tasks" tab to see sample tasks
3. ✅ **Test Reassignment** - Try reassigning a task to another user
4. ✅ **Add Clients** - Add your real client data
5. ✅ **Create Tasks** - Start creating real tasks

---

## Need Help?

- Check: `TASK-REASSIGNMENT-GUIDE.md` for task assignment help
- Check: `TESTING-GUIDE.md` for testing instructions (if it exists)
- Check Supabase logs if you encounter errors

**Once the database is initialized, you're ready to go! 🚀**
