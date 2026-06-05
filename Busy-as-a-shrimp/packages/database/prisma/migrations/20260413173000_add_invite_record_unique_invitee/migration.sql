-- One invitee can only belong to one invitation relationship.
-- If historical duplicates exist on invitee_id, this unique index will fail.
-- Clean duplicates first, then rerun the migration.
SET @idx_exists := (
  SELECT COUNT(1)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'invite_records'
    AND INDEX_NAME = 'uk_invite_records_invitee'
);

SET @sql := IF(
  @idx_exists = 0,
  'ALTER TABLE `invite_records` ADD UNIQUE INDEX `uk_invite_records_invitee`(`invitee_id`)',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
