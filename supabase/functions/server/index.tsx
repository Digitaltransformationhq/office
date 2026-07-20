import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kvStore from "./kv_store.tsx";

const app = new Hono();

// Create Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Web Push (VAPID) — keys provided via environment variables
const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:brijesh@kapsca.in';

// Lazy-load web-push so a load failure can never break the rest of the API.
let _webpush: any = null;
let _webpushTried = false;
async function getWebpush() {
  if (_webpushTried) return _webpush;
  _webpushTried = true;
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return null;
  try {
    const mod: any = await import('npm:web-push@3.6.7');
    _webpush = mod.default || mod;
    _webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
  } catch (e) {
    console.log('web-push load failed:', e);
    _webpush = null;
  }
  return _webpush;
}

// Send a browser push to all of a user's subscriptions (best-effort).
async function sendPush(userId: string, payload: { title: string; body: string; url?: string }) {
  if (!userId) return;
  const wp = await getWebpush();
  if (!wp) return;
  try {
    const { data: subs } = await supabase.from('push_subscriptions').select('*').eq('user_id', userId);
    for (const s of subs || []) {
      try {
        await wp.sendNotification(JSON.parse(s.subscription), JSON.stringify(payload));
      } catch (e: any) {
        // Drop expired/invalid subscriptions
        if (e?.statusCode === 404 || e?.statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('id', s.id);
        } else {
          console.log('push send error:', e?.statusCode || e);
        }
      }
    }
  } catch (e) {
    console.log('sendPush failed:', e);
  }
}

// Create an in-app notification AND a browser push for a user (best-effort).
async function notifyUser(userId: string, type: string, title: string, message: string) {
  if (!userId) return;
  try {
    await supabase.from('notifications').insert([{
      id: `notif:${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      user_id: userId,
      type,
      title,
      message: message || title,
      is_read: false,
    }]);
  } catch (e) {
    console.log('notifyUser failed:', e);
  }
  // Carry the type, not a view: the client owns the type -> section mapping
  // (src/app/utils/notifications.ts) and resolves it against the user's role.
  // This was hardcoded to '/', so every push click landed on the app root.
  const url = `/?notif=${encodeURIComponent(type)}`;
  await sendPush(userId, { title, body: message || title, url });
}

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-0abfa7cf/health", (c) => {
  return c.json({ status: "ok" });
});

// ============================================
// LOGIN & LOCATION TRACKING
// ============================================

app.post('/make-server-0abfa7cf/login', async (c) => {
  try {
    const body = await c.req.json();
    const { email, password, latitude, longitude, location, ipAddress, userAgent } = body;

    console.log('=== LOGIN REQUEST ===');
    console.log('Login attempt for email:', email);
    console.log('Password provided:', password ? '***' : '(none)');

    // Find user by email (in production, use proper password hashing)
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .limit(1);

    if (userError) {
      console.log('Database error:', userError);
      throw userError;
    }

    if (!users || users.length === 0) {
      console.log('User not found for email:', email);
      return c.json({ success: false, error: 'Invalid email or password' }, 401);
    }

    const user = users[0];
    console.log('User found:', user.id, user.name, 'password column exists:', user.hasOwnProperty('password'), 'password value:', user.password);

    // Check password (in production, use bcrypt for hashing)
    // If password column doesn't exist yet, use default password 'Pass@2026'
    const userPassword = user.password !== undefined && user.password !== null ? user.password : 'Pass@2026';

    console.log('Expected password:', userPassword, 'Provided password:', password, 'Match:', password === userPassword);

    if (password !== userPassword) {
      // Log failed attempt
      const failedLoginId = `login:${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Try to log failed attempt (may fail if login_history table doesn't exist yet)
      try {
        await supabase.from('login_history').insert([{
          id: failedLoginId,
          user_id: user.id,
          user_name: user.name,
          user_email: user.email,
          latitude,
          longitude,
          location,
          ip_address: ipAddress,
          user_agent: userAgent,
          status: 'failed',
        }]);
      } catch (historyError) {
        console.log('Could not log failed login attempt (login_history table may not exist yet):', historyError);
      }

      return c.json({ success: false, error: 'Invalid email or password' }, 401);
    }

    // Update user's last login info (only update location columns if they exist)
    const updateData: any = {
      last_login: new Date().toISOString(),
    };

    // Add location fields if columns exist
    if (user.hasOwnProperty('last_login_latitude') || latitude !== null) {
      updateData.last_login_latitude = latitude;
      updateData.last_login_longitude = longitude;
      updateData.last_login_location = location;
      updateData.last_login_ip = ipAddress;
    }

    await supabase
      .from('users')
      .update(updateData)
      .eq('id', user.id);

    // Log successful login (may fail if login_history table doesn't exist yet)
    try {
      const loginId = `login:${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await supabase.from('login_history').insert([{
        id: loginId,
        user_id: user.id,
        user_name: user.name,
        user_email: user.email,
        latitude,
        longitude,
        location,
        ip_address: ipAddress,
        user_agent: userAgent,
        status: 'success',
      }]);
    } catch (historyError) {
      console.log('Could not log successful login (login_history table may not exist yet):', historyError);
    }

    return c.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        lastLoginLocation: location,
      }
    });
  } catch (error) {
    console.log('Error during login:', error);
    return c.json({ success: false, error: 'Login failed', details: String(error) }, 500);
  }
});

app.get('/make-server-0abfa7cf/login-history/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');

    const { data, error } = await supabase
      .from('login_history')
      .select('*')
      .eq('user_id', userId)
      .order('login_time', { ascending: false })
      .limit(50);

    if (error) throw error;

    return c.json({ success: true, data: data || [] });
  } catch (error) {
    console.log('Error fetching login history:', error);
    return c.json({ success: false, error: 'Failed to fetch login history' }, 500);
  }
});

// ============================================
// TASKS ENDPOINTS
// ============================================

app.get('/make-server-0abfa7cf/tasks', async (c) => {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return c.json({ success: true, data: data || [] });
  } catch (error) {
    console.log('Error fetching tasks:', error);
    return c.json({ success: false, error: 'Failed to fetch tasks', details: String(error) }, 500);
  }
});

app.get('/make-server-0abfa7cf/tasks/user/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('assigned_to_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return c.json({ success: true, data: data || [] });
  } catch (error) {
    console.log('Error fetching user tasks:', error);
    return c.json({ success: false, error: 'Failed to fetch user tasks' }, 500);
  }
});

app.post('/make-server-0abfa7cf/tasks', async (c) => {
  try {
    const body = await c.req.json();
    const taskId = `task:${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log('=== TASK CREATE REQUEST ===');
    console.log('Request body:', JSON.stringify(body, null, 2));

    const task: any = {
      id: taskId,
      client: body.client,
      task: body.task,
      category: body.category,
      assigned_to: body.assignedTo,
      assigned_to_id: body.assignedToId,
      priority: body.priority,
      status: body.status || 'Pending',
      start_date: body.startDate,
      target_date: body.targetDate,
      completion_date: body.completionDate || null,
      estimated_hours: body.estimatedHours || 0,
      budgeted_fee: body.budgetedFee || 0,
      hours_logged: 0,
      comments: body.comments || '',
    };

    // Add created_by fields if provided
    if (body.createdBy !== undefined) task.created_by = body.createdBy;
    if (body.createdById !== undefined) task.created_by_id = body.createdById;

    console.log('Task object to insert:', JSON.stringify(task, null, 2));

    const { data, error } = await supabase
      .from('tasks')
      .insert([task])
      .select()
      .single();

    if (error) {
      console.log('=== SUPABASE CREATE ERROR ===');
      console.log('Error object:', error);
      console.log('Error code:', error.code);
      console.log('Error message:', error.message);
      console.log('Error details:', error.details);
      console.log('Error hint:', error.hint);
      throw error;
    }

    console.log('Task created successfully:', data);

    // Notify the assignee (unless it still needs partner approval)
    if (body.assignedToId && task.status !== 'Pending Approval') {
      await notifyUser(body.assignedToId, 'task', 'New task assigned',
        `${body.task}${body.client ? ' — ' + body.client : ''}`);
    }

    return c.json({ success: true, data });
  } catch (error: any) {
    console.log('=== CREATE CATCH BLOCK ERROR ===');
    console.log('Error type:', typeof error);
    console.log('Error:', error);
    console.log('Full error object:', JSON.stringify(error, null, 2));

    const errorMessage = error?.message || error?.msg || 'Unknown error';
    const errorCode = error?.code || '';
    const errorDetails = typeof error?.details === 'object'
      ? JSON.stringify(error?.details)
      : (error?.details || '');
    const errorHint = error?.hint || '';

    console.log('Extracted error message:', errorMessage);
    console.log('Extracted error code:', errorCode);
    console.log('Extracted error details:', errorDetails);
    console.log('Extracted error hint:', errorHint);

    return c.json({
      success: false,
      error: 'Failed to create task',
      message: errorMessage,
      code: errorCode,
      details: errorDetails,
      hint: errorHint,
      fullError: JSON.stringify(error)
    }, 500);
  }
});

app.put('/make-server-0abfa7cf/tasks/:taskId', async (c) => {
  try {
    const taskId = c.req.param('taskId');
    const body = await c.req.json();

    console.log('=== TASK UPDATE REQUEST ===');
    console.log('Task ID:', taskId);
    console.log('Request body:', JSON.stringify(body, null, 2));

    const updates: any = {};
    // Basic task fields
    if (body.task !== undefined) updates.task = body.task;
    if (body.category !== undefined) updates.category = body.category;
    if (body.client !== undefined) updates.client = body.client;
    if (body.status !== undefined) updates.status = body.status;
    if (body.priority !== undefined) updates.priority = body.priority;
    if (body.startDate !== undefined) updates.start_date = body.startDate;
    if (body.targetDate !== undefined) updates.target_date = body.targetDate;
    if (body.completionDate !== undefined) updates.completion_date = body.completionDate;
    if (body.hoursLogged !== undefined) updates.hours_logged = body.hoursLogged;
    if (body.comments !== undefined) updates.comments = body.comments;

    // Billing fields - only add if provided
    if (body.billingFees !== undefined) updates.billing_fees = body.billingFees;
    if (body.taxableAmount !== undefined) updates.taxable_amount = body.taxableAmount;
    if (body.billingDescription !== undefined) updates.billing_description = body.billingDescription;

    // Reassignment fields - only add if provided
    if (body.assignedTo !== undefined) updates.assigned_to = body.assignedTo;
    if (body.assignedToId !== undefined) updates.assigned_to_id = body.assignedToId;
    if (body.assignmentStatus !== undefined) updates.assignment_status = body.assignmentStatus;
    if (body.reassignedFromId !== undefined) updates.reassigned_from_id = body.reassignedFromId;
    if (body.reassignedFromName !== undefined) updates.reassigned_from_name = body.reassignedFromName;
    if (body.originallyAssignedById !== undefined) updates.originally_assigned_by_id = body.originallyAssignedById;
    if (body.originallyAssignedByName !== undefined) updates.originally_assigned_by_name = body.originallyAssignedByName;
    if (body.reassignedAt !== undefined) updates.reassigned_at = body.reassignedAt;

    // Rejection reason — stored in comments since tasks table has no rejection_reason column
    if (body.rejectionReason !== undefined && body.rejectionReason.trim()) {
      const existingComments = updates.comments || '';
      const rejectionNote = `[Rejected by ${body.approvedBy || 'Partner'}]: ${body.rejectionReason}`;
      updates.comments = existingComments ? `${existingComments}\n${rejectionNote}` : rejectionNote;
    }

    console.log('Updates object:', JSON.stringify(updates, null, 2));

    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId)
      .select()
      .single();

    if (error) {
      console.log('=== SUPABASE ERROR ===');
      console.log('Error object:', error);
      console.log('Error code:', error.code);
      console.log('Error message:', error.message);
      console.log('Error details:', error.details);
      console.log('Error hint:', error.hint);
      throw error;
    }

    console.log('Task updated successfully:', data);

    // On approval (task released to the assignee), notify them
    if (body.approvedBy && data?.status === 'Pending' && data?.assigned_to_id) {
      await notifyUser(data.assigned_to_id, 'task', 'Task approved & assigned',
        `${data.task}${data.client ? ' — ' + data.client : ''}`);
    }

    return c.json({ success: true, data });
  } catch (error: any) {
    console.log('=== CATCH BLOCK ERROR ===');
    console.log('Error type:', typeof error);
    console.log('Error:', error);
    
    // Extract detailed error information from Supabase error object
    const errorMessage = error?.message || error?.msg || 'Unknown error';
    const errorCode = error?.code || '';
    const errorDetails = error?.details || '';
    const errorHint = error?.hint || '';
    
    console.log('Extracted error message:', errorMessage);
    console.log('Extracted error code:', errorCode);
    console.log('Extracted error details:', errorDetails);
    console.log('Extracted error hint:', errorHint);
    
    return c.json({ 
      success: false, 
      error: 'Failed to update task', 
      message: errorMessage,
      code: errorCode,
      details: errorDetails,
      hint: errorHint
    }, 500);
  }
});

app.delete('/make-server-0abfa7cf/tasks/:taskId', async (c) => {
  try {
    const taskId = c.req.param('taskId');

    console.log('=== TASK DELETE REQUEST ===');
    console.log('Task ID:', taskId);

    const { data, error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)
      .select()
      .single();

    if (error) {
      console.log('=== SUPABASE DELETE ERROR ===');
      console.log('Error:', error);
      throw error;
    }

    console.log('Task deleted successfully:', data);

    return c.json({ success: true, data });
  } catch (error: any) {
    console.log('=== DELETE CATCH BLOCK ERROR ===');
    console.log('Error:', error);

    const errorMessage = error?.message || 'Unknown error';
    const errorCode = error?.code || '';

    return c.json({
      success: false,
      error: 'Failed to delete task',
      message: errorMessage,
      code: errorCode
    }, 500);
  }
});

// ============================================
// USERS ENDPOINTS
// ============================================

app.get('/make-server-0abfa7cf/users', async (c) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('role', { ascending: true });

    if (error) throw error;

    return c.json({ success: true, data: data || [] });
  } catch (error) {
    console.log('Error fetching users:', error);
    return c.json({ success: false, error: 'Failed to fetch users' }, 500);
  }
});

app.get('/make-server-0abfa7cf/users/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;

    return c.json({ success: true, data });
  } catch (error) {
    console.log('Error fetching user:', error);
    return c.json({ success: false, error: 'Failed to fetch user' }, 500);
  }
});

