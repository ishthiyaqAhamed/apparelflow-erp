# ApparelFlow ERP: Cutting Verification & Sewing Queue Gate

A full-stack implementation of the Cutting Operations & Gatekeeper Verification Terminal for the Webtezza (Pvt) Ltd Software Engineering Intern practical challenge.

No cutting batch can reach the sewing queue unless a Cutting Verifier has counted every component and none is short. This is enforced on the server, not only in the UI.

Live app: https://apparelflow-erp-ten.vercel.app/
Repository: https://github.com/ishthiyaqAhamed/apparelflow-erp
AI usage report: [AI_OPTIMIZATION_REPORT.md](./AI_OPTIMIZATION_REPORT.md)

## Demo credentials

The login page also has a clickable demo panel that fills these in.

| Role                     Email                      Password 

| Cutting Supervisor | supervisor@apparelflow.com | Demo@1234 
| Cutting Verifier | verifier@apparelflow.com | Demo@1234 
| Sewing Supervisor | sewing@apparelflow.com | Demo@1234 

## Tech stack

Next.js (App Router) with TypeScript and Tailwind CSS
PostgreSQL on Neon, accessed through Prisma 6
JWT sessions with `jose`, stored in an httpOnly cookie; passwords hashed with `bcryptjs`
Vitest for automated tests
Deployed on Vercel

## How it works

### State machine


CUTTING_IN_PROGRESS -> PENDING_VERIFICATION -> VERIFIED -> SEWING_STARTED
                                 |
                         +-> REJECTED (mandatory reason)


1. Cutting Supervisor creates an order from a recipe. The server multiplies the target quantity by each component's pieces-per-garment to produce the expected counts. The order is created as PENDING_VERIFICATION.

2. Cutting Verifier counts the physical pieces. Each component gets a status calculated by the server:
   GREEN: counted equals expected
   YELLOW: counted is more than expected (excess; batch may proceed)
   RED: counted is less than expected (shortage; approval blocked)

3. The verifier can approve only if every component is counted and none is RED. Otherwise they can only reject, with a mandatory reason.

4. On approval the server writes an audit row (verifier id, timestamp, fabric wastage %) and the order becomes VERIFIED.

5. Sewing Supervisor sees only VERIFIED orders, with the verifier's name, timestamp, per-component variance and wastage, and can start sewing.

Fabric wastage % = ((actual yards − expected yards) ÷ expected yards) × 100, where expected yards = target quantity × standard yards per piece. It is calculated and stored by the backend.

### Security model

The UI hides and disables things for convenience, but the server is the real boundary. Every API route starts with a role guard (src/lib/guard.ts).

| Rule | Where it is enforced | Response |
|---|---|---|
| No session | Role guard | 401 |
| Wrong role (e.g. supervisor tries to approve) | Role guard | 403 |
| Approve with any RED, missing or uncounted component | Approve route, recalculated from stored quantities | 422 |
| Reject without a reason note | Reject route (trimmed, 5 to 500 characters) | 400 |
| Approve or reject an order that is not pending | Approve and reject routes | 409 |
| Sewing queue only returns verified orders | `where: { status: "VERIFIED" }` inside the database query; the route reads no URL parameters | n/a |
| Start sewing on a non-verified or unknown order | Single atomic update with `status: "VERIFIED"` in the `where`; same response for all other cases | 404 |

Other points:

- The verifier's identity and all audit timestamps come from the signed session cookie and the database clock. They are never read from a request body.
- Expected quantities and statuses are computed on the server. The client only sends counts.
- Approve and reject run in a database transaction, and use a conditional update so two simultaneous requests cannot both succeed.
- The audit log table is insert-only; no route updates or deletes its rows.

## API reference

