-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "visitorId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "referrerOrigin" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "AnalyticsEvent_visitorId_idx" ON "AnalyticsEvent"("visitorId");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_timestamp_idx" ON "AnalyticsEvent"("timestamp");
