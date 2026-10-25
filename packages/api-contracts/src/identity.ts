import { z } from 'zod';

import { paginationQuerySchema } from './common.ts';

/** Fixed seller roles (PD-0003). No custom roles; capability order is owner ⊃ manager ⊃ viewer. */
export const organizationRoleSchema = z.enum(['owner', 'manager', 'viewer']);
export type OrganizationRole = z.infer<typeof organizationRoleSchema>;

export const organizationStatusSchema = z.enum(['active', 'deactivated']);
export type OrganizationStatus = z.infer<typeof organizationStatusSchema>;

/**
 * Email is the login identifier and is compared case-insensitively, so it is normalized to
 * lowercase at the contract boundary and stored that way.
 */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(254)
  .pipe(z.email('Enter a valid email address.'));

/** UC-002: at least 10 characters. Length beats composition rules for resisting guessing. */
export const passwordSchema = z.string().min(10).max(200);

export const signUpRequestSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: z.string().trim().min(1).max(120),
});
export type SignUpRequest = z.infer<typeof signUpRequestSchema>;

export const signInRequestSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(200),
});
export type SignInRequest = z.infer<typeof signInRequestSchema>;

export const changePasswordRequestSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: passwordSchema,
});
export type ChangePasswordRequest = z.infer<typeof changePasswordRequestSchema>;

export const membershipSchema = z.object({
  organizationId: z.string(),
  organizationName: z.string(),
  organizationStatus: organizationStatusSchema,
  role: organizationRoleSchema,
});
export type Membership = z.infer<typeof membershipSchema>;

/** The signed-in user as they see themselves. Never includes credentials. */
export const currentUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  displayName: z.string(),
  isPlatformAdmin: z.boolean(),
  /** `null` for a buyer, who belongs to no organization. */
  membership: membershipSchema.nullable(),
});
export type CurrentUser = z.infer<typeof currentUserSchema>;

export const sessionResponseSchema = z.object({
  /** Opaque bearer token (ADR-008). Presented as `Authorization: Bearer <token>`. */
  token: z.string(),
  expiresAt: z.string(),
  user: currentUserSchema,
});
export type SessionResponse = z.infer<typeof sessionResponseSchema>;

export const createOrganizationRequestSchema = z.object({
  name: z.string().trim().min(1).max(140),
  description: z.string().trim().max(2000).optional(),
});
export type CreateOrganizationRequest = z.infer<typeof createOrganizationRequestSchema>;

export const updateOrganizationRequestSchema = createOrganizationRequestSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update.',
  });
export type UpdateOrganizationRequest = z.infer<typeof updateOrganizationRequestSchema>;

export const addMemberRequestSchema = z.object({
  /** The person must already have an account; email invitations are a later feature. */
  email: emailSchema,
  role: organizationRoleSchema,
});
export type AddMemberRequest = z.infer<typeof addMemberRequestSchema>;

export const changeMemberRoleRequestSchema = z.object({
  role: organizationRoleSchema,
});
export type ChangeMemberRoleRequest = z.infer<typeof changeMemberRoleRequestSchema>;

export const organizationLifecycleRequestSchema = z.object({
  reason: z.string().trim().min(1).max(2000),
});
export type OrganizationLifecycleRequest = z.infer<typeof organizationLifecycleRequestSchema>;

export const organizationMemberSchema = z.object({
  userId: z.string(),
  email: z.string(),
  displayName: z.string(),
  role: organizationRoleSchema,
  addedAt: z.string(),
});
export type OrganizationMember = z.infer<typeof organizationMemberSchema>;

export const organizationSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  status: organizationStatusSchema,
  memberCount: z.number().int().nonnegative(),
  createdAt: z.string(),
  deactivatedAt: z.string().nullable(),
});
export type Organization = z.infer<typeof organizationSchema>;

export const organizationListResponseSchema = z.object({
  items: z.array(organizationSchema),
  total: z.number().int().nonnegative(),
});
export type OrganizationListResponse = z.infer<typeof organizationListResponseSchema>;

export const organizationMemberListResponseSchema = z.object({
  items: z.array(organizationMemberSchema),
});
export type OrganizationMemberListResponse = z.infer<typeof organizationMemberListResponseSchema>;

export const organizationAuditEntryTypeSchema = z.enum([
  'organization_created',
  'organization_profile_updated',
  'member_added',
  'member_role_changed',
  'member_removed',
  'organization_deactivated',
  'organization_reactivated',
]);
export type OrganizationAuditEntryType = z.infer<typeof organizationAuditEntryTypeSchema>;

export const organizationAuditEntrySchema = z.object({
  id: z.string(),
  sequence: z.number().int().positive(),
  type: organizationAuditEntryTypeSchema,
  occurredAt: z.string(),
  actorUserId: z.string().nullable(),
  summary: z.string(),
  details: z.record(z.string(), z.unknown()),
});
export type OrganizationAuditEntry = z.infer<typeof organizationAuditEntrySchema>;

export const organizationAuditResponseSchema = z.object({
  items: z.array(organizationAuditEntrySchema),
});
export type OrganizationAuditResponse = z.infer<typeof organizationAuditResponseSchema>;

export const organizationIdParamsSchema = z.object({
  organizationId: z.string().min(1),
});
export type OrganizationIdParams = z.infer<typeof organizationIdParamsSchema>;

export const organizationMemberParamsSchema = organizationIdParamsSchema.extend({
  userId: z.string().min(1),
});
export type OrganizationMemberParams = z.infer<typeof organizationMemberParamsSchema>;

export const listOrganizationsQuerySchema = paginationQuerySchema.extend({
  status: organizationStatusSchema.optional(),
});
export type ListOrganizationsQuery = z.infer<typeof listOrganizationsQuerySchema>;
