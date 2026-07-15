# ⚡ QUICK START - Approval Workflows

## 🎯 DO THESE 2 THINGS TO ACTIVATE

### 1️⃣ RUN SQL MIGRATION

**Supabase Dashboard** → **SQL Editor** → **New Query** → Paste this:

```sql
-- Copy entire contents of database-inquiry-system.sql and paste here
```

Then click **RUN**.

---

### 2️⃣ DEPLOY EDGE FUNCTION

**Supabase Dashboard** → **Edge Functions** → **make-server-0abfa7cf** → **Redeploy**

---

## ✅ TEST IT WORKS

Open in browser:
```
https://whhnkacjzfyidodqhbpw.supabase.co/functions/v1/make-server-0abfa7cf/health
```

Should show: `{"status":"ok"}`

---

## 🎉 THEN YOU'LL SEE

**Partner/Admin Dashboard:**
- 📋 Orange card: "Pending Task Approvals"
- 📨 Orange card: "Pending Inquiries"

**Staff Dashboard:**
- 📨 Button: "New Inquiry" (top right)

---

## 🔧 If Still Not Working

1. **Browser Console** (F12) → Check for errors
2. **Supabase** → **Edge Functions** → **Logs** → Look for red errors
3. Send me the error messages

---

**That's it! 2 steps and you're done.**
