-- Optional free-form event tags. Normalized to lowercase + deduped at write time.
-- Filtered via Prisma `hasSome` (exact match); values never contain commas.
ALTER TABLE "Event" ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
