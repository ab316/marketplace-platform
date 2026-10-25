import { createHmac, timingSafeEqual } from 'node:crypto';

import {
  type ProviderCallback as ProviderCallbackBody,
  providerCallbackSchema,
} from '@acme/api-contracts';

import type { ProviderCallback } from '../../application/ports.ts';
import { ProviderCallbackRejectedError } from '../../domain/errors.ts';

/**
 * Signs and verifies provider callbacks (ADR-009 §2). The webhook route and the simulated provider
 * both go through `decode`, so the simulated path exercises the same verification a real provider
 * integration depends on.
 */
export class ProviderCallbackCodec {
  readonly #secret: string;

  constructor(secret: string) {
    this.#secret = secret;
  }

  sign(rawBody: string): string {
    return createHmac('sha256', this.#secret).update(rawBody).digest('hex');
  }

  encode(callback: ProviderCallbackBody): { rawBody: string; signature: string } {
    const rawBody = JSON.stringify(callback);
    return { rawBody, signature: this.sign(rawBody) };
  }

  /** Verifies the signature before anything is parsed, then validates the body shape. */
  decode(rawBody: string, signature: string | undefined): ProviderCallback {
    if (signature === undefined || !this.#matches(rawBody, signature)) {
      throw new ProviderCallbackRejectedError('Provider callback signature is missing or invalid.');
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      throw new ProviderCallbackRejectedError('Provider callback body is not valid JSON.');
    }

    const result = providerCallbackSchema.safeParse(parsed);
    if (!result.success) {
      throw new ProviderCallbackRejectedError('Provider callback body is malformed.', {
        issues: result.error.issues.map((issue) => issue.path.join('.')),
      });
    }
    return result.data;
  }

  #matches(rawBody: string, signature: string): boolean {
    const expected = Buffer.from(this.sign(rawBody), 'hex');
    let provided: Buffer;
    try {
      provided = Buffer.from(signature, 'hex');
    } catch {
      return false;
    }
    return provided.length === expected.length && timingSafeEqual(provided, expected);
  }
}
