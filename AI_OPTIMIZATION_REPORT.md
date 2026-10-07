## Tool Used

I used Claude for step-by-step guidance on the Prisma schema, API routes, UI components and tests. I ran, tested and debugged everything."

## Flawed / Broken AI Code

### Flaw 1: Duplicate `DATABASE_URL` after `prisma init`

What went wrong: The Claude AI told me to put my Neon connection string in .env and then run npx prisma init, without warning that prisma init appends its own local placeholder DATABASE_URL. My .env ended up with two DATABASE_URL lines, and the later placeholder overrode the real one.

How it showed up: prisma migrate dev failed with "Environment variable not found: DATABASE_URL".

Fix: I opened .env, saw the two lines, and removed the placeholder. I also added import "dotenv/config" to prisma.config.ts, because Prisma skips loading .env when a config file exists.

Lesson: Generated tooling can silently change config files. Read the file after running a setup command.


### Flaw 2: The wastage formula was duplicated across routes

What went wrong: The approve route had the fabric wastage formula written inline. The reject route needed the same value for its audit log, so the formula would have been pasted a second time.

Fix: While adding the reject route, we moved the formula into one function, calculateWastagePct in src/lib/wastage.ts, and I updated the approve route to use it. I confirmed approval still returned the same value (2.22 for a 92-yard order that should use 90).

Lesson: Duplicated business rules drift apart. Approved and rejected batches would eventually report different wastage for the same fabric.

### Flaw 3: Unpinned test-runner install broke on a peer dependency conflict

What went wrong: The Claude AI told me to run npm install -D vitest, which pulled the newest major version. That version required a newer @types/node than my project had, and npm stopped with an ERESOLVE error.

Fix: I did not use --force or --legacy-peer-deps, since they hide the conflict. I installed vitest@3, which works with my existing typings, and confirmed all tests ran.

Lesson: Check a suggested version against the project's current dependencies instead of installing "latest".

## 3. Human Refactoring

I did not accept the first working version of each feature. After each step I ran it, tested it with curl or in the browser, and then restructured code where I saw duplication or a weak boundary.

Shared wastage calculation. The fabric wastage formula was written inline in the approve route. I moved it to calculateWastagePct in src/lib/wastage.ts so approve and reject use one implementation, and re-checked that approval still returned 2.22%.

One source of truth for the sewing queue. The verified-only query was needed by both the API route and the sewing dashboard. I moved it into getSewingQueue in src/lib/sewing-queue.ts, so the status = 'VERIFIED' rule exists in one place and the page and the API cannot disagree.

Central role guard. Authentication and role checks live in one function, requireRole, used as the first line of every protected route, instead of repeating session checks in each handler.

Traffic-light logic in one function. getItemStatus is used by the server when saving counts, by the approve route when it rechecks, and by the verifier screen for the live preview, so the colours always follow the same rule.

Page-level access check. After a logout bug, I added a session check inside the dashboard page and no longer rely on the layout alone for access control.

Safe test setup. Tests run against a separate Neon branch, and the setup file refuses to run if the test URL is missing or equals the main database URL. Cleanup deletes only orders whose number starts with TEST-.


## Defensive Architecture

### State machine

An order moves through PENDING_VERIFICATION, then VERIFIED, then SEWING_STARTED, or from PENDING_VERIFICATION to REJECTED. There is no general "update status" endpoint, and the client never sends a status. A status can only change through one of three routes, each with its own checks:

`POST /api/orders/[id]/approve`: PENDING_VERIFICATION to VERIFIED
`POST /api/orders/[id]/reject`: PENDING_VERIFICATION to REJECTED
`POST /api/sewing/[id]/start`: VERIFIED to SEWING_STARTED

Each transition is a conditional database update, for example updateMany with status: "PENDING_VERIFICATION" in the where clause. If two requests arrive at the same time, or a request targets an order in the wrong state, only the first can change it. Approve and reject also run inside a database transaction, so the checks, the status change and the audit log row succeed or fail together.

### Role guard on every route

Every API route starts with requireRole(...). It reads the signed session cookie and returns 401 if nobody is logged in, or 403 if the role is not allowed. Because this runs before any other code, a Cutting Supervisor who posts directly to the approve URL is refused before the database is touched. Hidden tabs and redirects in the UI are not part of the security.

### Hard stop on shortages

The Approve route returns 422 if any component is uncounted or short. It does not trust the stored status column: it recalculates each component's status from the stored actual_qty and expected_qty. Expected quantities are computed on the server from the recipe, and statuses are computed on the server when counts are saved, so the client only ever submits raw counts. Disabling the Approve button in the UI is only a convenience; removing the disabled attribute still gets a 422 from the server.

### Query isolation for the sewing queue

The sewing queue is built by one function, getSewingQueue, whose database query has where: { status: "VERIFIED" } written into it. The API route and the dashboard page both use that function, so they cannot disagree. The route reads no URL parameters, so adding ?status=PENDING_VERIFICATION has no effect. The verifier's order list is also forced to PENDING_VERIFICATION on the server.

The "Start Sewing" route returns the same 404 for a pending, a rejected and a non-existent order, so a sewing supervisor cannot learn which orders exist in other states.


### Input validation

Every route validates its input again on the server: order ids and counts must be whole numbers, negatives, decimals and text are rejected, and a rejection reason must be 5 to 500 characters after trimming.

### Verified by tests

Automated tests call the real route handlers against a separate test database, with only the session lookup replaced. They check that an all-GREEN order is approved, that a shortage returns 422 and leaves the order pending with no audit log, that a missing or blank rejection note returns 400, that non-verifier roles get 403, and that pending and rejected orders never appear in the sewing queue.