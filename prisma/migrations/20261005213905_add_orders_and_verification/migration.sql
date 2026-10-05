-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('CUTTING_IN_PROGRESS', 'PENDING_VERIFICATION', 'REJECTED', 'VERIFIED', 'SEWING_STARTED');

-- CreateEnum
CREATE TYPE "ItemStatus" AS ENUM ('GREEN', 'YELLOW', 'RED');

-- CreateEnum
CREATE TYPE "Decision" AS ENUM ('APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "cutting_orders" (
    "id" SERIAL NOT NULL,
    "order_no" TEXT NOT NULL,
    "recipe_id" INTEGER NOT NULL,
    "target_qty" INTEGER NOT NULL,
    "fabric_roll_id" TEXT NOT NULL,
    "actual_fabric_yds" DOUBLE PRECISION NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'CUTTING_IN_PROGRESS',
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cutting_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_items" (
    "id" SERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "component_id" INTEGER NOT NULL,
    "expected_qty" INTEGER NOT NULL,
    "actual_qty" INTEGER,
    "status" "ItemStatus",

    CONSTRAINT "verification_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_logs" (
    "id" SERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "verifier_id" INTEGER NOT NULL,
    "decision" "Decision" NOT NULL,
    "rejection_note" TEXT,
    "wastage_pct" DOUBLE PRECISION NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cutting_orders_order_no_key" ON "cutting_orders"("order_no");

-- CreateIndex
CREATE INDEX "cutting_orders_status_idx" ON "cutting_orders"("status");

-- CreateIndex
CREATE UNIQUE INDEX "verification_items_order_id_component_id_key" ON "verification_items"("order_id", "component_id");

-- AddForeignKey
ALTER TABLE "cutting_orders" ADD CONSTRAINT "cutting_orders_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cutting_orders" ADD CONSTRAINT "cutting_orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_items" ADD CONSTRAINT "verification_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "cutting_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_items" ADD CONSTRAINT "verification_items_component_id_fkey" FOREIGN KEY ("component_id") REFERENCES "recipe_components"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_logs" ADD CONSTRAINT "verification_logs_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "cutting_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_logs" ADD CONSTRAINT "verification_logs_verifier_id_fkey" FOREIGN KEY ("verifier_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
