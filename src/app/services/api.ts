import { projectId, publicAnonKey } from '/utils/supabase/info';
import { normalizeRole } from '../utils/roles';

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-0abfa7cf`;

// Transform database snake_case to frontend camelCase
function transformTask(task: any) {
  return {
    id: task.id,
    client: task.client,
    task: task.task,
    category: task.category,
    assignedTo: task.assigned_to,
    assignedToId: task.assigned_to_id,
    priority: task.priority,
    status: task.status,
    assignmentStatus: task.assignment_status,
    startDate: task.start_date,
    targetDate: task.target_date,
    completionDate: task.completion_date,
    hoursLogged: task.hours_logged,
    budgetedFee: task.budgeted_fee,
    estimatedHours: task.estimated_hours,
    comments: task.comments,
    billingFees: task.billing_fees,
    taxableAmount: task.taxable_amount,
    billingDescription: task.billing_description,
    originallyAssignedById: task.originally_assigned_by_id,
    originallyAssignedByName: task.originally_assigned_by_name,
    reassignedFromId: task.reassigned_from_id,
    reassignedFromName: task.reassigned_from_name,
    rejectionReason: task.rejection_reason,
    reassignedAt: task.reassigned_at,
    createdBy: task.created_by,
    createdById: task.created_by_id,
    // Who the approval is routed to. Null means any partner may take it — the
    // approval queue relies on that distinction to decide who can act.
    approverId: task.approver_id,
    approverName: task.approver_name,
    // Who actually signed it off, which may differ from who it was routed to.
    approvedById: task.approved_by_id,
    approvedBy: task.approved_by_name,
    approvedAt: task.approved_at,
    // The latest open change request, mirrored from the comment thread so a task
    // list can flag "you are being waited on" without a fetch per row. A set
    // changesRequestedAt is what makes it open; resubmitting clears it.
    changesRequestedAt: task.changes_requested_at,
    changesRequestedBy: task.changes_requested_by,
    changesRequestedNote: task.changes_requested_note,
    revisionCount: task.revision_count || 0,
    createdAt: task.created_at,
    updatedAt: task.updated_at,
  };
}

/**
 * One message in a task's approval thread. Snake_case off the wire, like every
 * other row the server returns.
 */
export interface TaskComment {
  id: string;
  taskId: string;
  authorId: string | null;
  authorName: string;
  authorRole?: string;
  /** What the message is: work handed over, changes wanted, sign-off, or a plain note. */
  kind: 'submission' | 'change_request' | 'approval' | 'note';
  message: string;
  createdAt: string;
}

/** What a caller supplies to add to the thread. */
export interface NewTaskComment {
  message: string;
  authorId: string;
  authorName: string;
  authorRole?: string;
  kind?: TaskComment['kind'];
}

function transformTaskComment(row: any): TaskComment {
  return {
    id: row.id,
    taskId: row.task_id,
    authorId: row.author_id,
    authorName: row.author_name,
    authorRole: row.author_role,
    kind: row.kind,
    message: row.message,
    createdAt: row.created_at,
  };
}

function transformUser(user: any) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: normalizeRole(user.role) ?? user.role,
    status: user.status,
    lastLogin: user.last_login,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  };
}

function transformClient(client: any) {
  return {
    id: client.id,
    name: client.name,
    industry: client.industry,
    gst: client.gst,
    contact: client.contact,
    email: client.email,
    status: client.status,
    fileNumber: client.file_number,
    pan: client.pan,
    firmName: client.firm_name,
    itrFees: client.itr_fees || 0,
    gstFees: client.gst_fees || 0,
    gstAnnualReturnFees: client.gst_annual_return_fees || 0,
    accountingFees: client.accounting_fees || 0,
    auditFees: client.audit_fees || 0,
    companyActFees: client.company_act_fees || 0,
    tdsFees: client.tds_fees || 0,
    pfEsicPtLabourFees: client.pf_esic_pt_labour_fees || 0,
    consultancyFees: client.consultancy_fees || 0,
    totalFees: client.total_fees || 0,
    mobileNumber: client.mobile_number,
    emailId: client.email_id,
    createdAt: client.created_at,
    updatedAt: client.updated_at,
  };
}

async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${publicAnonKey}`,
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    console.error(`API Error (${endpoint}):`, data);
    console.error('Response status:', response.status);
    console.error('Response statusText:', response.statusText);
    console.error('Error message:', data.message);
    console.error('Error code:', data.code);
    console.error('Error details:', typeof data.details === 'object' ? JSON.stringify(data.details, null, 2) : data.details);
    console.error('Error hint:', data.hint);
    console.error('Full error:', data.fullError);
    console.error('Additional info:', data.additionalInfo);

    // Return the error data instead of throwing, so caller can handle it
    return {
      success: false,
      error: data.error || 'API request failed',
      message: data.message || data.error || 'API request failed',
      code: data.code,
      details: data.details || data.additionalInfo || data.errorCode || 'No details available',
      hint: data.hint,
      fullError: data.fullError,
      ...data
    };
  }

  return data;
}

