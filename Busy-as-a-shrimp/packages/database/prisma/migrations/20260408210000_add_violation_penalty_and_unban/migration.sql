SET @last_ip_exists := (
  SELECT COUNT(1)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'last_ip'
);

SET @sql := IF(
  @last_ip_exists = 0,
  'ALTER TABLE `users` ADD COLUMN `last_ip` VARCHAR(50) NULL',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @invite_code_exists := (
  SELECT COUNT(1)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'invite_code'
);

SET @sql := IF(
  @invite_code_exists = 0,
  'ALTER TABLE `users` ADD COLUMN `invite_code` VARCHAR(10) NULL',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @speak_muted_until_exists := (
  SELECT COUNT(1)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'speak_muted_until'
);

SET @sql := IF(
  @speak_muted_until_exists = 0,
  'ALTER TABLE `users` ADD COLUMN `speak_muted_until` DATETIME(3) NULL',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS `violation_events` (
  `event_id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT NOT NULL,
  `scene` VARCHAR(50) NOT NULL,
  `reason` VARCHAR(255) NOT NULL,
  `decision` ENUM('warning', 'mute', 'ban', 'unban') NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `idx_violation_user_created`(`user_id`, `created_at`),
  PRIMARY KEY (`event_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

SET @risk_control_events_table_exists := (
  SELECT COUNT(1)
  FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'risk_control_events'
);

SET @sql := IF(
  @risk_control_events_table_exists = 1,
  'ALTER TABLE `risk_control_events`
      MODIFY `event_type` ENUM(
        ''same_ip_limit'',
        ''abnormal_device'',
        ''invite_chain_detection'',
        ''brush_order_disposal'',
        ''violation_penalty'',
        ''account_unban''
      ) NOT NULL',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_violation_events_exists := (
  SELECT COUNT(1)
  FROM information_schema.REFERENTIAL_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'violation_events'
    AND CONSTRAINT_NAME = 'violation_events_user_id_fkey'
);

SET @sql := IF(
  @fk_violation_events_exists = 0,
  'ALTER TABLE `violation_events` ADD CONSTRAINT `violation_events_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
