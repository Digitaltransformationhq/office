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
    createdAt: task.created_at,
    updatedAt: task.updated_at,
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