| Method and path | Role | Purpose |
|---|---|---|
| `POST /api/auth/login` | public | Log in, sets session cookie |
| `POST /api/auth/logout` | any | Clears the session |
| `GET /api/auth/me` | any | Current user from the session |
| `GET /api/recipes` | cutting_supervisor | Recipes with components (read-only) |
| `POST /api/orders` | cutting_supervisor | Create a cutting order |
| `GET /api/orders` | cutting_supervisor, cutting_verifier | List orders (the verifier only ever gets pending ones) |
| `POST /api/orders/[id]/count` | cutting_verifier | Save component counts; server sets statuses |
| `POST /api/orders/[id]/approve` | cutting_verifier | Approve (422 if any shortage or uncounted) |
| `POST /api/orders/[id]/reject` | cutting_verifier | Reject with a mandatory note |
| `GET /api/sewing/queue` | sewing_supervisor | Verified orders only |
| `POST /api/sewing/[id]/start` | sewing_supervisor | Start sewing assembly |

## Database schema

Defined in `prisma/schema.prisma`, with migrations in `prisma/migrations`.

| Table | Purpose | Key columns |
|---|---|---|
| `users` | Accounts and roles | id, email (unique), password_hash, role, full_name, created_at |
| `recipes` | Bill of materials headers | id, recipe_code (unique), name, category, std_fabric_yards, wastage_cap |
| `recipe_components` | Cut parts per recipe | id, recipe_id, component_name, pieces_per_garment, image_url |
| `cutting_orders` | Production batches | id, order_no (unique), recipe_id, target_qty, fabric_roll_id, actual_fabric_yds, status, created_by, timestamps |
| `verification_items` | One row per component per order | id, order_id, component_id, expected_qty, actual_qty (nullable), status (nullable); unique on (order_id, component_id) |
| `verification_logs` | Immutable audit trail | id, order_id, verifier_id, decision, rejection_note, wastage_pct, timestamp |

Relationships: a recipe has many components and many orders; an order belongs to a recipe and a creating user and has many verification items and logs; each item points to one recipe component; each log points to a verifying user. `cutting_orders.status` is indexed because the sewing queue always filters on it.

Seed data: two recipes (REC-BL01 Casual Blouse, REC-CT02 Crop Top) with the exact components and quantities from the brief, and the three demo users above.

## Running locally

Requirements: Node.js 20 or higher and a PostgreSQL database (a free Neon project works).

```bash
git clone https://github.com/ishthiyaqAhamed/apparelflow-erp.git
cd apparelflow-erp
npm install
```

Create a `.env` file in the project root:

```
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require"
AUTH_SECRET="a-long-random-string"
```

Generate a secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Then create the tables, seed the data and start the app:

```bash
npx prisma migrate deploy
npx tsx prisma/seed.ts
npm run dev
```

Open http://localhost:3000.

## Tests

bash
npm test


There are 9 tests across 3 files. The five required domain rules are covered:

1. An order with all GREEN components can be approved by a verifier.
2. An order with a RED (shortage) component is blocked with 422, stays pending and writes no audit log.
3. Rejecting without a reason note (missing or blank) is refused with 400.
4. Non-verifier roles get 403 on approve and reject.
5. Pending and rejected orders never appear in the sewing queue query.

Plus unit tests for the traffic-light logic.

The tests call the real route handlers against a real database, with only the session lookup replaced by a fake that returns a chosen user. To keep them away from real data they need a second database: set TEST_DATABASE_URL in .env (for example a Neon branch of the main database). The test setup refuses to run if it is missing or identical to DATABASE_URL, and cleanup only deletes orders whose number starts with TEST-.

## Design decisions and notes

SEWING_STARTED status: the brief ends the pipeline at the sewing queue but also asks for a "Start Sewing Assembly" action, so this extra status records it.

Rejection note length: the brief only says a reason is mandatory. The server requires 5 to 500 characters after trimming, so blank or one-character notes are refused.

Number inputs are text fields with explicit validation, because browser number fields allow decimals and exponent notation. Quantities and counts must be whole numbers; fabric yards allow up to two decimals.

Wastage cap: each recipe stores its wastage cap, but approval is not blocked by it, since the brief does not require that. The wastage % is recorded and travels with the batch.

Wrong-state responses: the sewing start route answers 404 for any non-verified order so a sewing supervisor cannot learn which orders exist in other states.

Light theme is forced and all form controls use dark text on white, to avoid the low-contrast input defect called out in the brief. Status colours are always paired with a text label.

