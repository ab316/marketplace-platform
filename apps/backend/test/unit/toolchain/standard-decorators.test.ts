import { expect, test } from 'vitest';

const calls: string[] = [];
function trace<This, Args extends unknown[], R>(
  target: (this: This, ...args: Args) => R,
  context: ClassMethodDecoratorContext<This, (this: This, ...args: Args) => R>
) {
  return function (this: This, ...args: Args): R {
    calls.push(String(context.name));
    return target.call(this, ...args);
  };
}

class PlaceOrder {
  @trace
  execute(n: number) {
    return n * 2;
  }
}

test('standard decorators compile and run under test (ADR-007)', () => {
  expect(new PlaceOrder().execute(21)).toBe(42);
  expect(calls).toEqual(['execute']);
});
