CREATE TABLE `solo_signals` (
  `solo_signal_id` BIGINT NOT NULL AUTO_INCREMENT,
  `external_id` VARCHAR(128) NOT NULL,
  `source_name` VARCHAR(120) NOT NULL,
  `title` VARCHAR(300) NOT NULL,
  `summary` TEXT NULL,
  `source_url` VARCHAR(500) NOT NULL,
  `published_at` DATETIME(3) NOT NULL,
  `income_snippet` VARCHAR(500) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`solo_signal_id`),
  UNIQUE INDEX `solo_signals_external_id_key`(`external_id`),
  INDEX `idx_solo_signals_published_id`(`published_at` DESC, `solo_signal_id` DESC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
