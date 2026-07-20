-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "brand" TEXT NOT NULL,
    "center" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "specJson" TEXT NOT NULL,
    "html" TEXT NOT NULL,
    "pdf" BLOB NOT NULL,
    "enriched" BOOLEAN NOT NULL DEFAULT false,
    "modelId" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
