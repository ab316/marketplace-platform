import type { Clock } from '@acme/core-contracts';

/** Controllable clock, so expiry behavior never depends on wall-clock time. */
export class TestClock implements Clock {
  #current: Date;

  constructor(start: string | Date = '2026-10-24T09:00:00.000Z') {
    this.#current = new Date(start);
  }

  now(): Date {
    return new Date(this.#current);
  }

  advanceHours(hours: number): void {
    this.#current = new Date(this.#current.getTime() + hours * 60 * 60 * 1000);
  }

  advanceMinutes(minutes: number): void {
    this.#current = new Date(this.#current.getTime() + minutes * 60 * 1000);
  }
}
