CREATE DATABASE `gpt_qa` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;

-- db_gpt_qa.chat definition

CREATE TABLE `chat` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '自增id',
  `name` varchar(255) NOT NULL COMMENT '对话记录名称',
  `context` json DEFAULT NULL COMMENT '对话关联的文档',
  `user_id` int NOT NULL COMMENT '用户id',
  `type` int NOT NULL DEFAULT '0' COMMENT '问答类型：0. 文档问答；1. 全局global；2. 全局analyst；3. 全局个人',
  `create_time` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `update_time` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
  `delete_time` datetime(6) DEFAULT NULL COMMENT '删除时间',
  PRIMARY KEY (`id`),
  KEY `IDX_15d83eb496fd7bec7368b30dbf` (`user_id`),
  KEY `IDX_70844789d25c8c238fc8a45a70` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- db_gpt_qa.code definition

CREATE TABLE `code` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '自增id',
  `code` varchar(255) NOT NULL COMMENT '验证码',
  `type` tinyint NOT NULL COMMENT '验证码类型',
  `user` varchar(255) NOT NULL COMMENT '用户标识',
  `expiry` datetime NOT NULL COMMENT '有效期',
  `response` varchar(255) DEFAULT NULL COMMENT '验证码接口的响应',
  `create_time` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `update_time` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
  `delete_time` datetime(6) DEFAULT NULL COMMENT '删除时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- db_gpt_qa.config definition

