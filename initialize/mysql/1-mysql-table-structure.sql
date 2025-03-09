-- MySQL dump 10.13  Distrib 9.1.0, for macos14.7 (arm64)
--
-- Host: 127.0.0.1    Database: db_smart_invoice_platform_sd
-- ------------------------------------------------------
-- Server version	8.4.0

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
-- Table structure for table `doc_parser_store_info`
--

CREATE DATABASE IF NOT EXISTS gpt_qa;
USE gpt_qa;


DROP TABLE IF EXISTS `migrations`;
CREATE TABLE `migrations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `timestamp` bigint NOT NULL,
  `name` varchar(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*!40101 SET character_set_client = utf8mb4 */;


DROP TABLE IF EXISTS `t_ai_writing_record`;
CREATE TABLE `t_ai_writing_record` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `user_id` int NOT NULL COMMENT '用户ID',
  `article_id` int DEFAULT NULL COMMENT '文章ID',
  `writing_type` int NOT NULL COMMENT '写作类型',
  `original_text` longtext COMMENT '原文本',
  `generated_text` longtext COMMENT '生成文本',
  `create_time` datetime NOT NULL COMMENT '创建时间',
  `delete_time` datetime DEFAULT NULL COMMENT '删除时间',
  `update_time` datetime NOT NULL COMMENT '更新时间',
  `llm_options` longtext,
  `prompt` longtext,
  PRIMARY KEY (`id`),
  KEY `IDX_user_id` (`user_id`),
  KEY `IDX_article_id` (`article_id`),
  CONSTRAINT `t_ai_writing_record_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `t_user` (`id`),
  CONSTRAINT `t_ai_writing_record_ibfk_2` FOREIGN KEY (`article_id`) REFERENCES `t_article` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=98 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


/*!40101 SET character_set_client = utf8mb4 */;

