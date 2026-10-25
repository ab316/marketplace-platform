## API

HTTP composition: `create-server.ts` builds the Fastify instance (Helmet, CORS, rate limiting, the
shared error handler) and `routes.ts` mounts each module's routes. Route handlers live in the
owning module's `presentation/` layer.

Request and response shapes come from `@acme/api-contracts` and are validated with Zod at the
handler boundary. The generated OpenAPI specification and typed frontend client are a Phase 6
deliverable and are **not** implemented yet (see `docs/TECH_STACK.md`).

### Authentication

Sign in through `POST /api/auth/sign-in` and send the returned opaque token as
`Authorization: Bearer <token>` ([ADR-008](../../../../docs/decisions/ADR-008-opaque-session-authentication.md)).
Identity, platform role, and organization membership are resolved from storage on **every**
request, so removing a member, changing their role, or deactivating their organization takes
effect on their next call with no token re-issue.

Browsing the catalogue works with no token at all; everything else requires one.

### Roles

Fixed by [PD-0003](../../../../docs/product/decisions/0003-identity-and-organization-access.md).
A user belongs to at most one organization; a buyer belongs to none.

| Role                     | May do                                                           |
| ------------------------ | ---------------------------------------------------------------- |
| _(signed in, no org)_    | Browse, order, cancel own orders, create an organization         |
| `viewer`                 | …plus read the organization's listings, orders, members, audit   |
| `manager`                | …plus create, edit, publish, and archive listings                |
| `owner`                  | …plus edit the organization profile and manage members           |
| `platform_admin` (staff) | Inspect every organization and order; deactivate/reactivate orgs |

Marketplace staff oversee the marketplace; they deliberately cannot act as a seller. Staff standing
is provisioned out of band (`ProvisionPlatformAdmin`), never through an HTTP route.

### Endpoints

| Method | Path                                                  | Who                    | Purpose                                 |
| ------ | ----------------------------------------------------- | ---------------------- | --------------------------------------- |
| GET    | `/health`                                             | anyone                 | Liveness                                |
| POST   | `/api/auth/sign-up`                                   | anyone                 | Create an account                       |
| POST   | `/api/auth/sign-in`                                   | anyone                 | Exchange credentials for a session      |
| POST   | `/api/auth/sign-out`                                  | signed in              | Revoke the current session              |
| GET    | `/api/auth/me`                                        | signed in              | Current user, role, and membership      |
| POST   | `/api/auth/password`                                  | signed in              | Change password; revokes all sessions   |
| POST   | `/api/organizations`                                  | signed in, no org      | Create an organization, become owner    |
| GET    | `/api/organizations/:organizationId`                  | member / staff         | Organization profile                    |
| PATCH  | `/api/organizations/:organizationId`                  | owner                  | Edit the profile                        |
| GET    | `/api/organizations/:organizationId/members`          | member / staff         | Member list                             |
| POST   | `/api/organizations/:organizationId/members`          | owner                  | Add a registered user with a role       |
| PATCH  | `/api/organizations/:organizationId/members/:userId`  | owner                  | Change a member's role                  |
| DELETE | `/api/organizations/:organizationId/members/:userId`  | owner                  | Remove a member                         |
| GET    | `/api/organizations/:organizationId/audit`            | member / staff         | Append-only change history              |
| GET    | `/api/admin/organizations`                            | staff                  | Every organization (`?status=`)         |
| GET    | `/api/admin/organizations/:organizationId/listings`   | staff                  | Any organization's listings             |
| POST   | `/api/admin/organizations/:organizationId/deactivate` | staff                  | Retire a seller (nothing is deleted)    |
| POST   | `/api/admin/organizations/:organizationId/reactivate` | staff                  | Restore a seller                        |
| GET    | `/api/listings`                                       | anyone                 | Browse active listings (`?q=`, paging)  |
| GET    | `/api/listings/:listingId`                            | anyone                 | Listing detail (drafts: owner/staff)    |
| POST   | `/api/listings`                                       | owner / manager        | Create a draft                          |
| PATCH  | `/api/listings/:listingId`                            | owner / manager        | Edit a draft                            |
| POST   | `/api/listings/:listingId/publish`                    | owner / manager        | Publish a draft                         |
| POST   | `/api/listings/:listingId/archive`                    | owner / manager        | Archive an active listing               |
| GET    | `/api/seller/listings`                                | any member             | The organization's listings, any status |
| POST   | `/api/orders`                                         | signed in              | Place an order for one unit             |
| GET    | `/api/orders/:orderId`                                | buyer / seller / staff | Order detail with timeline              |
| POST   | `/api/orders/:orderId/cancel`                         | buyer                  | Cancel an unpaid order                  |
| GET    | `/api/buyer/orders`                                   | signed in              | The caller's own orders                 |
| POST   | `/api/orders/:orderId/pay`                            | buyer                  | Pay into escrow (202; outcome follows)  |
| GET    | `/api/orders/:orderId/payments`                       | staff                  | Every payment attempt for the order     |
| GET    | `/api/orders/:orderId/financial-history`              | staff                  | Ledger entries and escrow balance       |
| POST   | `/api/payments/provider/callbacks`                    | provider (signed)      | Payment outcome webhook                 |

