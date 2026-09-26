import { z } from 'zod';

// ─── Auth Schemas ────────────────────────────────────────────────

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters'),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// ─── Organization Schemas ────────────────────────────────────────

export const createOrganizationSchema = z.object({
  name: z
    .string()
    .min(2, 'Organization name must be at least 2 characters')
    .max(100, 'Organization name too long'),
});

export const updateOrganizationSchema = z.object({
  name: z
    .string()
    .min(2, 'Organization name must be at least 2 characters')
    .max(100, 'Organization name too long')
    .optional(),
});

// ─── Invitation Schemas ──────────────────────────────────────────

export const inviteMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['ADMIN', 'MANAGER', 'MEMBER'], {
    errorMap: () => ({ message: 'Role must be ADMIN, MANAGER, or MEMBER' }),
  }),
});

export const changeRoleSchema = z.object({
  role: z.enum(['ADMIN', 'MANAGER', 'MEMBER'], {
    errorMap: () => ({ message: 'Role must be ADMIN, MANAGER, or MEMBER' }),
  }),
});

// ─── Project Schemas ─────────────────────────────────────────────

export const createProjectSchema = z.object({
  name: z
    .string()
    .min(1, 'Project name is required')
    .max(200, 'Project name too long'),
  description: z.string().max(2000, 'Description too long').optional(),
});

export const updateProjectSchema = z.object({
  name: z
    .string()
    .min(1, 'Project name is required')
    .max(200, 'Project name too long')
    .optional(),
  description: z.string().max(2000, 'Description too long').optional().nullable(),
});

// ─── Task Schemas ────────────────────────────────────────────────

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Task title is required').max(500, 'Title too long'),
  description: z.string().max(5000, 'Description too long').optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  projectId: z.string().uuid('Invalid project ID'),
  assigneeId: z.string().uuid('Invalid assignee ID').optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional().nullable(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  assigneeId: z.string().uuid('Invalid assignee ID').optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
});

// ─── Billing Schemas ─────────────────────────────────────────────

export const createCheckoutSchema = z.object({
  plan: z.enum(['PRO', 'BUSINESS'], {
    errorMap: () => ({ message: 'Plan must be PRO or BUSINESS' }),
  }),
});

// ─── Query Schemas ───────────────────────────────────────────────

export const paginationQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).optional(),
  limit: z.string().regex(/^\d+$/).optional(),
});

export const taskFilterQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).optional(),
  limit: z.string().regex(/^\d+$/).optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  assigneeId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  search: z.string().optional(),
});

export const auditLogQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).optional(),
  limit: z.string().regex(/^\d+$/).optional(),
  action: z.string().optional(),
  actorId: z.string().uuid().optional(),
  entity: z.string().optional(),
});
