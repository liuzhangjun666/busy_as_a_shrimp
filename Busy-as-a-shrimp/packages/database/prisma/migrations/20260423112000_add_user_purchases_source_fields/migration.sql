ALTER TABLE `user_purchases`
  ADD COLUMN `source_module` VARCHAR(32) NULL,
  ADD COLUMN `source_action` VARCHAR(64) NULL;
