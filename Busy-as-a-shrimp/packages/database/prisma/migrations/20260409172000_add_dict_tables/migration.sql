CREATE TABLE IF NOT EXISTS `dict_types` (
    `dict_id` BIGINT NOT NULL AUTO_INCREMENT,
    `dict_name` VARCHAR(100) NOT NULL,
    `dict_type` VARCHAR(100) NOT NULL,
    `status` ENUM('normal', 'disabled') NOT NULL DEFAULT 'normal',
    `remark` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `uk_dict_types_type`(`dict_type`),
    PRIMARY KEY (`dict_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `dict_data` (
    `dict_data_id` BIGINT NOT NULL AUTO_INCREMENT,
    `dict_type` VARCHAR(100) NOT NULL,
    `dict_code` VARCHAR(100) NOT NULL,
    `dict_label` VARCHAR(100) NOT NULL,
    `dict_value` VARCHAR(100) NOT NULL,
    `dict_sort` INT NOT NULL DEFAULT 0,
    `status` ENUM('normal', 'disabled') NOT NULL DEFAULT 'normal',
    `remark` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `uk_dict_data_type_code`(`dict_type`, `dict_code`),
    INDEX `idx_dict_data_type_status_sort`(`dict_type`, `status`, `dict_sort`),
    PRIMARY KEY (`dict_data_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

SET @fk_exists := (
  SELECT COUNT(1)
  FROM information_schema.REFERENTIAL_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'dict_data'
    AND CONSTRAINT_NAME = 'fk_dict_data_type'
);

SET @sql := IF(
  @fk_exists = 0,
  'ALTER TABLE `dict_data` ADD CONSTRAINT `fk_dict_data_type` FOREIGN KEY (`dict_type`) REFERENCES `dict_types`(`dict_type`) ON DELETE RESTRICT ON UPDATE CASCADE',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
