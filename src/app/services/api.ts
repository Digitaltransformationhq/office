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
    /** The form field is `gstin`; the column is the legacy `gst`. Exposed under
     *  both names so neither side has to remember which it is. */
    gstin: client.gst,
    itrApplicable: client.itr_applicable !== false,
    /** 'Filing' or 'Non-filer' — on record, but no return is due from this firm. */
    clientType: client.client_type || 'Filing',
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

// ============================================
// ITR REGISTER
// ============================================
// clients (PAN) -> itr_filings (one row per client per financial year).
// There is no ITR client table: see docs/itr-register.md.

/** Every state a return can be in. Ordered as the work flows. */
export const ITR_STATUSES = [
  'Pending',
  'Data Requested',
  'Data Not Provided',
  'Data Received',
  'In Preparation',
  'Ready to File',
  'Filed',
  'Not Applicable',
] as const;

export type ItrStatus = typeof ITR_STATUSES[number];

export const ITR_FORMS = ['ITR-1', 'ITR-2', 'ITR-3', 'ITR-4', 'ITR-5', 'ITR-6', 'ITR-7'] as const;

/**
 * How a client's papers reached the office.
 *
 * A closed list, so the answer can be counted. Left as free text it would fill
 * up with 'whatsapp', 'Whatsapp' and 'on wtsp', which is no use to anyone
 * looking at how the year's data actually came in.
 */
export const ITR_DATA_MEDIUMS = [
  'In person',
  'Collected from client',
  'Courier / Post',
  'Email',
  'WhatsApp',
  'Cloud link',
  'Pen drive',
  'Downloaded from portal',
  'Other',
] as const;

export type ItrDataMedium = typeof ITR_DATA_MEDIUMS[number];

/** The bit of explanation each option needs, where the name alone is ambiguous. */
export const ITR_DATA_MEDIUM_HINTS: Partial<Record<ItrDataMedium, string>> = {
  'In person': 'client brought it in',
  'Collected from client': 'someone from the office fetched it',
  'Cloud link': 'Drive, Dropbox, a shared folder',
  'Pen drive': 'including a Tally backup on a disk',
  'Downloaded from portal': 'AIS / 26AS / TIS',
};

/** One return, for one client, for one year. */
export interface ItrFiling {
  id: string;
  clientId: string;
  clientName: string;
  pan: string | null;
  fileNumber: string | null;
  /** 'Non-filer' clients should not appear here; surfaced so the UI can say so if they do. */
  clientType: string;
  financialYear: string;
  itrForm: string | null;
  status: ItrStatus;
  /** The control list's own words, kept verbatim — see the importer. */
  dataNote: string | null;
  /** How the papers reached the office. Null means it was never recorded —
   *  which is true of every return that came in from the control list. */
  dataMedium: ItrDataMedium | null;
  statusNote: string | null;
  partnerRemark: string | null;
  regime: 'Old' | 'New' | null;
  /** May be null even when filed: two rows on the sheet say only "DONE". */
  filedOn: string | null;
  acknowledgementNo: string | null;
  isAudit: boolean;
  /** Business income other than speculation or F&O — moves the due date to 31 August. */
  businessIncome: boolean;
  dueDate: string | null;
  cpc: boolean;
  itrV: boolean;
  computation: boolean;
  financialStatement: boolean;
  challan: boolean;
  wpGroup: string | null;

  /** Where the invoice has got to. Set by Accounts, not by the ITR desk. */
  billingStatus: 'Not Ready' | 'Pending' | 'Billed' | 'Returned';
  billNumber: string | null;
  billDate: string | null;
  billingRemarks: string | null;
  billedByName: string | null;
  billedAt: string | null;
  /** Why Accounts sent it back. Kept after correction — the record is the point. */
  returnedReason: string | null;
  returnedByName: string | null;
  returnedAt: string | null;
  returnCount: number;
  responsiblePersonId: string | null;
  responsiblePersonName: string | null;
  remarks: string | null;
  updatedByName: string | null;
}

