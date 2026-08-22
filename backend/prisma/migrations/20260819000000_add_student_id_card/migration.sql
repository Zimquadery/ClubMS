-- AddColumn: mandatory unique student ID + ID card photo path
ALTER TABLE "User" ADD COLUMN "studentId" TEXT;
ALTER TABLE "User" ADD COLUMN "idCardUrl" TEXT;

-- Backfill distinct 8-digit student IDs (window functions need a subquery in UPDATE)
UPDATE "User" SET "studentId" = s.rn
FROM (SELECT id, LPAD((row_number() OVER ())::text, 8, '0') AS rn FROM "User") AS s
WHERE s.id = "User".id;
UPDATE "User" SET "idCardUrl" = '/uploads/Dummy_ID_card.jpg';

ALTER TABLE "User" ALTER COLUMN "studentId" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "idCardUrl" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "User_studentId_key" ON "User"("studentId");
