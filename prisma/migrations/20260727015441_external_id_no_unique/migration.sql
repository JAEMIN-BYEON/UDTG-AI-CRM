-- DropIndex
DROP INDEX "Listing_externalId_key";

-- CreateIndex
CREATE INDEX "Listing_externalId_idx" ON "Listing"("externalId");