function transformItrFiling(row: any): ItrFiling {
  return {
    id: row.id,
    clientId: row.client_id,
    clientName: row.clients?.name || row.client_id,
    pan: row.clients?.pan ?? null,
    fileNumber: row.clients?.file_number ?? null,
    clientType: row.clients?.client_type || 'Filing',
    financialYear: row.financial_year,
    itrForm: row.itr_form,
    status: row.status,
    dataNote: row.data_note,
    dataMedium: row.data_medium,
    statusNote: row.status_note,
    partnerRemark: row.partner_remark,
    regime: row.regime,
    filedOn: row.filed_on,
    acknowledgementNo: row.acknowledgement_no,
    isAudit: !!row.is_audit,
    businessIncome: !!row.business_income,
    dueDate: row.due_date,
    cpc: !!row.cpc,
    itrV: !!row.itr_v,
    computation: !!row.computation,
    financialStatement: !!row.financial_statement,
    challan: !!row.challan,
    wpGroup: row.wp_group,
    billingStatus: row.billing_status || 'Not Ready',
    billNumber: row.bill_number,
    billDate: row.bill_date,
    billingRemarks: row.billing_remarks,
    billedByName: row.billed_by_name,
    billedAt: row.billed_at,
    returnedReason: row.returned_reason,
    returnedByName: row.returned_by_name,
    returnedAt: row.returned_at,
    returnCount: row.return_count || 0,
    responsiblePersonId: row.responsible_person_id,
    responsiblePersonName: row.responsible_person_name,
    remarks: row.remarks,
    updatedByName: row.updated_by_name,
  };
}

export const itrAPI = {
  /** Every return for one financial year, in a single request. */
  getRegister: async (financialYear: string) => {
    const result = await fetchAPI(`/itr/register?fy=${encodeURIComponent(financialYear)}`);
    return {
      ...result,
      data: {
        financialYear,
        filings: (result.data?.filings || []).map(transformItrFiling) as ItrFiling[],
      },
    };
  },

  getFinancialYears: async () => {
    const result = await fetchAPI('/itr/financial-years');
    return { ...result, data: (result.data || []) as string[] };
  },

  /**
   * Returns waiting on Accounts, and the ones Accounts sent back.
   * `fy` is optional — omit it to see every year at once.
   */
  getBillingQueue: async (financialYear?: string) => {
    const qs = financialYear ? `?fy=${encodeURIComponent(financialYear)}` : '';
    const result = await fetchAPI(`/itr/billing-queue${qs}`);
    return { ...result, data: (result.data || []).map(transformItrFiling) as ItrFiling[] };
  },

  /** Accounts raises the invoice. */
  markBilled: async (filingId: string, details: {
    billNumber: string;
    billDate?: string;
    acknowledgementNo?: string;
    remarks?: string;
    billedById?: string;
    billedByName?: string;
  }) => {
    const result = await fetchAPI(`/itr/filings/${encodeURIComponent(filingId)}/bill`, {
      method: 'PUT',
      body: JSON.stringify(details),
    });
    return { ...result, data: result.data ? transformItrFiling(result.data) : null };
  },

  /** Accounts sends it back for correction. The reason is required. */
  returnForCorrection: async (filingId: string, details: {
    reason: string;
    returnedById?: string;
    returnedByName?: string;
  }) => {
    const result = await fetchAPI(`/itr/filings/${encodeURIComponent(filingId)}/return`, {
      method: 'PUT',
      body: JSON.stringify(details),
    });
    return { ...result, data: result.data ? transformItrFiling(result.data) : null };
  },

  /** Create or update one return. Upsert on (client, year). */
  saveFiling: async (filing: Partial<ItrFiling> & { clientId: string; financialYear: string }) => {
    const result = await fetchAPI('/itr/filings', {
      method: 'PUT',
      body: JSON.stringify(filing),
    });
    return { ...result, data: result.data ? transformItrFiling(result.data) : null };
  },
};

// ============================================
// PERSONAL TO-DO LIST
// ============================================

/** One line on somebody's private list. */
export interface Todo {
  id: string;
  userId: string;
  body: string;
  done: boolean;
  /** The day it was ticked, in the OWNER's local reckoning — not the server's. */
  doneOn: string | null;
  doneAt: string | null;
  position: number;
  createdAt: string;
}

function transformTodo(row: any): Todo {
  return {
    id: row.id,
    userId: row.user_id,
    body: row.body,
    done: !!row.done,
    doneOn: row.done_on,
    doneAt: row.done_at,
    position: row.position ?? 0,
    createdAt: row.created_at,
  };
}

/**
 * A private daily list. Every call carries the owner, and the server matches on
 * it, so one person's list can never be reached through another's session.
 */
