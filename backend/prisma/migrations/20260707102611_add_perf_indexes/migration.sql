-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "ClubMembership_clubId_status_role_idx" ON "ClubMembership"("clubId", "status", "role");

-- CreateIndex
CREATE INDEX "Event_startTime_idx" ON "Event"("startTime");