app.post('/make-server-0abfa7cf/users', async (c) => {
  try {
    const body = await c.req.json();

    console.log('=== CREATE USER REQUEST ===');
    console.log('Request body:', JSON.stringify(body, null, 2));

    // Validate required fields
    if (!body.name || !body.email || !body.role) {
      return c.json({
        success: false,
        error: 'Missing required fields',
        details: 'Name, email, and role are required'
      }, 400);
    }

    const userId = `user:${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const user = {
      id: userId,
      name: body.name,
      email: body.email,
      role: body.role,
      status: body.status || 'Active',
      password: body.password || 'Pass@2026',
    };

    console.log('User object to insert:', JSON.stringify(user, null, 2));

    // Try to insert
    const { data, error } = await supabase
      .from('users')
      .insert([user])
      .select()
      .single();

    console.log('Insert result - data:', data);
    console.log('Insert result - error:', error);

    if (error) {
      console.log('=== DATABASE ERROR ===');
      console.log('Error code:', error.code);
      console.log('Error message:', error.message);
      console.log('Error details:', error.details);
      console.log('Error hint:', error.hint);
      console.log('Full error object:', JSON.stringify(error, null, 2));

      // Handle specific errors
      if (error.code === '23505') {
        return c.json({
          success: false,
          error: 'Email already exists',
          details: 'A user with this email already exists. Please use a different email.'
        }, 400);
      }

      if (error.code === '42703') {
        return c.json({
          success: false,
          error: 'Database column missing',
          details: 'The password column does not exist. Please run: ALTER TABLE users ADD COLUMN password TEXT DEFAULT \'Pass@2026\';'
        }, 500);
      }

      if (error.message && error.message.toLowerCase().includes('password')) {
        return c.json({
          success: false,
          error: 'Password column missing',
          details: 'Run this SQL: ALTER TABLE users ADD COLUMN IF NOT EXISTS password TEXT DEFAULT \'Pass@2026\';'
        }, 500);
      }

      return c.json({
        success: false,
        error: 'Database error',
        details: error.message || error.details || error.hint || 'Unknown database error',
        errorCode: error.code || 'UNKNOWN'
      }, 500);
    }

    console.log('=== USER CREATED SUCCESSFULLY ===');
    console.log('User ID:', data.id);
    console.log('User name:', data.name);

    return c.json({ success: true, data });

  } catch (error: any) {
    console.log('=== CATCH BLOCK ERROR ===');
    console.log('Error object:', error);
    console.log('Error name:', error?.name);
    console.log('Error message:', error?.message);
    console.log('Error stack:', error?.stack);

    // Try multiple ways to get error info
    let errorMsg = 'Unknown error';
    if (error?.message) {
      errorMsg = error.message;
    } else if (typeof error === 'string') {
      errorMsg = error;
    } else {
      try {
        errorMsg = JSON.stringify(error);
      } catch {
        errorMsg = String(error);
      }
    }

    return c.json({
      success: false,
      error: 'Failed to create user',
      details: errorMsg,
      errorType: typeof error,
      errorName: error?.name || 'Unknown'
    }, 500);
  }
});

app.put('/make-server-0abfa7cf/users/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const body = await c.req.json();

    console.log('Updating user:', userId, 'with data:', JSON.stringify(body));

    const { data, error } = await supabase
      .from('users')
      .update(body)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.log('Supabase error updating user:', error);
      throw error;
    }

    console.log('User updated successfully:', data);
    return c.json({ success: true, data });
  } catch (error) {
    console.log('Error updating user:', error);
    console.log('Error details:', {
      message: error?.message,
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
    });
    return c.json({ 
      success: false, 
      error: 'Failed to update user',
      details: error?.message || 'Unknown error',
      code: error?.code,
      hint: error?.hint,
    }, 500);
  }
});

app.delete('/make-server-0abfa7cf/users/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (error) throw error;

    return c.json({ success: true, message: 'User deleted' });
  } catch (error) {
    console.log('Error deleting user:', error);
    return c.json({ success: false, error: 'Failed to delete user' }, 500);
  }
});

// ============================================
// CALENDAR/IMPORTANT DATES ENDPOINTS
// ============================================

app.get('/make-server-0abfa7cf/calendar-events', async (c) => {
  try {
    const events = await kvStore.getByPrefix('calendar_event:');
    return c.json({ success: true, data: events });
  } catch (error) {
    console.log('Error fetching calendar events:', error);
    return c.json({ success: false, error: 'Failed to fetch calendar events' }, 500);
  }
});

app.post('/make-server-0abfa7cf/calendar-events', async (c) => {
  try {
    const body = await c.req.json();
    const eventId = `calendar_event:${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const eventData = {
      id: eventId,
      title: body.title,
      description: body.description,
      event_date: body.eventDate,
      event_type: body.eventType, // 'due-date', 'birthday', 'holiday', 'other'
      recurring: body.recurring || false,
      created_by: body.createdBy,
      created_at: new Date().toISOString(),
    };

    await kvStore.set(eventId, eventData);
    return c.json({ success: true, data: eventData });
  } catch (error) {
    console.log('Error creating calendar event:', error);
    return c.json({ success: false, error: 'Failed to create calendar event' }, 500);
  }
});

app.put('/make-server-0abfa7cf/calendar-events/:eventId', async (c) => {
  try {
    const eventId = c.req.param('eventId');
    const body = await c.req.json();

    const existing = await kvStore.get(eventId);
    if (!existing) {
      return c.json({ success: false, error: 'Event not found' }, 404);
    }

    const updatedData = {
      ...existing,
      title: body.title,
      description: body.description,
      event_date: body.eventDate,
      event_type: body.eventType,
      recurring: body.recurring,
      updated_at: new Date().toISOString(),
    };

    await kvStore.set(eventId, updatedData);
    return c.json({ success: true, data: updatedData });
  } catch (error) {
    console.log('Error updating calendar event:', error);
    return c.json({ success: false, error: 'Failed to update calendar event' }, 500);
  }
});

app.delete('/make-server-0abfa7cf/calendar-events/:eventId', async (c) => {
  try {
    const eventId = c.req.param('eventId');
    await kvStore.del(eventId);
    return c.json({ success: true, message: 'Calendar event deleted' });
  } catch (error) {
    console.log('Error deleting calendar event:', error);
    return c.json({ success: false, error: 'Failed to delete calendar event' }, 500);
  }
});

// ============================================
// ANNOUNCEMENTS ENDPOINTS
// ============================================

app.get('/make-server-0abfa7cf/announcements', async (c) => {
  try {
    const announcements = await kvStore.getByPrefix('announcement:');
    return c.json({ success: true, data: announcements });
  } catch (error) {
    console.log('Error fetching announcements:', error);
    return c.json({ success: false, error: 'Failed to fetch announcements' }, 500);
  }
});

app.get('/make-server-0abfa7cf/announcements/active', async (c) => {
  try {
    const announcements = await kvStore.getByPrefix('announcement:');
    
    // Filter active announcements
    const now = new Date();
    const activeAnnouncements = announcements.filter((ann: any) => {
      if (!ann.is_active) return false;
      
      // Check start date
      if (ann.start_date && new Date(ann.start_date) > now) return false;
      
      // Check end date
      if (ann.end_date && new Date(ann.end_date) < now) return false;
      
      return true;
    });

    return c.json({ success: true, data: activeAnnouncements });
  } catch (error) {
    console.log('Error fetching active announcements:', error);
    return c.json({ success: false, error: 'Failed to fetch active announcements' }, 500);
  }
});

app.post('/make-server-0abfa7cf/announcements', async (c) => {
  try {
    const body = await c.req.json();
    const announcementId = `announcement:${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const announcementData = {
      id: announcementId,
      title: body.title,
      message: body.message,
      type: body.type || 'info', // 'info', 'warning', 'success', 'urgent'
      is_active: body.isActive !== undefined ? body.isActive : true,
      start_date: body.startDate || null,
      end_date: body.endDate || null,
      target_roles: body.targetRoles || [], // Empty array means all roles
      created_by: body.createdBy,
      created_at: new Date().toISOString(),
    };

    await kvStore.set(announcementId, announcementData);

    // Fan out a notification to every targeted user (all active users if no roles set)
    if (announcementData.is_active) {
      try {
        let query = supabase.from('users').select('id').eq('status', 'Active');
        const roles = announcementData.target_roles;
        if (Array.isArray(roles) && roles.length > 0) query = query.in('role', roles);
        const { data: recipients } = await query;
        for (const u of recipients || []) {
          await notifyUser(u.id, 'announcement', announcementData.title, announcementData.message);
        }
      } catch (e) {
        console.log('announcement notify fan-out failed:', e);
      }
    }

    return c.json({ success: true, data: announcementData });
  } catch (error) {
    console.log('Error creating announcement:', error);
    return c.json({ success: false, error: 'Failed to create announcement' }, 500);
  }
});

app.put('/make-server-0abfa7cf/announcements/:announcementId', async (c) => {
  try {
    const announcementId = c.req.param('announcementId');
    const body = await c.req.json();

    const existing = await kvStore.get(announcementId);
    if (!existing) {
      return c.json({ success: false, error: 'Announcement not found' }, 404);
    }

    const updatedData = {
      ...existing,
      title: body.title,
      message: body.message,
      type: body.type,
      is_active: body.isActive,
      start_date: body.startDate,
      end_date: body.endDate,
      target_roles: body.targetRoles || [],
      updated_at: new Date().toISOString(),
    };

    await kvStore.set(announcementId, updatedData);
    return c.json({ success: true, data: updatedData });
  } catch (error) {
    console.log('Error updating announcement:', error);
    return c.json({ success: false, error: 'Failed to update announcement' }, 500);
  }
});

app.delete('/make-server-0abfa7cf/announcements/:announcementId', async (c) => {
  try {
    const announcementId = c.req.param('announcementId');
    await kvStore.del(announcementId);
    return c.json({ success: true, message: 'Announcement deleted' });
  } catch (error) {
    console.log('Error deleting announcement:', error);
    return c.json({ success: false, error: 'Failed to delete announcement' }, 500);
  }
});

app.put('/make-server-0abfa7cf/announcements/:announcementId/toggle', async (c) => {
  try {
    const announcementId = c.req.param('announcementId');

    const existing = await kvStore.get(announcementId);
    if (!existing) {
      return c.json({ success: false, error: 'Announcement not found' }, 404);
    }

    const updatedData = {
      ...existing,
      is_active: !existing.is_active,
      updated_at: new Date().toISOString(),
    };

    await kvStore.set(announcementId, updatedData);
    return c.json({ success: true, data: updatedData });
  } catch (error) {
    console.log('Error toggling announcement:', error);
    return c.json({ success: false, error: 'Failed to toggle announcement' }, 500);
  }
});

// ============================================
// CLIENTS ENDPOINTS
// ============================================

app.get('/make-server-0abfa7cf/clients', async (c) => {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;

    return c.json({ success: true, data: data || [] });
  } catch (error) {
    console.log('Error fetching clients:', error);
    return c.json({ success: false, error: 'Failed to fetch clients' }, 500);
  }
});

app.post('/make-server-0abfa7cf/clients', async (c) => {
  try {
    const body = await c.req.json();
    const clientId = `client:${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const client = {
      id: clientId,
      name: body.name,
      industry: body.industry,
      gst: body.gst,
      contact: body.contact,
      email: body.email,
      status: body.status || 'Active',
    };

    const { data, error } = await supabase
      .from('clients')
      .insert([client])
      .select()
      .single();

    if (error) throw error;

    return c.json({ success: true, data });
  } catch (error) {
    console.log('Error creating client:', error);
    return c.json({ success: false, error: 'Failed to create client', details: String(error) }, 500);
  }
});

app.put('/make-server-0abfa7cf/clients/:clientId', async (c) => {
  try {
    const clientId = c.req.param('clientId');
    const body = await c.req.json();

    const { data, error } = await supabase
      .from('clients')
      .update(body)
      .eq('id', clientId)
      .select()
      .single();

    if (error) throw error;

    return c.json({ success: true, data });
  } catch (error) {
    console.log('Error updating client:', error);
    return c.json({ success: false, error: 'Failed to update client' }, 500);
  }
});

// ============================================
// PASSWORD MANAGEMENT ENDPOINTS
// ============================================

// Change Password
app.post('/make-server-0abfa7cf/change-password', async (c) => {
  try {
    const body = await c.req.json();
    const { email, currentPassword, newPassword } = body;

    console.log('Change password request for:', email);

    // Find user
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .limit(1);

    if (userError) {
      console.log('Error fetching user:', userError);
      return c.json({ success: false, error: 'Database error: ' + userError.message }, 500);
    }

    if (!users || users.length === 0) {
      console.log('User not found:', email);
      return c.json({ success: false, error: 'User not found' }, 404);
    }

    const user = users[0];

    // Check if password column exists
    if (!user.hasOwnProperty('password') || user.password === null || user.password === undefined) {
      console.log('Password column missing. Run database-password-features.sql migration.');
      return c.json({
        success: false,
        error: 'Password feature not configured. Please run database-password-features.sql migration in Supabase.'
      }, 500);
    }

    // Verify current password
    if (currentPassword !== user.password) {
      console.log('Current password incorrect');
      return c.json({ success: false, error: 'Current password is incorrect' }, 401);
    }

    // Update password
    const { error: updateError } = await supabase
      .from('users')
      .update({ password: newPassword })
      .eq('id', user.id);

    if (updateError) {
      console.log('Error updating password:', updateError);
      return c.json({ success: false, error: 'Failed to update password: ' + updateError.message }, 500);
    }

    console.log('Password changed successfully for:', email);
    return c.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.log('Error changing password:', error);
    return c.json({ success: false, error: 'Failed to change password: ' + String(error) }, 500);
  }
});

// Send OTP for password reset
app.post('/make-server-0abfa7cf/send-otp', async (c) => {
  try {
    const body = await c.req.json();
    const { method, contact } = body;

    // Find user by email or mobile
    let user;
    if (method === 'email') {
      const { data: users } = await supabase
        .from('users')
        .select('*')
        .eq('email', contact)
        .limit(1);
      user = users && users.length > 0 ? users[0] : null;
    } else {
      // For mobile, you would need to add a mobile column to users table
      return c.json({ success: false, error: 'Mobile OTP not configured. Please use email OTP.' }, 400);
    }

    if (!user) {
      return c.json({ success: false, error: 'User not found with this contact information' }, 404);
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpId = `otp:${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP in database
    await supabase.from('password_reset_otps').insert([{
      id: otpId,
      user_id: user.id,
      user_email: method === 'email' ? contact : user.email,
      user_mobile: method === 'mobile' ? contact : null,
      otp,
      method,
      expires_at: expiresAt.toISOString(),
    }]);

    // TODO: Send OTP via email/SMS service
    // For now, OTP is stored in database - in production, integrate with SendGrid/Twilio
    console.log(`OTP for ${contact}: ${otp} (expires at ${expiresAt.toISOString()})`);

    return c.json({
      success: true,
      message: `OTP sent to your ${method}`,
      // In development, return OTP for testing (REMOVE IN PRODUCTION!)
      devOtp: otp,
    });
  } catch (error) {
    console.log('Error sending OTP:', error);
    return c.json({ success: false, error: 'Failed to send OTP' }, 500);
  }
});

// Verify OTP
app.post('/make-server-0abfa7cf/verify-otp', async (c) => {
  try {
    const body = await c.req.json();
    const { method, contact, otp } = body;

    // Find matching OTP
    const { data: otps, error: otpError } = await supabase
      .from('password_reset_otps')
      .select('*')
      .eq(method === 'email' ? 'user_email' : 'user_mobile', contact)
      .eq('otp', otp)
      .eq('method', method)
      .eq('verified', false)
      .eq('used', false)
      .order('created_at', { ascending: false })
      .limit(1);

    if (otpError) throw otpError;

    if (!otps || otps.length === 0) {
      return c.json({ success: false, error: 'Invalid or expired OTP' }, 400);
    }

    const otpRecord = otps[0];

    // Check if expired
    if (new Date(otpRecord.expires_at) < new Date()) {
      return c.json({ success: false, error: 'OTP has expired' }, 400);
    }

    // Mark as verified
    await supabase
      .from('password_reset_otps')
      .update({ verified: true })
      .eq('id', otpRecord.id);

    return c.json({ success: true, message: 'OTP verified successfully' });
  } catch (error) {
    console.log('Error verifying OTP:', error);
    return c.json({ success: false, error: 'Failed to verify OTP' }, 500);
  }
});

// Reset Password
app.post('/make-server-0abfa7cf/reset-password', async (c) => {
  try {
    const body = await c.req.json();
    const { method, contact, otp, newPassword } = body;

    // Find and verify OTP
    const { data: otps, error: otpError } = await supabase
      .from('password_reset_otps')
      .select('*')
      .eq(method === 'email' ? 'user_email' : 'user_mobile', contact)
      .eq('otp', otp)
      .eq('method', method)
      .eq('verified', true)
      .eq('used', false)
      .order('created_at', { ascending: false })
      .limit(1);

    if (otpError) throw otpError;

    if (!otps || otps.length === 0) {
      return c.json({ success: false, error: 'Invalid or already used OTP' }, 400);
    }

    const otpRecord = otps[0];

    // Check if expired
    if (new Date(otpRecord.expires_at) < new Date()) {
      return c.json({ success: false, error: 'OTP has expired' }, 400);
    }

    // Update user password
    const { error: updateError } = await supabase
      .from('users')
      .update({ password: newPassword })
      .eq('id', otpRecord.user_id);

    if (updateError) throw updateError;

    // Mark OTP as used
    await supabase
      .from('password_reset_otps')
      .update({ used: true })
      .eq('id', otpRecord.id);

    return c.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    console.log('Error resetting password:', error);
    return c.json({ success: false, error: 'Failed to reset password' }, 500);
  }
});

// ============================================
// TASK ASSIGNMENTS
// ============================================

// Create assignment
app.post('/make-server-0abfa7cf/assignments', async (c) => {
  try {
    const body = await c.req.json();

    const assignmentId = 'assign:' + crypto.randomUUID();

    const assignment = {
      id: assignmentId,
      task_name: body.taskName,
      client_name: body.clientName,
      category: body.category,
      priority: body.priority,
      assigned_from_id: body.assignedFromId,
      assigned_from_name: body.assignedFromName,
      assigned_to_id: body.assignedToId,
      assigned_to_name: body.assignedToName,
      status: 'Pending',
      notes: body.notes,
      assigned_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('task_assignments')
      .insert(assignment)
      .select()
      .single();

    if (error) throw error;

    return c.json({ success: true, data });
  } catch (error) {
    console.log('Error creating assignment:', error);
    return c.json({ success: false, error: 'Failed to create assignment' }, 500);
  }
});

// Get assignments for a user
app.get('/make-server-0abfa7cf/assignments/user/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');

    const { data, error } = await supabase
      .from('task_assignments')
      .select('*')
      .eq('assigned_to_id', userId)
      .order('assigned_at', { ascending: false });

    if (error) throw error;

    return c.json({ success: true, data: data || [] });
  } catch (error) {
    console.log('Error fetching assignments:', error);
    return c.json({ success: false, error: 'Failed to fetch assignments' }, 500);
  }
});

// Get all assignments (for partners)
app.get('/make-server-0abfa7cf/assignments', async (c) => {
  try {
    const { data, error } = await supabase
      .from('task_assignments')
      .select('*')
      .order('assigned_at', { ascending: false });

    if (error) throw error;

    return c.json({ success: true, data: data || [] });
  } catch (error) {
    console.log('Error fetching all assignments:', error);
    return c.json({ success: false, error: 'Failed to fetch assignments' }, 500);
  }
});

// Update assignment status
app.put('/make-server-0abfa7cf/assignments/:assignmentId/status', async (c) => {
  try {
    const assignmentId = c.req.param('assignmentId');
    const body = await c.req.json();
    const { status, notes } = body;

    const updateData: any = {
      status: status,
      responded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (notes) {
      updateData.notes = notes;
    }

    const { data, error } = await supabase
      .from('task_assignments')
      .update(updateData)
      .eq('id', assignmentId)
      .select()
      .single();

    if (error) throw error;

    return c.json({ success: true, data });
  } catch (error) {
    console.log('Error updating assignment status:', error);
    return c.json({ success: false, error: 'Failed to update assignment status' }, 500);
  }
});

// ============================================
// NOTIFICATIONS
// ============================================

// Get notifications for a user
// Web Push: expose the public VAPID key so the browser can subscribe
app.get('/make-server-0abfa7cf/push/vapid-public-key', (c) => {
  return c.json({ success: true, key: VAPID_PUBLIC });
});

// Web Push: save a browser push subscription for a user (upsert by endpoint)
app.post('/make-server-0abfa7cf/push/subscribe', async (c) => {
  try {
    const { userId, subscription } = await c.req.json();
    const endpoint = subscription?.endpoint;
    if (!userId || !endpoint) {
      return c.json({ success: false, error: 'userId and subscription are required' }, 400);
    }
    const { error } = await supabase.from('push_subscriptions').upsert({
      id: `push:${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      user_id: userId,
      endpoint,
      subscription: JSON.stringify(subscription),
    }, { onConflict: 'endpoint' });
    if (error) throw error;
    return c.json({ success: true });
  } catch (error) {
    console.log('Error saving push subscription:', error);
    return c.json({ success: false, error: 'Failed to save subscription' }, 500);
  }
});

app.get('/make-server-0abfa7cf/notifications/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');

    const { data, error} = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    return c.json({ success: true, data: data || [] });
  } catch (error) {
    console.log('Error fetching notifications:', error);
    return c.json({ success: false, error: 'Failed to fetch notifications' }, 500);
  }
});

