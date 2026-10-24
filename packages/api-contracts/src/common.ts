import { z } from 'zod';

/** Every amount the API accepts or returns is SEK minor units (öre). */
export const moneySchema = z.object({
  amountMinor: z.number().int().nonnegative(),
  currency: z.literal('SEK'),
});

export type Money = z.infer<typeof moneySchema>;

/** Stable error envelope for every non-2xx response. */
export const errorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.string(), z.unknown()).optional(),
  }),
});

export type ErrorResponse = z.infer<typeof errorResponseSchema>;

export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
