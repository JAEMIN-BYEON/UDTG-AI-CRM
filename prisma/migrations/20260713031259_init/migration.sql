-- CreateTable
CREATE TABLE "Listing" (
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
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Consultation" (
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME
);

-- CreateTable
CREATE TABLE "Recommendation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "consultationId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "scoreBreakdown" TEXT NOT NULL,
    "reasonText" TEXT NOT NULL,
    "reasonSource" TEXT NOT NULL DEFAULT 'template',
    "modelId" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Recommendation_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "Consultation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Recommendation_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Consent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "consultationId" TEXT NOT NULL,
    "consentType" TEXT NOT NULL,
    "policyVersion" TEXT NOT NULL,
    "agreedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Consent_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "Consultation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Video" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "VideoView" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "consultationId" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" DATETIME,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "VideoView_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "Consultation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "VideoView_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