// Mark notification as read
app.put('/make-server-0abfa7cf/notifications/:notificationId/read', async (c) => {
  try {
    const notificationId = c.req.param('notificationId');

    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .select()
      .single();

    if (error) throw error;

    return c.json({ success: true, data });
  } catch (error) {
    console.log('Error marking notification as read:', error);
    return c.json({ success: false, error: 'Failed to mark notification as read' }, 500);
  }
});

// Mark all notifications as read
app.put('/make-server-0abfa7cf/notifications/:userId/read-all', async (c) => {
  try {
    const userId = c.req.param('userId');

    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw error;

    return c.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.log('Error marking all notifications as read:', error);
    return c.json({ success: false, error: 'Failed to mark all notifications as read' }, 500);
  }
});

// ============================================
// LEAVE MANAGEMENT
// ============================================

// Apply for leave
app.post('/make-server-0abfa7cf/leave/apply', async (c) => {
  try {
    const body = await c.req.json();
    const { userId, leaveType, fromDate, toDate, isHalfDay, totalDays, reason } = body;

    const { data, error } = await supabase
      .from('leave_applications')
      .insert([{
        user_id: userId,
        leave_type: leaveType,
        from_date: fromDate,
        to_date: toDate,
        is_half_day: isHalfDay || false,
        total_days: totalDays,
        reason,
        status: 'Pending',
      }])
      .select()
      .single();

    if (error) throw error;

    return c.json({ success: true, data });
  } catch (error) {
    console.log('Error applying for leave:', error);
    return c.json({ success: false, error: 'Failed to apply for leave' }, 500);
  }
});

