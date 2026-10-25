import type { Kysely } from 'kysely';

import type { Database } from '../../../../shared/infrastructure/database/schema.ts';
import type { SessionRepository } from '../../application/ports.ts';
import { Session } from '../../domain/session.ts';

export class PgSessionRepository implements SessionRepository {
  readonly #db: Kysely<Database>;

  constructor(db: Kysely<Database>) {
    this.#db = db;
  }

  async findByTokenHash(tokenHash: string): Promise<Session | null> {
    const row = await this.#db
      .selectFrom('sessions')
      .selectAll()
      .where('token_hash', '=', tokenHash)
      .executeTakeFirst();

    if (row === undefined) {
      return null;
    }

    return Session.restore({
      id: row.id,
      userId: row.user_id,
      tokenHash: row.token_hash,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      revokedAt: row.revoked_at,
    });
  }

  async insert(session: Session): Promise<void> {
    const state = session.state;

    await this.#db
      .insertInto('sessions')
      .values({
        id: state.id,
        user_id: state.userId,
        token_hash: state.tokenHash,
        created_at: state.createdAt,
        expires_at: state.expiresAt,
        revoked_at: state.revokedAt,
      })
      .execute();
  }

  async save(session: Session): Promise<void> {
    const state = session.state;

    await this.#db
      .updateTable('sessions')
      .set({ expires_at: state.expiresAt, revoked_at: state.revokedAt })
      .where('id', '=', state.id)
      .execute();
  }

  async revokeAllForUser(userId: string, now: Date): Promise<void> {
    await this.#db
      .updateTable('sessions')
      .set({ revoked_at: now })
      .where('user_id', '=', userId)
      .where('revoked_at', 'is', null)
      .execute();
  }
}
