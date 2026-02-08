-- arnnect.BATCH_JOB_EXECUTION_SEQ definition

CREATE TABLE `BATCH_JOB_EXECUTION_SEQ` (
  `ID` bigint NOT NULL,
  `UNIQUE_KEY` char(1) COLLATE utf8mb4_unicode_ci NOT NULL,
  UNIQUE KEY `UNIQUE_KEY_UN` (`UNIQUE_KEY`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- arnnect.BATCH_JOB_INSTANCE definition

CREATE TABLE `BATCH_JOB_INSTANCE` (
  `JOB_INSTANCE_ID` bigint NOT NULL,
  `VERSION` bigint DEFAULT NULL,
  `JOB_NAME` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `JOB_KEY` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`JOB_INSTANCE_ID`),
  UNIQUE KEY `JOB_INST_UN` (`JOB_NAME`,`JOB_KEY`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- arnnect.BATCH_JOB_SEQ definition

CREATE TABLE `BATCH_JOB_SEQ` (
  `ID` bigint NOT NULL,
  `UNIQUE_KEY` char(1) COLLATE utf8mb4_unicode_ci NOT NULL,
  UNIQUE KEY `UNIQUE_KEY_UN` (`UNIQUE_KEY`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- arnnect.BATCH_STEP_EXECUTION_SEQ definition

CREATE TABLE `BATCH_STEP_EXECUTION_SEQ` (
  `ID` bigint NOT NULL,
  `UNIQUE_KEY` char(1) COLLATE utf8mb4_unicode_ci NOT NULL,
  UNIQUE KEY `UNIQUE_KEY_UN` (`UNIQUE_KEY`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- arnnect.art_field definition

CREATE TABLE `art_field` (
  `field_id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(20) NOT NULL,
  PRIMARY KEY (`field_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- arnnect.collect_book definition

CREATE TABLE `collect_book` (
  `user_ticket_id` bigint NOT NULL AUTO_INCREMENT,
  `collect_rank` bigint DEFAULT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `member_id` bigint NOT NULL,
  `ticket_id` bigint NOT NULL,
  PRIMARY KEY (`user_ticket_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- arnnect.comment definition

CREATE TABLE `comment` (
  `comment_id` bigint NOT NULL AUTO_INCREMENT,
  `content` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` datetime(6) DEFAULT NULL,
  `is_deleted` tinyint DEFAULT '0',
  `member_id` bigint NOT NULL,
  `parent_comment_id` int DEFAULT NULL,
  `target_id` int NOT NULL,
  `target_type` enum('REVIEW','ARTWORK') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`comment_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- arnnect.follow definition

CREATE TABLE `follow` (
  `source_id` bigint NOT NULL,
  `target_id` bigint NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`source_id`,`target_id`),
  KEY `follow_member_FK_1` (`target_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- arnnect.`member` definition

CREATE TABLE `member` (
  `member_id` bigint NOT NULL AUTO_INCREMENT,
  `member_uuid` varchar(36) NOT NULL,
  `role` enum('GENERAL','ARTIST') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT 'GENERAL',
  `name` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `birth` date NOT NULL,
  `nickname` varchar(50) NOT NULL,
  `origin_profile_image_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `saved_profile_image_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `is_agree` tinyint(1) NOT NULL,
  `is_deleted` tinyint(1) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  `profile_image` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  PRIMARY KEY (`member_id`),
  UNIQUE KEY `member_unique` (`email`),
  UNIQUE KEY `member_unique_1` (`phone`),
  UNIQUE KEY `member_unique_2` (`member_uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- arnnect.member_mbti definition

CREATE TABLE `member_mbti` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) DEFAULT NULL,
  `member_uuid` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `type` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- arnnect.review definition

CREATE TABLE `review` (
  `review_id` bigint NOT NULL AUTO_INCREMENT COMMENT '감상평 ID',
  `artwork_id` bigint DEFAULT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` datetime(6) DEFAULT NULL,
  `is_deleted` tinyint DEFAULT '0',
  `member_id` bigint NOT NULL,
  `origin_image_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `saved_image_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `title` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`review_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- arnnect.tag definition

CREATE TABLE `tag` (
  `tag_id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`tag_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- arnnect.user_action_log definition

CREATE TABLE `user_action_log` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `artwork_id` bigint DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `action` enum('COMMENT','LIKE','REVIEW_WRITE','SELECT','STAY','VIEW') NOT NULL,
  `member_uuid` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- arnnect.user_activity_summary definition

CREATE TABLE `user_activity_summary` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `comment_cnt` bigint DEFAULT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `favorite_cnt` bigint DEFAULT NULL,
  `member_uuid` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- arnnect.user_artist_score definition

CREATE TABLE `user_artist_score` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `artist_uuid` varchar(255) DEFAULT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `member_uuid` varchar(255) DEFAULT NULL,
  `score` bigint DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- arnnect.user_artwork_ranking definition

CREATE TABLE `user_artwork_ranking` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `artwork_id` bigint DEFAULT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `member_uuid` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ranking` bigint DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- arnnect.user_artwork_score definition

CREATE TABLE `user_artwork_score` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `artwork_id` bigint DEFAULT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `member_uuid` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `score` bigint DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- arnnect.user_genre_score definition

CREATE TABLE `user_genre_score` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) DEFAULT NULL,
  `genre_id` bigint DEFAULT NULL,
  `member_uuid` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `score` bigint DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- arnnect.user_tag_score definition

CREATE TABLE `user_tag_score` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) DEFAULT NULL,
  `member_uuid` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `score` bigint DEFAULT NULL,
  `tag_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- arnnect.BATCH_JOB_EXECUTION definition

CREATE TABLE `BATCH_JOB_EXECUTION` (
  `JOB_EXECUTION_ID` bigint NOT NULL,
  `VERSION` bigint DEFAULT NULL,
  `JOB_INSTANCE_ID` bigint NOT NULL,
  `CREATE_TIME` datetime(6) NOT NULL,
  `START_TIME` datetime(6) DEFAULT NULL,
  `END_TIME` datetime(6) DEFAULT NULL,
  `STATUS` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `EXIT_CODE` varchar(2500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `EXIT_MESSAGE` varchar(2500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `LAST_UPDATED` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`JOB_EXECUTION_ID`),
  KEY `JOB_INST_EXEC_FK` (`JOB_INSTANCE_ID`),
  CONSTRAINT `JOB_INST_EXEC_FK` FOREIGN KEY (`JOB_INSTANCE_ID`) REFERENCES `BATCH_JOB_INSTANCE` (`JOB_INSTANCE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- arnnect.BATCH_JOB_EXECUTION_CONTEXT definition

CREATE TABLE `BATCH_JOB_EXECUTION_CONTEXT` (
  `JOB_EXECUTION_ID` bigint NOT NULL,
  `SHORT_CONTEXT` varchar(2500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `SERIALIZED_CONTEXT` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`JOB_EXECUTION_ID`),
  CONSTRAINT `JOB_EXEC_CTX_FK` FOREIGN KEY (`JOB_EXECUTION_ID`) REFERENCES `BATCH_JOB_EXECUTION` (`JOB_EXECUTION_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- arnnect.BATCH_JOB_EXECUTION_PARAMS definition

CREATE TABLE `BATCH_JOB_EXECUTION_PARAMS` (
  `JOB_EXECUTION_ID` bigint NOT NULL,
  `PARAMETER_NAME` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `PARAMETER_TYPE` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `PARAMETER_VALUE` varchar(2500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `IDENTIFYING` char(1) COLLATE utf8mb4_unicode_ci NOT NULL,
  KEY `JOB_EXEC_PARAMS_FK` (`JOB_EXECUTION_ID`),
  CONSTRAINT `JOB_EXEC_PARAMS_FK` FOREIGN KEY (`JOB_EXECUTION_ID`) REFERENCES `BATCH_JOB_EXECUTION` (`JOB_EXECUTION_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- arnnect.BATCH_STEP_EXECUTION definition

CREATE TABLE `BATCH_STEP_EXECUTION` (
  `STEP_EXECUTION_ID` bigint NOT NULL,
  `VERSION` bigint NOT NULL,
  `STEP_NAME` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `JOB_EXECUTION_ID` bigint NOT NULL,
  `CREATE_TIME` datetime(6) NOT NULL,
  `START_TIME` datetime(6) DEFAULT NULL,
  `END_TIME` datetime(6) DEFAULT NULL,
  `STATUS` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `COMMIT_COUNT` bigint DEFAULT NULL,
  `READ_COUNT` bigint DEFAULT NULL,
  `FILTER_COUNT` bigint DEFAULT NULL,
  `WRITE_COUNT` bigint DEFAULT NULL,
  `READ_SKIP_COUNT` bigint DEFAULT NULL,
  `WRITE_SKIP_COUNT` bigint DEFAULT NULL,
  `PROCESS_SKIP_COUNT` bigint DEFAULT NULL,
  `ROLLBACK_COUNT` bigint DEFAULT NULL,
  `EXIT_CODE` varchar(2500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `EXIT_MESSAGE` varchar(2500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `LAST_UPDATED` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`STEP_EXECUTION_ID`),
  KEY `JOB_EXEC_STEP_FK` (`JOB_EXECUTION_ID`),
  CONSTRAINT `JOB_EXEC_STEP_FK` FOREIGN KEY (`JOB_EXECUTION_ID`) REFERENCES `BATCH_JOB_EXECUTION` (`JOB_EXECUTION_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- arnnect.BATCH_STEP_EXECUTION_CONTEXT definition

CREATE TABLE `BATCH_STEP_EXECUTION_CONTEXT` (
  `STEP_EXECUTION_ID` bigint NOT NULL,
  `SHORT_CONTEXT` varchar(2500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `SERIALIZED_CONTEXT` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`STEP_EXECUTION_ID`),
  CONSTRAINT `STEP_EXEC_CTX_FK` FOREIGN KEY (`STEP_EXECUTION_ID`) REFERENCES `BATCH_STEP_EXECUTION` (`STEP_EXECUTION_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- arnnect.art_genre definition

CREATE TABLE `art_genre` (
  `genre_id` int NOT NULL AUTO_INCREMENT,
  `field_id` int NOT NULL,
  `name` varchar(30) NOT NULL,
  `e_name` varchar(30) NOT NULL,
  PRIMARY KEY (`genre_id`),
  KEY `art_genre_art_field_FK` (`field_id`),
  CONSTRAINT `art_genre_art_field_FK` FOREIGN KEY (`field_id`) REFERENCES `art_field` (`field_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- arnnect.artist definition

CREATE TABLE `artist` (
  `artist_id` bigint NOT NULL AUTO_INCREMENT,
  `member_id` bigint NOT NULL,
  `is_new` bit(1) DEFAULT NULL,
  `field_id` int NOT NULL,
  `genre_id` int NOT NULL,
  `debut_year` int DEFAULT NULL,
  `sns_page` varchar(500) DEFAULT NULL,
  `document` varchar(255) DEFAULT NULL,
  `affiliation` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `is_verified` tinyint(1) DEFAULT NULL,
  `introduction` text,
  PRIMARY KEY (`artist_id`),
  KEY `artist_art_field_FK` (`field_id`),
  KEY `artist_art_genre_FK` (`genre_id`),
  KEY `artist_member_FK` (`member_id`),
  CONSTRAINT `artist_art_field_FK` FOREIGN KEY (`field_id`) REFERENCES `art_field` (`field_id`),
  CONSTRAINT `artist_art_genre_FK` FOREIGN KEY (`genre_id`) REFERENCES `art_genre` (`genre_id`),
  CONSTRAINT `artist_member_FK` FOREIGN KEY (`member_id`) REFERENCES `member` (`member_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- arnnect.artwork definition

CREATE TABLE `artwork` (
  `artwork_id` bigint NOT NULL AUTO_INCREMENT COMMENT '작품 ID',
  `member_id` bigint NOT NULL,
  `field_id` int DEFAULT NULL COMMENT '분야',
  `genre_id` int NOT NULL COMMENT '장르',
  `title` varchar(100) NOT NULL COMMENT '작품명',
  `description` text COMMENT '작품설명',
  `production_date` date DEFAULT NULL COMMENT '제작연도',
  `size` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '작품크기',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '등록일',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '수정일',
  `is_deleted` bit(1) DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `origin_image_name` varchar(255) NOT NULL COMMENT '원본 이미지 이름',
  `saved_image_name` varchar(255) NOT NULL COMMENT '저장된 이미지 이름',
  PRIMARY KEY (`artwork_id`),
  KEY `artwork_art_genre_FK` (`genre_id`),
  KEY `artwork_art_field_FK` (`field_id`),
  KEY `artwork_member_FK` (`member_id`),
  CONSTRAINT `artwork_art_field_FK` FOREIGN KEY (`field_id`) REFERENCES `art_field` (`field_id`),
  CONSTRAINT `artwork_art_genre_FK` FOREIGN KEY (`genre_id`) REFERENCES `art_genre` (`genre_id`),
  CONSTRAINT `artwork_member_FK` FOREIGN KEY (`member_id`) REFERENCES `member` (`member_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- arnnect.artwork_tag definition

CREATE TABLE `artwork_tag` (
  `artwork_tag_id` bigint NOT NULL AUTO_INCREMENT,
  `artwork_id` bigint DEFAULT NULL COMMENT '작품 ID',
  `tag_id` bigint DEFAULT NULL,
  PRIMARY KEY (`artwork_tag_id`),
  KEY `FKhogsvtke0m46k4kjn37m2m53n` (`tag_id`),
  KEY `artwork_tag_artwork_FK` (`artwork_id`),
  CONSTRAINT `artwork_tag_artwork_FK` FOREIGN KEY (`artwork_id`) REFERENCES `artwork` (`artwork_id`),
  CONSTRAINT `FKhogsvtke0m46k4kjn37m2m53n` FOREIGN KEY (`tag_id`) REFERENCES `tag` (`tag_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- arnnect.fan_letter definition

CREATE TABLE `fan_letter` (
  `fan_letter_id` bigint NOT NULL AUTO_INCREMENT,
  `answer` text COLLATE utf8mb4_unicode_ci,
  `artwork_id` bigint DEFAULT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `deleted_at` datetime(6) DEFAULT NULL,
  `is_answered` bit(1) DEFAULT NULL,
  `is_deleted` bit(1) DEFAULT NULL,
  `title` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `writer_id` bigint DEFAULT NULL,
  `artist_member_id` bigint DEFAULT NULL,
  PRIMARY KEY (`fan_letter_id`),
  KEY `FKeh6tb86h2psxgdkg5sb5sydqs` (`artist_member_id`),
  CONSTRAINT `FKeh6tb86h2psxgdkg5sb5sydqs` FOREIGN KEY (`artist_member_id`) REFERENCES `member` (`member_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- arnnect.favorite_artwork definition

CREATE TABLE `favorite_artwork` (
  `member_id` bigint NOT NULL,
  `artwork_id` bigint NOT NULL COMMENT '작품 ID',
  `is_favorite` bit(1) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '좋아요 시간',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`member_id`,`artwork_id`),
  KEY `favorite_artwork_artwork_FK` (`artwork_id`),
  KEY `favorite_artwork_member_FK` (`member_id`),
  CONSTRAINT `favorite_artwork_artwork_FK` FOREIGN KEY (`artwork_id`) REFERENCES `artwork` (`artwork_id`),
  CONSTRAINT `favorite_artwork_member_FK` FOREIGN KEY (`member_id`) REFERENCES `member` (`member_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- arnnect.review_tag definition

CREATE TABLE `review_tag` (
  `review_tag_id` bigint NOT NULL AUTO_INCREMENT,
  `review_id` bigint DEFAULT NULL COMMENT '감상평 ID',
  `tag_id` bigint DEFAULT NULL,
  PRIMARY KEY (`review_tag_id`),
  KEY `FKea2voymuynf2rmdx7ph30cwoe` (`review_id`),
  KEY `FKktgdj6yskxf37alvmhehas7fu` (`tag_id`),
  CONSTRAINT `FKea2voymuynf2rmdx7ph30cwoe` FOREIGN KEY (`review_id`) REFERENCES `review` (`review_id`),
  CONSTRAINT `FKktgdj6yskxf37alvmhehas7fu` FOREIGN KEY (`tag_id`) REFERENCES `tag` (`tag_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- arnnect.ticket_info definition

CREATE TABLE `ticket_info` (
  `ticket_id` bigint NOT NULL AUTO_INCREMENT,
  `member_id` bigint NOT NULL,
  `ticket_code` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `address` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address_detail` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `start_time` time(6) DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `end_time` time(6) DEFAULT NULL,
  `qr_image_name` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ticket_image_name` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `is_deleted` bit(1) DEFAULT NULL,
  `deleted_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`ticket_id`),
  UNIQUE KEY `ticket_info_unique` (`ticket_code`),
  KEY `ticket_info_member_FK` (`member_id`),
  CONSTRAINT `ticket_info_member_FK` FOREIGN KEY (`member_id`) REFERENCES `member` (`member_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;