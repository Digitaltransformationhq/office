# Location Tracking Setup Guide

## Overview

The system now tracks user login locations in real-time, storing geolocation data, IP addresses, and login history.

## Setup Steps

### 1. Run Database Updates

Open **Supabase Dashboard** → **SQL Editor** → **New Query**

Copy and paste ALL commands from `database-location-update.sql`:

```sql
-- This will:
-- ✅ Add location columns to users table
-- ✅ Create login_history table
-- ✅ Add indexes for performance
```

Click **RUN** to execute.

### 2. Verify Database Changes

Go to **Supabase Dashboard** → **Table Editor**

Check that:
- **users** table now has new columns:
  - `last_login_latitude`
  - `last_login_longitude`
  - `last_login_location`
  - `last_login_ip`
  
- **login_history** table exists with columns:
  - `id`, `user_id`, `user_name`, `user_email`
  - `login_time`, `latitude`, `longitude`, `location`
  - `ip_address`, `user_agent`, `status`

### 3. Test Location Tracking

1. **Clear browser localStorage**: `localStorage.clear()`
2. **Refresh the page** to see login screen
3. **Click Login** with any valid credentials
4. **Browser will ask**: "Allow location access?" → Click **Allow**
5. You should see: "Getting location..." message
6. Login completes with location stored

### 4. Verify Location Data

#### Check Users Table
```sql
SELECT 
  name, 
  email, 
  last_login_location, 
  last_login_ip,
  last_login
FROM users 
WHERE last_login_location IS NOT NULL
ORDER BY last_login DESC;
```

#### Check Login History
```sql
SELECT 
  user_name,
  login_time,
  location,
  ip_address,
  status
FROM login_history
ORDER BY login_time DESC
LIMIT 10;
```

## How It Works

### Login Flow

1. **User enters credentials** and clicks Login
2. **System gets IP address** from https://api.ipify.org
3. **Browser requests location permission**
4. **System gets GPS coordinates** (latitude, longitude)
5. **System converts coordinates to location name** using OpenStreetMap
6. **Data sent to backend** with login request
7. **Backend verifies credentials**
8. **Backend updates users table** with latest location
9. **Backend logs to login_history table**
10. **User logged in successfully**

### Data Stored

#### Users Table (Last Login Only)
- `last_login_latitude`: e.g., 22.3072
- `last_login_longitude`: e.g., 73.1812
- `last_login_location`: e.g., "Vadodara, Gujarat, India"
- `last_login_ip`: e.g., "103.25.45.67"
- `last_login`: Timestamp of last login

#### Login History Table (All Logins)
- Every login attempt (success and failed)
- Full location data for each login
- User agent (browser/device info)
- IP address for each login
- Timestamp for audit trail

## Privacy & Security

### Browser Permission
- Users must **allow location access**
- If denied, login continues with "Location not available"
- Not required for login to work

### Data Security
- All location data stored in **secure Supabase PostgreSQL**
- Only accessible by authenticated API calls
- Location data never shown publicly
- Admins can view login history for security

### Use Cases

✅ **Security Monitoring**: Detect unusual login locations
✅ **Audit Trail**: Track who logged in from where
✅ **Compliance**: Meet data access logging requirements
✅ **User Safety**: Alert users of suspicious login locations
✅ **Analytics**: Understand where team works from

## Viewing Login History

### For Admins
Admins can view all login history in Admin Dashboard (feature to be added):
- Recent logins by user
- Login locations on map
- Failed login attempts
- Suspicious activity alerts

### API Endpoint
```javascript
GET /login-history/:userId
```

Returns last 50 login attempts for a user.

## Location Data Examples

### Successful Login
```json
{
  "user_name": "Abhishek Patel",
  "login_time": "2026-04-25T14:30:45Z",
  "latitude": 22.3072,
  "longitude": 73.1812,
  "location": "Vadodara, Gujarat, India",
  "ip_address": "103.25.45.67",
  "user_agent": "Mozilla/5.0...",
  "status": "success"
}
```

### Failed Login Attempt
```json
{
  "user_name": "Unknown",
  "login_time": "2026-04-25T14:25:12Z",
  "latitude": null,
  "longitude": null,
  "location": "Location not available",
  "ip_address": "45.78.23.11",
  "user_agent": "Mozilla/5.0...",
  "status": "failed"
}
```

## Testing Different Scenarios

### Test 1: Normal Login with Location
1. Clear localStorage
2. Login with valid credentials
3. Allow location access
4. ✅ Location stored

### Test 2: Login Without Location
1. Clear localStorage
2. Login with valid credentials
3. Deny location access
4. ✅ Login works, location = "Location not available"

### Test 3: Failed Login
1. Clear localStorage
2. Login with wrong password
3. ✅ Failed attempt logged with location

### Test 4: Multiple Logins
1. Login as Partner from one browser
2. Login as Staff from another browser
3. ✅ Both logins tracked separately

## Troubleshooting

### Location Not Being Saved?

**Check:**
1. Did you run `database-location-update.sql`?
2. Check browser console for errors
3. Did browser ask for location permission?
4. Check Supabase logs for errors

### "Getting location..." Stuck?

**Solution:**
- Browser blocked location API
- Check browser permissions: Settings → Privacy → Location
- Allow location for your domain
- Or login continues after timeout

### IP Address Shows as Localhost?

**Expected in development:**
- When testing locally, IP may show as `127.0.0.1`
- In production, real IP will be captured
- Use a VPN test to see different IPs

### Location Permission Not Asking?

**Reasons:**
1. Already denied in past (check browser settings)
2. Not on HTTPS (location API requires secure connection)
3. Browser doesn't support geolocation

**Fix:**
- Chrome: `chrome://settings/content/location`
- Clear site permissions and try again

## Advanced Features (Future)

- 📍 **Map View**: Show login locations on world map
- 🚨 **Alerts**: Email when login from new location
- 📊 **Analytics**: Login patterns and trends
- 🔒 **Geo-Fencing**: Restrict login to specific regions
- 📱 **Device Tracking**: Track device used for login
- ⏱️ **Session Duration**: Track how long users stay logged in

## API Reference

### Login Endpoint
```
POST /make-server-0abfa7cf/login
```

**Request Body:**
```json
{
  "email": "user@kapsca.in",
  "password": "Pass@2026",
  "latitude": 22.3072,
  "longitude": 73.1812,
  "location": "Vadodara, Gujarat, India",
  "ipAddress": "103.25.45.67",
  "userAgent": "Mozilla/5.0..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user:10",
    "name": "Abhishek Patel",
    "email": "apm@kapsca.in",
    "role": "partner",
    "lastLoginLocation": "Vadodara, Gujarat, India"
  }
}
```

### Login History Endpoint
```
GET /make-server-0abfa7cf/login-history/:userId
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "login:123456_abc",
      "user_id": "user:10",
      "login_time": "2026-04-25T14:30:45Z",
      "location": "Vadodara, Gujarat, India",
      "latitude": 22.3072,
      "longitude": 73.1812,
      "ip_address": "103.25.45.67",
      "status": "success"
    }
  ]
}
```

## Summary

✅ **Real-time location tracking** on every login
✅ **IP address capture** for security
✅ **Full login history** stored in database
✅ **Privacy-friendly** (requires user permission)
✅ **Works offline** (login continues without location)
✅ **Production-ready** security and audit trail

Your KAPS & Co. system now has enterprise-grade login tracking! 🌍
