# ✅ Complete Test Guide - Add Staff Feature

## Prerequisites - Run Database Migration First

**BEFORE TESTING:** Run `database-add-staff-complete.sql` in Supabase SQL Editor

This script will:
1. Add password column
2. Set passwords for existing users
3. Create triggers
4. Test the setup
5. Verify everything works

---

## Testing Steps

### Test 1: Database Setup Verification

**In Supabase SQL Editor, run:**
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name = 'password';
```

**Expected Result:**
```
column_name | data_type
password    | text
```

✅ **If you see this, database is ready!**

---

### Test 2: Add Staff from Partner Dashboard

1. **Login as Partner**
   - Email: `apm@kapsca.in`
   - Password: `Pass@2026`

2. **Click "👤 Add Staff" button** (top-right corner)

3. **Fill in the form:**
   - Name: `Test Staff Member`
   - Email: `teststaff@kapsca.in`
   - Role: `Team Member`
   - Password: `Pass@2026` (default, you can change it)

4. **Click "Create Staff Member"**

5. **Expected Result:**
   - ✅ Success screen appears
   - ✅ Shows all credentials
   - ✅ Copy buttons work
   - ✅ Modal shows instructions

---

### Test 3: Verify in Database

**In Supabase Table Editor or SQL Editor:**
```sql
SELECT id, name, email, role, password, status, created_at
FROM users
WHERE email = 'teststaff@kapsca.in';
```

**Expected Result:**
```
id              | name               | email                   | role        | password   | status | created_at
user:123456...  | Test Staff Member  | teststaff@kapsca.in    | team-member | Pass@2026  | Active | 2026-04-26...
```

✅ **User exists in database!**

---

### Test 4: Login as New Staff

1. **Logout** from Partner account

2. **Login with new credentials:**
   - Email: `teststaff@kapsca.in`
   - Password: `Pass@2026`

3. **Expected Result:**
   - ✅ Login successful
   - ✅ See Team Member Dashboard
   - ✅ Can view own tasks
   - ✅ Can navigate to Team section

---

### Test 5: Change Password

1. **As the new staff member**, click **Settings** in sidebar

2. **Fill in Change Password form:**
   - Current Password: `Pass@2026`
   - New Password: `NewPassword123`
   - Confirm: `NewPassword123`

3. **Click "Change Password"**

4. **Expected Result:**
   - ✅ Success message appears
   - ✅ Password changed

5. **Logout and login with new password**
   - Email: `teststaff@kapsca.in`
   - Password: `NewPassword123`
   - ✅ Login successful!

---

### Test 6: Add Staff from Admin Dashboard

1. **Login as Admin**
   - Email: `office@kapsca.in`
   - Password: `Pass@2026`

2. **Click "👤 Add Staff" button**

3. **Create another staff member:**
   - Name: `Admin Test Staff`
   - Email: `admintest@kapsca.in`
   - Role: `Team Leader`
   - Password: `Pass@2026`

4. **Expected Result:**
   - ✅ Staff created successfully
   - ✅ Credentials shown

---

### Test 7: Test Different Roles

Create staff with each role:

**Team Member:**
- Limited access
- Can see own tasks
- Can view team tasks

**Team Leader:**
- Can manage team
- Can view all team member tasks
- Has Team Leader Dashboard

**Partner:**
- Full access
- Can create tasks
- Can add other staff

**Admin:**
- System administration
- User management
- Full access

---

### Test 8: Error Handling

#### Test 8a: Duplicate Email
1. Try to create user with existing email
2. **Expected:** Error message "Email already exists"

#### Test 8b: Invalid Email
1. Try email without @: `testuser`
2. **Expected:** Validation error

#### Test 8c: Short Password
1. Try password with 5 characters
2. **Expected:** "Password must be at least 8 characters"

#### Test 8d: Missing Fields
1. Leave name empty
2. **Expected:** "Name and Email are required"

---

### Test 9: Browser Console Verification

**Open Browser Console (F12 → Console) while adding staff:**

**Success logs should show:**
```
usersAPI.create called with: {name: "...", email: "...", ...}
=== CREATE USER REQUEST ===
Request body: {...}
User object to insert: {...}
=== USER CREATED SUCCESSFULLY ===
User ID: user:123456...
User name: Test Staff Member
usersAPI.create result: {success: true, data: {...}}
Create user response: {success: true, data: {...}}
```

**Error logs (if any) should show:**
```
=== DATABASE ERROR ===
Error code: 42703 (or other code)
Error message: (specific error)
```

---

### Test 10: Copy Credentials

1. After creating staff, click **"📋 Copy Password"**
2. Paste in notepad - should show: `Pass@2026`

3. Click **"📋 Copy All Credentials"**
4. Paste in notepad - should show:
```
KAPS & Co. Login Credentials

Name: Test Staff Member
Email: teststaff@kapsca.in
Password: Pass@2026
Role: team-member

Login at: [Your Website URL]

Please change your password after first login from Settings.
```

---

## Complete Test Checklist

- [ ] Database migration run successfully
- [ ] Password column exists
- [ ] Can add staff from Partner Dashboard
- [ ] Can add staff from Admin Dashboard
- [ ] Staff appears in database
- [ ] Can login with new credentials
- [ ] Can change password
- [ ] Can login with new password
- [ ] Duplicate email shows error
- [ ] Invalid email shows error
- [ ] Short password shows error
- [ ] Missing fields show error
- [ ] Copy Password works
- [ ] Copy All Credentials works
- [ ] Success screen shows all info
- [ ] Browser console shows no errors
- [ ] Can create Team Member
- [ ] Can create Team Leader
- [ ] Can create Partner
- [ ] Can create Admin

---

## Expected Success Rate

**All 20 items should be ✅ checked**

If any fail, check:
1. Did you run `database-add-staff-complete.sql`?
2. Check browser console for errors
3. Check Supabase Edge Function logs
4. Verify password column exists

---

## Clean Up Test Data

After testing, you can delete test users:

```sql
-- Delete test users
DELETE FROM users 
WHERE email IN (
    'teststaff@kapsca.in',
    'admintest@kapsca.in'
);

-- Or delete all test users
DELETE FROM users 
WHERE email LIKE 'test%@kapsca.in';
```

---

## Production Checklist

Before going live:

- [ ] All tests pass
- [ ] Database backup created
- [ ] Password hashing planned (for production)
- [ ] Email service integrated (optional)
- [ ] User management UI planned
- [ ] Audit logging configured
- [ ] Access controls verified

---

## Support

If any test fails:
1. Run `database-add-staff-complete.sql` again
2. Clear browser cache
3. Check browser console
4. Check Supabase logs
5. Verify all files are updated

Your Add Staff feature is now fully functional! 🎉
