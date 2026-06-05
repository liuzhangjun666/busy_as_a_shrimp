-- Backfill baseline fields required by later migrations on fresh databases.
SET @users_invite_code_exists := (
  SELECT COUNT(1)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'invite_code'
);

SET @sql := IF(
  @users_invite_code_exists = 0,
  'ALTER TABLE `users` ADD COLUMN `invite_code` VARCHAR(10) NULL AFTER `masked_phone`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @users_last_ip_exists := (
  SELECT COUNT(1)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'last_ip'
);

SET @sql := IF(
  @users_last_ip_exists = 0,
  'ALTER TABLE `users` ADD COLUMN `last_ip` VARCHAR(50) NULL AFTER `invite_code`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @users_task_accept_count_exists := (
  SELECT COUNT(1)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'task_accept_count'
);

SET @sql := IF(
  @users_task_accept_count_exists = 0,
  'ALTER TABLE `users` ADD COLUMN `task_accept_count` INT NOT NULL DEFAULT 0 AFTER `last_ip`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @users_task_view_count_exists := (
  SELECT COUNT(1)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'task_view_count'
);

SET @sql := IF(
  @users_task_view_count_exists = 0,
  'ALTER TABLE `users` ADD COLUMN `task_view_count` INT NOT NULL DEFAULT 0 AFTER `task_accept_count`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @users_invite_unique_exists := (
  SELECT COUNT(1)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'invite_code'
    AND NON_UNIQUE = 0
);

SET @sql := IF(
  @users_invite_unique_exists = 0,
  'ALTER TABLE `users` ADD UNIQUE INDEX `users_invite_code_key`(`invite_code`)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @announcements_title_exists := (
  SELECT COUNT(1)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'announcements'
    AND COLUMN_NAME = 'title'
);

SET @sql := IF(
  @announcements_title_exists = 0,
  'ALTER TABLE `announcements` ADD COLUMN `title` VARCHAR(100) NOT NULL DEFAULT ''未命名公告'' AFTER `created_at`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @announcements_type_exists := (
  SELECT COUNT(1)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'announcements'
    AND COLUMN_NAME = 'type'
);

SET @sql := IF(
  @announcements_type_exists = 0,
  'ALTER TABLE `announcements` ADD COLUMN `type` VARCHAR(20) NOT NULL DEFAULT ''notice'' AFTER `title`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
