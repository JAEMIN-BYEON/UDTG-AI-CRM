-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Listing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "brand" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "workHours" TEXT NOT NULL,
    "shift" TEXT NOT NULL,
    "payStructure" TEXT NOT NULL,
    "incomeMin" INTEGER NOT NULL,
    "incomeMax" INTEGER NOT NULL,
    "physicalLoad" INTEGER NOT NULL,
    "loadType" TEXT NOT NULL,
    "numberPlates" TEXT NOT NULL,
    "vehicleRequirement" TEXT NOT NULL,
    "initialCapitalMin" INTEGER NOT NULL,
    "pros" TEXT NOT NULL,
    "cons" TEXT NOT NULL,
    "sunTopAvailable" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "slotCount" INTEGER NOT NULL DEFAULT 1,
    "introMd" TEXT NOT NULL DEFAULT '',
    "center" TEXT NOT NULL DEFAULT '',
    "externalId" TEXT,
    "internalMemo" TEXT NOT NULL DEFAULT '',
    "reviewNote" TEXT NOT NULL DEFAULT '',
    "deletedAt" DATETIME,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Listing" ("brand", "category", "cons", "createdAt", "deletedAt", "id", "incomeMax", "incomeMin", "initialCapitalMin", "introMd", "isActive", "loadType", "numberPlates", "payStructure", "physicalLoad", "pros", "region", "shift", "slotCount", "sunTopAvailable", "updatedAt", "vehicleRequirement", "workHours") SELECT "brand", "category", "cons", "createdAt", "deletedAt", "id", "incomeMax", "incomeMin", "initialCapitalMin", "introMd", "isActive", "loadType", "numberPlates", "payStructure", "physicalLoad", "pros", "region", "shift", "slotCount", "sunTopAvailable", "updatedAt", "vehicleRequirement", "workHours" FROM "Listing";
DROP TABLE "Listing";
ALTER TABLE "new_Listing" RENAME TO "Listing";
CREATE UNIQUE INDEX "Listing_externalId_key" ON "Listing"("externalId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
