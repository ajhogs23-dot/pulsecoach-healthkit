CREATE TABLE `activity_summaries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`activityDate` varchar(10) NOT NULL,
	`steps` int NOT NULL DEFAULT 0,
	`distanceMeters` int NOT NULL DEFAULT 0,
	`activeMinutes` int NOT NULL DEFAULT 0,
	`activeCalories` int NOT NULL DEFAULT 0,
	`source` varchar(40) NOT NULL,
	`externalId` varchar(120),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `activity_summaries_id` PRIMARY KEY(`id`),
	CONSTRAINT `activity_user_date_source_idx` UNIQUE(`userId`,`activityDate`,`source`)
);
--> statement-breakpoint
CREATE TABLE `challenge_participants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`challengeId` int NOT NULL,
	`userId` int NOT NULL,
	`status` enum('invited','accepted','declined') NOT NULL DEFAULT 'invited',
	`finalScore` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `challenge_participants_id` PRIMARY KEY(`id`),
	CONSTRAINT `challenge_participant_idx` UNIQUE(`challengeId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `challenges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`creatorId` int NOT NULL,
	`title` varchar(160) NOT NULL,
	`metric` varchar(50) NOT NULL,
	`duration` enum('day','week','month') NOT NULL,
	`blind` boolean NOT NULL DEFAULT true,
	`startsAt` timestamp NOT NULL,
	`endsAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `challenges_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `feedback` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`category` enum('feature','issue','change') NOT NULL,
	`message` text NOT NULL,
	`contactAllowed` boolean NOT NULL DEFAULT false,
	`status` enum('new','reviewing','planned','closed') NOT NULL DEFAULT 'new',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `feedback_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `foods` (
	`id` int AUTO_INCREMENT NOT NULL,
	`barcode` varchar(64),
	`name` varchar(255) NOT NULL,
	`source` varchar(80) NOT NULL,
	`nutritionJson` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `foods_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `friendships` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requesterId` int NOT NULL,
	`addresseeId` int NOT NULL,
	`status` enum('pending','accepted','declined','blocked','cancelled') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `friendships_id` PRIMARY KEY(`id`),
	CONSTRAINT `friendships_pair_idx` UNIQUE(`requesterId`,`addresseeId`)
);
--> statement-breakpoint
CREATE TABLE `goals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`currentWeight` varchar(32),
	`goalWeight` varchar(32),
	`pace` enum('cautious','steady','slower'),
	`primaryGoal` varchar(120),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `goals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `health_permissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`provider` varchar(40) NOT NULL,
	`categories` text NOT NULL,
	`grantedAt` timestamp,
	`revokedAt` timestamp,
	CONSTRAINT `health_permissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `health_permissions_user_provider_idx` UNIQUE(`userId`,`provider`)
);
--> statement-breakpoint
CREATE TABLE `meals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`foodId` int,
	`name` varchar(160) NOT NULL,
	`portionsJson` text,
	`loggedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `meals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `privacy_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`routeRetention` enum('one_day','seven_days','thirty_days','manual') NOT NULL DEFAULT 'one_day',
	`allDayBreadcrumbs` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `privacy_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `privacy_user_idx` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`username` varchar(40) NOT NULL,
	`avatarUrl` varchar(500),
	`unitSystem` enum('metric','imperial') NOT NULL DEFAULT 'metric',
	`timezone` varchar(64) NOT NULL DEFAULT 'Australia/Sydney',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `profiles_user_idx` UNIQUE(`userId`),
	CONSTRAINT `profiles_username_idx` UNIQUE(`username`)
);
--> statement-breakpoint
CREATE TABLE `route_points` (
	`id` int AUTO_INCREMENT NOT NULL,
	`routeId` int NOT NULL,
	`latitude` varchar(32) NOT NULL,
	`longitude` varchar(32) NOT NULL,
	`recordedAt` timestamp NOT NULL,
	CONSTRAINT `route_points_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `routes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`sessionId` int,
	`routeDate` varchar(10) NOT NULL,
	`isAllDay` boolean NOT NULL DEFAULT false,
	`retention` varchar(20) NOT NULL,
	`deletedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `routes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `share_permissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`friendId` int NOT NULL,
	`category` varchar(60) NOT NULL,
	`enabled` boolean NOT NULL DEFAULT false,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `share_permissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `share_pair_category_idx` UNIQUE(`ownerId`,`friendId`,`category`)
);
--> statement-breakpoint
CREATE TABLE `supplement_schedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`supplementId` int NOT NULL,
	`timing` varchar(40) NOT NULL,
	`reminderEnabled` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `supplement_schedules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `supplements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`barcode` varchar(64),
	`name` varchar(160) NOT NULL,
	`labelJson` text,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `supplements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workout_plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`daysPerWeek` int NOT NULL,
	`focusJson` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workout_plans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workout_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`activityType` varchar(40),
	`title` varchar(160) NOT NULL,
	`status` enum('planned','active','completed','skipped') NOT NULL DEFAULT 'planned',
	`startedAt` timestamp,
	`finishedAt` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `workout_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workout_sets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`exerciseName` varchar(160) NOT NULL,
	`weight` varchar(32),
	`reps` int,
	`rpe` varchar(16),
	`restSeconds` int,
	`completedAt` timestamp,
	CONSTRAINT `workout_sets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `challenges_creator_idx` ON `challenges` (`creatorId`);--> statement-breakpoint
CREATE INDEX `challenges_ends_idx` ON `challenges` (`endsAt`);--> statement-breakpoint
CREATE INDEX `feedback_user_idx` ON `feedback` (`userId`);--> statement-breakpoint
CREATE INDEX `feedback_status_idx` ON `feedback` (`status`);--> statement-breakpoint
CREATE INDEX `foods_barcode_idx` ON `foods` (`barcode`);--> statement-breakpoint
CREATE INDEX `friendships_addressee_idx` ON `friendships` (`addresseeId`);--> statement-breakpoint
CREATE INDEX `goals_user_idx` ON `goals` (`userId`);--> statement-breakpoint
CREATE INDEX `meals_user_idx` ON `meals` (`userId`);--> statement-breakpoint
CREATE INDEX `route_points_route_idx` ON `route_points` (`routeId`);--> statement-breakpoint
CREATE INDEX `routes_user_date_idx` ON `routes` (`userId`,`routeDate`);--> statement-breakpoint
CREATE INDEX `supplement_schedules_supplement_idx` ON `supplement_schedules` (`supplementId`);--> statement-breakpoint
CREATE INDEX `supplements_user_idx` ON `supplements` (`userId`);--> statement-breakpoint
CREATE INDEX `workout_plans_user_idx` ON `workout_plans` (`userId`);--> statement-breakpoint
CREATE INDEX `workout_sessions_user_idx` ON `workout_sessions` (`userId`);--> statement-breakpoint
CREATE INDEX `workout_sessions_status_idx` ON `workout_sessions` (`status`);--> statement-breakpoint
CREATE INDEX `workout_sets_session_idx` ON `workout_sets` (`sessionId`);