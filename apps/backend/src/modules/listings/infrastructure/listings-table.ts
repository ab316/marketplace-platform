import type { JSONColumnType } from 'kysely';

import type { ConditionGrade, ConditionGuarantees, ListingStatus } from '../domain/listing.ts';

export type ListingsTable = {
  id: string;
  organization_id: string;
  status: ListingStatus;
  title: string | null;
  description: string | null;
  brand: string | null;
  model: string | null;
  cpu: string | null;
  ram: string | null;
  storage: string | null;
  screen_size: string | null;
  condition_grade: ConditionGrade | null;
  condition_guarantees: JSONColumnType<ConditionGuarantees> | null;
  known_defects: string | null;
  price_ore: number | null;
  currency: 'SEK';
  quantity: number | null;
  quantity_available: number;
  fulfillment_expectations: string | null;
  version: number;
  created_at: Date;
  updated_at: Date;
};
