-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN "guardianEmail" TEXT;
ALTER TABLE "Appointment" ADD COLUMN "guardianPhone" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ConsentRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "dataPrincipalId" TEXT,
    "anonymousId" TEXT,
    "purpose" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "noticeVersionId" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "givenByGuardian" BOOLEAN NOT NULL DEFAULT false,
    "appointmentId" TEXT,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ConsentRecord_dataPrincipalId_fkey" FOREIGN KEY ("dataPrincipalId") REFERENCES "DataPrincipal" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ConsentRecord_noticeVersionId_fkey" FOREIGN KEY ("noticeVersionId") REFERENCES "NoticeVersion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ConsentRecord_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ConsentRecord" ("anonymousId", "channel", "createdAt", "dataPrincipalId", "givenByGuardian", "id", "ipHash", "language", "noticeVersionId", "purpose", "status", "timestamp", "updatedAt", "userAgent") SELECT "anonymousId", "channel", "createdAt", "dataPrincipalId", "givenByGuardian", "id", "ipHash", "language", "noticeVersionId", "purpose", "status", "timestamp", "updatedAt", "userAgent" FROM "ConsentRecord";
DROP TABLE "ConsentRecord";
ALTER TABLE "new_ConsentRecord" RENAME TO "ConsentRecord";
CREATE INDEX "ConsentRecord_dataPrincipalId_purpose_timestamp_idx" ON "ConsentRecord"("dataPrincipalId", "purpose", "timestamp");
CREATE INDEX "ConsentRecord_anonymousId_purpose_timestamp_idx" ON "ConsentRecord"("anonymousId", "purpose", "timestamp");
CREATE INDEX "ConsentRecord_timestamp_idx" ON "ConsentRecord"("timestamp");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
