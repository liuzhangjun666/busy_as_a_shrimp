ALTER TABLE `bounty_tasks`
  ADD COLUMN `publisher_id` BIGINT NULL,
  ADD COLUMN `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  ADD COLUMN `selected_submission_id` BIGINT NULL,
  ADD COLUMN `finished_at` DATETIME(3) NULL,
  ADD COLUMN `cancelled_at` DATETIME(3) NULL;

ALTER TABLE `task_submissions`
  ADD COLUMN `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  ADD COLUMN `publisher_agreed_at` DATETIME(3) NULL,
  ADD COLUMN `claimer_agreed_at` DATETIME(3) NULL,
  ADD COLUMN `contact_unlocked_at` DATETIME(3) NULL,
  ADD COLUMN `reward_granted_at` DATETIME(3) NULL;

CREATE INDEX `bounty_tasks_publisher_id_idx` ON `bounty_tasks`(`publisher_id`);

ALTER TABLE `bounty_tasks`
  ADD CONSTRAINT `bounty_tasks_publisher_id_fkey`
  FOREIGN KEY (`publisher_id`) REFERENCES `users`(`user_id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