CREATE TABLE `config` (
  `key` varchar(255) NOT NULL COMMENT '配置key',
  `data` json NOT NULL COMMENT '配置内容',
  `create_time` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `update_time` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
  `delete_time` datetime(6) DEFAULT NULL COMMENT '删除时间',
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- db_gpt_qa.content definition

CREATE TABLE `content` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '自增id',
  `chat_id` int NOT NULL COMMENT '对话记录id',
  `user_id` int NOT NULL COMMENT '用户id',
  `content` text NOT NULL COMMENT '问/答的内容',
  `type` tinyint NOT NULL COMMENT '类型（提问/回答）',
  `source` text COMMENT '回答内容source',
  `feedback` tinyint DEFAULT NULL COMMENT '用户反馈',
  `status` tinyint DEFAULT NULL COMMENT '状态',
  `compliance_check` tinyint DEFAULT NULL COMMENT '合规检查状态：1. 问题通过；2. 问题不通过；3. 答案通过；4. 答案不通过',
  `extra_data` json DEFAULT NULL COMMENT '问答扩展内容',
  `create_time` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `update_time` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
  `delete_time` datetime(6) DEFAULT NULL COMMENT '删除时间',
  PRIMARY KEY (`id`),
  KEY `IDX_e2d828d9197f55014bd2e8f811` (`create_time`),
  KEY `IDX_2e5d4bfda7b3be7a1e3d8a04ed` (`chat_id`,`user_id`,`type`,`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- db_gpt_qa.document definition

CREATE TABLE `document` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '自增id',
  `uuid` varchar(255) NOT NULL COMMENT '文件MD5值',
  `name` varchar(255) NOT NULL COMMENT '文件名',
  `library_id` int NOT NULL COMMENT '知识库id',
  `folder_id` int DEFAULT NULL COMMENT '文件夹id',
  `extra_data` json DEFAULT NULL COMMENT '文档扩展内容',
  `update_by` int NOT NULL COMMENT '更新人',
  `status` tinyint NOT NULL DEFAULT '0' COMMENT '文档解析状态',
  `visibility` tinyint NOT NULL DEFAULT '1' COMMENT '文档是否可见',
  `message` varchar(1000) DEFAULT NULL COMMENT '文档解析失败message',
  `summary` text COMMENT '文档概要',
  `sort` int DEFAULT NULL COMMENT '文档在文件夹中的顺序',
  `type` tinyint NOT NULL DEFAULT '1' COMMENT '文档类型',
  `parse_time` int DEFAULT NULL COMMENT '解析耗时',
  `parse_start_time` datetime DEFAULT NULL COMMENT '解析开始时间',
  `create_time` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `update_time` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
  `delete_time` datetime(6) DEFAULT NULL COMMENT '删除时间',
  PRIMARY KEY (`id`),
  KEY `IDX_8960855240f8a386eed1d7791c` (`uuid`),
  KEY `IDX_e6b217e0ee15ee48df9eb0ca9c` (`sort`),
  KEY `IDX_c34b2233b60ceafbb352cc6841` (`create_time`),
  KEY `IDX_7f794bc7975bd13e6945af7fe9` (`update_time`),
  KEY `IDX_c1ff81156bdaed92e0f0eee509` (`library_id`,`folder_id`,`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- db_gpt_qa.folder definition

CREATE TABLE `folder` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '自增id',
  `name` varchar(255) NOT NULL COMMENT '文件夹名称',
  `user_id` int NOT NULL COMMENT '用户id',
  `library_id` int NOT NULL,
  `parent_id` int DEFAULT NULL COMMENT '上级目录',
  `sort` int DEFAULT NULL COMMENT '文档在知识库中的顺序',
  `create_time` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `update_time` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
  `delete_time` datetime(6) DEFAULT NULL COMMENT '删除时间',
  PRIMARY KEY (`id`),
  KEY `IDX_bfbecd046981b82f2b31c274c8` (`sort`),
  KEY `IDX_1a0208580c307ecb1ee3f26c26` (`create_time`),
  KEY `IDX_22b0ed51f576703a3d447b4c33` (`update_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- db_gpt_qa.hotspots definition

CREATE TABLE `hotspots` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '自增id',
  `spots` json DEFAULT NULL COMMENT '热点内容',
  `create_time` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `update_time` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
  `delete_time` datetime(6) DEFAULT NULL COMMENT '删除时间',
  PRIMARY KEY (`id`),
  KEY `IDX_20b63609dcf72febe96e4a42db` (`create_time`),
  KEY `IDX_7d97030912e2f9aa1e6abe84e8` (`update_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- db_gpt_qa.library definition

CREATE TABLE `library` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '自增id',
  `name` varchar(255) NOT NULL COMMENT '知识库名称',
  `note` varchar(10000) NOT NULL COMMENT '知识库描述',
  `summary` varchar(255) DEFAULT NULL COMMENT '描述的摘要',
  `type` tinyint NOT NULL COMMENT '知识库类型',
  `user_id` int DEFAULT NULL,
  `create_time` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `update_time` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
  `delete_time` datetime(6) DEFAULT NULL COMMENT '删除时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- db_gpt_qa.log definition

CREATE TABLE `log` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '自增id',
  `data` json NOT NULL COMMENT '日志内容',
  `type` tinyint NOT NULL COMMENT '日志类型',
  `user_id` int DEFAULT NULL,
  `create_time` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `update_time` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
  `delete_time` datetime(6) DEFAULT NULL COMMENT '删除时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- db_gpt_qa.recycle definition

CREATE TABLE `recycle` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '自增id',
  `source` json NOT NULL COMMENT '原位置',
  `expiry` datetime NOT NULL COMMENT '有效期',
  `user_id` int NOT NULL COMMENT '用户id',
  `create_time` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `update_time` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
  `delete_time` datetime(6) DEFAULT NULL COMMENT '删除时间',
  PRIMARY KEY (`id`),
  KEY `IDX_b2b11215a02dea862a0bc7d2d7` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- db_gpt_qa.token definition

CREATE TABLE `token` (
  `token` varchar(255) NOT NULL COMMENT '登录token',
  `user_id` int NOT NULL COMMENT '用户id',
  `expiry` datetime NOT NULL COMMENT '有效期',
  `create_time` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  PRIMARY KEY (`token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- db_gpt_qa.`user` definition

CREATE TABLE `user` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '自增id',
  `account` varchar(255) NOT NULL COMMENT '帐号',
  `password` varchar(255) DEFAULT NULL COMMENT '加密后的密码',
  `login_failed_count` int DEFAULT NULL COMMENT '登录失败次数',
  `name` varchar(255) DEFAULT NULL COMMENT '用户名称',
  `email` varchar(255) DEFAULT NULL COMMENT '邮箱',
  `mobile` varchar(255) DEFAULT NULL COMMENT '手机号',
  `openid` varchar(255) DEFAULT NULL COMMENT 'textin openid',
  `mobile_area_code` varchar(255) DEFAULT NULL COMMENT '手机号国际区号',
  `avatar` varchar(255) DEFAULT NULL COMMENT '头像',
  `company` varchar(255) DEFAULT NULL COMMENT '公司',
  `role` tinyint NOT NULL COMMENT '用户角色',
  `salt` varchar(255) NOT NULL COMMENT '加密盐',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '用户状态',
  `create_time` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `update_time` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
  `delete_time` datetime(6) DEFAULT NULL COMMENT '删除时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_4ab2df0a57a74fdf904e0e2708` (`account`),
  UNIQUE KEY `IDX_e12875dfb3b1d92d7d7c5377e2` (`email`),
  UNIQUE KEY `IDX_29fd51e9cf9241d022c5a4e02e` (`mobile`),
  UNIQUE KEY `IDX_0fda9260b0aaff9a5b8f38ac16` (`openid`),
  KEY `IDX_fb4546ebca5220c726ad6d96f4` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- 初始化数据
INSERT INTO `user` (`id`, `account`, `password`, `role`, `salt`) VALUES (1, 'admin', 'a40d5148b1755ce0b095de3b8a0a0b7827dd0e84b6650dfc7f6046da2ed60612', 0, '565fb07c-d5e9-4187-9035-cd6b203692fb');
INSERT INTO `library` (`id`, `name`, `note`, `type`, `user_id`) VALUES (1, '公开知识库', '系统自动创建的公开知识库', 0, null);
INSERT INTO `library` (`id`, `name`, `note`, `type`, `user_id`) VALUES (2, '我的知识库', '系统自动创建的自定义知识库', 10, 1);
INSERT INTO `folder` (`id`, `name`, `library_id`, `user_id`, `sort`) VALUES (1, '默认文件夹', 2, 1, 1);
