-- Moves the parent or guardian details of bookings for patients under 18 out of "Appointment"
-- into their own "Guardian" table. Existing values are copied as they are (still encrypted;
-- no key needed), then the old columns are removed. No other data changes.

-- CreateTable
CREATE TABLE "Guardian" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "dataPrincipalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    CONSTRAINT "Guardian_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Guardian_dataPrincipalId_fkey" FOREIGN KEY ("dataPrincipalId") REFERENCES "DataPrincipal" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Copy existing guardian details (one row per booking for a patient under 18).
INSERT INTO "Guardian" ("id", "createdAt", "updatedAt", "appointmentId", "dataPrincipalId", "name", "relationship", "phone", "email")
SELECT 'g' || lower(hex(randomblob(12))), "createdAt", "updatedAt", "id", "dataPrincipalId", "guardianName", "guardianRelationship", "guardianPhone", "guardianEmail"
FROM "Appointment"
WHERE "patientIsMinor" = 1 AND "guardianName" IS NOT NULL AND "guardianRelationship" IS NOT NULL;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Appointment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "dataPrincipalId" TEXT NOT NULL,
    "preferredDate" DATETIME NOT NULL,
    "preferredSlot" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "notes" TEXT,
    "patientIsMinor" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "legallyRequired" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" DATETIME,
    CONSTRAINT "Appointment_dataPrincipalId_fkey" FOREIGN KEY ("dataPrincipalId") REFERENCES "DataPrincipal" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Appointment" ("completedAt", "createdAt", "dataPrincipalId", "id", "legallyRequired", "notes", "patientIsMinor", "preferredDate", "preferredSlot", "service", "status", "updatedAt") SELECT "completedAt", "createdAt", "dataPrincipalId", "id", "legallyRequired", "notes", "patientIsMinor", "preferredDate", "preferredSlot", "service", "status", "updatedAt" FROM "Appointment";
DROP TABLE "Appointment";
ALTER TABLE "new_Appointment" RENAME TO "Appointment";
CREATE INDEX "Appointment_dataPrincipalId_idx" ON "Appointment"("dataPrincipalId");
CREATE INDEX "Appointment_status_preferredDate_idx" ON "Appointment"("status", "preferredDate");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Guardian_appointmentId_key" ON "Guardian"("appointmentId");

-- CreateIndex
CREATE INDEX "Guardian_dataPrincipalId_idx" ON "Guardian"("dataPrincipalId");
