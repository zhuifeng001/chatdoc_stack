
USE gpt_qa;

-- LOCK TABLES `system_oauth2_client` WRITE;
-- INSERT INTO `system_oauth2_client` VALUES (1,'default','admin','票据自动化平台','','',0,1800000,43200000,'','[\"code\"]',NULL,NULL,NULL,NULL,NULL,0,1,1,'2025-02-13 08:32:32','2025-02-13 08:32:32');
-- UNLOCK TABLES;

-- 初始化数据
INSERT INTO `t_user` (`id`, `account`, `password`, `role`, `salt`) VALUES (1, 'admin', 'a40d5148b1755ce0b095de3b8a0a0b7827dd0e84b6650dfc7f6046da2ed60612', 0, '565fb07c-d5e9-4187-9035-cd6b203692fb');
INSERT INTO `t_library` (`id`, `name`, `note`, `type`, `user_id`) VALUES (1, '公开知识库', '系统自动创建的公开知识库', 0, null);
INSERT INTO `t_library` (`id`, `name`, `note`, `type`, `user_id`) VALUES (2, '我的知识库', '系统自动创建的自定义知识库', 10, 1);
INSERT INTO `t_folder` (`id`, `name`, `library_id`, `user_id`, `sort`) VALUES (1, '默认文件夹', 2, 1, 1);