// Tasks API
export const tasksAPI = {
  getAll: async () => {
    const result = await fetchAPI('/tasks');
    return {
      ...result,
      data: result.data?.map(transformTask) || [],
    };
  },

  getByUser: async (userId: string) => {
    const result = await fetchAPI(`/tasks/user/${userId}`);
    return {
      ...result,
      data: result.data?.map(transformTask) || [],
    };
  },

  create: async (task: any) => {
    const result = await fetchAPI('/tasks', {
      method: 'POST',
      body: JSON.stringify(task),
    });
    return {
      ...result,
      data: result.data ? transformTask(result.data) : null,
    };
  },

  /**
   * `updates` may carry a `comment: NewTaskComment` alongside the fields. The
   * server appends it to the approval thread once the update itself has stuck,
   * and derives the change-request bookkeeping from its `kind` — so submitting
   * work, sending it back, and signing it off are each one request.
   */
  update: async (taskId: string, updates: any) => {
    const result = await fetchAPI(`/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return {
      ...result,
      data: result.data ? transformTask(result.data) : null,
    };
  },

  delete: async (taskId: string) => {
    return fetchAPI(`/tasks/${taskId}`, {
      method: 'DELETE',
    });
  },

  /** The whole approval thread for one task, oldest first. */
  getComments: async (taskId: string) => {
    const result = await fetchAPI(`/tasks/${taskId}/comments`);
    return {
      ...result,
      data: (result.data || []).map(transformTaskComment) as TaskComment[],
    };
  },

  /**
   * Add to the thread without moving the task.
   *
   * The notes that accompany a decision — submitting work, requesting changes,
   * approving — belong on `update` instead, as its `comment` field, so the note
   * and the status land in one request and cannot half-apply.
   */
  addComment: async (taskId: string, comment: NewTaskComment) => {
    const result = await fetchAPI(`/tasks/${taskId}/comments`, {
      method: 'POST',
      body: JSON.stringify(comment),
    });
    return {
      ...result,
      data: result.data ? transformTaskComment(result.data) : null,
    };
  },
};

// Users API
export const usersAPI = {
  getAll: async () => {
    const result = await fetchAPI('/users');
    return {
      ...result,
      data: result.data?.map(transformUser) || [],
    };
  },

  getById: async (userId: string) => {
    const result = await fetchAPI(`/users/${userId}`);
    return {
      ...result,
      data: result.data ? transformUser(result.data) : null,
    };
  },

  create: async (user: any) => {
    console.log('usersAPI.create called with:', user);
    const result = await fetchAPI('/users', {
      method: 'POST',
      body: JSON.stringify(user),
    });
    console.log('usersAPI.create result:', result);

    // Check if result indicates failure
    if (!result.success) {
      console.error('User creation failed:', result);
      return result; // Return the error response as-is
    }

    return {
      ...result,
      data: result.data ? transformUser(result.data) : null,
    };
  },

  update: async (userId: string, updates: any) => {
    const result = await fetchAPI(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return {
      ...result,
      data: result.data ? transformUser(result.data) : null,
    };
  },

  delete: async (userId: string) => {
    return fetchAPI(`/users/${userId}`, {
      method: 'DELETE',
    });
  },
};

// Clients API
export const clientsAPI = {
  getAll: async () => {
    const result = await fetchAPI('/clients');
    return {
      ...result,
      data: result.data?.map(transformClient) || [],
    };
  },

  create: async (client: any) => {
    const result = await fetchAPI('/clients', {
      method: 'POST',
      body: JSON.stringify(client),
    });
    return {
      ...result,
      data: result.data ? transformClient(result.data) : null,
    };
  },

  update: async (clientId: string, updates: any) => {
    const result = await fetchAPI(`/clients/${clientId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return {
      ...result,
      data: result.data ? transformClient(result.data) : null,
    };
  },
};

// Login API
export const loginAPI = {
  login: async (credentials: {
    email: string;
    password: string;
    /** Optional: only the browser can obtain these, and only with permission.
     *  IP and device are read from the request headers server-side. */
    latitude?: number;
    longitude?: number;
  }) => {
    return fetchAPI('/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },

  /** Every user's sign-ins. Admin only, enforced in the UI. */
  getAllLoginHistory: async () => {
    return fetchAPI('/login-history');
  },

  getLoginHistory: async (userId: string) => {
    return fetchAPI(`/login-history/${userId}`);
  },
};

// Assignments API
export const assignmentsAPI = {
  create: async (assignment: any) => {
    return fetchAPI('/assignments', {
      method: 'POST',
      body: JSON.stringify(assignment),
    });
  },

  getMyAssignments: async (userId: string) => {
    return fetchAPI(`/assignments/user/${userId}`);
  },

  getAll: async () => {
    return fetchAPI('/assignments');
  },

  updateStatus: async (assignmentId: string, status: string, notes?: string) => {
    return fetchAPI(`/assignments/${assignmentId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, notes }),
    });
  },
};

/**
 * Leave API.
 *
 * The leave components each called `fetch('/api/leave/...')` directly — a
 * relative path on the site's own domain, where nothing is served. Those
 * requests have always failed, which is why the approval queue was permanently
 * empty. Everything else in the app goes through fetchAPI, which targets the
 * edge function; leave now does too.
 */
/**
 * The leave endpoints return raw rows in snake_case, while the components read
 * camelCase — leave.leaveType, leave.fromDate, leave.totalDays. Every one of
 * those would have come back undefined, so the approval queue would have
 * rendered blank columns even once the tables existed. Mapped here, the same
 * way tasks, users and clients already are.
 */
function transformLeave(l: any) {
  return {
    ...l,
    leaveType: l.leave_type,
    fromDate: l.from_date,
    toDate: l.to_date,
    isHalfDay: l.is_half_day,
    totalDays: l.total_days,
    approvedById: l.approved_by_id,
    approvedByName: l.approved_by_name,
    approvedAt: l.approved_at,
    rejectionReason: l.rejection_reason,
    createdAt: l.created_at,
    // /leave/pending already adds userName and userEmail from the joined user.
    userName: l.userName || l.user_name,
  };
}

export const leaveAPI = {
  getPending: async () => {
    const result = await fetchAPI('/leave/pending');
    return { ...result, data: (result.data || []).map(transformLeave) };
  },

  getByUser: async (userId: string) => {
    const result = await fetchAPI(`/leave/user/${userId}`);
    return { ...result, data: (result.data || []).map(transformLeave) };
  },

  getBalance: async (userId: string) => {
    return fetchAPI(`/leave/balance/${userId}`);
  },

  apply: async (application: any) => {
    return fetchAPI('/leave/apply', {
      method: 'POST',
      body: JSON.stringify(application),
    });
  },

  /** approverId must be the real user id ('user:7') — it is written to a column with an FK. */
  approve: async (leaveId: string, approverId: string, comments?: string) => {
    return fetchAPI(`/leave/${leaveId}/approve`, {
      method: 'PUT',
      body: JSON.stringify({ approverId, comments }),
    });
  },

  reject: async (leaveId: string, approverId: string, rejectionReason: string, comments?: string) => {
    return fetchAPI(`/leave/${leaveId}/reject`, {
      method: 'PUT',
      body: JSON.stringify({ approverId, rejectionReason, comments }),
    });
  },
};

// Notifications API
export const notificationsAPI = {
  getMyNotifications: async (userId: string) => {
    return fetchAPI(`/notifications/${userId}`);
  },

  markAsRead: async (notificationId: string) => {
    return fetchAPI(`/notifications/${notificationId}/read`, {
      method: 'PUT',
    });
  },

  markAllAsRead: async (userId: string) => {
    return fetchAPI(`/notifications/${userId}/read-all`, {
      method: 'PUT',
    });
  },

  dismiss: async (notificationId: string) => {
    return fetchAPI(`/notifications/${encodeURIComponent(notificationId)}`, {
      method: 'DELETE',
    });
  },
};

// Inquiries API
export const inquiriesAPI = {
  getPending: async () => {
    return fetchAPI('/inquiries/pending');
  },

  getAll: async () => {
    return fetchAPI('/inquiries');
  },

  getByUser: async (userId: string) => {
    return fetchAPI(`/inquiries/user/${userId}`);
  },

  create: async (inquiry: any) => {
    return fetchAPI('/inquiries', {
      method: 'POST',
      body: JSON.stringify(inquiry),
    });
  },

  update: async (inquiryId: string, data: any) => {
    return fetchAPI(`/inquiries/${inquiryId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  updateStatus: async (inquiryId: string, data: any) => {
    return fetchAPI(`/inquiries/${inquiryId}/status`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  approve: async (inquiryId: string, data: any) => {
    return fetchAPI(`/inquiries/${inquiryId}/approve`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  reject: async (inquiryId: string, reason: string) => {
    return fetchAPI(`/inquiries/${inquiryId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  // Communication methods
  getCommunications: async (inquiryId: string) => {
    return fetchAPI(`/inquiries/${inquiryId}/communications`);
  },

  addCommunication: async (inquiryId: string, data: {
    message: string;
    senderId: string;
    senderName: string;
    senderRole: string;
  }) => {
    return fetchAPI(`/inquiries/${inquiryId}/communications`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// Calendar Events API
export const calendarAPI = {
  getAll: async () => {
    return fetchAPI('/calendar-events');
  },

  create: async (event: any) => {
    return fetchAPI('/calendar-events', {
      method: 'POST',
      body: JSON.stringify(event),
    });
  },

  update: async (eventId: string, updates: any) => {
    return fetchAPI(`/calendar-events/${eventId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  delete: async (eventId: string) => {
    return fetchAPI(`/calendar-events/${eventId}`, {
      method: 'DELETE',
    });
  },
};

// Announcements API
export const announcementsAPI = {
  getAll: async () => {
    return fetchAPI('/announcements');
  },

  getActive: async () => {
    return fetchAPI('/announcements/active');
  },

  create: async (announcement: any) => {
    return fetchAPI('/announcements', {
      method: 'POST',
      body: JSON.stringify(announcement),
    });
  },

  update: async (announcementId: string, updates: any) => {
    return fetchAPI(`/announcements/${announcementId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  delete: async (announcementId: string) => {
    return fetchAPI(`/announcements/${announcementId}`, {
      method: 'DELETE',
    });
  },

  toggle: async (announcementId: string) => {
    return fetchAPI(`/announcements/${announcementId}/toggle`, {
      method: 'PUT',
    });
  },
};

// Billing Records API
export const billingAPI = {
  getAll: async () => {
    return fetchAPI('/billing-records');
  },

  getById: async (recordId: string) => {
    return fetchAPI(`/billing-records/${recordId}`);
  },

  create: async (billingData: {
    taskId: string;
    billNumber: string;
    billDate?: string;
    /**
     * Required — the server rejects the request without it. Now that billing is
     * the only fee-capture step in the lifecycle, this is where the amount is
     * recorded; it was previously missing from this type while still being sent.
     */
    taxableAmount: number;
    remarks?: string;
    billedBy: string;
    billedById: string;
  }) => {
    return fetchAPI('/billing-records', {
      method: 'POST',
      body: JSON.stringify(billingData),
    });
  },


  delete: async (recordId: string) => {
    return fetchAPI(`/billing-records/${recordId}`, {
      method: 'DELETE',
    });
  },
};