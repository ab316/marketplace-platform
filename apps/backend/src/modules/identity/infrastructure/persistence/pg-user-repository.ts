import type { Kysely } from 'kysely';

import type { Database } from '../../../../shared/infrastructure/database/schema.ts';
import type { UserRepository } from '../../application/ports.ts';
import { EmailAlreadyRegisteredError } from '../../domain/errors.ts';
import { User, type UserState } from '../../domain/user.ts';

interface UserRow {
  id: string;
  email: string;
  display_name: string;
  platform_role: string;
  created_at: Date;
  updated_at: Date;
  password_hash: string;
}

const toUserState = (row: UserRow): UserState => ({
  id: row.id,
  email: row.email,
  displayName: row.display_name,
  passwordHash: row.password_hash,
  platformRole: row.platform_role === 'platform_admin' ? 'platform_admin' : 'member',
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

/** Postgres thrown for a violated unique index, so a concurrent duplicate sign-up loses here. */
const isUniqueViolation = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && 'code' in error && error.code === '23505';

export class PgUserRepository implements UserRepository {
  readonly #db: Kysely<Database>;

  constructor(db: Kysely<Database>) {
    this.#db = db;
  }

  async findById(userId: string): Promise<User | null> {
    const row = await this.#selectUsers().where('users.id', '=', userId).executeTakeFirst();
    return row === undefined ? null : User.restore(toUserState(row));
  }

  async findByEmail(email: string): Promise<User | null> {
    const row = await this.#selectUsers().where('users.email', '=', email).executeTakeFirst();
    return row === undefined ? null : User.restore(toUserState(row));
  }

  async findManyByIds(userIds: readonly string[]): Promise<readonly User[]> {
    if (userIds.length === 0) {
      return [];
    }

    const rows = await this.#selectUsers()
      .where('users.id', 'in', [...userIds])
      .execute();
    return rows.map((row) => User.restore(toUserState(row)));
  }

  /** The account and its credentials are one aggregate, so they are written together. */
  async insert(user: User): Promise<void> {
    const state = user.state;

    try {
      await this.#db.transaction().execute(async (trx) => {
        await trx
          .insertInto('users')
          .values({
            id: state.id,
            email: state.email,
            display_name: state.displayName,
            platform_role: state.platformRole,
            created_at: state.createdAt,
            updated_at: state.updatedAt,
          })
          .execute();

        await trx
          .insertInto('user_credentials')
          .values({
            user_id: state.id,
            password_hash: state.passwordHash,
            updated_at: state.updatedAt,
          })
          .execute();
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new EmailAlreadyRegisteredError();
      }
      throw error;
    }
  }

  async save(user: User): Promise<void> {
    const state = user.state;

    await this.#db.transaction().execute(async (trx) => {
      await trx
        .updateTable('users')
        .set({
          email: state.email,
          display_name: state.displayName,
          platform_role: state.platformRole,
          updated_at: state.updatedAt,
        })
        .where('id', '=', state.id)
        .execute();

      await trx
        .updateTable('user_credentials')
        .set({ password_hash: state.passwordHash, updated_at: state.updatedAt })
        .where('user_id', '=', state.id)
        .execute();
    });
  }

  #selectUsers() {
    return this.#db
      .selectFrom('users')
      .innerJoin('user_credentials', 'user_credentials.user_id', 'users.id')
      .select([
        'users.id',
        'users.email',
        'users.display_name',
        'users.platform_role',
        'users.created_at',
        'users.updated_at',
        'user_credentials.password_hash',
      ]);
  }
}