// Get user's leave applications
app.get('/make-server-0abfa7cf/leave/user/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');

    const { data, error } = await supabase
      .from('leave_applications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return c.json({ success: true, data: data || [] });
  } catch (error) {
    console.log('Error fetching leave applications:', error);
    return c.json({ success: false, error: 'Failed to fetch leave applications' }, 500);
  }
});

// Get pending leave applications
app.get('/make-server-0abfa7cf/leave/pending', async (c) => {
  try {
    const { data, error } = await supabase
      .from('leave_applications')
      .select(`
        *,
        users!leave_applications_user_id_fkey (name, email)
      `)
      .eq('status', 'Pending')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const enrichedData = (data || []).map(leave => ({
      ...leave,
      userName: leave.users?.name || 'Unknown User',
      userEmail: leave.users?.email || '',
    }));

    return c.json({ success: true, data: enrichedData });
  } catch (error) {
    console.log('Error fetching pending leaves:', error);
    return c.json({ success: false, error: 'Failed to fetch pending leaves' }, 500);
  }
});

// Approve leave
app.put('/make-server-0abfa7cf/leave/:leaveId/approve', async (c) => {
  try {
    const leaveId = c.req.param('leaveId');
    const body = await c.req.json();
    const { approverId, comments } = body;

    // Get leave details first
    const { data: leaveData } = await supabase
      .from('leave_applications')
      .select('*')
      .eq('id', leaveId)
      .single();

    // Update leave status
    const { data, error } = await supabase
      .from('leave_applications')
      .update({
        status: 'Approved',
        approved_by_id: approverId,
        approved_at: new Date().toISOString(),
      })
      .eq('id', leaveId)
      .select()
      .single();

    if (error) throw error;

    // Deduct from leave balance
    if (leaveData) {
      const balanceField =
        leaveData.leave_type === 'CL' ? 'casual_leave_balance' :
        leaveData.leave_type === 'SL' ? 'sick_leave_balance' :
        'earned_leave_balance';

      await supabase
        .from('leave_balance')
        .update({
          [balanceField]: supabase.rpc('decrement_balance', {
            user_id: leaveData.user_id,
            field: balanceField,
            amount: leaveData.total_days
          })
        })
        .eq('user_id', leaveData.user_id)
        .eq('year', new Date().getFullYear());
    }

    return c.json({ success: true, data });
  } catch (error) {
    console.log('Error approving leave:', error);
    return c.json({ success: false, error: 'Failed to approve leave' }, 500);
  }
});

