-- Reconcile remaining schema drift introduced outside migration history.

CREATE TABLE IF NOT EXISTS `lobster_statuses` (
  `lobster_id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT NOT NULL,
  `hp` INT NOT NULL DEFAULT 100,
  `personality` VARCHAR(20) NULL,
  `personality_unlocked` BOOLEAN NOT NULL DEFAULT false,
  `lobster_expires_at` DATETIME(3) NULL,
  `last_executed_at` DATETIME(3) NULL,
  `status` ENUM('sleeping','active','executing','paused') NOT NULL DEFAULT 'sleeping',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  UNIQUE INDEX `lobster_statuses_user_id_key` (`user_id`),
  PRIMARY KEY (`lobster_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `lobster_task_logs` (
  `log_id` BIGINT NOT NULL AUTO_INCREMENT,
  `lobster_id` BIGINT NOT NULL,
  `task_type` VARCHAR(50) NOT NULL,
  `personality` VARCHAR(20) NOT NULL,
  `status` VARCHAR(20) NOT NULL,
  `input_json` JSON NULL,
  `output_json` JSON NULL,
  `deerflow_run_id` VARCHAR(100) NULL,
  `started_at` DATETIME(3) NOT NULL,
  `completed_at` DATETIME(3) NULL,
  INDEX `lobster_task_logs_lobster_id_started_at_idx` (`lobster_id`, `started_at`),
  PRIMARY KEY (`log_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `hp_logs` (
  `log_id` BIGINT NOT NULL AUTO_INCREMENT,
  `lobster_id` BIGINT NOT NULL,
  `delta` INT NOT NULL,
  `reason` VARCHAR(50) NOT NULL,
  `ref_id` BIGINT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `hp_logs_lobster_id_created_at_idx` (`lobster_id`, `created_at`),
  PRIMARY KEY (`log_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `opportunities` (
  `opportunity_id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT NOT NULL,
  `source_type` VARCHAR(30) NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `content` TEXT NULL,
  `price_range` JSON NULL,
  `commission` DECIMAL(10,2) NULL,
  `source_url` VARCHAR(500) NULL,
  `status` ENUM('pending_review','approved','rejected','expired','claimed') NOT NULL DEFAULT 'pending_review',
  `task_log_id` BIGINT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `reviewed_at` DATETIME(3) NULL,
  INDEX `opportunities_user_id_status_idx` (`user_id`, `status`),
  PRIMARY KEY (`opportunity_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `lobster_review_tasks` (
  `review_id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT NOT NULL,
  `task_log_id` BIGINT NULL,
  `context` JSON NULL,
  `status` ENUM('pending','approved','rejected','expired') NOT NULL DEFAULT 'pending',
  `expires_at` DATETIME(3) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  INDEX `lobster_review_tasks_user_id_status_idx` (`user_id`, `status`),
  PRIMARY KEY (`review_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `lobster_match_records` (
  `match_id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT NOT NULL,
  `target_user_id` BIGINT NULL,
  `title` VARCHAR(200) NOT NULL,
  `content` TEXT NULL,
  `match_score` DECIMAL(5,2) NULL,
  `metadata` JSON NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `lobster_match_records_user_id_idx` (`user_id`),
  PRIMARY KEY (`match_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `user_purchases` (
  `purchase_id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT NOT NULL,
  `item_type` VARCHAR(50) NOT NULL,
  `amount` DECIMAL(10,2) NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'completed',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `user_purchases_user_id_idx` (`user_id`),
  PRIMARY KEY (`purchase_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

SET @fk_lobster_status_user_exists := (
  SELECT COUNT(1)
  FROM information_schema.REFERENTIAL_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'lobster_statuses'
    AND CONSTRAINT_NAME = 'lobster_statuses_user_id_fkey'
);

SET @sql := IF(
  @fk_lobster_status_user_exists = 0,
  'ALTER TABLE `lobster_statuses` ADD CONSTRAINT `lobster_statuses_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_lobster_task_logs_exists := (
  SELECT COUNT(1)
  FROM information_schema.REFERENTIAL_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'lobster_task_logs'
    AND CONSTRAINT_NAME = 'lobster_task_logs_lobster_id_fkey'
);

SET @sql := IF(
  @fk_lobster_task_logs_exists = 0,
  'ALTER TABLE `lobster_task_logs` ADD CONSTRAINT `lobster_task_logs_lobster_id_fkey` FOREIGN KEY (`lobster_id`) REFERENCES `lobster_statuses`(`lobster_id`) ON DELETE RESTRICT ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_hp_logs_exists := (
  SELECT COUNT(1)
  FROM information_schema.REFERENTIAL_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'hp_logs'
    AND CONSTRAINT_NAME = 'hp_logs_lobster_id_fkey'
);

SET @sql := IF(
  @fk_hp_logs_exists = 0,
  'ALTER TABLE `hp_logs` ADD CONSTRAINT `hp_logs_lobster_id_fkey` FOREIGN KEY (`lobster_id`) REFERENCES `lobster_statuses`(`lobster_id`) ON DELETE RESTRICT ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_lobster_review_exists := (
  SELECT COUNT(1)
  FROM information_schema.REFERENTIAL_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'lobster_review_tasks'
    AND CONSTRAINT_NAME = 'lobster_review_tasks_user_id_fkey'
);

SET @sql := IF(
  @fk_lobster_review_exists = 0,
  'ALTER TABLE `lobster_review_tasks` ADD CONSTRAINT `lobster_review_tasks_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_lobster_match_exists := (
  SELECT COUNT(1)
  FROM information_schema.REFERENTIAL_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'lobster_match_records'
    AND CONSTRAINT_NAME = 'lobster_match_records_user_id_fkey'
);

SET @sql := IF(
  @fk_lobster_match_exists = 0,
  'ALTER TABLE `lobster_match_records` ADD CONSTRAINT `lobster_match_records_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_user_purchases_exists := (
  SELECT COUNT(1)
  FROM information_schema.REFERENTIAL_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'user_purchases'
    AND CONSTRAINT_NAME = 'user_purchases_user_id_fkey'
);

SET @sql := IF(
  @fk_user_purchases_exists = 0,
  'ALTER TABLE `user_purchases` ADD CONSTRAINT `user_purchases_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @dict_data_fk_old_exists := (
  SELECT COUNT(1)
  FROM information_schema.REFERENTIAL_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'dict_data'
    AND CONSTRAINT_NAME = 'fk_dict_data_type'
);

SET @dict_data_fk_new_exists := (
  SELECT COUNT(1)
  FROM information_schema.REFERENTIAL_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'dict_data'
    AND CONSTRAINT_NAME = 'dict_data_dict_type_fkey'
);

SET @sql := IF(
  @dict_data_fk_old_exists = 1 AND @dict_data_fk_new_exists = 0,
  'ALTER TABLE `dict_data` DROP FOREIGN KEY `fk_dict_data_type`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @dict_data_fk_new_exists := (
  SELECT COUNT(1)
  FROM information_schema.REFERENTIAL_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'dict_data'
    AND CONSTRAINT_NAME = 'dict_data_dict_type_fkey'
);

SET @sql := IF(
  @dict_data_fk_new_exists = 0,
  'ALTER TABLE `dict_data` ADD CONSTRAINT `dict_data_dict_type_fkey` FOREIGN KEY (`dict_type`) REFERENCES `dict_types`(`dict_type`) ON DELETE RESTRICT ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @dict_types_index_old_exists := (
  SELECT COUNT(1)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'dict_types'
    AND INDEX_NAME = 'uk_dict_types_type'
);

SET @dict_types_index_new_exists := (
  SELECT COUNT(1)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'dict_types'
    AND INDEX_NAME = 'dict_types_dict_type_key'
);

SET @sql := IF(
  @dict_types_index_old_exists = 1 AND @dict_types_index_new_exists = 0,
  'ALTER TABLE `dict_types` RENAME INDEX `uk_dict_types_type` TO `dict_types_dict_type_key`',
  IF(
    @dict_types_index_old_exists = 0 AND @dict_types_index_new_exists = 0,
    'ALTER TABLE `dict_types` ADD UNIQUE INDEX `dict_types_dict_type_key`(`dict_type`)',
    'SELECT 1'
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @dict_types_index_new_exists := (
  SELECT COUNT(1)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'dict_types'
    AND INDEX_NAME = 'dict_types_dict_type_key'
);

SET @sql := IF(
  @dict_types_index_new_exists = 0,
  'ALTER TABLE `dict_types` RENAME INDEX `uk_dict_types_type` TO `dict_types_dict_type_key`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @dict_types_updated_needs_fix := (
  SELECT COUNT(1)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'dict_types'
    AND COLUMN_NAME = 'updated_at'
    AND (COLUMN_DEFAULT IS NOT NULL OR EXTRA LIKE '%on update%')
);

SET @sql := IF(
  @dict_types_updated_needs_fix > 0,
  'ALTER TABLE `dict_types` MODIFY `updated_at` DATETIME(3) NOT NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @dict_data_updated_needs_fix := (
  SELECT COUNT(1)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'dict_data'
    AND COLUMN_NAME = 'updated_at'
    AND (COLUMN_DEFAULT IS NOT NULL OR EXTRA LIKE '%on update%')
);

SET @sql := IF(
  @dict_data_updated_needs_fix > 0,
  'ALTER TABLE `dict_data` MODIFY `updated_at` DATETIME(3) NOT NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_penalty_commission_exists := (
  SELECT COUNT(1)
  FROM information_schema.REFERENTIAL_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'brush_order_penalty_commissions'
    AND CONSTRAINT_NAME = 'brush_order_penalty_commissions_penalty_id_fkey'
);

SET @fk_penalty_commission_delete_rule := (
  SELECT DELETE_RULE
  FROM information_schema.REFERENTIAL_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'brush_order_penalty_commissions'
    AND CONSTRAINT_NAME = 'brush_order_penalty_commissions_penalty_id_fkey'
  LIMIT 1
);

SET @sql := IF(
  @fk_penalty_commission_exists = 1 AND @fk_penalty_commission_delete_rule <> 'RESTRICT',
  'ALTER TABLE `brush_order_penalty_commissions` DROP FOREIGN KEY `brush_order_penalty_commissions_penalty_id_fkey`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_penalty_commission_exists := (
  SELECT COUNT(1)
  FROM information_schema.REFERENTIAL_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'brush_order_penalty_commissions'
    AND CONSTRAINT_NAME = 'brush_order_penalty_commissions_penalty_id_fkey'
);

SET @sql := IF(
  @fk_penalty_commission_exists = 0,
  'ALTER TABLE `brush_order_penalty_commissions` ADD CONSTRAINT `brush_order_penalty_commissions_penalty_id_fkey` FOREIGN KEY (`penalty_id`) REFERENCES `brush_order_penalties`(`penalty_id`) ON DELETE RESTRICT ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
