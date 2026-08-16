-- CreateTable
-- Pending co-host invitations. Holds ONLY pending rows: accept converts to an
-- EventHost (isPrimary=false) and deletes the invite; reject/cancel delete it.
-- Keeping pending state out of EventHost means host-based authz never sees it.
CREATE TABLE "EventHostInvite" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventHostInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventHostInvite_eventId_clubId_key" ON "EventHostInvite"("eventId", "clubId");

CREATE INDEX "EventHostInvite_clubId_idx" ON "EventHostInvite"("clubId");

-- AddForeignKey
ALTER TABLE "EventHostInvite" ADD CONSTRAINT "EventHostInvite_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventHostInvite" ADD CONSTRAINT "EventHostInvite_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;
