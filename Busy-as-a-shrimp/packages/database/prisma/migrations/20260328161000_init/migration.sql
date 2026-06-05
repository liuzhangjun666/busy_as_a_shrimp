-- CreateTable
CREATE TABLE `users` (
    `user_id` BIGINT NOT NULL AUTO_INCREMENT,
    `phone_hash` VARCHAR(64) NOT NULL,
    `role` ENUM('service', 'resource', 'both') NOT NULL,
    `city` VARCHAR(50) NULL,
    `district` VARCHAR(100) NULL,
    `member_level` ENUM('free', 'monthly', 'yearly', 'lifetime') NOT NULL DEFAULT 'free',
    `member_expire` DATETIME(3) NULL,
    `status` ENUM('active', 'banned', 'frozen') NOT NULL DEFAULT 'active',
    `captain_level` ENUM('normal', 'advanced', 'gold') NOT NULL DEFAULT 'normal',
    `masked_phone` VARCHAR(20) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `resources` (
    `resource_id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `resource_type` ENUM('skill', 'location', 'account', 'time') NOT NULL,
    `tags` JSON NOT NULL,
    `area_code` VARCHAR(20) NULL,
    `price_range` JSON NULL,
    `status` ENUM('pending', 'active', 'inactive', 'rejected') NOT NULL DEFAULT 'pending',
    `verified_at` DATETIME(3) NULL,
    `last_update` DATETIME(3) NULL,

    INDEX `resources_user_id_fkey`(`user_id`),
    PRIMARY KEY (`resource_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `matches` (
    `match_id` BIGINT NOT NULL AUTO_INCREMENT,
    `need_id` BIGINT NOT NULL,
    `resource_id` BIGINT NOT NULL,
    `match_score` DECIMAL(5, 2) NOT NULL,
    `status` ENUM('pushed', 'viewed', 'confirmed', 'done', 'invalid') NOT NULL,
    `push_time` DATETIME(3) NULL,
    `feedback` TINYINT NULL,

    INDEX `matches_resource_id_fkey`(`resource_id`),
    INDEX `need_id`(`need_id`),
    PRIMARY KEY (`match_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `captain_commissions` (
    `commission_id` BIGINT NOT NULL AUTO_INCREMENT,
    `captain_id` BIGINT NOT NULL,
    `order_id` BIGINT NOT NULL,
    `order_amount` DECIMAL(10, 2) NOT NULL,
    `commission_rate` DECIMAL(5, 2) NOT NULL,
    `commission_amount` DECIMAL(10, 2) NOT NULL,
    `status` ENUM('pending', 'active', 'paid', 'invalid') NOT NULL,
    `confirm_at` DATETIME(3) NULL,

    INDEX `idx_commission_captain_id`(`captain_id`),
    INDEX `order_id`(`order_id`),
    PRIMARY KEY (`commission_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invite_records` (
    `record_id` BIGINT NOT NULL AUTO_INCREMENT,
    `inviter_id` BIGINT NOT NULL,
    `invitee_id` BIGINT NOT NULL,
    `invite_code` VARCHAR(8) NOT NULL,
    `is_valid` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `invitee_id`(`invitee_id`),
    INDEX `inviter_id`(`inviter_id`),
    PRIMARY KEY (`record_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `contents` (
    `content_id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `content_type` ENUM('card', 'post', 'video_script', 'poster') NOT NULL,
    `content_body` TEXT NOT NULL,
    `target_platform` VARCHAR(50) NOT NULL,
    `status` ENUM('draft', 'pending', 'published', 'rejected') NOT NULL DEFAULT 'draft',
    `stats` JSON NULL,
    `published_at` DATETIME(3) NULL,

    INDEX `contents_user_id_fkey`(`user_id`),
    PRIMARY KEY (`content_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `announcements` (
    `notice_id` BIGINT NOT NULL AUTO_INCREMENT,
    `content` TEXT NOT NULL,
    `publisher` VARCHAR(50) NOT NULL DEFAULT 'admin',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`notice_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `resources` ADD CONSTRAINT `resources_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `matches` ADD CONSTRAINT `matches_resource_id_fkey` FOREIGN KEY (`resource_id`) REFERENCES `resources`(`resource_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contents` ADD CONSTRAINT `contents_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
