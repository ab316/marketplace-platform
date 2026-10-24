// Snapshot-owned copies of the listing condition vocabulary: the snapshot
// preserves what the buyer was promised even if the listings model evolves.
export type ConditionGrade = 'A' | 'B' | 'C';
export type ConditionGuarantees = {
  batteryHealthMinPercent?: number | undefined;
  batteryCycleCountMax?: number | undefined;
};

export type OrderStatus = 'awaiting_payment' | 'cancelled';
export type CancellationReason = 'buyer_cancelled' | 'expired';

export const UNPAID_ORDER_TTL_HOURS = 24;

// Immutable snapshot of the listing content the buyer committed to (UC-001 B5).
export type ListingSnapshot = {
  listingId: string;
  title: string;
  description: string;
  brand: string;
  model: string;
  cpu: string;
  ram: string;
  storage: string;
  screenSize: string;
  conditionGrade: ConditionGrade;
  conditionGuarantees: ConditionGuarantees;
  knownDefects: string;
  priceOre: number;
  currency: 'SEK';
  fulfillmentExpectations: string;
};

export type TimelineEntryType = 'order_created' | 'order_cancelled';

export type TimelineEntry = {
  id: string;
  type: TimelineEntryType;
  message: string;
  nextStep: string | null;
  actorId: string | null;
  occurredAt: Date;
};

export type OrderProps = {
  id: string;
  buyerId: string;
  sellerOrganizationId: string;
  status: OrderStatus;
  cancellationReason: CancellationReason | null;
  listingSnapshot: ListingSnapshot;
  priceOre: number;
  currency: 'SEK';
  expiresAt: Date;
  version: number;
  createdAt: Date;
  timeline: TimelineEntry[];
};

export class OrderDomainError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'OrderDomainError';
    this.code = code;
  }
}

export class InvalidOrderStateError extends OrderDomainError {
  constructor(message: string) {
    super('INVALID_ORDER_STATE', message);
    this.name = 'InvalidOrderStateError';
  }
}

export class Order {
  props: OrderProps;

  private constructor(props: OrderProps) {
    this.props = props;
  }

  static create(input: {
    id: string;
    timelineEntryId: string;
    buyerId: string;
    sellerOrganizationId: string;
    listingSnapshot: ListingSnapshot;
    now: Date;
  }): Order {
    const expiresAt = new Date(input.now.getTime() + UNPAID_ORDER_TTL_HOURS * 60 * 60 * 1000);
    return new Order({
      id: input.id,
      buyerId: input.buyerId,
      sellerOrganizationId: input.sellerOrganizationId,
      status: 'awaiting_payment',
      cancellationReason: null,
      listingSnapshot: input.listingSnapshot,
      priceOre: input.listingSnapshot.priceOre,
      currency: input.listingSnapshot.currency,
      expiresAt,
      version: 0,
      createdAt: input.now,
      timeline: [
        {
          id: input.timelineEntryId,
          type: 'order_created',
          message: `Order created for "${input.listingSnapshot.title}". One unit is reserved for you.`,
          nextStep: `Pay to secure this order. Unpaid orders expire after ${UNPAID_ORDER_TTL_HOURS} hours.`,
          actorId: input.buyerId,
          occurredAt: input.now,
        },
      ],
    });
  }

  static fromProps(props: OrderProps): Order {
    return new Order(props);
  }

  // Buyer cancels an unpaid order (UC-001 A1). A cancelled order can never be
  // paid or reactivated; the reserved unit is released by the application layer.
  cancel(input: {
    reason: CancellationReason;
    actorId: string | null;
    timelineEntryId: string;
    now: Date;
  }): void {
    if (this.props.status !== 'awaiting_payment') {
      throw new InvalidOrderStateError('Only orders awaiting payment can be cancelled');
    }
    this.props.status = 'cancelled';
    this.props.cancellationReason = input.reason;
    this.props.timeline.push({
      id: input.timelineEntryId,
      type: 'order_cancelled',
      message:
        input.reason === 'expired'
          ? 'Order expired because it was not paid in time. The reserved unit was returned to stock.'
          : 'Order cancelled by the buyer. The reserved unit was returned to stock.',
      nextStep: null,
      actorId: input.actorId,
      occurredAt: input.now,
    });
  }
}
