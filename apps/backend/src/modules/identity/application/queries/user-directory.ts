import type { UserRepository } from '../ports.ts';

/**
 * Internal lookup used by other modules to name a person on a record they already hold — today,
 * the buyer on an order the selling organization reads (UC-015, P1-023).
 *
 * Same contract as `OrganizationDirectory`: not exposed over HTTP, takes no actor, answers only
 * "what is this user called?". Only the display name is published this way; the email and every
 * other account detail stay behind the identity module's own authorized routes (spec D3).
 */
export class UserDirectory {
  readonly #users: UserRepository;

  constructor(users: UserRepository) {
    this.#users = users;
  }

  /** One read for a page of records. Unknown ids are absent from the result. */
  async displayNamesOf(userIds: readonly string[]): Promise<ReadonlyMap<string, string>> {
    if (userIds.length === 0) {
      return new Map();
    }
    const users = await this.#users.findManyByIds(userIds);
    return new Map(users.map((user) => [user.id, user.displayName]));
  }
}