// Reject leave
app.put('/make-server-0abfa7cf/leave/:leaveId/reject', async (c) => {
  try {
    const leaveId = c.req.param('leaveId');
    const body = await c.req.json();
    const { approverId, rejectionReason, comments } = body;

    const { data, error } = await supabase
      .from('leave_applications')
      .update({
        status: 'Rejected',
        approved_by_id: approverId,
        rejection_reason: rejectionReason,
        approved_at: new Date().toISOString(),
      })
      .eq('id', leaveId)
      .select()
      .single();

    if (error) throw error;

    return c.json({ success: true, data });
  } catch (error) {
    console.log('Error rejecting leave:', error);
    return c.json({ success: false, error: 'Failed to reject leave' }, 500);
  }
});

// Get leave balance
app.get('/make-server-0abfa7cf/leave/balance/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const year = new Date().getFullYear();

    const { data, error } = await supabase
      .from('leave_balance')
      .select('*')
      .eq('user_id', userId)
      .eq('year', year)
      .single();

    if (error) {
      // If no balance record exists, return defaults
      return c.json({
        success: true,
        data: {
          casualLeaveBalance: 10,
          sickLeaveBalance: 7,
          earnedLeaveBalance: 15,
        }
      });
    }

    return c.json({
      success: true,
      data: {
        casualLeaveBalance: data.casual_leave_balance,
        sickLeaveBalance: data.sick_leave_balance,
        earnedLeaveBalance: data.earned_leave_balance,
      }
    });
  } catch (error) {
    console.log('Error fetching leave balance:', error);
    return c.json({ success: false, error: 'Failed to fetch leave balance' }, 500);
  }
});

