-- CreateTable
CREATE TABLE "NoticeVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "version" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "dataItems" TEXT NOT NULL,
    "purposes" TEXT NOT NULL,
    "effectiveFrom" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ConsentRecord" (
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
    "ipHash" TEXT,
    "userAgent" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ConsentRecord_dataPrincipalId_fkey" FOREIGN KEY ("dataPrincipalId") REFERENCES "DataPrincipal" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ConsentRecord_noticeVersionId_fkey" FOREIGN KEY ("noticeVersionId") REFERENCES "NoticeVersion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DataPrincipal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "referenceId" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "erasedAt" DATETIME
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "dataPrincipalId" TEXT NOT NULL,
    "preferredDate" DATETIME NOT NULL,
    "preferredSlot" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "notes" TEXT,
    "patientIsMinor" BOOLEAN NOT NULL DEFAULT false,
    "guardianName" TEXT,
    "guardianRelationship" TEXT,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "legallyRequired" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" DATETIME,
    CONSTRAINT "Appointment_dataPrincipalId_fkey" FOREIGN KEY ("dataPrincipalId") REFERENCES "DataPrincipal" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OtpChallenge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "dataPrincipalId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "consumedAt" DATETIME,
    CONSTRAINT "OtpChallenge_dataPrincipalId_fkey" FOREIGN KEY ("dataPrincipalId") REFERENCES "DataPrincipal" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RightsRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "dataPrincipalId" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "identifierProvided" TEXT NOT NULL,
    "verificationMethod" TEXT NOT NULL,
    "payload" TEXT,
    "response" TEXT,
    "dueDate" DATETIME NOT NULL,
    "respondedAt" DATETIME,
    CONSTRAINT "RightsRequest_dataPrincipalId_fkey" FOREIGN KEY ("dataPrincipalId") REFERENCES "DataPrincipal" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Grievance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "referenceNumber" TEXT NOT NULL,
    "dataPrincipalId" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "contactName" TEXT,
    "contactDetail" TEXT,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "dueDate" DATETIME NOT NULL,
    "resolution" TEXT,
    "resolvedAt" DATETIME,
    "escalationNote" TEXT NOT NULL,
    CONSTRAINT "Grievance_dataPrincipalId_fkey" FOREIGN KEY ("dataPrincipalId") REFERENCES "DataPrincipal" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Nomination" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "dataPrincipalId" TEXT NOT NULL,
    "nomineeName" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "Nomination_dataPrincipalId_fkey" FOREIGN KEY ("dataPrincipalId") REFERENCES "DataPrincipal" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipHash" TEXT,
    "detail" TEXT
);

-- CreateTable
CREATE TABLE "BreachIncident" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "detectedAt" DATETIME NOT NULL,
    "occurredAt" DATETIME,
    "location" TEXT,
    "description" TEXT NOT NULL,
    "nature" TEXT NOT NULL,
    "extent" TEXT NOT NULL,
    "affectedCount" INTEGER NOT NULL DEFAULT 0,
    "likelyImpact" TEXT,
    "consequencesForPrincipals" TEXT,
    "mitigation" TEXT,
    "safetyMeasuresForPrincipals" TEXT,
    "rootCause" TEXT,
    "responsibleFindings" TEXT,
    "remedialMeasures" TEXT,
    "boardIntimatedAt" DATETIME,
    "detailedReportDueAt" DATETIME NOT NULL,
    "detailedReportSentAt" DATETIME,
    "principalsIntimatedAt" DATETIME
);

-- CreateIndex
CREATE UNIQUE INDEX "NoticeVersion_version_language_key" ON "NoticeVersion"("version", "language");

-- CreateIndex
CREATE INDEX "ConsentRecord_dataPrincipalId_purpose_timestamp_idx" ON "ConsentRecord"("dataPrincipalId", "purpose", "timestamp");

-- CreateIndex
CREATE INDEX "ConsentRecord_anonymousId_purpose_timestamp_idx" ON "ConsentRecord"("anonymousId", "purpose", "timestamp");

-- CreateIndex
CREATE INDEX "ConsentRecord_timestamp_idx" ON "ConsentRecord"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "DataPrincipal_referenceId_key" ON "DataPrincipal"("referenceId");

-- CreateIndex
CREATE INDEX "Appointment_dataPrincipalId_idx" ON "Appointment"("dataPrincipalId");

-- CreateIndex
CREATE INDEX "Appointment_status_preferredDate_idx" ON "Appointment"("status", "preferredDate");

-- CreateIndex
CREATE INDEX "OtpChallenge_dataPrincipalId_createdAt_idx" ON "OtpChallenge"("dataPrincipalId", "createdAt");

-- CreateIndex
CREATE INDEX "RightsRequest_status_dueDate_idx" ON "RightsRequest"("status", "dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "Grievance_referenceNumber_key" ON "Grievance"("referenceNumber");

-- CreateIndex
CREATE INDEX "Grievance_status_dueDate_idx" ON "Grievance"("status", "dueDate");

-- CreateIndex
CREATE INDEX "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");
