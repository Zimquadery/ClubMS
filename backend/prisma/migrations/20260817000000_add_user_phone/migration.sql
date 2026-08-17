-- AddColumn: mandatory phone; backfill placeholder for pre-existing rows before NOT NULL
ALTER TABLE "User" ADD COLUMN "phone" TEXT;
UPDATE "User" SET "phone" = '0000000000';
ALTER TABLE "User" ALTER COLUMN "phone" SET NOT NULL;
