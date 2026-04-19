/*
  Warnings:

  - A unique constraint covering the columns `[code]` on the table `Store` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Store" ADD COLUMN "code" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Store_code_key" ON "Store"("code");
