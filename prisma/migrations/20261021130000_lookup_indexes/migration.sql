-- Indexes for lookups by person and by booking. Additive only: no table or row changes.
-- CreateIndex
CREATE INDEX "ConsentRecord_appointmentId_idx" ON "ConsentRecord"("appointmentId");

-- CreateIndex
CREATE INDEX "ConsentRecord_noticeVersionId_idx" ON "ConsentRecord"("noticeVersionId");

-- CreateIndex
CREATE INDEX "RightsRequest_dataPrincipalId_type_idx" ON "RightsRequest"("dataPrincipalId", "type");

-- CreateIndex
CREATE INDEX "Grievance_dataPrincipalId_idx" ON "Grievance"("dataPrincipalId");
