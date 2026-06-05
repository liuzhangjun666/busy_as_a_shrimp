ALTER TABLE `users`
  ADD COLUMN `phone_encrypted` LONGTEXT NULL AFTER `phone_hash`;