DROP TABLE IF EXISTS `t_article`;
CREATE TABLE `t_article` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `user_id` int NOT NULL COMMENT '用户ID',
  `title` varchar(255) NOT NULL COMMENT '标题',
  `create_time` datetime NOT NULL COMMENT '创建时间',
  `delete_time` datetime DEFAULT NULL COMMENT '删除时间',
  `update_time` datetime NOT NULL COMMENT '更新时间',
  `image_limit` int DEFAULT NULL COMMENT '图片限制',
  `current_base_version` int DEFAULT NULL COMMENT '当前基础版本号',
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `t_article_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `t_user` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=218 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


/*!40101 SET character_set_client = utf8mb4 */;


DROP TABLE IF EXISTS `t_article_base`;
CREATE TABLE `t_article_base` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `article_id` int NOT NULL COMMENT '文章ID',
  `content` longtext COMMENT '内容',
  `create_time` datetime NOT NULL COMMENT '创建时间',
  `delete_time` datetime DEFAULT NULL COMMENT '删除时间',
  `update_time` datetime NOT NULL COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `IDX_article_id` (`article_id`),
  CONSTRAINT `t_article_base_ibfk_1` FOREIGN KEY (`article_id`) REFERENCES `t_article` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1171 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


/*!40101 SET character_set_client = utf8mb4 */;


DROP TABLE IF EXISTS `t_article_image`;
CREATE TABLE `t_article_image` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `article_id` int NOT NULL COMMENT '文章ID',
  `image_url` varchar(255) NOT NULL COMMENT '图片URL',
  `create_time` datetime NOT NULL COMMENT '创建时间',
  `delete_time` datetime DEFAULT NULL COMMENT '删除时间',
  `update_time` datetime NOT NULL COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `IDX_article_id` (`article_id`),
  CONSTRAINT `t_article_image_ibfk_1` FOREIGN KEY (`article_id`) REFERENCES `t_article` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=42 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


/*!40101 SET character_set_client = utf8mb4 */;


DROP TABLE IF EXISTS `t_article_merge`;
CREATE TABLE `t_article_merge` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `article_id` int NOT NULL COMMENT '文章ID',
  `new_base_version` int DEFAULT NULL COMMENT '新基础版本号',
  `old_base_version` int DEFAULT NULL COMMENT '旧基础版本号',
  `delta` longtext COMMENT '差异',
  `create_time` datetime NOT NULL COMMENT '创建时间',
  `delete_time` datetime DEFAULT NULL COMMENT '删除时间',
  `update_time` datetime NOT NULL COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `IDX_article_id` (`article_id`),
  KEY `new_base_version` (`new_base_version`),
  KEY `old_base_version` (`old_base_version`),
  CONSTRAINT `t_article_merge_ibfk_1` FOREIGN KEY (`article_id`) REFERENCES `t_article` (`id`),
  CONSTRAINT `t_article_merge_ibfk_2` FOREIGN KEY (`new_base_version`) REFERENCES `t_article_base` (`id`),
  CONSTRAINT `t_article_merge_ibfk_3` FOREIGN KEY (`old_base_version`) REFERENCES `t_article_base` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


/*!40101 SET character_set_client = utf8mb4 */;


DROP TABLE IF EXISTS `t_article_version`;
CREATE TABLE `t_article_version` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `article_id` int NOT NULL COMMENT '文章ID',
  `base_version` int DEFAULT NULL COMMENT '基础版本号',
  `delta` longtext COMMENT '差异',
  `create_time` datetime NOT NULL COMMENT '创建时间',
  `delete_time` datetime DEFAULT NULL COMMENT '删除时间',
  `update_time` datetime NOT NULL COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `IDX_article_id` (`article_id`),
  KEY `base_version` (`base_version`),
  CONSTRAINT `t_article_version_ibfk_1` FOREIGN KEY (`article_id`) REFERENCES `t_article` (`id`),
  CONSTRAINT `t_article_version_ibfk_2` FOREIGN KEY (`base_version`) REFERENCES `t_article_base` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


/*!40101 SET character_set_client = utf8mb4 */;


DROP TABLE IF EXISTS `t_chat`;
CREATE TABLE `t_chat` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '自增id',
  `name` varchar(255) NOT NULL COMMENT '对话记录名称',
  `user_id` int NOT NULL COMMENT '用户id',
  `create_time` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `update_time` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
  `delete_time` datetime(6) DEFAULT NULL COMMENT '删除时间',
  `context` json DEFAULT NULL COMMENT '对话关联的文档',
  `type` tinyint(1) NOT NULL DEFAULT '0' COMMENT '问答类型：0. 文档问答；1. 全局global；2. 全局analyst；3. 全局个人',
  PRIMARY KEY (`id`),
  KEY `IDX_70844789d25c8c238fc8a45a70` (`create_time`),
  KEY `IDX_15d83eb496fd7bec7368b30dbf` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=143407 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


/*!40101 SET character_set_client = utf8mb4 */;


DROP TABLE IF EXISTS `t_code`;
CREATE TABLE `t_code` (
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
) ENGINE=InnoDB AUTO_INCREMENT=86 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


/*!40101 SET character_set_client = utf8mb4 */;


DROP TABLE IF EXISTS `t_config`;
CREATE TABLE `t_config` (
  `key` varchar(255) NOT NULL COMMENT '配置key',
  `data` json NOT NULL COMMENT '配置内容',
  `create_time` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `update_time` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
  `delete_time` datetime(6) DEFAULT NULL COMMENT '删除时间',
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


/*!40101 SET character_set_client = utf8mb4 */;


DROP TABLE IF EXISTS `t_content`;
CREATE TABLE `t_content` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '自增id',
  `chat_id` int NOT NULL COMMENT '对话记录id',
  `content` text NOT NULL COMMENT '问/答的内容',
  `type` tinyint NOT NULL COMMENT '类型（提问/回答）',
  `source` text COMMENT '回答内容source',
  `feedback` tinyint DEFAULT NULL COMMENT '用户反馈',
  `create_time` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `update_time` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
  `delete_time` datetime(6) DEFAULT NULL COMMENT '删除时间',
  `user_id` int NOT NULL COMMENT '用户id',
  `extra_data` json DEFAULT NULL COMMENT '问答扩展内容',
  `status` tinyint DEFAULT NULL COMMENT '状态',
  `compliance_check` tinyint DEFAULT NULL COMMENT '合规检查状态：1. 问题通过；2. 问题不通过；3. 答案通过；4. 答案不通过',
  PRIMARY KEY (`id`),
  KEY `IDX_e2d828d9197f55014bd2e8f811` (`create_time`),
  KEY `IDX_2e5d4bfda7b3be7a1e3d8a04ed` (`chat_id`,`user_id`,`type`,`status`),
  KEY `IDX_3g5d4bfda7b3be7a1e3d8a056d` (`type`,`status`,`compliance_check`),
  FULLTEXT KEY `content_fulltext` (`content`) /*!50100 WITH PARSER `ngram` */ 
) ENGINE=InnoDB AUTO_INCREMENT=330044 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


/*!40101 SET character_set_client = utf8mb4 */;


DROP TABLE IF EXISTS `t_document`;
CREATE TABLE `t_document` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '自增id',
  `uuid` varchar(255) NOT NULL COMMENT '文件MD5值',
  `name` varchar(255) NOT NULL COMMENT '文件名',
  `library_id` int NOT NULL COMMENT '知识库id',
  `folder_id` int DEFAULT NULL COMMENT '文件夹id',
  `update_by` int NOT NULL COMMENT '更新人',
  `status` tinyint NOT NULL DEFAULT '0' COMMENT '文档解析状态',
  `message` varchar(1000) DEFAULT NULL COMMENT '文档解析失败message',
  `sort` int DEFAULT NULL COMMENT '文档在文件夹中的顺序',
  `create_time` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `update_time` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
  `delete_time` datetime(6) DEFAULT NULL COMMENT '删除时间',
  `type` tinyint NOT NULL DEFAULT '1' COMMENT '文档类型',
  `parse_time` int DEFAULT NULL COMMENT '解析耗时',
  `parse_start_time` datetime DEFAULT NULL COMMENT '解析开始时间',
  `extra_data` json DEFAULT NULL COMMENT '文档扩展内容',
  `summary` text COMMENT '文档概要',
  `data_company` varchar(255) GENERATED ALWAYS AS (json_unquote(json_extract(`extra_data`,_utf8mb3'$.company'))) VIRTUAL COMMENT 'Company name extracted from extra_data',
  `data_finance_date` varchar(255) GENERATED ALWAYS AS (json_unquote(json_extract(`extra_data`,_utf8mb3'$.financeDate'))) VIRTUAL COMMENT 'Finance date extracted from extra_data',
  `data_finance_type` varchar(255) GENERATED ALWAYS AS (json_unquote(json_extract(`extra_data`,_utf8mb3'$.financeType'))) VIRTUAL COMMENT 'Finance type extracted from extra_data',
  `data_industry` varchar(255) GENERATED ALWAYS AS (json_unquote(json_extract(`extra_data`,_utf8mb3'$.industry'))) VIRTUAL COMMENT 'Industry extracted from extra_data',
  `visibility` tinyint(1) NOT NULL DEFAULT '1' COMMENT '是否可见，1/0',
  PRIMARY KEY (`id`),
  KEY `IDX_e6b217e0ee15ee48df9eb0ca9c` (`sort`),
  KEY `IDX_c34b2233b60ceafbb352cc6841` (`create_time`),
  KEY `IDX_7f794bc7975bd13e6945af7fe9` (`update_time`),
  KEY `IDX_8960855240f8a386eed1d7791c` (`uuid`),
  KEY `IDX_c1ff81156bdaed92e0f0eee509` (`library_id`,`folder_id`,`status`),
  KEY `idx_data_company` (`data_company`),
  KEY `idx_data_finance_date` (`data_finance_date`),
  KEY `idx_data_finance_type` (`data_finance_type`),
  KEY `idx_data_industry` (`data_industry`)
) ENGINE=InnoDB AUTO_INCREMENT=3855 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


/*!40101 SET character_set_client = utf8mb4 */;


DROP TABLE IF EXISTS `t_folder`;
CREATE TABLE `t_folder` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '自增id',
  `name` varchar(255) NOT NULL COMMENT '文件夹名称',
  `user_id` int NOT NULL COMMENT '用户id',
  `library_id` int NOT NULL,
  `sort` int DEFAULT NULL COMMENT '文档在知识库中的顺序',
  `create_time` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `update_time` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
  `delete_time` datetime(6) DEFAULT NULL COMMENT '删除时间',
  `parent_id` int DEFAULT NULL COMMENT '上级目录',
  PRIMARY KEY (`id`),
  KEY `IDX_bfbecd046981b82f2b31c274c8` (`sort`),
  KEY `IDX_1a0208580c307ecb1ee3f26c26` (`create_time`),
  KEY `IDX_22b0ed51f576703a3d447b4c33` (`update_time`)
) ENGINE=InnoDB AUTO_INCREMENT=436 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


/*!40101 SET character_set_client = utf8mb4 */;


DROP TABLE IF EXISTS `t_hotspots`;
CREATE TABLE `t_hotspots` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '自增id',
  `spots` json DEFAULT NULL COMMENT '热点内容',
  `create_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `delete_time` timestamp NULL DEFAULT NULL COMMENT '删除时间',
  PRIMARY KEY (`id`),
  KEY `IDX_create_time` (`create_time`),
  KEY `IDX_update_time` (`update_time`)
) ENGINE=InnoDB AUTO_INCREMENT=100 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='热点';


