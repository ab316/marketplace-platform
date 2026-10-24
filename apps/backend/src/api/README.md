## API

HTTP composition: `create-server.ts` builds the Fastify instance (Helmet, CORS, rate limiting, the
shared error handler) and `routes.ts` mounts each module's routes. Route handlers live in the
owning module's `presentation/` layer.

Request and response shapes come from `@acme/api-contracts` and are validated with Zod at the
handler boundary. The generated OpenAPI specification and typed frontend client are a Phase 1
deliverable and are **not** implemented yet (see `docs/TECH_STACK.md`).

### Authentication (stub)

UC-001 does not include user management or real authentication. The caller is identified by an
`x-actor-id` header matching one of the fixed actors in `src/shared/presentation/actors.ts`:

| Actor id           | Role                                                 | Organization         |
| ------------------ | ---------------------------------------------------- | -------------------- |
| `usr_buyer_alice`  | buyer                                                | —                    |
| `usr_buyer_dave`   | buyer                                                | —                    |
| `usr_seller_bo`    | seller, may manage listings                          | `org_nordic_refurb`  |
| `usr_seller_maja`  | seller, **may not** manage listings                  | `org_nordic_refurb`  |
| `usr_seller_jonas` | seller, may manage listings (different organization) | `org_baltic_devices` |

Browsing the catalogue works without a header; everything else requires one.

### Endpoints

| Method | Path                               | Who            | Purpose                                 |
| ------ | ---------------------------------- | -------------- | --------------------------------------- |
| GET    | `/health`                          | anyone         | Liveness                                |
| GET    | `/api/listings`                    | anyone         | Browse active listings (`?q=`, paging)  |
| GET    | `/api/listings/:listingId`         | anyone         | Listing detail (drafts: owner only)     |
| POST   | `/api/listings`                    | seller         | Create a draft                          |
| PATCH  | `/api/listings/:listingId`         | seller         | Edit a draft                            |
| POST   | `/api/listings/:listingId/publish` | seller         | Publish a draft                         |
| POST   | `/api/listings/:listingId/archive` | seller         | Archive an active listing               |
| GET    | `/api/seller/listings`             | seller         | The organization's listings, any status |
| POST   | `/api/orders`                      | buyer          | Place an order for one unit             |
| GET    | `/api/orders/:orderId`             | buyer / seller | Order detail with timeline              |
| POST   | `/api/orders/:orderId/cancel`      | buyer          | Cancel an unpaid order                  |
| GET    | `/api/buyer/orders`                | buyer          | The buyer's orders                      |

### Errors

Every non-2xx response uses one envelope:

```json
{
  "error": { "code": "LISTING_UNAVAILABLE", "message": "...", "details": { "listingId": "lst_…" } }
}
```

`400` validation · `401` unknown/missing actor · `403` not permitted · `404` not found ·
`409` state conflict (already published, out of stock, already cancelled) · `500` unexpected.

### Walking UC-001 with curl

Start the server (`pnpm dev` from the repo root; defaults to in-memory persistence on port 3000).

```bash
BASE=http://localhost:3000
SELLER='x-actor-id: usr_seller_bo'
ALICE='x-actor-id: usr_buyer_alice'
DAVE='x-actor-id: usr_buyer_dave'

# 1. Seller creates a draft (one unit, so the stock rules are easy to see)
LISTING=$(curl -s -X POST $BASE/api/listings -H "$SELLER" -H 'content-type: application/json' -d '{
  "title": "ThinkPad T14 Gen 3 — refurbished",
  "description": "Business laptop, professionally refurbished and tested.",
  "specifications": {
    "brand": "Lenovo", "model": "ThinkPad T14 Gen 3", "cpu": "Intel Core i5-1245U",
    "ramGb": 16, "storageType": "nvme", "storageGb": 512, "screenSizeInches": 14
  },
  "condition": {
    "grade": "A",
    "guarantees": { "batteryHealthMinPercent": 92, "batteryCycleMin": 100, "batteryCycleMax": 300 },
    "knownDefects": "none"
  },
  "priceMinor": 799000, "currency": "SEK", "quantityTotal": 1,
  "fulfillmentExpectations": "Dispatched within 2 business days from Gothenburg."
}' | jq -r .id)

# 2. Drafts are invisible to buyers
curl -s $BASE/api/listings | jq '.total'          # 0

# 3. Publish it
curl -s -X POST $BASE/api/listings/$LISTING/publish -H "$SELLER" | jq '.status, .availableQuantity'

# 4. Buyer discovers it
curl -s "$BASE/api/listings?q=thinkpad" | jq '.items[0] | {id, title, price, availableQuantity}'

# 5. Buyer places an order — lands in "awaiting_payment" with a timeline and an expiry
ORDER=$(curl -s -X POST $BASE/api/orders -H "$ALICE" -H 'content-type: application/json' \
  -d "{\"listingId\":\"$LISTING\"}" | jq -r .id)
curl -s $BASE/api/orders/$ORDER -H "$ALICE" | jq '{status, expiresAt, timeline}'

# 6. The unit is held: a second buyer gets 409 LISTING_UNAVAILABLE
curl -s -X POST $BASE/api/orders -H "$DAVE" -H 'content-type: application/json' \
  -d "{\"listingId\":\"$LISTING\"}" | jq '.error.code'

# 7. Cancel, and the unit goes back on sale
curl -s -X POST $BASE/api/orders/$ORDER/cancel -H "$ALICE" | jq '{status, cancellationReason}'
curl -s $BASE/api/listings/$LISTING | jq '.availableQuantity'   # 1
```

Unpaid orders are released automatically by the reservation-expiry sweep
(`src/jobs/reservation-expiry-job.ts`). To see it without waiting 24 hours, start the server with
a short window, for example `ORDER_RESERVATION_TTL_HOURS=0.001 ORDER_EXPIRY_SWEEP_INTERVAL_MS=1000`.