// ============================================
// TIME LOG
// ============================================

// Log time
app.post('/make-server-0abfa7cf/timelog', async (c) => {
  try {
    const body = await c.req.json();
    const { userId, taskId, taskName, clientName, hours, description, logDate } = body;

    const { data, error } = await supabase
      .from('time_logs')
      .insert([{
        user_id: userId,
        task_id: taskId,
        task_name: taskName,
        client_name: clientName,
        hours,
        description,
        log_date: logDate,
      }])
      .select()
      .single();

    if (error) throw error;

    return c.json({ success: true, data });
  } catch (error) {
    console.log('Error logging time:', error);
    return c.json({ success: false, error: 'Failed to log time' }, 500);
  }
});

// Get user's time logs
app.get('/make-server-0abfa7cf/timelog/user/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');

    const { data, error } = await supabase
      .from('time_logs')
      .select('*')
      .eq('user_id', userId)
      .order('log_date', { ascending: false })
      .limit(100);

    if (error) throw error;

    return c.json({ success: true, data: data || [] });
  } catch (error) {
    console.log('Error fetching time logs:', error);
    return c.json({ success: false, error: 'Failed to fetch time logs' }, 500);
  }
});

// ============================================
// ATTENDANCE
// ============================================

// Mark attendance
app.post('/make-server-0abfa7cf/attendance', async (c) => {
  try {
    const body = await c.req.json();
    const { userId, attendanceDate, status, checkInTime, checkOutTime, totalHours, location } = body;

    const { data, error } = await supabase
      .from('attendance')
      .insert([{
        user_id: userId,
        attendance_date: attendanceDate,
        status,
        check_in_time: checkInTime,
        check_out_time: checkOutTime,
        total_hours: totalHours,
        location,
      }])
      .select()
      .single();

    if (error) throw error;

    return c.json({ success: true, data });
  } catch (error) {
    console.log('Error marking attendance:', error);
    return c.json({ success: false, error: 'Failed to mark attendance' }, 500);
  }
});

// Get user's attendance
app.get('/make-server-0abfa7cf/attendance/user/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');

    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', userId)
      .order('attendance_date', { ascending: false })
      .limit(100);

    if (error) throw error;

    return c.json({ success: true, data: data || [] });
  } catch (error) {
    console.log('Error fetching attendance:', error);
    return c.json({ success: false, error: 'Failed to fetch attendance' }, 500);
  }
});

// ============================================
// DOCUMENTS
// ============================================

// Upload document
app.post('/make-server-0abfa7cf/documents', async (c) => {
  try {
    const body = await c.req.json();
    const { clientId, documentName, documentType, financialYear, filePath } = body;

    const { data, error } = await supabase
      .from('documents')
      .insert([{
        client_id: clientId,
        document_name: documentName,
        document_type: documentType,
        financial_year: financialYear,
        file_path: filePath,
      }])
      .select()
      .single();

    if (error) throw error;

    return c.json({ success: true, data });
  } catch (error) {
    console.log('Error uploading document:', error);
    return c.json({ success: false, error: 'Failed to upload document' }, 500);
  }
});

// Get client's documents
app.get('/make-server-0abfa7cf/documents/client/:clientId', async (c) => {
  try {
    const clientId = c.req.param('clientId');

    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return c.json({ success: true, data: data || [] });
  } catch (error) {
    console.log('Error fetching documents:', error);
    return c.json({ success: false, error: 'Failed to fetch documents' }, 500);
  }
});

// ============================================
// QUERIES
// ============================================

// Create query
app.post('/make-server-0abfa7cf/queries', async (c) => {
  try {
    const body = await c.req.json();
    const { clientId, queryType, subject, description, priority, status } = body;

    const { data, error } = await supabase
      .from('queries')
      .insert([{
        client_id: clientId,
        query_type: queryType,
        subject,
        description,
        priority,
        status: status || 'Open',
      }])
      .select()
      .single();

    if (error) throw error;

    return c.json({ success: true, data });
  } catch (error) {
    console.log('Error creating query:', error);
    return c.json({ success: false, error: 'Failed to create query' }, 500);
  }
});

// Get client's queries
app.get('/make-server-0abfa7cf/queries/client/:clientId', async (c) => {
  try {
    const clientId = c.req.param('clientId');

    const { data, error } = await supabase
      .from('queries')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return c.json({ success: true, data: data || [] });
  } catch (error) {
    console.log('Error fetching queries:', error);
    return c.json({ success: false, error: 'Failed to fetch queries' }, 500);
  }
});

