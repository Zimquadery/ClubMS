-- Club join rules: restrict who can send join requests by department.
-- ALL = anyone (default), ALLOW = only listed departments, BLOCK = all except listed departments.
ALTER TABLE "Club" ADD COLUMN "joinRuleMode" TEXT NOT NULL DEFAULT 'ALL';
ALTER TABLE "Club" ADD COLUMN "joinDepartments" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
