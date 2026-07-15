// ============================================
// ADD THESE ENDPOINTS TO supabase/functions/server/index.tsx
// ============================================

// LEAVE MANAGEMENT ENDPOINTS

app.post('/make-server-0abfa7cf/leave/apply', async (c) => {
  try {
    const body = await c.req.json();
    const leaveId = 'leave:' + crypto.randomUUID();
    
    const { data, error } = await supabase
      .from('leave_applications')
      .insert({
        id: leaveId,
        user_id: body.userId,
        user_name: body.userName,
        leave_type: body.leaveType,
        from_date: body.fromDate,
        to_date: body.toDate,
        is_half_day: body.isHalfDay || false,
        total_days: body.totalDays,
        reason: body.reason,
        status: 'Pending'
      })
      .select()
      .single();

    if (error) throw error;
    return c.json({ success: true, data });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

app.get('/make-server-0abfa7cf/leave/user/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const { data, error } = await supabase
      .from('leave_applications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return c.json({ success: true, data });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

app.get('/make-server-0abfa7cf/leave/pending', async (c) => {
  try {
    const { data, error } = await supabase
      .from('leave_applications')
      .select('*')
      .eq('status', 'Pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return c.json({ success: true, data });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

app.put('/make-server-0abfa7cf/leave/:leaveId/approve', async (c) => {
  try {
    const leaveId = c.req.param('leaveId');
    const body = await c.req.json();
    
    const { data, error } = await supabase
      .from('leave_applications')
      .update({
        status: 'Approved',
        approved_by_id: body.approvedById,
        approved_by_name: body.approvedByName,
        approved_at: new Date().toISOString()
      })
      .eq('id', leaveId)
      .select()
      .single();

    if (error) throw error;
    return c.json({ success: true, data });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

app.put('/make-server-0abfa7cf/leave/:leaveId/reject', async (c) => {
  try {
    const leaveId = c.req.param('leaveId');
    const body = await c.req.json();
    
    const { data, error } = await supabase
      .from('leave_applications')
      .update({
        status: 'Rejected',
        approved_by_id: body.approvedById,
        approved_by_name: body.approvedByName,
        approved_at: new Date().toISOString(),
        rejection_reason: body.reason
      })
      .eq('id', leaveId)
      .select()
      .single();

    if (error) throw error;
    return c.json({ success: true, data });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

app.get('/make-server-0abfa7cf/leave/balance/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const { data, error } = await supabase
      .from('leave_balance')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) throw error;
    return c.json({ success: true, data });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// TIME LOG ENDPOINTS

app.post('/make-server-0abfa7cf/timelog', async (c) => {
  try {
    const body = await c.req.json();
    const logId = 'timelog:' + crypto.randomUUID();
    
    const { data, error } = await supabase
      .from('time_logs')
      .insert({
        id: logId,
        user_id: body.userId,
        user_name: body.userName,
        task_id: body.taskId,
        task_name: body.taskName,
        client_name: body.clientName,
        category: body.category,
        hours: body.hours,
        description: body.description,
        log_date: body.logDate
      })
      .select()
      .single();

    if (error) throw error;
    return c.json({ success: true, data });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

app.get('/make-server-0abfa7cf/timelog/user/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const { data, error } = await supabase
      .from('time_logs')
      .select('*')
      .eq('user_id', userId)
      .order('log_date', { ascending: false });

    if (error) throw error;
    return c.json({ success: true, data });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// ATTENDANCE ENDPOINTS

app.post('/make-server-0abfa7cf/attendance', async (c) => {
  try {
    const body = await c.req.json();
    const attendanceId = 'att:' + crypto.randomUUID();
    
    const { data, error } = await supabase
      .from('attendance')
      .insert({
        id: attendanceId,
        user_id: body.userId,
        user_name: body.userName,
        attendance_date: body.attendanceDate,
        status: body.status,
        check_in_time: body.checkInTime,
        check_out_time: body.checkOutTime,
        total_hours: body.totalHours,
        location: body.location,
        notes: body.notes
      })
      .select()
      .single();

    if (error) throw error;
    return c.json({ success: true, data });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

app.get('/make-server-0abfa7cf/attendance/user/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', userId)
      .order('attendance_date', { ascending: false })
      .limit(30);

    if (error) throw error;
    return c.json({ success: true, data });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// APPROVAL QUEUE ENDPOINT

app.get('/make-server-0abfa7cf/approvals/pending', async (c) => {
  try {
    const { data, error } = await supabase
      .from('approvals')
      .select('*')
      .eq('status', 'Pending')
      .order('created_at', { ascending: false});

    if (error) throw error;
    return c.json({ success: true, data });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

app.put('/make-server-0abfa7cf/approvals/:approvalId/approve', async (c) => {
  try {
    const approvalId = c.req.param('approvalId');
    const body = await c.req.json();
    
    const { data, error } = await supabase
      .from('approvals')
      .update({
        status: 'Approved',
        approved_by_id: body.approvedById,
        approved_by_name: body.approvedByName,
        approved_at: new Date().toISOString(),
        comments: body.comments
      })
      .eq('id', approvalId)
      .select()
      .single();

    if (error) throw error;
    return c.json({ success: true, data });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

app.put('/make-server-0abfa7cf/approvals/:approvalId/reject', async (c) => {
  try {
    const approvalId = c.req.param('approvalId');
    const body = await c.req.json();
    
    const { data, error } = await supabase
      .from('approvals')
      .update({
        status: 'Rejected',
        approved_by_id: body.approvedById,
        approved_by_name: body.approvedByName,
        approved_at: new Date().toISOString(),
        rejection_reason: body.reason
      })
      .eq('id', approvalId)
      .select()
      .single();

    if (error) throw error;
    return c.json({ success: true, data });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});
