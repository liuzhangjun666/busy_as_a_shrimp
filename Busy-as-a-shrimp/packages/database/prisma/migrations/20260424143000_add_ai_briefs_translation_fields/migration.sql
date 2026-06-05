ALTER TABLE `ai_briefs`
  ADD COLUMN `title_zh` VARCHAR(300) NULL AFTER `title`,
  ADD COLUMN `summary_zh` TEXT NULL AFTER `summary`,
  ADD COLUMN `translate_status` VARCHAR(20) NOT NULL DEFAULT 'pending' AFTER `summary_zh`,
  ADD COLUMN `translated_at` DATETIME(3) NULL AFTER `translate_status`;

CREATE INDEX `idx_ai_briefs_translate_status` ON `ai_briefs`(`translate_status`);
