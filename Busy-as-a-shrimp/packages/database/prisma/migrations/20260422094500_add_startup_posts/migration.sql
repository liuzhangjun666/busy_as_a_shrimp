CREATE TABLE IF NOT EXISTS `startup_posts` (
  `startup_post_id` BIGINT NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(160) NOT NULL,
  `summary` VARCHAR(500) NULL,
  `content` TEXT NOT NULL,
  `category` VARCHAR(60) NULL,
  `tags` JSON NULL,
  `cover_image_url` VARCHAR(500) NULL,
  `contact_info` VARCHAR(255) NULL,
  `source_url` VARCHAR(500) NULL,
  `status` ENUM('draft','published','offline') NOT NULL DEFAULT 'draft',
  `sort` INT NOT NULL DEFAULT 0,
  `view_count` INT NOT NULL DEFAULT 0,
  `published_at` DATETIME(3) NULL,
  `created_by` VARCHAR(50) NOT NULL DEFAULT 'admin',
  `updated_by` VARCHAR(50) NOT NULL DEFAULT 'admin',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`startup_post_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

SET @idx_status_published_exists := (
  SELECT COUNT(1)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'startup_posts'
    AND INDEX_NAME = 'idx_startup_posts_status_published_at'
);

SET @sql := IF(
  @idx_status_published_exists = 0,
  'CREATE INDEX `idx_startup_posts_status_published_at` ON `startup_posts`(`status`, `published_at`)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_category_exists := (
  SELECT COUNT(1)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'startup_posts'
    AND INDEX_NAME = 'idx_startup_posts_category'
);

SET @sql := IF(
  @idx_category_exists = 0,
  'CREATE INDEX `idx_startup_posts_category` ON `startup_posts`(`category`)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_created_at_exists := (
  SELECT COUNT(1)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'startup_posts'
    AND INDEX_NAME = 'idx_startup_posts_created_at'
);

SET @sql := IF(
  @idx_created_at_exists = 0,
  'CREATE INDEX `idx_startup_posts_created_at` ON `startup_posts`(`created_at`)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