export const todosAPI = {
  /** Everything open, plus the last week of ticked items for the caller to
   *  filter down to its own idea of today. */
  getMine: async (userId: string) => {
    const result = await fetchAPI(`/todos?userId=${encodeURIComponent(userId)}`);
    return { ...result, data: (result.data || []).map(transformTodo) as Todo[] };
  },

  add: async (userId: string, body: string) => {
    const result = await fetchAPI('/todos', {
      method: 'POST',
      body: JSON.stringify({ userId, body }),
    });
    return { ...result, data: result.data ? transformTodo(result.data) : null };
  },

  /** `doneOn` must be the browser's local date — see the Todo interface. */
  update: async (id: string, userId: string, patch: { body?: string; done?: boolean; doneOn?: string }) => {
    const result = await fetchAPI(`/todos/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify({ userId, ...patch }),
    });
    return { ...result, data: result.data ? transformTodo(result.data) : null };
  },

  delete: async (id: string, userId: string) =>
    fetchAPI(`/todos/${encodeURIComponent(id)}?userId=${encodeURIComponent(userId)}`, { method: 'DELETE' }),
};

// ============================================
// CLIENT DISCUSSIONS
// ============================================

/** One recorded conversation with a client. */
export interface ClientDiscussion {
  id: string;
  clientId: string;
  /** The day the conversation happened. */
  discussedOn: string;
  mode: 'In person' | 'Phone' | 'WhatsApp' | 'Email' | 'Video call' | 'Other';
  note: string;
  participants: string | null;
  followUp: string | null;
  recordedById: string | null;
  recordedByName: string;
  /** The day it was written down — not the same thing as `discussedOn`, and the
   *  gap between them is what tells you how contemporaneous the note is. */
  createdAt: string;
}

function transformDiscussion(row: any): ClientDiscussion {
  return {
    id: row.id,
    clientId: row.client_id,
    discussedOn: row.discussed_on,
    mode: row.mode,
    note: row.note,
    participants: row.participants,
    followUp: row.follow_up,
    recordedById: row.recorded_by_id,
    recordedByName: row.recorded_by_name,
    createdAt: row.created_at,
  };
}

/**
 * The discussion log.
 *
 * Note what is missing: there is no `update`. Entries cannot be edited, because
 * a note that can be rewritten later is no use as a record of what was said at
 * the time. A correction is a new entry.
 */
export const discussionsAPI = {
  /** The whole thread for one client, newest conversation first. */
  getForClient: async (clientId: string) => {
    const result = await fetchAPI(`/clients/${encodeURIComponent(clientId)}/discussions`);
    return { ...result, data: (result.data || []).map(transformDiscussion) as ClientDiscussion[] };
  },

  /** `{ [clientId]: lastDiscussedOn }` across the whole book, for the register. */
  getLatestDates: async () => {
    const result = await fetchAPI('/client-discussions/latest');
    return { ...result, data: (result.data || {}) as Record<string, string> };
  },

  record: async (clientId: string, entry: {
    discussedOn?: string;
    mode?: string;
    note: string;
    participants?: string;
    followUp?: string;
    recordedById?: string;
    recordedByName: string;
  }) => {
    const result = await fetchAPI(`/clients/${encodeURIComponent(clientId)}/discussions`, {
      method: 'POST',
      body: JSON.stringify(entry),
    });
    return { ...result, data: result.data ? transformDiscussion(result.data) : null };
  },

  /** Admin only. The one way anything leaves the log. */
  delete: async (id: string) => fetchAPI(`/client-discussions/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};

// ============================================
// GST COMPLIANCE REGISTER
// ============================================
// See docs/gst-compliance.md.

/** One GST registration — a GSTIN held under a client's PAN. */
export interface GstRegistration {
  id: string;
  clientId: string;
  clientName: string;
  pan: string | null;
  /** The office's own code for this registration ("167", "DNG-BHV"). */
  codeNo: string | null;
  gstin: string;
  tradeName: string | null;
  state: string | null;
  filingFrequency: 'Monthly' | 'Quarterly' | 'Composition' | 'Annual' | 'Irregular' | 'Not Applicable';
  responsiblePersonId: string | null;
  responsiblePersonName: string | null;
  billingFrequency: string | null;
  contactPerson: string | null;
  mobileNumber: string | null;
  emailId: string | null;
  cashLedger: number;
  creditLedger: number;
  reclaimedAmount: number;
  status: 'Active' | 'Suspended' | 'Cancelled';
  notes: string | null;
}

/** Every state a cell of the register can be in. Ordered as the work flows. */
export const GST_FILING_STATUSES = [
  'Pending',
  'Message Sent',
  'Data Not Provided',
  'Data Received',
  'OTP Awaited',
  'Challan Sent',
  'Nil',
  'Filed',
  'Not Applicable',
] as const;

export type GstFilingStatus = typeof GST_FILING_STATUSES[number];

/** One return, for one registration, for one period. */
export interface GstFiling {
  id: string;
  registrationId: string;
  returnType: 'GSTR-1' | 'GSTR-3B' | 'GSTR-4' | 'GSTR-9' | 'GSTR-9C' | 'CMP-08' | 'Other';
  financialYear: string;
  periodKey: string;
  periodLabel: string;
  periodStart: string | null;
  periodEnd: string | null;
  dueDate: string | null;
  status: GstFilingStatus;
  dataReceivedOn: string | null;
  filedOn: string | null;
  arn: string | null;
  updatedByName: string | null;
  remarks: string | null;
  updatedAt: string | null;
}

function transformGstRegistration(row: any): GstRegistration {
  return {
    id: row.id,
    clientId: row.client_id,
    // Embedded from the joined client, so the grid can show who a GSTIN belongs
    // to without a second request per row.
    clientName: row.clients?.name || row.trade_name || row.gstin,
    pan: row.clients?.pan ?? null,
    codeNo: row.code_no,
    gstin: row.gstin,
    tradeName: row.trade_name,
    state: row.state,
    filingFrequency: row.filing_frequency,
    responsiblePersonId: row.responsible_person_id,
    responsiblePersonName: row.responsible_person_name,
    billingFrequency: row.billing_frequency,
    contactPerson: row.contact_person,
    mobileNumber: row.mobile_number,
    emailId: row.email_id,
    cashLedger: Number(row.cash_ledger) || 0,
    creditLedger: Number(row.credit_ledger) || 0,
    reclaimedAmount: Number(row.reclaimed_amount) || 0,
    status: row.status,
    notes: row.notes,
  };
}

function transformGstFiling(row: any): GstFiling {
  return {
    id: row.id,
    registrationId: row.registration_id,
    returnType: row.return_type,
    financialYear: row.financial_year,
    periodKey: row.period_key,
    periodLabel: row.period_label,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    dueDate: row.due_date,
    status: row.status,
    dataReceivedOn: row.data_received_on,
    filedOn: row.filed_on,
    arn: row.arn,
    updatedByName: row.updated_by_name,
    remarks: row.remarks,
    updatedAt: row.updated_at,
  };
}

export const gstAPI = {
  /**
   * The whole register for one financial year in a single request.
   *
   * The grid is 136 rows by 24 columns; fetching each registration's filings
   * separately would be 136 round trips to render one screen.
   */
  getRegister: async (financialYear: string) => {
    const result = await fetchAPI(`/gst/register?fy=${encodeURIComponent(financialYear)}`);
    return {
      ...result,
      data: {
        financialYear,
        registrations: (result.data?.registrations || []).map(transformGstRegistration),
        filings: (result.data?.filings || []).map(transformGstFiling),
      },
    };
  },

  getFinancialYears: async () => {
    const result = await fetchAPI('/gst/financial-years');
    return { ...result, data: (result.data || []) as string[] };
  },

  /**
   * The portal login for one registration. Always an explicit act against a
   * named registration — credentials are never part of a list payload.
   */
  getCredentials: async (registrationId: string) => {
    const result = await fetchAPI(`/gst/registrations/${encodeURIComponent(registrationId)}/credentials`);
    return {
      ...result,
      data: result.data
        ? { userId: result.data.portal_user_id, password: result.data.portal_password }
        : null,
    };
  },

  createRegistration: async (registration: Partial<GstRegistration> & { clientId: string; gstin: string }) => {
    const result = await fetchAPI('/gst/registrations', {
      method: 'POST',
      body: JSON.stringify(registration),
    });
    return { ...result, data: result.data ? transformGstRegistration(result.data) : null };
  },

  updateRegistration: async (registrationId: string, updates: Partial<GstRegistration>) => {
    const result = await fetchAPI(`/gst/registrations/${encodeURIComponent(registrationId)}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return { ...result, data: result.data ? transformGstRegistration(result.data) : null };
  },

  /**
   * Set the state of one cell. Upsert: most periods have no row until someone
   * first touches them, so this creates as often as it updates.
   */
  saveFiling: async (filing: {
    registrationId: string;
    returnType: GstFiling['returnType'];
    financialYear: string;
    periodKey: string;
    periodLabel: string;
    periodStart?: string | null;
    periodEnd?: string | null;
    dueDate?: string | null;
    status: GstFilingStatus;
    filedOn?: string | null;
    dataReceivedOn?: string | null;
    arn?: string | null;
    remarks?: string | null;
    updatedById?: string;
    updatedByName?: string;
  }) => {
    const result = await fetchAPI('/gst/filings', {
      method: 'PUT',
      body: JSON.stringify(filing),
    });
    return { ...result, data: result.data ? transformGstFiling(result.data) : null };
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