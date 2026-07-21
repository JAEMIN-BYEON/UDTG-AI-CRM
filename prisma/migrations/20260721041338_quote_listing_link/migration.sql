-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Quote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "brand" TEXT NOT NULL,
    "center" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "specJson" TEXT NOT NULL,
    "html" TEXT NOT NULL,
    "pdf" BLOB NOT NULL,
    "enriched" BOOLEAN NOT NULL DEFAULT false,
    "modelId" TEXT NOT NULL DEFAULT '',
    "listingId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Quote_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Quote" ("brand", "center", "createdAt", "enriched", "filename", "html", "id", "modelId", "pdf", "specJson") SELECT "brand", "center", "createdAt", "enriched", "filename", "html", "id", "modelId", "pdf", "specJson" FROM "Quote";
DROP TABLE "Quote";
ALTER TABLE "new_Quote" RENAME TO "Quote";
CREATE INDEX "Quote_listingId_createdAt_idx" ON "Quote"("listingId", "createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
