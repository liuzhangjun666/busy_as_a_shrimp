CREATE TABLE IF NOT EXISTS `user_devices` (
    `device_id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `register_ip` VARCHAR(50) NOT NULL,
    `device_fingerprint` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_user_devices_user`(`user_id`),
    INDEX `idx_user_devices_ip`(`register_ip`),
    INDEX `idx_user_devices_fingerprint`(`device_fingerprint`),
    PRIMARY KEY (`device_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `risk_control_events` (
    `event_id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NULL,
    `event_type` ENUM('same_ip_limit', 'abnormal_device', 'invite_chain_detection', 'brush_order_disposal') NOT NULL,
    `action` ENUM('pass', 'review', 'block', 'disposed') NOT NULL,
    `detail` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_risk_user`(`user_id`),
    INDEX `idx_risk_type_created`(`event_type`, `created_at`),
    PRIMARY KEY (`event_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

SET @fk_user_devices_exists := (
  SELECT COUNT(1)
  FROM information_schema.REFERENTIAL_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'user_devices'
    AND CONSTRAINT_NAME = 'user_devices_user_id_fkey'
);

SET @sql := IF(
  @fk_user_devices_exists = 0,
  'ALTER TABLE `user_devices` ADD CONSTRAINT `user_devices_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_risk_events_exists := (
  SELECT COUNT(1)
  FROM information_schema.REFERENTIAL_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'risk_control_events'
    AND CONSTRAINT_NAME = 'risk_control_events_user_id_fkey'
);

SET @sql := IF(
  @fk_risk_events_exists = 0,
  'ALTER TABLE `risk_control_events` ADD CONSTRAINT `risk_control_events_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE SET NULL ON UPDATE CASCADE',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
