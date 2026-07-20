-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Consultation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT '작성중',
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "residenceArea" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "drivingYears" INTEGER NOT NULL DEFAULT 0,
    "cargoYears" INTEGER NOT NULL DEFAULT 0,
    "license" TEXT NOT NULL,
    "hasCargoCert" BOOLEAN NOT NULL DEFAULT false,
    "desiredIncome" INTEGER NOT NULL,
    "desiredRegion" TEXT NOT NULL,
    "desiredWorkHours" TEXT NOT NULL DEFAULT '',
    "shiftAvailability" TEXT NOT NULL,
    "desiredBrand" TEXT NOT NULL DEFAULT '',
    "fitnessLevel" INTEGER NOT NULL,
    "initialCapital" INTEGER NOT NULL,
    "hasVehicle" BOOLEAN NOT NULL DEFAULT false,
    "vehiclePreference" TEXT NOT NULL DEFAULT '',
    "interestedIn" TEXT NOT NULL DEFAULT '',
    "questions" TEXT NOT NULL DEFAULT '',
    "sunTopSchedule" TEXT NOT NULL DEFAULT '',
    "familyConsent" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "creditStatus" TEXT NOT NULL DEFAULT '',
    "unavailableTimes" TEXT NOT NULL DEFAULT '',
    "vehicleTonnage" TEXT NOT NULL DEFAULT '',
    "vehicleBodyType" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "deletedAt" DATETIME
);
INSERT INTO "new_Consultation" ("age", "cargoYears", "completedAt", "createdAt", "deletedAt", "desiredBrand", "desiredIncome", "desiredRegion", "desiredWorkHours", "drivingYears", "familyConsent", "fitnessLevel", "hasCargoCert", "hasVehicle", "id", "initialCapital", "interestedIn", "license", "name", "notes", "phone", "questions", "residenceArea", "shiftAvailability", "status", "sunTopSchedule", "vehiclePreference") SELECT "age", "cargoYears", "completedAt", "createdAt", "deletedAt", "desiredBrand", "desiredIncome", "desiredRegion", "desiredWorkHours", "drivingYears", "familyConsent", "fitnessLevel", "hasCargoCert", "hasVehicle", "id", "initialCapital", "interestedIn", "license", "name", "notes", "phone", "questions", "residenceArea", "shiftAvailability", "status", "sunTopSchedule", "vehiclePreference" FROM "Consultation";
DROP TABLE "Consultation";
ALTER TABLE "new_Consultation" RENAME TO "Consultation";
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
    "deletedAt" DATETIME,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Listing" ("brand", "category", "cons", "createdAt", "deletedAt", "id", "incomeMax", "incomeMin", "initialCapitalMin", "isActive", "loadType", "numberPlates", "payStructure", "physicalLoad", "pros", "region", "shift", "slotCount", "sunTopAvailable", "updatedAt", "vehicleRequirement", "workHours") SELECT "brand", "category", "cons", "createdAt", "deletedAt", "id", "incomeMax", "incomeMin", "initialCapitalMin", "isActive", "loadType", "numberPlates", "payStructure", "physicalLoad", "pros", "region", "shift", "slotCount", "sunTopAvailable", "updatedAt", "vehicleRequirement", "workHours" FROM "Listing";
DROP TABLE "Listing";
ALTER TABLE "new_Listing" RENAME TO "Listing";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