### Errors

Every non-2xx response uses one envelope:

```json
{
  "error": { "code": "LISTING_UNAVAILABLE", "message": "...", "details": { "listingId": "lst_…" } }
}
```

`400` validation (including a rejected provider callback) · `401` missing, expired, or revoked
session · `403` not permitted · `404` not found · `409` state conflict (already published, out of
stock, already cancelled, organization deactivated, order not payable, payment already in progress)
· `500` unexpected.

Sign-in answers `401 INVALID_CREDENTIALS` identically for an unknown email and a wrong password,
so the endpoint cannot be used to discover which addresses are registered.

### Walking UC-001 with curl

Start the server (`pnpm dev` from the repo root; defaults to in-memory persistence on port 3000).

```bash
BASE=http://localhost:3000
CT='content-type: application/json'
PW='correct-horse-battery'

# 0. Create the cast, then sign in. Sign-up returns the user; sign-in returns the session token.
for who in bo@nordic.example alice@buyer.example dave@buyer.example; do
  curl -s -X POST $BASE/api/auth/sign-up -H "$CT" \
    -d "{\"email\":\"$who\",\"password\":\"$PW\",\"displayName\":\"$who\"}" > /dev/null
done
token() { curl -s -X POST $BASE/api/auth/sign-in -H "$CT" \
  -d "{\"email\":\"$1\",\"password\":\"$PW\"}" | jq -r .token; }

SELLER="authorization: Bearer $(token bo@nordic.example)"
ALICE="authorization: Bearer $(token alice@buyer.example)"
DAVE="authorization: Bearer $(token dave@buyer.example)"

# 0b. The seller needs an organization before they can list anything
curl -s -X POST $BASE/api/organizations -H "$SELLER" -H "$CT" \
  -d '{"name":"Nordic Refurb"}' | jq '{id, name, status}'

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

### Walking UC-004 with curl

Continues from the steps above with a fresh order. Payment runs on the built-in simulated provider
(PD-0004 §9); the `scenario` field tells it what to do and is only accepted while that provider is
configured.

```bash
# 8. Order again, then pay. 202: the attempt is pending; the provider answers a moment later.
ORDER=$(curl -s -X POST $BASE/api/orders -H "$ALICE" -H "$CT" -d "{\"listingId\":\"$LISTING\"}" | jq -r .id)
curl -s -X POST $BASE/api/orders/$ORDER/pay -H "$ALICE" -H "$CT" -d '{"scenario":"success"}' | jq '{id, status}'
sleep 1

# 9. Paid into escrow: "Payment secured" on the timeline, fee rate frozen, unit sold
curl -s $BASE/api/orders/$ORDER -H "$ALICE" | jq '{status, payment, timeline: [.timeline[].title]}'
curl -s $BASE/api/listings/$LISTING | jq '{reservedQuantity, soldQuantity, availableQuantity}'

# 10. A failed payment leaves the order payable; the buyer simply tries again
ORDER2=$(curl -s -X POST $BASE/api/orders -H "$DAVE" -H "$CT" -d "{\"listingId\":\"$LISTING\"}" | jq -r .id)
curl -s -X POST $BASE/api/orders/$ORDER2/pay -H "$DAVE" -H "$CT" -d '{"scenario":"failure"}' > /dev/null; sleep 1
curl -s $BASE/api/orders/$ORDER2 -H "$DAVE" | jq '{status, payment: .payment.status, last: .timeline[-1].title}'

# 11. Staff see where the money is
curl -s $BASE/api/orders/$ORDER/financial-history -H "$STAFF" | jq '{escrowBalance, kinds: [.entries[].kind]}'
curl -s $BASE/api/orders/$ORDER/payments -H "$STAFF" | jq '[.attempts[] | {status, feeRateBps}]'
```

Other scenarios: `timeout` (no answer; the attempt times out after `PAYMENT_ATTEMPT_TIMEOUT_MINUTES`
and the order becomes eligible for expiry again) and `duplicate_success` (the same success delivered
twice; applied once). A real provider would call `POST /api/payments/provider/callbacks` with the
body signed by HMAC-SHA256 over the raw JSON in `x-provider-signature`.

### Marketplace staff

Staff standing is never granted over HTTP. Promote an account directly in the database (or from a
script calling `identity.provisionPlatformAdmin`):

```sql
UPDATE users SET platform_role = 'platform_admin' WHERE email = 'staff@marketplace.example';
```

That account can then list every organization, inspect any order, and deactivate or reactivate a
seller — but still cannot create listings, because staff oversee the marketplace rather than sell
on it.

Unpaid orders are released automatically by the reservation-expiry sweep
(`src/jobs/reservation-expiry-job.ts`). To see it without waiting 24 hours, start the server with
a short window, for example `ORDER_RESERVATION_TTL_HOURS=0.001 ORDER_EXPIRY_SWEEP_INTERVAL_MS=1000`.