/*!40101 SET character_set_client = utf8mb4 */;


DROP TABLE IF EXISTS `t_library`;
CREATE TABLE `t_library` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '自增id',
  `name` varchar(255) NOT NULL COMMENT '知识库名称',
  `note` varchar(10000) NOT NULL COMMENT '知识库描述',
  `type` tinyint NOT NULL COMMENT '知识库类型',
  `create_time` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `update_time` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
  `delete_time` datetime(6) DEFAULT NULL COMMENT '删除时间',
  `summary` varchar(255) DEFAULT NULL COMMENT '描述的摘要',
  `user_id` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=74 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


/*!40101 SET character_set_client = utf8mb4 */;


DROP TABLE IF EXISTS `t_log`;
CREATE TABLE `t_log` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '自增id',
  `data` json NOT NULL COMMENT '日志内容',
  `type` tinyint NOT NULL COMMENT '日志类型',
  `user_id` int DEFAULT NULL,
  `create_time` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `update_time` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
  `delete_time` datetime(6) DEFAULT NULL COMMENT '删除时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3194 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


/*!40101 SET character_set_client = utf8mb4 */;


DROP TABLE IF EXISTS `t_recycle`;
CREATE TABLE `t_recycle` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '自增id',
  `source` json NOT NULL COMMENT '原位置',
  `expiry` datetime NOT NULL COMMENT '有效期',
  `create_time` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `update_time` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
  `delete_time` datetime(6) DEFAULT NULL COMMENT '删除时间',
  `user_id` int NOT NULL COMMENT '用户id',
  PRIMARY KEY (`id`),
  KEY `IDX_b2b11215a02dea862a0bc7d2d7` (`create_time`)
) ENGINE=InnoDB AUTO_INCREMENT=1880 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


