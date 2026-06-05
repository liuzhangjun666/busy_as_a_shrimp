SET @col_exists := (
  SELECT COUNT(1)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'resources'
    AND COLUMN_NAME = 'resource_types'
);

SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE `resources` ADD COLUMN `resource_types` JSON NULL AFTER `resource_type`',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
