UPDATE "Club" c SET name = name || ' (' || sub.rn || ')'
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY name ORDER BY "createdAt") AS rn
  FROM "Club"
) sub
WHERE c.id = sub.id AND sub.rn > 1;

CREATE UNIQUE INDEX "Club_name_key" ON "Club"("name");
