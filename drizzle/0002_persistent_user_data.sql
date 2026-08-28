CREATE TABLE `user_data` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `namespace` varchar(80) NOT NULL,
  `payloadJson` text NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `user_data_id` PRIMARY KEY(`id`),
  CONSTRAINT `user_data_owner_namespace_idx` UNIQUE(`userId`,`namespace`)
);
CREATE INDEX `user_data_owner_idx` ON `user_data` (`userId`);
