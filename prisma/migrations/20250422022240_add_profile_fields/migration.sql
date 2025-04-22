-- AlterTable
ALTER TABLE "Profile" ADD COLUMN "allergies" JSONB;
ALTER TABLE "Profile" ADD COLUMN "cuisinePreferences" JSONB;
ALTER TABLE "Profile" ADD COLUMN "dietaryRestrictions" JSONB;
ALTER TABLE "Profile" ADD COLUMN "workoutFrequency" INTEGER;
ALTER TABLE "Profile" ADD COLUMN "workoutIntensity" INTEGER;
