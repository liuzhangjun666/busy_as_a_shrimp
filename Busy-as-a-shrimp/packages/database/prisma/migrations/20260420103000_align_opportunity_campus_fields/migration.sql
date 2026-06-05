-- Align opportunities table fields with campus recruitment frontend contract.

SET @company_name_exists := (
  SELECT COUNT(1)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'opportunities'
    AND COLUMN_NAME = 'company_name'
);

SET @sql := IF(
  @company_name_exists = 0,
  'ALTER TABLE `opportunities` ADD COLUMN `company_name` VARCHAR(120) NOT NULL DEFAULT '''' AFTER `user_id`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @industry_exists := (
  SELECT COUNT(1)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'opportunities'
    AND COLUMN_NAME = 'industry'
);

SET @sql := IF(
  @industry_exists = 0,
  'ALTER TABLE `opportunities` ADD COLUMN `industry` VARCHAR(60) NOT NULL DEFAULT '''' AFTER `company_name`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @logo_gradient_exists := (
  SELECT COUNT(1)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'opportunities'
    AND COLUMN_NAME = 'logo_gradient'
);

SET @sql := IF(
  @logo_gradient_exists = 0,
  'ALTER TABLE `opportunities` ADD COLUMN `logo_gradient` VARCHAR(100) NOT NULL DEFAULT '''' AFTER `industry`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @recruitment_type_exists := (
  SELECT COUNT(1)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'opportunities'
    AND COLUMN_NAME = 'recruitment_type'
);

SET @sql := IF(
  @recruitment_type_exists = 0,
  'ALTER TABLE `opportunities` ADD COLUMN `recruitment_type` VARCHAR(60) NOT NULL DEFAULT '''' AFTER `logo_gradient`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @location_exists := (
  SELECT COUNT(1)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'opportunities'
    AND COLUMN_NAME = 'location'
);

SET @sql := IF(
  @location_exists = 0,
  'ALTER TABLE `opportunities` ADD COLUMN `location` VARCHAR(60) NOT NULL DEFAULT '''' AFTER `recruitment_type`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @start_date_exists := (
  SELECT COUNT(1)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'opportunities'
    AND COLUMN_NAME = 'start_date'
);

SET @sql := IF(
  @start_date_exists = 0,
  'ALTER TABLE `opportunities` ADD COLUMN `start_date` VARCHAR(20) NOT NULL DEFAULT '''' AFTER `location`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @end_date_exists := (
  SELECT COUNT(1)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'opportunities'
    AND COLUMN_NAME = 'end_date'
);

SET @sql := IF(
  @end_date_exists = 0,
  'ALTER TABLE `opportunities` ADD COLUMN `end_date` VARCHAR(20) NOT NULL DEFAULT '''' AFTER `start_date`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @no_written_test_exists := (
  SELECT COUNT(1)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'opportunities'
    AND COLUMN_NAME = 'no_written_test'
);

SET @sql := IF(
  @no_written_test_exists = 0,
  'ALTER TABLE `opportunities` ADD COLUMN `no_written_test` BOOLEAN NOT NULL DEFAULT false AFTER `end_date`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @position_exists := (
  SELECT COUNT(1)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'opportunities'
    AND COLUMN_NAME = 'position'
);

SET @sql := IF(
  @position_exists = 0,
  'ALTER TABLE `opportunities` ADD COLUMN `position` VARCHAR(120) NOT NULL DEFAULT '''' AFTER `no_written_test`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @announcement_url_exists := (
  SELECT COUNT(1)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'opportunities'
    AND COLUMN_NAME = 'announcement_url'
);

SET @sql := IF(
  @announcement_url_exists = 0,
  'ALTER TABLE `opportunities` ADD COLUMN `announcement_url` VARCHAR(500) NOT NULL DEFAULT '''' AFTER `position`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @apply_url_exists := (
  SELECT COUNT(1)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'opportunities'
    AND COLUMN_NAME = 'apply_url'
);

SET @sql := IF(
  @apply_url_exists = 0,
  'ALTER TABLE `opportunities` ADD COLUMN `apply_url` VARCHAR(500) NOT NULL DEFAULT '''' AFTER `announcement_url`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE `opportunities`
SET
  `company_name` = IF(
    `company_name` = '',
    COALESCE(NULLIF(TRIM(SUBSTRING_INDEX(`title`, '-', 1)), ''), '未知公司'),
    `company_name`
  ),
  `industry` = IF(`industry` = '', '未知行业', `industry`),
  `logo_gradient` = IF(`logo_gradient` = '', 'from-slate-500 to-slate-600', `logo_gradient`),
  `recruitment_type` = IF(`recruitment_type` = '', '校园招聘', `recruitment_type`),
  `location` = IF(`location` = '', '全国', `location`),
  `start_date` = IF(`start_date` = '', DATE_FORMAT(`created_at`, '%Y-%m-%d'), `start_date`),
  `end_date` = IF(`end_date` = '', DATE_FORMAT(`created_at`, '%Y-%m-%d'), `end_date`),
  `position` = IF(
    `position` = '',
    COALESCE(NULLIF(TRIM(`title`), ''), '待补充岗位'),
    `position`
  ),
  `announcement_url` = IF(
    `announcement_url` = '',
    COALESCE(NULLIF(`source_url`, ''), ''),
    `announcement_url`
  ),
  `apply_url` = IF(
    `apply_url` = '',
    COALESCE(NULLIF(`source_url`, ''), `announcement_url`),
    `apply_url`
  ),
  `source_type` = IF(`source_type` = '', 'campus_recruitment', `source_type`);

SET @idx_user_source_exists := (
  SELECT COUNT(1)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'opportunities'
    AND INDEX_NAME = 'idx_opportunities_user_source'
);

SET @sql := IF(
  @idx_user_source_exists = 0,
  'CREATE INDEX `idx_opportunities_user_source` ON `opportunities`(`user_id`, `source_type`)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_created_at_exists := (
  SELECT COUNT(1)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'opportunities'
    AND INDEX_NAME = 'idx_opportunities_created_at'
);

SET @sql := IF(
  @idx_created_at_exists = 0,
  'CREATE INDEX `idx_opportunities_created_at` ON `opportunities`(`created_at` DESC)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
