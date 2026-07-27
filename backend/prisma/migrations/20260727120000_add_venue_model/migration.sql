-- CreateTable
CREATE TABLE "Venue" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Venue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Venue_name_key" ON "Venue"("name");

-- RenameColumn: Event.location -> Event.venue (display name; managed snapshot or custom text)
ALTER TABLE "Event" RENAME COLUMN "location" TO "venue";

-- AddColumn: optional FK to managed Venue (null for custom/free-text venues)
ALTER TABLE "Event" ADD COLUMN "venueId" TEXT;

-- CreateIndex
CREATE INDEX "Event_venueId_idx" ON "Event"("venueId");

-- AddForeignKey: deleting a Venue nulls out Event.venueId (the snapshot name in Event.venue is preserved)
ALTER TABLE "Event" ADD CONSTRAINT "Event_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE SET NULL ON UPDATE CASCADE;
