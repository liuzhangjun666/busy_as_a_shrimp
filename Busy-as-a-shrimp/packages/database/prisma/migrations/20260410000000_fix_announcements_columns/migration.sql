-- 补充 announcements 表在初始迁移中遗漏的 title 和 type 字段
SET @title_exists := (
  SELECT COUNT(1)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'announcements'
    AND COLUMN_NAME = 'title'
);

SET @sql := IF(
  @title_exists = 0,
  'ALTER TABLE `announcements` ADD COLUMN `title` VARCHAR(100) NOT NULL DEFAULT \'未命名公告\' AFTER `notice_id`',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @type_exists := (
  SELECT COUNT(1)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'announcements'
    AND COLUMN_NAME = 'type'
);

SET @sql := IF(
  @type_exists = 0,
  'ALTER TABLE `announcements` ADD COLUMN `type` VARCHAR(20) NOT NULL DEFAULT \'notice\' AFTER `publisher`',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
