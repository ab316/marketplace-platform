import {
  InvalidListingStateError,
  ListingNotPublishableError,
  NoAvailableStockError,
} from './errors.ts';

export type ListingStatus = 'draft' | 'active' | 'archived';
export type ConditionGrade = 'A' | 'B' | 'C';

export type ConditionGuarantees = {
  batteryHealthMinPercent?: number | undefined;
  batteryCycleCountMax?: number | undefined;
};

// Fields a listing must disclose before it can be published (UC-001 Data /
// Validations). `| undefined` members are tolerated on input and stripped on
// write so partial payloads cannot blank out existing values.
export type ListingFields = {
  title?: string | undefined;
  description?: string | undefined;
  brand?: string | undefined;
  model?: string | undefined;
  cpu?: string | undefined;
  ram?: string | undefined;
  storage?: string | undefined;
  screenSize?: string | undefined;
  conditionGrade?: ConditionGrade | undefined;
  conditionGuarantees?: ConditionGuarantees | undefined;
  knownDefects?: string | undefined;
  priceOre?: number | undefined;
  quantity?: number | undefined;
  fulfillmentExpectations?: string | undefined;
};

function definedFields(fields: ListingFields): ListingFields {
  return Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined));
}

export type ListingProps = ListingFields & {
  id: string;
  organizationId: string;
  status: ListingStatus;
  currency: 'SEK';
  quantityAvailable: number;
  version: number;
  createdAt: Date;
  updatedAt: Date;
};

const REQUIRED_TEXT_FIELDS = [
  'title',
  'description',
  'brand',
  'model',
  'cpu',
  'ram',
  'storage',
  'screenSize',
  'knownDefects',
  'fulfillmentExpectations',
] as const;

export class Listing {
  props: ListingProps;

  private constructor(props: ListingProps) {
    this.props = props;
  }

  static createDraft(input: {
    id: string;
    organizationId: string;
    fields: ListingFields;
    now: Date;
  }): Listing {
    return new Listing({
      ...definedFields(input.fields),
      id: input.id,
      organizationId: input.organizationId,
      status: 'draft',
      currency: 'SEK',
      quantityAvailable: 0,
      version: 0,
      createdAt: input.now,
      updatedAt: input.now,
    });
  }

  static fromProps(props: ListingProps): Listing {
    return new Listing(props);
  }

  updateDraft(fields: ListingFields, now: Date): void {
    if (this.props.status !== 'draft') {
      throw new InvalidListingStateError('Only draft listings can be edited');
    }
    this.props = { ...this.props, ...definedFields(fields), updatedAt: now };
  }

  publish(now: Date): void {
    if (this.props.status !== 'draft') {
      throw new InvalidListingStateError('Only draft listings can be published');
    }

    const missing: string[] = [];
    for (const field of REQUIRED_TEXT_FIELDS) {
      const value = this.props[field];
      if (typeof value !== 'string' || value.trim().length === 0) {
        missing.push(field);
      }
    }
    if (this.props.conditionGrade === undefined) {
      missing.push('conditionGrade');
    }
    if (this.props.conditionGuarantees === undefined) {
      missing.push('conditionGuarantees');
    }
    if (!Number.isInteger(this.props.priceOre) || (this.props.priceOre ?? 0) <= 0) {
      missing.push('priceOre');
    }
    if (!Number.isInteger(this.props.quantity) || (this.props.quantity ?? 0) < 1) {
      missing.push('quantity');
    }
    if (missing.length > 0) {
      throw new ListingNotPublishableError(missing);
    }

    this.props.status = 'active';
    this.props.quantityAvailable = this.props.quantity ?? 0;
    this.props.updatedAt = now;
  }

  archive(now: Date): void {
    if (this.props.status !== 'active') {
      throw new InvalidListingStateError('Only active listings can be archived');
    }
    this.props.status = 'archived';
    this.props.updatedAt = now;
  }

  // Reserves one pooled-stock unit for an order (UC-001 B4). Only active
  // listings with available stock are orderable; stock never goes negative.
  reserveUnit(now: Date): void {
    if (this.props.status !== 'active') {
      throw new InvalidListingStateError('Orders can only be created from active listings');
    }
    if (this.props.quantityAvailable < 1) {
      throw new NoAvailableStockError();
    }
    this.props.quantityAvailable -= 1;
    this.props.updatedAt = now;
  }

  // Returns a reserved unit to stock when an unpaid order is cancelled or
  // expires (UC-001 A1/A2). Archived listings keep accurate counts too.
  releaseUnit(now: Date): void {
    if (this.props.status === 'draft') {
      throw new InvalidListingStateError('Draft listings cannot hold reservations');
    }
    if (this.props.quantity !== undefined && this.props.quantityAvailable >= this.props.quantity) {
      throw new InvalidListingStateError('No reserved units to release');
    }
    this.props.quantityAvailable += 1;
    this.props.updatedAt = now;
  }
}