// Get query responses
app.get('/make-server-0abfa7cf/queries/:queryId/responses', async (c) => {
  try {
    const queryId = c.req.param('queryId');

    const { data, error } = await supabase
      .from('query_responses')
      .select(`
        *,
        users!query_responses_responded_by_id_fkey (name)
      `)
      .eq('query_id', queryId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    const enrichedData = (data || []).map(resp => ({
      ...resp,
      respondedBy: resp.users?.name || 'Unknown User',
    }));

    return c.json({ success: true, data: enrichedData });
  } catch (error) {
    console.log('Error fetching query responses:', error);
    return c.json({ success: false, error: 'Failed to fetch query responses' }, 500);
  }
});

// Add query response
app.post('/make-server-0abfa7cf/queries/:queryId/responses', async (c) => {
  try {
    const queryId = c.req.param('queryId');
    const body = await c.req.json();
    const { responseText, isInternal } = body;

    const { data, error } = await supabase
      .from('query_responses')
      .insert([{
        query_id: queryId,
        response_text: responseText,
        is_internal: isInternal || false,
      }])
      .select()
      .single();

    if (error) throw error;

    // Update query status to In Progress if it was Open
    await supabase
      .from('queries')
      .update({ status: 'In Progress' })
      .eq('id', queryId)
      .eq('status', 'Open');

    return c.json({ success: true, data });
  } catch (error) {
    console.log('Error adding query response:', error);
    return c.json({ success: false, error: 'Failed to add query response' }, 500);
  }
});

// Update query status
app.put('/make-server-0abfa7cf/queries/:queryId/status', async (c) => {
  try {
    const queryId = c.req.param('queryId');
    const body = await c.req.json();
    const { status } = body;

    const { data, error } = await supabase
      .from('queries')
      .update({ status })
      .eq('id', queryId)
      .select()
      .single();

    if (error) throw error;

    return c.json({ success: true, data });
  } catch (error) {
    console.log('Error updating query status:', error);
    return c.json({ success: false, error: 'Failed to update query status' }, 500);
  }
});

// Get tasks for a client (for due dates)
app.get('/make-server-0abfa7cf/tasks/client/:clientId', async (c) => {
  try {
    const clientId = c.req.param('clientId');

    // Get client name first
    const { data: clientData } = await supabase
      .from('clients')
      .select('name')
      .eq('id', clientId)
      .single();

    if (!clientData) {
      return c.json({ success: true, data: [] });
    }

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('client', clientData.name)
      .order('target_date', { ascending: true });

    if (error) throw error;

    return c.json({ success: true, data: data || [] });
  } catch (error) {
    console.log('Error fetching client tasks:', error);
    return c.json({ success: false, error: 'Failed to fetch client tasks' }, 500);
  }
});

// ============================================
// CLIENT INQUIRIES
// ============================================

// Create inquiry
app.post('/make-server-0abfa7cf/inquiries', async (c) => {
  try {
    const body = await c.req.json();
    const { clientName, companyName, contactPerson, mobileNumber, email, workType, notes, expectedTimeline, sourceOfInquiry, status, submittedBy, submittedById } = body;

    const { data, error } = await supabase
      .from('client_inquiries')
      .insert([{
        client_name: clientName,
        company_name: companyName,
        contact_person: contactPerson,
        mobile_number: mobileNumber,
        email,
        work_type: workType,
        notes,
        expected_timeline: expectedTimeline,
        source_of_inquiry: sourceOfInquiry,
        status: status || 'Pending Review',
        submitted_by: submittedBy,
        submitted_by_id: submittedById,
      }])
      .select()
      .single();

    if (error) throw error;

    return c.json({ success: true, data });
  } catch (error) {
    console.log('Error creating inquiry:', error);
    return c.json({ success: false, error: 'Failed to create inquiry' }, 500);
  }
});

// Get pending inquiries
app.get('/make-server-0abfa7cf/inquiries/pending', async (c) => {
  try {
    const { data, error } = await supabase
      .from('client_inquiries')
      .select('*')
      .eq('status', 'Pending Review')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return c.json({ success: true, data: data || [] });
  } catch (error) {
    console.log('Error fetching pending inquiries:', error);
    return c.json({ success: false, error: 'Failed to fetch pending inquiries' }, 500);
  }
});

// Get all inquiries
app.get('/make-server-0abfa7cf/inquiries', async (c) => {
  try {
    const { data, error } = await supabase
      .from('client_inquiries')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return c.json({ success: true, data: data || [] });
  } catch (error) {
    console.log('Error fetching inquiries:', error);
    return c.json({ success: false, error: 'Failed to fetch inquiries' }, 500);
  }
});

// Update inquiry
app.put('/make-server-0abfa7cf/inquiries/:inquiryId', async (c) => {
  try {
    const inquiryId = c.req.param('inquiryId');
    const body = await c.req.json();

    const updates: any = {};
    if (body.clientName !== undefined) updates.client_name = body.clientName;
    if (body.companyName !== undefined) updates.company_name = body.companyName;
    if (body.mobileNumber !== undefined) updates.mobile_number = body.mobileNumber;
    if (body.email !== undefined) updates.email = body.email;
    if (body.workType !== undefined) updates.work_type = body.workType;
    if (body.notes !== undefined) updates.notes = body.notes;

    const { data, error } = await supabase
      .from('client_inquiries')
      .update(updates)
      .eq('id', inquiryId)
      .select()
      .single();

    if (error) throw error;

    return c.json({ success: true, data });
  } catch (error) {
    console.log('Error updating inquiry:', error);
    return c.json({ success: false, error: 'Failed to update inquiry' }, 500);
  }
});

// Update inquiry status
app.put('/make-server-0abfa7cf/inquiries/:inquiryId/status', async (c) => {
  try {
    const inquiryId = c.req.param('inquiryId');
    const body = await c.req.json();
    const { status, reviewedBy, reviewedById, rejectionReason } = body;

    const updates: any = {
      status,
      reviewed_at: new Date().toISOString(),
    };

    if (reviewedBy) updates.reviewed_by = reviewedBy;
    if (reviewedById) updates.reviewed_by_id = reviewedById;
    if (rejectionReason) updates.rejection_reason = rejectionReason;

    const { data, error } = await supabase
      .from('client_inquiries')
      .update(updates)
      .eq('id', inquiryId)
      .select()
      .single();

    if (error) throw error;

    return c.json({ success: true, data });
  } catch (error) {
    console.log('Error updating inquiry status:', error);
    return c.json({ success: false, error: 'Failed to update inquiry status' }, 500);
  }
});

// Get inquiries by user (their own submissions)
app.get('/make-server-0abfa7cf/inquiries/user/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    console.log('Getting inquiries for userId:', userId);

    const { data, error } = await supabase
      .from('client_inquiries')
      .select('*')
      .eq('submitted_by_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.log('Error from Supabase:', error);
      throw error;
    }

    console.log(`Found ${data?.length || 0} inquiries for user ${userId}`);
    return c.json({ success: true, data: data || [] });
  } catch (error) {
    console.log('Error fetching user inquiries:', error);
    return c.json({ success: false, error: 'Failed to fetch user inquiries' }, 500);
  }
});

// Add communication to inquiry
app.post('/make-server-0abfa7cf/inquiries/:inquiryId/communications', async (c) => {
  try {
    const inquiryId = c.req.param('inquiryId');
    const body = await c.req.json();
    const { message, senderId, senderName, senderRole } = body;

    const { data, error } = await supabase
      .from('inquiry_communications')
      .insert([{
        inquiry_id: inquiryId,
        message,
        sender_id: senderId,
        sender_name: senderName,
        sender_role: senderRole,
      }])
      .select()
      .single();

    if (error) throw error;

    return c.json({ success: true, data });
  } catch (error) {
    console.log('Error adding communication:', error);
    return c.json({ success: false, error: 'Failed to add communication' }, 500);
  }
});

