/**
 * The canonical task categories, matching the CHECK constraint on `tasks.category`
 * in database-schema.sql. Kept here so revenue breakdowns can list every category
 * — including ones with nothing billed against them yet.
 */
export const TASK_CATEGORIES = [
  'Income Tax', 'GST', 'Audit', 'Certification', 'Project Finance', 'Accounts',
  'Advisory', 'Office Work', 'Consultancy', 'Litigation', 'MCA Work',
] as const;