/*!40101 SET character_set_client = utf8mb4 */;


DROP TABLE IF EXISTS `t_token`;
CREATE TABLE `t_token` (
  `token` varchar(255) NOT NULL COMMENT '登录token',
  `user_id` int NOT NULL COMMENT '用户id',
  `expiry` datetime NOT NULL COMMENT '有效期',
  `create_time` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  PRIMARY KEY (`token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


/*!40101 SET character_set_client = utf8mb4 */;

DROP TABLE IF EXISTS `t_user`;
CREATE TABLE `t_user` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '自增id',
  `account` varchar(255) NOT NULL COMMENT '帐号',
  `password` varchar(255) DEFAULT NULL COMMENT '加密后的密码',
  `role` tinyint NOT NULL COMMENT '用户角色',
  `salt` varchar(255) NOT NULL COMMENT '加密盐',
  `create_time` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `update_time` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
  `delete_time` datetime(6) DEFAULT NULL COMMENT '删除时间',
  `name` varchar(255) DEFAULT NULL COMMENT '用户名称',
  `email` varchar(255) DEFAULT NULL COMMENT '邮箱',
  `mobile` varchar(255) DEFAULT NULL COMMENT '手机号',
  `avatar` varchar(255) DEFAULT NULL COMMENT '头像',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '用户状态',
  `mobile_area_code` varchar(255) DEFAULT NULL COMMENT '手机号国际区号',
  `company` varchar(255) DEFAULT NULL COMMENT '公司',
  `login_failed_count` int DEFAULT NULL COMMENT '登录连续失败次数',
  `openid` varchar(50) DEFAULT NULL COMMENT 'Textin 用户 openid',
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_4ab2df0a57a74fdf904e0e2708` (`account`),
  UNIQUE KEY `IDX_e12875dfb3b1d92d7d7c5377e2` (`email`),
  UNIQUE KEY `IDX_29fd51e9cf9241d022c5a4e02e` (`mobile`),
  UNIQUE KEY `IDX_64ea97f70d9e4f87b9a067b0cf` (`openid`),
  KEY `IDX_fb4546ebca5220c726ad6d96f4` (`create_time`)
) ENGINE=InnoDB AUTO_INCREMENT=73 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
