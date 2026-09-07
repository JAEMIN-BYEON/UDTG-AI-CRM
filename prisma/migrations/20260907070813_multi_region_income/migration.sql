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
    "desiredIncomes" TEXT NOT NULL DEFAULT '',
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
INSERT INTO "new_Consultation" ("age", "cargoYears", "completedAt", "createdAt", "creditStatus", "deletedAt", "desiredBrand", "desiredIncome", "desiredRegion", "desiredWorkHours", "drivingYears", "familyConsent", "fitnessLevel", "hasCargoCert", "hasVehicle", "id", "initialCapital", "interestedIn", "license", "name", "notes", "phone", "questions", "residenceArea", "shiftAvailability", "status", "sunTopSchedule", "unavailableTimes", "vehicleBodyType", "vehiclePreference", "vehicleTonnage") SELECT "age", "cargoYears", "completedAt", "createdAt", "creditStatus", "deletedAt", "desiredBrand", "desiredIncome", "desiredRegion", "desiredWorkHours", "drivingYears", "familyConsent", "fitnessLevel", "hasCargoCert", "hasVehicle", "id", "initialCapital", "interestedIn", "license", "name", "notes", "phone", "questions", "residenceArea", "shiftAvailability", "status", "sunTopSchedule", "unavailableTimes", "vehicleBodyType", "vehiclePreference", "vehicleTonnage" FROM "Consultation";
DROP TABLE "Consultation";
ALTER TABLE "new_Consultation" RENAME TO "Consultation";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
