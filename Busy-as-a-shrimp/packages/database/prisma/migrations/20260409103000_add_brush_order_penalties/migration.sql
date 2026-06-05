CREATE TABLE IF NOT EXISTS `brush_order_penalties` (
  `penalty_id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT NOT NULL,
  `invite_record_id` BIGINT NOT NULL,
  `trigger_reasons` JSON NOT NULL,
  `before_captain_level` ENUM('normal', 'advanced', 'gold') NOT NULL,
  `status` ENUM('applied', 'confirmed', 'rolled_back') NOT NULL DEFAULT 'applied',
  `reviewed_by` BIGINT NULL,
  `review_note` VARCHAR(255) NULL,
  `applied_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `reviewed_at` DATETIME(3) NULL,
  `rolled_back_at` DATETIME(3) NULL,

  UNIQUE INDEX `brush_order_penalties_invite_record_id_key`(`invite_record_id`),
  INDEX `idx_penalty_user_status`(`user_id`, `status`),
  INDEX `idx_penalty_applied`(`applied_at`),
  PRIMARY KEY (`penalty_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `brush_order_penalty_commissions` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `penalty_id` BIGINT NOT NULL,
  `commission_id` BIGINT NOT NULL,
  `before_status` ENUM('pending', 'active', 'paid', 'invalid') NOT NULL,
  `before_amount` DECIMAL(10,2) NOT NULL,

  UNIQUE INDEX `uk_penalty_commission`(`penalty_id`, `commission_id`),
  INDEX `idx_penalty_commission_id`(`commission_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

SET @fk_penalty_user_exists := (
  SELECT COUNT(1)
  FROM information_schema.REFERENTIAL_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'brush_order_penalties'
    AND CONSTRAINT_NAME = 'brush_order_penalties_user_id_fkey'
);

SET @sql := IF(
  @fk_penalty_user_exists = 0,
  'ALTER TABLE `brush_order_penalties` ADD CONSTRAINT `brush_order_penalties_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_penalty_invite_exists := (
  SELECT COUNT(1)
  FROM information_schema.REFERENTIAL_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'brush_order_penalties'
    AND CONSTRAINT_NAME = 'brush_order_penalties_invite_record_id_fkey'
);

SET @sql := IF(
  @fk_penalty_invite_exists = 0,
  'ALTER TABLE `brush_order_penalties` ADD CONSTRAINT `brush_order_penalties_invite_record_id_fkey` FOREIGN KEY (`invite_record_id`) REFERENCES `invite_records`(`record_id`) ON DELETE RESTRICT ON UPDATE CASCADE',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_penalty_commission_penalty_exists := (
  SELECT COUNT(1)
  FROM information_schema.REFERENTIAL_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'brush_order_penalty_commissions'
    AND CONSTRAINT_NAME = 'brush_order_penalty_commissions_penalty_id_fkey'
);

SET @sql := IF(
  @fk_penalty_commission_penalty_exists = 0,
  'ALTER TABLE `brush_order_penalty_commissions` ADD CONSTRAINT `brush_order_penalty_commissions_penalty_id_fkey` FOREIGN KEY (`penalty_id`) REFERENCES `brush_order_penalties`(`penalty_id`) ON DELETE CASCADE ON UPDATE CASCADE',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_penalty_commission_commission_exists := (
  SELECT COUNT(1)
  FROM information_schema.REFERENTIAL_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'brush_order_penalty_commissions'
    AND CONSTRAINT_NAME = 'brush_order_penalty_commissions_commission_id_fkey'
);

SET @sql := IF(
  @fk_penalty_commission_commission_exists = 0,
  'ALTER TABLE `brush_order_penalty_commissions` ADD CONSTRAINT `brush_order_penalty_commissions_commission_id_fkey` FOREIGN KEY (`commission_id`) REFERENCES `captain_commissions`(`commission_id`) ON DELETE RESTRICT ON UPDATE CASCADE',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
