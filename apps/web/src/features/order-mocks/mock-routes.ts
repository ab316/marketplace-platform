import type { Route } from 'next';

/**
 * The buyer-ordering mockups (UC-001, UC-013, UC-014; design spec: `docs/design/buyer-ordering.md`),
 * in the order they are meant to be read.
 *
 * Two of the surfaces carry genuine layout arguments — how the buyer confirms (D2) and how the
 * order page is composed (D6, D10) — so those come as competing directions. The states board and
 * the `/orders` list are not arguments: they are the states every direction must handle.
 */

export interface OrderMockPage {
  readonly href: Route;
  readonly name: string;
  /** What this page argues or demonstrates — the reason it is worth a page of its own. */
  readonly thesis: string;
  readonly reference: string;
}

export const confirmDirections: readonly OrderMockPage[] = [
  {
    href: '/mocks/orders/confirm/dialog',
    name: 'Confirm in place',
    reference: 'spec D2',
    thesis:
      'The confirmation is a checkpoint, not a destination: a dialog over the listing restates the commitment — one unit, this price, no payment yet, held 24 hours — while the laptop stays visible behind it. Argues that a buyer who just pressed Order should not be taken anywhere before the order exists.',
  },
  {
    href: '/mocks/orders/confirm/full-page',
    name: 'Confirm as its own page',
    reference: 'spec D2',
    thesis:
      'The confirmation is the commitment moment, so it gets a page: what you are ordering, what happens next, then one primary action. Argues that a 24-hour hold on someone else’s stock deserves a breath, and leaves room for what a real checkout grows later.',
  },
];

export const orderPageDirections: readonly OrderMockPage[] = [
  {
    href: '/mocks/orders/order/panel',
    name: 'Status panel',
    reference: 'UC-014, D6/D10',
    thesis:
      'The order page as a sibling of the listing page: snapshot and timeline on the left, a sticky status card on the right holding the state, the expiry, the next-step line, and the actions. Argues that the buyer’s question is "what do I do now?", so status and actions never scroll away.',
  },
  {
    href: '/mocks/orders/order/narrative',
    name: 'Single column',
    reference: 'UC-014, D6/D10',
    thesis:
      'The order page as a record read top to bottom: status banner, the next-step line directly under it, then the timeline, then the snapshot as the receipt. Argues that an order is mostly re-read after the fact, and a single column survives the fulfillment entries Phase 5 adds.',
  },
];

export const orderStatesMock: OrderMockPage = {
  href: '/mocks/orders/states',
  name: 'Order states',
  reference: 'UC-014 O3–O5, A2–A3',
  thesis:
    'Not a direction — the four states the order page must render whatever the layout: awaiting payment, cancelled by the buyer, expired unpaid, and paid into escrow, each with its status, its product-owned next-step line, and the actions that remain.',
};

export const ordersListMock: OrderMockPage = {
  href: '/mocks/orders/list',
  name: 'The buyer’s orders',
  reference: 'UC-014 O1/A1, D7/D9',
  thesis:
    'The plain list D7 asks for: the buyer’s orders newest first, 12 per page, each row carrying what it was, its status, the amount, and one secondary note — plus the empty state that points a new buyer at the catalogue instead of a blank page.',
};
