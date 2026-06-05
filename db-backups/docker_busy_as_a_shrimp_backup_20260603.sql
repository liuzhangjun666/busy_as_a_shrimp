-- MySQL dump 10.13  Distrib 8.0.19, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: busy_as_a_shrimp
-- ------------------------------------------------------
-- Server version	8.0.46

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `_prisma_migrations`
--

DROP TABLE IF EXISTS `_prisma_migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `_prisma_migrations` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `checksum` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `finished_at` datetime(3) DEFAULT NULL,
  `migration_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `logs` text COLLATE utf8mb4_unicode_ci,
  `rolled_back_at` datetime(3) DEFAULT NULL,
  `started_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `applied_steps_count` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_prisma_migrations`
--

LOCK TABLES `_prisma_migrations` WRITE;
/*!40000 ALTER TABLE `_prisma_migrations` DISABLE KEYS */;
INSERT INTO `_prisma_migrations` VALUES ('0a65bf07-9490-4384-b7c2-785586fc1a05','2249de3e8ceda57945d6ffbf970c1f9fcbc88e1357fb657933086ade82b85f1a','2026-06-03 03:51:08.411','20260409103000_add_brush_order_penalties',NULL,NULL,'2026-06-03 03:51:06.975',1),('0c166203-ce1d-4f43-b46b-9a245024f4e9','252309b6189b4dc7462c92b6227fc9da2c6d6ee3846cd4a338dc0587f536d1c7','2026-06-03 03:51:09.218','20260409200000_add_resource_types_json',NULL,NULL,'2026-06-03 03:51:08.979',1),('0ce66d18-9d0c-4448-a56a-d90928be18b7','51364b41a244d0dc791fe573ad677f82553c0b437e58d9228c4484b65ff64b0b','2026-06-03 03:51:16.549','20260420103000_align_opportunity_campus_fields',NULL,NULL,'2026-06-03 03:51:14.277',1),('12e58e42-31ad-4014-915c-a2baab91c80e','e0d56de81160bd6d9b9ded016fbdc3cf9cba21e890cf6185a5cb0a2911f19ee0','2026-06-03 03:51:19.026','20260602170000_add_user_password_hash',NULL,NULL,'2026-06-03 03:51:18.788',1),('26e8a544-4a62-4430-bc8c-37c2f9f190f9','18e697d506f2be678ace19f9f335a92d52ea064ec1fe2ad3d3454fbad265e3a3','2026-06-03 03:51:18.103','20260429153000_add_resource_activation_details',NULL,NULL,'2026-06-03 03:51:17.843',1),('33c04cef-c177-49a8-a156-19fb9afbfc48','f1f622c1bde0cc1ef9aba3012b1f018e23bb9e74d21c80e76c48e07cf1dda9b7','2026-06-03 03:51:09.267','20260410000000_fix_announcements_columns',NULL,NULL,'2026-06-03 03:51:09.234',1),('3c776cf3-5fde-4e3e-b674-2acb76667dad','c3aa45216694048270ebbface3762e39dc8af749db898a8eef6239af1793c0b5','2026-06-03 03:51:04.239','20260408143500_add_user_avatar',NULL,NULL,'2026-06-03 03:51:03.822',1),('3d7eb335-a737-4684-bd4e-57919aaaa4c1','bb56567a76f5765616925c21ec07942123319f776f07549b693c854ac3a1d9e7','2026-06-03 03:51:08.961','20260409172000_add_dict_tables',NULL,NULL,'2026-06-03 03:51:08.429',1),('5607dafa-7f15-4b3d-8c7e-1858dfcffb13','18fc21376d25952da6cc00cf23b136bde1f29dbcf2aa72ad706608ad2d157cd7','2026-06-03 03:51:17.071','20260422110000_add_ai_briefs',NULL,NULL,'2026-06-03 03:51:16.890',1),('560c2fa9-48f5-43e2-8235-e241aaacde52','493e5a9a45ac338687eeb175cc9e9856a5f9abb93ee88693b28f5db0ed0ec2fa','2026-06-03 03:51:14.017','20260414153000_reconcile_remaining_schema_drift',NULL,NULL,'2026-06-03 03:51:10.957',1),('5fe45657-4f43-48a2-b48f-02fa09e4ac56','8e21581f11288b12c9052e71847fd664916c94a2c1bf78444f842503f222947f','2026-06-03 03:51:05.081','20260408173000_add_risk_control_tables',NULL,NULL,'2026-06-03 03:51:04.256',1),('67052a78-fd42-48c8-bbe0-fc7895f50457','6a200de560e209268abc5bd907780dfb214ee125bf8c04395ccec752185a361a','2026-06-03 03:51:16.876','20260422094500_add_startup_posts',NULL,NULL,'2026-06-03 03:51:16.570',1),('71a4a6eb-bcb7-47d4-89d4-ec9426ab7b7a','61ab507916b914fe08d4e53977f986e3ef08b833667d3629b6466f1ad8afa451','2026-06-03 03:51:06.957','20260408210000_add_violation_penalty_and_unban',NULL,NULL,'2026-06-03 03:51:06.366',1),('737f6f1c-9d98-4515-9234-548649a29797','c2b02c149291da4a01fd96d2c8e3d6b945f3bc88cc88daeae78a68cdd87cc10a','2026-06-03 03:51:17.831','20260424143000_add_ai_briefs_translation_fields',NULL,NULL,'2026-06-03 03:51:17.524',1),('9160b398-6064-4862-a518-b64ce2126817','483a65a1ca11b0075fd828c7e8dbf05770ea0ca3e1b471e8dd76876c59543987','2026-06-03 03:51:18.636','20260430093000_add_user_nickname',NULL,NULL,'2026-06-03 03:51:18.350',1),('94d3871e-d584-4c82-95a5-7897407acb41','be8b4b961bae1c80ebf2c6b6787d480d41311ad34025bc2194949f8bb443caf4','2026-06-03 03:51:06.349','20260408190000_add_users_and_announcements_fields',NULL,NULL,'2026-06-03 03:51:05.093',1),('a35bd591-b0da-4d78-8120-5b330dcb209d','e9bb3447168e8931d0b242dff7dfeeb709e8252d48755d2772d2f23c1361cf32','2026-06-03 03:51:17.508','20260423112000_add_user_purchases_source_fields',NULL,NULL,'2026-06-03 03:51:17.268',1),('a4f8b49d-1a66-4418-9e83-7fa45059e8aa','2fc04c623aa6c0c9949fbf87c112c56ceee395b6b15929a4cefe928ace233109','2026-06-03 03:51:03.807','20260328161000_init',NULL,NULL,'2026-06-03 03:51:01.981',1),('bd202bdd-836b-425a-b4fa-b84b13706fe2','6722cd715a35d7909d80db240ea688b85ee5b3317ac36f17fdfdf7614649dca8','2026-06-03 03:51:18.335','20260429173000_add_resource_review_fields',NULL,NULL,'2026-06-03 03:51:18.115',1),('c1334442-3028-4600-8c34-450ffdc18ead','faa9fd96c7acdc7fd71650bfe2e751e1c08147077a92abb9173c94a36e697c6f','2026-06-03 03:51:10.942','20260414120000_reconcile_core_schema_drift',NULL,NULL,'2026-06-03 03:51:09.455',1),('de127acb-b9a7-4a58-ae74-2307680758f6','25cb520d2f7ad8f35693bc90156dbdb07614b6a38c7ec4fb42da66f903a9ba38','2026-06-03 03:51:17.253','20260422123000_add_solo_signals',NULL,NULL,'2026-06-03 03:51:17.104',1),('e1e6410a-2a42-45c0-b86e-4f9802430c3c','78f3087b9d0497f7ee6dbc79d568f96687f318201f08ecc98fe783de02c53d27','2026-06-03 03:51:09.440','20260413173000_add_invite_record_unique_invitee',NULL,NULL,'2026-06-03 03:51:09.324',1),('e4254718-5ada-4781-a851-ea11720e6f60','9b3962b9bfb60d17e247f070178a9653b5fc39aba7c55f624a4e62ddbe707198','2026-06-03 03:51:14.265','20260420093000_add_real_name_verification_columns',NULL,NULL,'2026-06-03 03:51:14.030',1),('ef1d7f88-d195-4d9e-914e-a7d8af5142b6','353039b3a9581ca3eebda23c2e39af65934fe9f075fd7731c457be2787993b90','2026-06-03 03:51:18.775','20260430110000_expand_resource_filter_dicts',NULL,NULL,'2026-06-03 03:51:18.650',1),('fb9a6da6-ee6d-4281-8f03-b2e091768d0f','64a0067e742b0b153e28c753c84f14c0814cbfacbc2cdc6e2d3615f72b62c546','2026-06-03 03:51:09.311','20260410123000_add_membership_orders',NULL,NULL,'2026-06-03 03:51:09.283',1);
/*!40000 ALTER TABLE `_prisma_migrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `activity_periods`
--

DROP TABLE IF EXISTS `activity_periods`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `activity_periods` (
  `period_id` bigint NOT NULL AUTO_INCREMENT,
  `start_time` datetime(3) NOT NULL,
  `end_time` datetime(3) NOT NULL,
  `reward_pool` decimal(10,2) NOT NULL DEFAULT '5000.00',
  `is_processed` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`period_id`),
  KEY `activity_periods_start_time_end_time_idx` (`start_time`,`end_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `activity_periods`
--

LOCK TABLES `activity_periods` WRITE;
/*!40000 ALTER TABLE `activity_periods` DISABLE KEYS */;
/*!40000 ALTER TABLE `activity_periods` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ai_briefs`
--

DROP TABLE IF EXISTS `ai_briefs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ai_briefs` (
  `ai_brief_id` bigint NOT NULL AUTO_INCREMENT,
  `external_id` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `source_name` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(300) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title_zh` varchar(300) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `summary` text COLLATE utf8mb4_unicode_ci,
  `summary_zh` text COLLATE utf8mb4_unicode_ci,
  `translate_status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `translated_at` datetime(3) DEFAULT NULL,
  `source_url` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `published_at` datetime(3) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`ai_brief_id`),
  UNIQUE KEY `ai_briefs_external_id_key` (`external_id`),
  KEY `idx_ai_briefs_published_id` (`published_at` DESC,`ai_brief_id` DESC),
  KEY `idx_ai_briefs_translate_status` (`translate_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ai_briefs`
--

LOCK TABLES `ai_briefs` WRITE;
/*!40000 ALTER TABLE `ai_briefs` DISABLE KEYS */;
/*!40000 ALTER TABLE `ai_briefs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `announcements`
--

DROP TABLE IF EXISTS `announcements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `announcements` (
  `notice_id` bigint NOT NULL AUTO_INCREMENT,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `publisher` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'admin',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `title` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '未命名公告',
  `type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'notice',
  PRIMARY KEY (`notice_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `announcements`
--

LOCK TABLES `announcements` WRITE;
/*!40000 ALTER TABLE `announcements` DISABLE KEYS */;
/*!40000 ALTER TABLE `announcements` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bounty_tasks`
--

DROP TABLE IF EXISTS `bounty_tasks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bounty_tasks` (
  `task_id` bigint NOT NULL AUTO_INCREMENT,
  `title` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `points` decimal(10,2) NOT NULL,
  `status` enum('PUBLISHED','FINISHED','CANCELLED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PUBLISHED',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `difficulty` enum('EASY','MEDIUM','HARD','EXPERT') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'MEDIUM',
  PRIMARY KEY (`task_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bounty_tasks`
--

LOCK TABLES `bounty_tasks` WRITE;
/*!40000 ALTER TABLE `bounty_tasks` DISABLE KEYS */;
/*!40000 ALTER TABLE `bounty_tasks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `brush_order_penalties`
--

DROP TABLE IF EXISTS `brush_order_penalties`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `brush_order_penalties` (
  `penalty_id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `invite_record_id` bigint NOT NULL,
  `trigger_reasons` json NOT NULL,
  `before_captain_level` enum('normal','advanced','gold') COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('applied','confirmed','rolled_back') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'applied',
  `reviewed_by` bigint DEFAULT NULL,
  `review_note` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `applied_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `reviewed_at` datetime(3) DEFAULT NULL,
  `rolled_back_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`penalty_id`),
  UNIQUE KEY `brush_order_penalties_invite_record_id_key` (`invite_record_id`),
  KEY `idx_penalty_user_status` (`user_id`,`status`),
  KEY `idx_penalty_applied` (`applied_at`),
  CONSTRAINT `brush_order_penalties_invite_record_id_fkey` FOREIGN KEY (`invite_record_id`) REFERENCES `invite_records` (`record_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `brush_order_penalties_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `brush_order_penalties`
--

LOCK TABLES `brush_order_penalties` WRITE;
/*!40000 ALTER TABLE `brush_order_penalties` DISABLE KEYS */;
/*!40000 ALTER TABLE `brush_order_penalties` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `brush_order_penalty_commissions`
--

DROP TABLE IF EXISTS `brush_order_penalty_commissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `brush_order_penalty_commissions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `penalty_id` bigint NOT NULL,
  `commission_id` bigint NOT NULL,
  `before_status` enum('pending','active','paid','invalid') COLLATE utf8mb4_unicode_ci NOT NULL,
  `before_amount` decimal(10,2) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_penalty_commission` (`penalty_id`,`commission_id`),
  KEY `idx_penalty_commission_id` (`commission_id`),
  CONSTRAINT `brush_order_penalty_commissions_commission_id_fkey` FOREIGN KEY (`commission_id`) REFERENCES `captain_commissions` (`commission_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `brush_order_penalty_commissions_penalty_id_fkey` FOREIGN KEY (`penalty_id`) REFERENCES `brush_order_penalties` (`penalty_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `brush_order_penalty_commissions`
--

LOCK TABLES `brush_order_penalty_commissions` WRITE;
/*!40000 ALTER TABLE `brush_order_penalty_commissions` DISABLE KEYS */;
/*!40000 ALTER TABLE `brush_order_penalty_commissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `captain_commissions`
--

DROP TABLE IF EXISTS `captain_commissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `captain_commissions` (
  `commission_id` bigint NOT NULL AUTO_INCREMENT,
  `captain_id` bigint NOT NULL,
  `order_id` bigint NOT NULL,
  `order_amount` decimal(10,2) NOT NULL,
  `commission_rate` decimal(5,2) NOT NULL,
  `commission_amount` decimal(10,2) NOT NULL,
  `status` enum('pending','active','paid','invalid') COLLATE utf8mb4_unicode_ci NOT NULL,
  `confirm_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`commission_id`),
  KEY `idx_commission_captain_id` (`captain_id`),
  KEY `order_id` (`order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `captain_commissions`
--

LOCK TABLES `captain_commissions` WRITE;
/*!40000 ALTER TABLE `captain_commissions` DISABLE KEYS */;
/*!40000 ALTER TABLE `captain_commissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `contents`
--

DROP TABLE IF EXISTS `contents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `contents` (
  `content_id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `content_type` enum('card','post','video_script','poster') COLLATE utf8mb4_unicode_ci NOT NULL,
  `content_body` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `target_platform` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('draft','pending','published','rejected') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `stats` json DEFAULT NULL,
  `published_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`content_id`),
  KEY `contents_user_id_fkey` (`user_id`),
  CONSTRAINT `contents_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `contents`
--

LOCK TABLES `contents` WRITE;
/*!40000 ALTER TABLE `contents` DISABLE KEYS */;
/*!40000 ALTER TABLE `contents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cyber_doppelgangers`
--

DROP TABLE IF EXISTS `cyber_doppelgangers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cyber_doppelgangers` (
  `doppelganger_id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `balance` decimal(10,2) NOT NULL DEFAULT '0.00',
  `status` enum('active','inactive','frozen') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'inactive',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`doppelganger_id`),
  UNIQUE KEY `cyber_doppelgangers_user_id_key` (`user_id`),
  CONSTRAINT `cyber_doppelgangers_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cyber_doppelgangers`
--

LOCK TABLES `cyber_doppelgangers` WRITE;
/*!40000 ALTER TABLE `cyber_doppelgangers` DISABLE KEYS */;
/*!40000 ALTER TABLE `cyber_doppelgangers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `dict_data`
--

DROP TABLE IF EXISTS `dict_data`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dict_data` (
  `dict_data_id` bigint NOT NULL AUTO_INCREMENT,
  `dict_type` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `dict_code` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `dict_label` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `dict_value` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `dict_sort` int NOT NULL DEFAULT '0',
  `status` enum('normal','disabled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'normal',
  `remark` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`dict_data_id`),
  UNIQUE KEY `uk_dict_data_type_code` (`dict_type`,`dict_code`),
  KEY `idx_dict_data_type_status_sort` (`dict_type`,`status`,`dict_sort`),
  CONSTRAINT `dict_data_dict_type_fkey` FOREIGN KEY (`dict_type`) REFERENCES `dict_types` (`dict_type`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=133 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `dict_data`
--

LOCK TABLES `dict_data` WRITE;
/*!40000 ALTER TABLE `dict_data` DISABLE KEYS */;
INSERT INTO `dict_data` VALUES (1,'RESOURCE_SKILL_TAGS','short_video','短视频','短视频',1,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(2,'RESOURCE_SKILL_TAGS','short_video_script','短视频脚本','短视频脚本',2,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(3,'RESOURCE_SKILL_TAGS','short_video_shooting','短视频拍摄','短视频拍摄',3,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(4,'RESOURCE_SKILL_TAGS','video_editing','视频剪辑','视频剪辑',4,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(5,'RESOURCE_SKILL_TAGS','live_stream','直播','直播',5,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(6,'RESOURCE_SKILL_TAGS','live_stream_ops','直播运营','直播运营',6,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(7,'RESOURCE_SKILL_TAGS','anchor_training','主播培训','主播培训',7,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(8,'RESOURCE_SKILL_TAGS','account_ops','账号代运营','账号代运营',8,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(9,'RESOURCE_SKILL_TAGS','content_copywriting','内容文案','内容文案',9,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(10,'RESOURCE_SKILL_TAGS','brand_copywriting','文案策划','文案策划',10,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(11,'RESOURCE_SKILL_TAGS','event_execution','活动执行','活动执行',11,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(12,'RESOURCE_SKILL_TAGS','corporate_live','企业自播','企业自播',12,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(13,'RESOURCE_SKILL_TAGS','ip_incubation','IP孵化','IP孵化',13,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(14,'RESOURCE_SKILL_TAGS','private_domain_ops','私域运营','私域运营',14,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(15,'RESOURCE_SKILL_TAGS','community_ops','社群运营','社群运营',15,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(16,'RESOURCE_SKILL_TAGS','seo_sem','SEO/SEM','SEO/SEM',16,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(17,'RESOURCE_SKILL_TAGS','ecommerce_ops','电商运营','电商运营',17,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(18,'RESOURCE_SKILL_TAGS','shop_ops','店铺运营','店铺运营',18,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(19,'RESOURCE_SKILL_TAGS','local_life_ops','本地生活运营','本地生活运营',19,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(20,'RESOURCE_SKILL_TAGS','ai_tools','AI工具应用','AI工具应用',20,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(21,'RESOURCE_SKILL_TAGS','ai_editing','AI剪辑','AI剪辑',21,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(22,'RESOURCE_SKILL_TAGS','graphic_design','平面设计','平面设计',22,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(23,'RESOURCE_SKILL_TAGS','brand_strategy','品牌策划','品牌策划',23,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(24,'RESOURCE_SKILL_TAGS','creator_bd','达人对接','达人对接',24,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(25,'RESOURCE_SKILL_TAGS','influencer_bd','博主商务','博主商务',25,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(26,'RESOURCE_SKILL_TAGS','visit_store_shoot','探店拍摄','探店拍摄',26,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(27,'RESOURCE_SKILL_TAGS','photography','摄影摄像','摄影摄像',27,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(28,'RESOURCE_SKILL_TAGS','product_selection','选品','选品',28,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(29,'RESOURCE_SKILL_TAGS','data_analysis','数据分析','数据分析',29,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(30,'RESOURCE_SKILL_TAGS','customer_service','客服转化','客服转化',30,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(31,'RESOURCE_SKILL_TAGS','supply_chain','供应链对接','供应链对接',31,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(32,'RESOURCE_SKILL_TAGS','training_coach','培训教练','培训教练',32,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(33,'RESOURCE_REGION_CODES','000000','全国','全国',1,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(34,'RESOURCE_REGION_CODES','110000','北京','北京',2,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(35,'RESOURCE_REGION_CODES','310000','上海','上海',3,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(36,'RESOURCE_REGION_CODES','440100','广州','广州',4,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(37,'RESOURCE_REGION_CODES','440300','深圳','深圳',5,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(38,'RESOURCE_REGION_CODES','330100','杭州','杭州',6,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(39,'RESOURCE_REGION_CODES','510100','成都','成都',7,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(40,'RESOURCE_REGION_CODES','420100','武汉','武汉',8,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(41,'RESOURCE_REGION_CODES','320100','南京','南京',9,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(42,'RESOURCE_REGION_CODES','610100','西安','西安',10,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(43,'RESOURCE_REGION_CODES','500000','重庆','重庆',11,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(44,'RESOURCE_REGION_CODES','120000','天津','天津',12,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(45,'RESOURCE_REGION_CODES','320500','苏州','苏州',13,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(46,'RESOURCE_REGION_CODES','330200','宁波','宁波',14,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(47,'RESOURCE_REGION_CODES','350200','厦门','厦门',15,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(48,'RESOURCE_REGION_CODES','350100','福州','福州',16,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(49,'RESOURCE_REGION_CODES','410100','郑州','郑州',17,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(50,'RESOURCE_REGION_CODES','430100','长沙','长沙',18,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(51,'RESOURCE_REGION_CODES','370200','青岛','青岛',19,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(52,'RESOURCE_REGION_CODES','370100','济南','济南',20,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(53,'RESOURCE_REGION_CODES','440600','佛山','佛山',21,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(54,'RESOURCE_REGION_CODES','441900','东莞','东莞',22,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(55,'RESOURCE_REGION_CODES','460100','海口','海口',23,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(56,'RESOURCE_REGION_CODES','530100','昆明','昆明',24,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(57,'RESOURCE_REGION_CODES','210100','沈阳','沈阳',25,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(58,'RESOURCE_REGION_CODES','220100','长春','长春',26,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(59,'RESOURCE_REGION_CODES','230100','哈尔滨','哈尔滨',27,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(60,'RESOURCE_REGION_CODES','340100','合肥','合肥',28,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(61,'RESOURCE_REGION_CODES','360100','南昌','南昌',29,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(62,'RESOURCE_REGION_CODES','450100','南宁','南宁',30,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(63,'RESOURCE_REGION_CODES','520100','贵阳','贵阳',31,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(64,'RESOURCE_CITY_NODES','nationwide','全国','全国',1,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(65,'RESOURCE_CITY_NODES','beijing','北京','北京',2,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(66,'RESOURCE_CITY_NODES','shanghai','上海','上海',3,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(67,'RESOURCE_CITY_NODES','guangzhou','广州','广州',4,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(68,'RESOURCE_CITY_NODES','shenzhen','深圳','深圳',5,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(69,'RESOURCE_CITY_NODES','hangzhou','杭州','杭州',6,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(70,'RESOURCE_CITY_NODES','chengdu','成都','成都',7,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(71,'RESOURCE_CITY_NODES','wuhan','武汉','武汉',8,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(72,'RESOURCE_CITY_NODES','nanjing','南京','南京',9,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(73,'RESOURCE_CITY_NODES','xian','西安','西安',10,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(74,'RESOURCE_CITY_NODES','chongqing','重庆','重庆',11,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(75,'RESOURCE_CITY_NODES','tianjin','天津','天津',12,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(76,'RESOURCE_CITY_NODES','suzhou','苏州','苏州',13,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(77,'RESOURCE_CITY_NODES','ningbo','宁波','宁波',14,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(78,'RESOURCE_CITY_NODES','xiamen','厦门','厦门',15,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(79,'RESOURCE_CITY_NODES','fuzhou','福州','福州',16,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(80,'RESOURCE_CITY_NODES','zhengzhou','郑州','郑州',17,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(81,'RESOURCE_CITY_NODES','changsha','长沙','长沙',18,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(82,'RESOURCE_CITY_NODES','qingdao','青岛','青岛',19,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(83,'RESOURCE_CITY_NODES','jinan','济南','济南',20,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(84,'RESOURCE_CITY_NODES','foshan','佛山','佛山',21,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(85,'RESOURCE_CITY_NODES','dongguan','东莞','东莞',22,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(86,'RESOURCE_CITY_NODES','haikou','海口','海口',23,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(87,'RESOURCE_CITY_NODES','kunming','昆明','昆明',24,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(88,'RESOURCE_CITY_NODES','shenyang','沈阳','沈阳',25,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(89,'RESOURCE_CITY_NODES','changchun','长春','长春',26,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(90,'RESOURCE_CITY_NODES','haerbin','哈尔滨','哈尔滨',27,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(91,'RESOURCE_CITY_NODES','hefei','合肥','合肥',28,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(92,'RESOURCE_CITY_NODES','nanchang','南昌','南昌',29,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(93,'RESOURCE_CITY_NODES','nanning','南宁','南宁',30,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(94,'RESOURCE_CITY_NODES','guiyang','贵阳','贵阳',31,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(95,'RESOURCE_WISH_TAGS','seek_partner','寻找合伙人','寻找合伙人',1,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(96,'RESOURCE_WISH_TAGS','resource_swap','资源互换','资源互换',2,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(97,'RESOURCE_WISH_TAGS','cross_industry','异业合作','异业合作',3,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(98,'RESOURCE_WISH_TAGS','traffic_share','流量共享','流量共享',4,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(99,'RESOURCE_WISH_TAGS','project_outsource','项目外包','项目外包',5,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(100,'RESOURCE_WISH_TAGS','recruit_anchor','招募主播','招募主播',6,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(101,'RESOURCE_WISH_TAGS','channel_cooperation','渠道合作','渠道合作',7,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(102,'RESOURCE_WISH_TAGS','brand_exposure','品牌曝光','品牌曝光',8,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(103,'RESOURCE_WISH_TAGS','monetization','商业变现','商业变现',9,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(104,'RESOURCE_WISH_TAGS','user_growth','用户增长','用户增长',10,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(105,'RESOURCE_WISH_TAGS','content_cocreation','内容共创','内容共创',11,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(106,'RESOURCE_WISH_TAGS','local_client','本地获客','本地获客',12,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(107,'RESOURCE_WISH_TAGS','product_testing','产品试用','产品试用',13,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(108,'RESOURCE_WISH_TAGS','joint_live','联合直播','联合直播',14,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(109,'RESOURCE_WISH_TAGS','course_collab','课程合作','课程合作',15,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(110,'RESOURCE_WISH_TAGS','supply_match','供应对接','供应对接',16,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(111,'RESOURCE_WISH_TAGS','investment_match','投融资对接','投融资对接',17,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(112,'RESOURCE_WISH_TAGS','case_exchange','案例互换','案例互换',18,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(113,'RESOURCE_NEED_TAGS','long_term','长期','长期',1,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(114,'RESOURCE_NEED_TAGS','short_term','短期','短期',2,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(115,'RESOURCE_NEED_TAGS','weekend','周末','周末',3,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(116,'RESOURCE_NEED_TAGS','part_time','兼职','兼职',4,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(117,'RESOURCE_NEED_TAGS','one_time','单次结','单次结',5,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(118,'RESOURCE_NEED_TAGS','remote','远程','远程',6,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(119,'RESOURCE_NEED_TAGS','onsite','到场','到场',7,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(120,'RESOURCE_NEED_TAGS','urgent','急单','急单',8,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(121,'RESOURCE_NEED_TAGS','monthly_package','月度包','月度包',9,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(122,'RESOURCE_NEED_TAGS','commission','佣金制','佣金制',10,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(123,'RESOURCE_NEED_TAGS','revenue_share','分成合作','分成合作',11,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(124,'RESOURCE_NEED_TAGS','fixed_price','固定报价','固定报价',12,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(125,'RESOURCE_NEED_TAGS','trial_order','试单','试单',13,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(126,'RESOURCE_NEED_TAGS','city_cooperation','同城合作','同城合作',14,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(127,'RESOURCE_NEED_TAGS','national_delivery','全国交付','全国交付',15,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(128,'RESOURCE_NEED_TAGS','night_slot','夜间档期','夜间档期',16,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(129,'RESOURCE_NEED_TAGS','weekday','工作日','工作日',17,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(130,'RESOURCE_NEED_TAGS','flexible_schedule','弹性时间','弹性时间',18,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(131,'RESOURCE_NEED_TAGS','team_needed','团队承接','团队承接',19,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733'),(132,'RESOURCE_NEED_TAGS','single_person','单人可接','单人可接',20,'normal',NULL,'2026-06-03 03:51:18.733','2026-06-03 03:51:18.733');
/*!40000 ALTER TABLE `dict_data` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `dict_types`
--

DROP TABLE IF EXISTS `dict_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dict_types` (
  `dict_id` bigint NOT NULL AUTO_INCREMENT,
  `dict_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `dict_type` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('normal','disabled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'normal',
  `remark` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`dict_id`),
  UNIQUE KEY `dict_types_dict_type_key` (`dict_type`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `dict_types`
--

LOCK TABLES `dict_types` WRITE;
/*!40000 ALTER TABLE `dict_types` DISABLE KEYS */;
INSERT INTO `dict_types` VALUES (1,'资源技能标签','RESOURCE_SKILL_TAGS','normal',NULL,'2026-06-03 03:51:18.717','2026-06-03 03:51:18.717'),(2,'资源地区标签','RESOURCE_REGION_CODES','normal',NULL,'2026-06-03 03:51:18.717','2026-06-03 03:51:18.717'),(3,'资源大厅城市节点','RESOURCE_CITY_NODES','normal',NULL,'2026-06-03 03:51:18.717','2026-06-03 03:51:18.717'),(4,'资源目标心愿标签','RESOURCE_WISH_TAGS','normal',NULL,'2026-06-03 03:51:18.717','2026-06-03 03:51:18.717'),(5,'资源业务需求标签','RESOURCE_NEED_TAGS','normal',NULL,'2026-06-03 03:51:18.717','2026-06-03 03:51:18.717');
/*!40000 ALTER TABLE `dict_types` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `hp_logs`
--

DROP TABLE IF EXISTS `hp_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `hp_logs` (
  `log_id` bigint NOT NULL AUTO_INCREMENT,
  `lobster_id` bigint NOT NULL,
  `delta` int NOT NULL,
  `reason` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ref_id` bigint DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`log_id`),
  KEY `hp_logs_lobster_id_created_at_idx` (`lobster_id`,`created_at`),
  CONSTRAINT `hp_logs_lobster_id_fkey` FOREIGN KEY (`lobster_id`) REFERENCES `lobster_statuses` (`lobster_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `hp_logs`
--

LOCK TABLES `hp_logs` WRITE;
/*!40000 ALTER TABLE `hp_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `hp_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `invite_records`
--

DROP TABLE IF EXISTS `invite_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `invite_records` (
  `record_id` bigint NOT NULL AUTO_INCREMENT,
  `inviter_id` bigint NOT NULL,
  `invitee_id` bigint NOT NULL,
  `invite_code` varchar(8) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_valid` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`record_id`),
  UNIQUE KEY `uk_invite_records_invitee` (`invitee_id`),
  KEY `invitee_id` (`invitee_id`),
  KEY `inviter_id` (`inviter_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `invite_records`
--

LOCK TABLES `invite_records` WRITE;
/*!40000 ALTER TABLE `invite_records` DISABLE KEYS */;
/*!40000 ALTER TABLE `invite_records` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lobster_match_records`
--

DROP TABLE IF EXISTS `lobster_match_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lobster_match_records` (
  `match_id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `target_user_id` bigint DEFAULT NULL,
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci,
  `match_score` decimal(5,2) DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`match_id`),
  KEY `lobster_match_records_user_id_idx` (`user_id`),
  CONSTRAINT `lobster_match_records_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lobster_match_records`
--

LOCK TABLES `lobster_match_records` WRITE;
/*!40000 ALTER TABLE `lobster_match_records` DISABLE KEYS */;
/*!40000 ALTER TABLE `lobster_match_records` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lobster_review_tasks`
--

DROP TABLE IF EXISTS `lobster_review_tasks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lobster_review_tasks` (
  `review_id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `task_log_id` bigint DEFAULT NULL,
  `context` json DEFAULT NULL,
  `status` enum('pending','approved','rejected','expired') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `expires_at` datetime(3) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`review_id`),
  KEY `lobster_review_tasks_user_id_status_idx` (`user_id`,`status`),
  CONSTRAINT `lobster_review_tasks_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lobster_review_tasks`
--

LOCK TABLES `lobster_review_tasks` WRITE;
/*!40000 ALTER TABLE `lobster_review_tasks` DISABLE KEYS */;
/*!40000 ALTER TABLE `lobster_review_tasks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lobster_statuses`
--

DROP TABLE IF EXISTS `lobster_statuses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lobster_statuses` (
  `lobster_id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `hp` int NOT NULL DEFAULT '100',
  `personality` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `personality_unlocked` tinyint(1) NOT NULL DEFAULT '0',
  `lobster_expires_at` datetime(3) DEFAULT NULL,
  `last_executed_at` datetime(3) DEFAULT NULL,
  `status` enum('sleeping','active','executing','paused') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'sleeping',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`lobster_id`),
  UNIQUE KEY `lobster_statuses_user_id_key` (`user_id`),
  CONSTRAINT `lobster_statuses_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lobster_statuses`
--

LOCK TABLES `lobster_statuses` WRITE;
/*!40000 ALTER TABLE `lobster_statuses` DISABLE KEYS */;
/*!40000 ALTER TABLE `lobster_statuses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lobster_task_logs`
--

DROP TABLE IF EXISTS `lobster_task_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lobster_task_logs` (
  `log_id` bigint NOT NULL AUTO_INCREMENT,
  `lobster_id` bigint NOT NULL,
  `task_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `personality` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `input_json` json DEFAULT NULL,
  `output_json` json DEFAULT NULL,
  `deerflow_run_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `started_at` datetime(3) NOT NULL,
  `completed_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`log_id`),
  KEY `lobster_task_logs_lobster_id_started_at_idx` (`lobster_id`,`started_at`),
  CONSTRAINT `lobster_task_logs_lobster_id_fkey` FOREIGN KEY (`lobster_id`) REFERENCES `lobster_statuses` (`lobster_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lobster_task_logs`
--

LOCK TABLES `lobster_task_logs` WRITE;
/*!40000 ALTER TABLE `lobster_task_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `lobster_task_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `matches`
--

DROP TABLE IF EXISTS `matches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `matches` (
  `match_id` bigint NOT NULL AUTO_INCREMENT,
  `need_id` bigint NOT NULL,
  `resource_id` bigint NOT NULL,
  `match_score` decimal(5,2) NOT NULL,
  `status` enum('pushed','viewed','confirmed','done','invalid') COLLATE utf8mb4_unicode_ci NOT NULL,
  `push_time` datetime(3) DEFAULT NULL,
  `feedback` tinyint DEFAULT NULL,
  PRIMARY KEY (`match_id`),
  KEY `matches_resource_id_fkey` (`resource_id`),
  KEY `need_id` (`need_id`),
  CONSTRAINT `matches_resource_id_fkey` FOREIGN KEY (`resource_id`) REFERENCES `resources` (`resource_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `matches`
--

LOCK TABLES `matches` WRITE;
/*!40000 ALTER TABLE `matches` DISABLE KEYS */;
/*!40000 ALTER TABLE `matches` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `opportunities`
--

DROP TABLE IF EXISTS `opportunities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `opportunities` (
  `opportunity_id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `company_name` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `industry` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `logo_gradient` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `recruitment_type` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `location` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `start_date` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `end_date` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `no_written_test` tinyint(1) NOT NULL DEFAULT '0',
  `position` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `announcement_url` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `apply_url` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `source_type` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci,
  `price_range` json DEFAULT NULL,
  `commission` decimal(10,2) DEFAULT NULL,
  `source_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('pending_review','approved','rejected','expired','claimed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending_review',
  `task_log_id` bigint DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `reviewed_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`opportunity_id`),
  KEY `opportunities_user_id_status_idx` (`user_id`,`status`),
  KEY `idx_opportunities_user_source` (`user_id`,`source_type`),
  KEY `idx_opportunities_created_at` (`created_at` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `opportunities`
--

LOCK TABLES `opportunities` WRITE;
/*!40000 ALTER TABLE `opportunities` DISABLE KEYS */;
/*!40000 ALTER TABLE `opportunities` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `point_transactions`
--

DROP TABLE IF EXISTS `point_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `point_transactions` (
  `transaction_id` bigint NOT NULL AUTO_INCREMENT,
  `doppelganger_id` bigint NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `type` enum('INVITE_REWARD','TASK_REWARD','TOKEN_CONSUME','SYSTEM_ADJUST','INITIAL_BONUS','DAILY_SIGN_IN','CONTRIBUTION_REWARD') COLLATE utf8mb4_unicode_ci NOT NULL,
  `metadata` json DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`transaction_id`),
  KEY `point_transactions_doppelganger_id_idx` (`doppelganger_id`),
  CONSTRAINT `point_transactions_doppelganger_id_fkey` FOREIGN KEY (`doppelganger_id`) REFERENCES `cyber_doppelgangers` (`doppelganger_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `point_transactions`
--

LOCK TABLES `point_transactions` WRITE;
/*!40000 ALTER TABLE `point_transactions` DISABLE KEYS */;
/*!40000 ALTER TABLE `point_transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `resources`
--

DROP TABLE IF EXISTS `resources`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `resources` (
  `resource_id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `resource_type` enum('skill','location','account','time') COLLATE utf8mb4_unicode_ci NOT NULL,
  `resource_types` json DEFAULT NULL,
  `tags` json NOT NULL,
  `area_code` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `price_range` json DEFAULT NULL,
  `status` enum('pending','active','inactive','rejected') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `verified_at` datetime(3) DEFAULT NULL,
  `last_update` datetime(3) DEFAULT NULL,
  `activation_details` json DEFAULT NULL,
  `review_reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `review_engine` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`resource_id`),
  KEY `resources_user_id_fkey` (`user_id`),
  CONSTRAINT `resources_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `resources`
--

LOCK TABLES `resources` WRITE;
/*!40000 ALTER TABLE `resources` DISABLE KEYS */;
/*!40000 ALTER TABLE `resources` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `risk_control_events`
--

DROP TABLE IF EXISTS `risk_control_events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `risk_control_events` (
  `event_id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint DEFAULT NULL,
  `event_type` enum('same_ip_limit','abnormal_device','invite_chain_detection','brush_order_disposal','violation_penalty','account_unban') COLLATE utf8mb4_unicode_ci NOT NULL,
  `action` enum('pass','review','block','disposed') COLLATE utf8mb4_unicode_ci NOT NULL,
  `detail` json DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`event_id`),
  KEY `idx_risk_user` (`user_id`),
  KEY `idx_risk_type_created` (`event_type`,`created_at`),
  CONSTRAINT `risk_control_events_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `risk_control_events`
--

LOCK TABLES `risk_control_events` WRITE;
/*!40000 ALTER TABLE `risk_control_events` DISABLE KEYS */;
/*!40000 ALTER TABLE `risk_control_events` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sign_in_records`
--

DROP TABLE IF EXISTS `sign_in_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sign_in_records` (
  `record_id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `last_sign_in_date` datetime(3) NOT NULL,
  `streak_days` int NOT NULL DEFAULT '1',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`record_id`),
  UNIQUE KEY `sign_in_records_user_id_last_sign_in_date_key` (`user_id`,`last_sign_in_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sign_in_records`
--

LOCK TABLES `sign_in_records` WRITE;
/*!40000 ALTER TABLE `sign_in_records` DISABLE KEYS */;
/*!40000 ALTER TABLE `sign_in_records` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `solo_signals`
--

DROP TABLE IF EXISTS `solo_signals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `solo_signals` (
  `solo_signal_id` bigint NOT NULL AUTO_INCREMENT,
  `external_id` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `source_name` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(300) COLLATE utf8mb4_unicode_ci NOT NULL,
  `summary` text COLLATE utf8mb4_unicode_ci,
  `source_url` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `published_at` datetime(3) NOT NULL,
  `income_snippet` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`solo_signal_id`),
  UNIQUE KEY `solo_signals_external_id_key` (`external_id`),
  KEY `idx_solo_signals_published_id` (`published_at` DESC,`solo_signal_id` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `solo_signals`
--

LOCK TABLES `solo_signals` WRITE;
/*!40000 ALTER TABLE `solo_signals` DISABLE KEYS */;
/*!40000 ALTER TABLE `solo_signals` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `startup_posts`
--

DROP TABLE IF EXISTS `startup_posts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `startup_posts` (
  `startup_post_id` bigint NOT NULL AUTO_INCREMENT,
  `title` varchar(160) COLLATE utf8mb4_unicode_ci NOT NULL,
  `summary` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tags` json DEFAULT NULL,
  `cover_image_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contact_info` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `source_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('draft','published','offline') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `sort` int NOT NULL DEFAULT '0',
  `view_count` int NOT NULL DEFAULT '0',
  `published_at` datetime(3) DEFAULT NULL,
  `created_by` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'admin',
  `updated_by` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'admin',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`startup_post_id`),
  KEY `idx_startup_posts_status_published_at` (`status`,`published_at`),
  KEY `idx_startup_posts_category` (`category`),
  KEY `idx_startup_posts_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `startup_posts`
--

LOCK TABLES `startup_posts` WRITE;
/*!40000 ALTER TABLE `startup_posts` DISABLE KEYS */;
/*!40000 ALTER TABLE `startup_posts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `task_submissions`
--

DROP TABLE IF EXISTS `task_submissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `task_submissions` (
  `submission_id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `task_id` bigint NOT NULL,
  `proof` text COLLATE utf8mb4_unicode_ci,
  `status` enum('PENDING','APPROVED','REJECTED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`submission_id`),
  KEY `task_submissions_task_id_idx` (`task_id`),
  KEY `task_submissions_user_id_idx` (`user_id`),
  CONSTRAINT `task_submissions_task_id_fkey` FOREIGN KEY (`task_id`) REFERENCES `bounty_tasks` (`task_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `task_submissions`
--

LOCK TABLES `task_submissions` WRITE;
/*!40000 ALTER TABLE `task_submissions` DISABLE KEYS */;
/*!40000 ALTER TABLE `task_submissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_devices`
--

DROP TABLE IF EXISTS `user_devices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_devices` (
  `device_id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `register_ip` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `device_fingerprint` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`device_id`),
  KEY `idx_user_devices_user` (`user_id`),
  KEY `idx_user_devices_ip` (`register_ip`),
  KEY `idx_user_devices_fingerprint` (`device_fingerprint`),
  CONSTRAINT `user_devices_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_devices`
--

LOCK TABLES `user_devices` WRITE;
/*!40000 ALTER TABLE `user_devices` DISABLE KEYS */;
INSERT INTO `user_devices` VALUES (1,1,'172.18.0.1','ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0','2026-06-03 03:56:50.000');
/*!40000 ALTER TABLE `user_devices` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_purchases`
--

DROP TABLE IF EXISTS `user_purchases`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_purchases` (
  `purchase_id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `item_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'completed',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `source_module` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `source_action` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`purchase_id`),
  KEY `user_purchases_user_id_idx` (`user_id`),
  CONSTRAINT `user_purchases_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_purchases`
--

LOCK TABLES `user_purchases` WRITE;
/*!40000 ALTER TABLE `user_purchases` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_purchases` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `user_id` bigint NOT NULL AUTO_INCREMENT,
  `phone_hash` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` enum('service','resource','both') COLLATE utf8mb4_unicode_ci NOT NULL,
  `city` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `district` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `member_level` enum('free','monthly','yearly','lifetime') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'free',
  `member_expire` datetime(3) DEFAULT NULL,
  `status` enum('active','banned','frozen') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `captain_level` enum('normal','advanced','gold') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'normal',
  `masked_phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nickname` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `invite_code` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_ip` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `task_accept_count` int NOT NULL DEFAULT '0',
  `task_view_count` int NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `avatar` longtext COLLATE utf8mb4_unicode_ci,
  `speak_muted_until` datetime(3) DEFAULT NULL,
  `real_name_verified` tinyint(1) NOT NULL DEFAULT '0',
  `real_name_verified_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `users_invite_code_key` (`invite_code`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'7929521ebdbf8b6f230913a3616b6086fc663e8e72419a5ede8e0383a493ea68','aaaec5c7f89d19932dbf231a17872289:5a905c719a018ef8c90237d61563b7278a1e80daae398da75a59d6e69c6d92acfa4333efb4944d1132ee17b72e59d601a94c5d17a6b5a840525cd41b202d7b54','service',NULL,NULL,'free',NULL,'active','normal','195****1200',NULL,'SHR-VYLFCL','::ffff:172.18.0.1',0,0,'2026-06-03 03:56:50.251',NULL,NULL,0,NULL);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `violation_events`
--

DROP TABLE IF EXISTS `violation_events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `violation_events` (
  `event_id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `scene` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reason` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `decision` enum('warning','mute','ban','unban') COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`event_id`),
  KEY `idx_violation_user_created` (`user_id`,`created_at`),
  CONSTRAINT `violation_events_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `violation_events`
--

LOCK TABLES `violation_events` WRITE;
/*!40000 ALTER TABLE `violation_events` DISABLE KEYS */;
/*!40000 ALTER TABLE `violation_events` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping routines for database 'busy_as_a_shrimp'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-06-03 12:03:33
