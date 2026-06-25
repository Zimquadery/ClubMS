-- CreateTable
CREATE TABLE "EventHost" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "addedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventHost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventHost_eventId_clubId_key" ON "EventHost"("eventId", "clubId");

CREATE INDEX "EventHost_clubId_isPrimary_idx" ON "EventHost"("clubId", "isPrimary");

-- AddForeignKey
ALTER TABLE "EventHost" ADD CONSTRAINT "EventHost_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventHost" ADD CONSTRAINT "EventHost_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventHost" ADD CONSTRAINT "EventHost_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: every existing Event gets a primary EventHost row from its current clubId.
-- Idempotent via ON CONFLICT (re-running won't duplicate rows); the unique index already exists.
INSERT INTO "EventHost" ("id", "eventId", "clubId", "isPrimary", "createdAt")
SELECT REPLACE(gen_random_uuid()::text, '-', ''), "id", "clubId", true, CURRENT_TIMESTAMP
FROM "Event"
WHERE NOT EXISTS (
  SELECT 1 FROM "EventHost" eh WHERE eh."eventId" = "Event"."id" AND eh."clubId" = "Event"."clubId"
);

-- DropForeignKey (must precede DropColumn)
ALTER TABLE "Event" DROP CONSTRAINT "Event_clubId_fkey";

-- DropColumn
ALTER TABLE "Event" DROP COLUMN "clubId";
