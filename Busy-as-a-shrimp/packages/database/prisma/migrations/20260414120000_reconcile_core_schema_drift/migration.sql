-- Reconcile core schema drift between schema.prisma and migrations history.
-- This migration is append-only and idempotent for MySQL 8.x.

CREATE TABLE IF NOT EXISTS `cyber_doppelgangers` (
  `doppelganger_id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT NOT NULL,
  `balance` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `status` ENUM('active','inactive','frozen') NOT NULL DEFAULT 'inactive',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  UNIQUE INDEX `cyber_doppelgangers_user_id_key` (`user_id`),
  PRIMARY KEY (`doppelganger_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `point_transactions` (
  `transaction_id` BIGINT NOT NULL AUTO_INCREMENT,
  `doppelganger_id` BIGINT NOT NULL,
  `amount` DECIMAL(10,2) NOT NULL,
  `type` ENUM('INVITE_REWARD','TASK_REWARD','TOKEN_CONSUME','SYSTEM_ADJUST','INITIAL_BONUS','DAILY_SIGN_IN','CONTRIBUTION_REWARD') NOT NULL,
  `metadata` JSON NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `point_transactions_doppelganger_id_idx` (`doppelganger_id`),
  PRIMARY KEY (`transaction_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `activity_periods` (
  `period_id` BIGINT NOT NULL AUTO_INCREMENT,
  `start_time` DATETIME(3) NOT NULL,
  `end_time` DATETIME(3) NOT NULL,
  `reward_pool` DECIMAL(10,2) NOT NULL DEFAULT 5000.00,
  `is_processed` BOOLEAN NOT NULL DEFAULT false,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `activity_periods_start_time_end_time_idx` (`start_time`, `end_time`),
  PRIMARY KEY (`period_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `sign_in_records` (
  `record_id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT NOT NULL,
  `last_sign_in_date` DATETIME(3) NOT NULL,
  `streak_days` INT NOT NULL DEFAULT 1,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `sign_in_records_user_id_last_sign_in_date_key` (`user_id`, `last_sign_in_date`),
  PRIMARY KEY (`record_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `bounty_tasks` (
  `task_id` BIGINT NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(100) NOT NULL,
  `content` TEXT NOT NULL,
  `points` DECIMAL(10,2) NOT NULL,
  `status` ENUM('PUBLISHED','FINISHED','CANCELLED') NOT NULL DEFAULT 'PUBLISHED',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `difficulty` ENUM('EASY','MEDIUM','HARD','EXPERT') NOT NULL DEFAULT 'MEDIUM',
  PRIMARY KEY (`task_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `task_submissions` (
  `submission_id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT NOT NULL,
  `task_id` BIGINT NOT NULL,
  `proof` TEXT NULL,
  `status` ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `task_submissions_task_id_idx` (`task_id`),
  INDEX `task_submissions_user_id_idx` (`user_id`),
  PRIMARY KEY (`submission_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

SET @idx_cyber_user_exists := (
  SELECT COUNT(1)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'cyber_doppelgangers'
    AND INDEX_NAME = 'cyber_doppelgangers_user_id_key'
);

SET @sql := IF(
  @idx_cyber_user_exists = 0,
  'ALTER TABLE `cyber_doppelgangers` ADD UNIQUE INDEX `cyber_doppelgangers_user_id_key`(`user_id`)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_point_doppelganger_exists := (
  SELECT COUNT(1)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'point_transactions'
    AND INDEX_NAME = 'point_transactions_doppelganger_id_idx'
);

SET @sql := IF(
  @idx_point_doppelganger_exists = 0,
  'ALTER TABLE `point_transactions` ADD INDEX `point_transactions_doppelganger_id_idx`(`doppelganger_id`)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_activity_period_exists := (
  SELECT COUNT(1)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'activity_periods'
    AND INDEX_NAME = 'activity_periods_start_time_end_time_idx'
);

SET @sql := IF(
  @idx_activity_period_exists = 0,
  'ALTER TABLE `activity_periods` ADD INDEX `activity_periods_start_time_end_time_idx`(`start_time`, `end_time`)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_signin_unique_exists := (
  SELECT COUNT(1)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'sign_in_records'
    AND INDEX_NAME = 'sign_in_records_user_id_last_sign_in_date_key'
);

SET @sql := IF(
  @idx_signin_unique_exists = 0,
  'ALTER TABLE `sign_in_records` ADD UNIQUE INDEX `sign_in_records_user_id_last_sign_in_date_key`(`user_id`, `last_sign_in_date`)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_submission_task_exists := (
  SELECT COUNT(1)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'task_submissions'
    AND INDEX_NAME = 'task_submissions_task_id_idx'
);

SET @sql := IF(
  @idx_submission_task_exists = 0,
  'ALTER TABLE `task_submissions` ADD INDEX `task_submissions_task_id_idx`(`task_id`)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_submission_user_exists := (
  SELECT COUNT(1)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'task_submissions'
    AND INDEX_NAME = 'task_submissions_user_id_idx'
);

SET @sql := IF(
  @idx_submission_user_exists = 0,
  'ALTER TABLE `task_submissions` ADD INDEX `task_submissions_user_id_idx`(`user_id`)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

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

SET @fk_cyber_user_exists := (
  SELECT COUNT(1)
  FROM information_schema.REFERENTIAL_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'cyber_doppelgangers'
    AND CONSTRAINT_NAME = 'cyber_doppelgangers_user_id_fkey'
);

SET @sql := IF(
  @fk_cyber_user_exists = 0,
  'ALTER TABLE `cyber_doppelgangers` ADD CONSTRAINT `cyber_doppelgangers_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_point_doppelganger_exists := (
  SELECT COUNT(1)
  FROM information_schema.REFERENTIAL_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'point_transactions'
    AND CONSTRAINT_NAME = 'point_transactions_doppelganger_id_fkey'
);

SET @sql := IF(
  @fk_point_doppelganger_exists = 0,
  'ALTER TABLE `point_transactions` ADD CONSTRAINT `point_transactions_doppelganger_id_fkey` FOREIGN KEY (`doppelganger_id`) REFERENCES `cyber_doppelgangers`(`doppelganger_id`) ON DELETE RESTRICT ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_submission_task_exists := (
  SELECT COUNT(1)
  FROM information_schema.REFERENTIAL_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'task_submissions'
    AND CONSTRAINT_NAME = 'task_submissions_task_id_fkey'
);

SET @sql := IF(
  @fk_submission_task_exists = 0,
  'ALTER TABLE `task_submissions` ADD CONSTRAINT `task_submissions_task_id_fkey` FOREIGN KEY (`task_id`) REFERENCES `bounty_tasks`(`task_id`) ON DELETE RESTRICT ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
