-- Persist real-name verification status on users.

ALTER TABLE `users`
  ADD COLUMN `real_name_verified` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `real_name_verified_at` DATETIME(3) NULL;