// Get communications for inquiry
app.get('/make-server-0abfa7cf/inquiries/:inquiryId/communications', async (c) => {
  try {
    const inquiryId = c.req.param('inquiryId');

    const { data, error } = await supabase
      .from('inquiry_communications')
      .select('*')
      .eq('inquiry_id', inquiryId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return c.json({ success: true, data: data || [] });
  } catch (error) {
    console.log('Error fetching communications:', error);
    return c.json({ success: false, error: 'Failed to fetch communications' }, 500);
  }
});

// ============================================
// BILLING RECORDS
// ============================================

// Get all billing records
app.get('/make-server-0abfa7cf/billing-records', async (c) => {
  try {
    const records = await kvStore.getByPrefix('billing:');
    
    console.log('=== FETCHING BILLING RECORDS ===');
    console.log('Raw records count:', records.length);
    
    // KV store returns objects directly, handle both stringified and object formats for backwards compatibility
    const parsedRecords = records
      .map(r => {
        try {
          // If it's already an object, return it
          if (typeof r === 'object' && r !== null) {
            return r;
          }
          // If it's a string, try to parse it
          if (typeof r === 'string') {
            return JSON.parse(r);
          }
          return null;
        } catch (e) {
          console.log('Error parsing record:', e);
          return null;
        }
      })
      .filter(r => r !== null)
      .sort((a, b) => new Date(b.billedAt).getTime() - new Date(a.billedAt).getTime());

    console.log('Parsed records count:', parsedRecords.length);
    
    return c.json({ success: true, data: parsedRecords });
  } catch (error) {
    console.log('Error fetching billing records:', error);
    return c.json({ success: false, error: 'Failed to fetch billing records' }, 500);
  }
});

// Create billing record (mark task as billed)
app.post('/make-server-0abfa7cf/billing-records', async (c) => {
  try {
    const body = await c.req.json();
    const { taskId, billNumber, billDate, taxableAmount, remarks, billedBy, billedById } = body;

    console.log('=== CREATE BILLING RECORD ===');
    console.log('Task ID:', taskId);
    console.log('Bill Number:', billNumber);
    console.log('Taxable Amount:', taxableAmount);
    console.log('Request body:', JSON.stringify(body, null, 2));

    // Validate required fields
    if (!taskId || !billNumber || !billedBy || !billedById) {
      return c.json({ 
        success: false, 
        error: 'Missing required fields: taskId, billNumber, billedBy, billedById are required' 
      }, 400);
    }

    // Validate taxableAmount
    if (taxableAmount === undefined || taxableAmount === null || isNaN(taxableAmount)) {
      return c.json({ 
        success: false, 
        error: 'Taxable Amount is required and must be a valid number' 
      }, 400);
    }

    // Get the task details
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    if (taskError || !task) {
      console.log('=== TASK FETCH ERROR ===');
      console.log('Task error:', taskError);
      console.log('Error message:', taskError?.message);
      console.log('Error code:', taskError?.code);
      console.log('Error details:', taskError?.details);
      console.log('Error hint:', taskError?.hint);
      return c.json({ 
        success: false, 
        error: 'Task not found',
        details: taskError?.message || 'Task does not exist',
        code: taskError?.code || '',
        hint: taskError?.hint || ''
      }, 404);
    }

    console.log('Task found:', task.id, task.task, 'Status:', task.status);

    // Check if task is in "Pending for Billing" status
    if (task.status !== 'Pending for Billing') {
      return c.json({ 
        success: false, 
        error: `Task must be in "Pending for Billing" status. Current status: ${task.status}` 
      }, 400);
    }

    // Raising the bill is the last step of the lifecycle, so the task lands on
    // 'Completed'. (It used to stop at 'Billed'; that value is retained in the
    // CHECK constraint only so pre-existing rows still render.)
    console.log('Updating task status to Completed...');
    const { data: updatedTask, error: updateError } = await supabase
      .from('tasks')
      .update({ 
        status: 'Completed',
        completion_date: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId)
      .select()
      .single();

    if (updateError) {
      console.log('=== TASK UPDATE ERROR ===');
      console.log('Update error:', updateError);
      console.log('Error message:', updateError?.message);
      console.log('Error code:', updateError?.code);
      console.log('Error details:', updateError?.details);
      console.log('Error hint:', updateError?.hint);
      
      return c.json({
        success: false,
        error: 'Failed to update task status',
        details: updateError?.message || 'Unknown database error',
        code: updateError?.code || '',
        hint: updateError?.hint || '',
        dbDetails: updateError?.details || ''
      }, 500);
    }

    console.log('Task updated successfully:', updatedTask.id);

    // Create billing record
    const billingId = `billing:${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const billingRecord = {
      id: billingId,
      taskId: task.id,
      clientName: task.client,
      taskName: task.task,
      category: task.category,
      assignedTo: task.assigned_to,
      assignedToId: task.assigned_to_id,
      completionDate: task.completion_date,
      billNumber,
      billDate: billDate || new Date().toISOString().split('T')[0],
      taxableAmount: taxableAmount || 0,
      remarks: remarks || '',
      billedBy,
      billedById,
      billedAt: new Date().toISOString(),
      budgetedFee: task.budgeted_fee || 0,
      hoursLogged: task.hours_logged || 0,
      // Payment stage. A new invoice starts unpaid and only counts as revenue
      // once it is marked paid. Records written before this field existed have
      // no paymentStatus at all and are treated as paid by the client.
      paymentStatus: 'Pending',
      paymentDate: null,
      paidAmount: 0,
      paidBy: null,
      paidById: null,
    };

    console.log('Storing billing record in KV store...');
    console.log('Billing record:', JSON.stringify(billingRecord, null, 2));
    
    // Store in KV store (don't stringify - kvStore handles that)
    try {
      await kvStore.set(billingId, billingRecord);
      console.log('Billing record created successfully:', billingId);
    } catch (kvError: any) {
      console.log('=== KV STORE ERROR ===');
      console.log('KV Error type:', typeof kvError);
      console.log('KV Error:', kvError);
      console.log('KV Error message:', kvError?.message);
      console.log('KV Error stack:', kvError?.stack);
      
      throw new Error(`Failed to store billing record: ${kvError?.message || String(kvError)}`);
    }

    return c.json({ 
      success: true, 
      data: billingRecord,
      message: 'Task marked as billed successfully'
    });
  } catch (error: any) {
    console.log('=== CATCH BLOCK ERROR ===');
    console.log('Error type:', typeof error);
    console.log('Error name:', error?.name);
    console.log('Error message:', error?.message);
    console.log('Error stack:', error?.stack);
    console.log('Full error object:', error);
    
    // Extract detailed error information and ensure everything is stringified properly
    const errorMessage = error?.message || error?.msg || 'Unknown error';
    const errorCode = error?.code || '';
    
    // Handle details that might be an object
    let errorDetails = '';
    if (error?.details) {
      errorDetails = typeof error.details === 'object' 
        ? JSON.stringify(error.details) 
        : String(error.details);
    }
    
    // Handle hint that might be an object  
    let errorHint = '';
    if (error?.hint) {
      errorHint = typeof error.hint === 'object'
        ? JSON.stringify(error.hint)
        : String(error.hint);
    }
    
    return c.json({ 
      success: false, 
      error: 'Failed to create billing record', 
      message: errorMessage,
      code: errorCode,
      details: errorDetails,
      hint: errorHint
    }, 500);
  }
});

// Get billing record by ID
app.get('/make-server-0abfa7cf/billing-records/:recordId', async (c) => {
  try {
    const recordId = c.req.param('recordId');
    const record = await kvStore.get(recordId);

    if (!record) {
      return c.json({ success: false, error: 'Billing record not found' }, 404);
    }

    // Handle both stringified and object formats for backwards compatibility
    let parsedRecord = record;
    if (typeof record === 'string') {
      parsedRecord = JSON.parse(record);
    }

    return c.json({ success: true, data: parsedRecord });
  } catch (error) {
    console.log('Error fetching billing record:', error);
    return c.json({ success: false, error: 'Failed to fetch billing record' }, 500);
  }
});

// Mark a billing record as paid — the step that turns an invoice into revenue
app.post('/make-server-0abfa7cf/billing-records/:recordId/mark-paid', async (c) => {
  try {
    const recordId = c.req.param('recordId');
    const body = await c.req.json();
    const { paymentDate, paidAmount, paidBy, paidById } = body;

    const record = await kvStore.get(recordId);
    if (!record) {
      return c.json({ success: false, error: 'Billing record not found' }, 404);
    }

    const billingData = typeof record === 'string' ? JSON.parse(record) : record;

    if (billingData.paymentStatus === 'Paid') {
      return c.json({ success: false, error: 'This invoice is already marked as paid' }, 400);
    }

    const updated = {
      ...billingData,
      paymentStatus: 'Paid',
      paymentDate: paymentDate || new Date().toISOString().split('T')[0],
      // Default to the invoiced amount so the common case needs no re-entry.
      paidAmount: paidAmount !== undefined && paidAmount !== null
        ? paidAmount
        : (billingData.taxableAmount || 0),
      paidBy: paidBy || null,
      paidById: paidById || null,
      paidAt: new Date().toISOString(),
    };

    await kvStore.set(recordId, updated);

    return c.json({ success: true, data: updated, message: 'Payment recorded successfully' });
  } catch (error: any) {
    console.log('Error marking billing record as paid:', error);
    return c.json({
      success: false,
      error: 'Failed to record payment',
      details: error?.message || String(error),
    }, 500);
  }
});

// Delete billing record (admin only)
app.delete('/make-server-0abfa7cf/billing-records/:recordId', async (c) => {
  try {
    const recordId = c.req.param('recordId');
    
    // Get the record first to get task ID
    const record = await kvStore.get(recordId);
    if (!record) {
      return c.json({ success: false, error: 'Billing record not found' }, 404);
    }

    const billingData = JSON.parse(record);

    // Deleting the bill undoes the step that completed the task, so the
    // completion date it stamped has to come off with it — otherwise the task
    // reads as finished on a date it is no longer finished on.
    await supabase
      .from('tasks')
      .update({ status: 'Pending for Billing', completion_date: null })
      .eq('id', billingData.taskId);

    // Delete the billing record
    await kvStore.del(recordId);

    return c.json({ success: true, message: 'Billing record deleted successfully' });
  } catch (error) {
    console.log('Error deleting billing record:', error);
    return c.json({ success: false, error: 'Failed to delete billing record' }, 500);
  }
});

Deno.serve(app.fetch);

Deno.serve(app.fetch);