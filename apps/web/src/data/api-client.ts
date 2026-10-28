import 'server-only';
import type { z } from 'zod';

import { readSessionToken } from '../lib/auth/session-cookie.ts';
import { serverEnv } from '../lib/env.ts';
import { ApiContractError, ApiTransportError, toApiError } from './api-error.ts';

/**
 * The one place `apps/web` talks to the backend (REPO_MAP.md §6).
 *
 * Responsibilities concentrated here so no feature has to remember them:
 *  - session transport: the httpOnly cookie becomes an `Authorization: Bearer` header (ADR-011),
 *    so the backend API stays header-based exactly as ADR-008 specified;
 *  - correlation: a request id is generated or forwarded so a UI failure can be traced into the
 *    backend's structured logs;
 *  - error normalization: everything non-2xx becomes an `ApiError`;
 *  - contract validation: successful bodies are parsed with the same `@acme/api-contracts`
 *    schema the backend validated against, so drift is caught here rather than in a component.
 *
 * Server-only by construction. Client Components reach the backend through Server Actions or
 * TanStack Query calling route handlers — never by importing this module.
 */

export interface ApiCallOptions {
  readonly path: string;
  readonly method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  readonly body?: unknown;
  readonly query?: Record<string, string | number | boolean | undefined>;
  /**
   * Send the caller's session. Default `true`. Set `false` only for genuinely public reads, so
   * anonymous catalogue pages stay cacheable.
   */
  readonly authenticated?: boolean;
  readonly correlationId?: string;
  /**
   * Next.js fetch caching. Defaults to `no-store`: most of this API is per-actor and
   * authorization-sensitive, so caching must be opted into deliberately, never inherited.
   */
  readonly cache?: RequestCache;
  readonly revalidate?: number | false;
  readonly tags?: readonly string[];
}

const buildUrl = (path: string, query: ApiCallOptions['query']): string => {
  const url = new URL(`${serverEnv().BACKEND_API_URL}${path}`);

  if (query !== undefined) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  return url.toString();
};

/** Performs the call and normalizes failures. Shared by `apiRequest` and `apiCommand`. */
const performCall = async (options: ApiCallOptions): Promise<Response> => {
  const {
    path,
    method = 'GET',
    body,
    query,
    authenticated = true,
    correlationId,
    cache = 'no-store',
    revalidate,
    tags,
  } = options;

  const headers = new Headers({ accept: 'application/json' });
  headers.set('x-correlation-id', correlationId ?? crypto.randomUUID());

  if (body !== undefined) {
    headers.set('content-type', 'application/json');
  }

  if (authenticated) {
    const token = await readSessionToken();
    if (token !== undefined) {
      headers.set('authorization', `Bearer ${token}`);
    }
  }

  const nextOptions: { revalidate?: number | false; tags?: string[] } = {};
  if (revalidate !== undefined) {
    nextOptions.revalidate = revalidate;
  }
  if (tags !== undefined) {
    nextOptions.tags = [...tags];
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      cache,
      ...(Object.keys(nextOptions).length > 0 ? { next: nextOptions } : {}),
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch (cause) {
    throw new ApiTransportError(path, cause);
  }

  if (!response.ok) {
    throw toApiError(response.status, await readJson(response));
  }

  return response;
};

/**
 * A read expecting a body, validated against its contract schema.
 *
 * The schema is required rather than optional: an unvalidated body would reach the UI as
 * `unknown` widened to whatever the caller claimed, which is the drift this layer exists to stop.
 */
export const apiRequest = async <TResponse>(
  options: ApiCallOptions & { readonly schema: z.ZodType<TResponse> }
): Promise<TResponse> => {
  const response = await performCall(options);

  const parsed = options.schema.safeParse(await readJson(response));
  if (!parsed.success) {
    throw new ApiContractError(
      options.path,
      parsed.error.issues.map((issue) => issue.message).join('; ')
    );
  }

  return parsed.data;
};

/**
 * A call whose response body is not consumed — 204s and fire-and-forget commands.
 *
 * Separate from `apiRequest` so neither needs a cast to express "there is no body here".
 */
export const apiCommand = async (options: ApiCallOptions): Promise<void> => {
  await performCall(options);
};

/** 204 and empty bodies are normal here, so a parse failure must not masquerade as an API error. */
const readJson = async (response: Response): Promise<unknown> => {
  const text = await response.text();
  if (text.length === 0) {
    return undefined;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
};
