-- Database initialization for Thailand Emergency Warning System

CREATE DATABASE IF NOT EXISTS `thaialert_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `thaialert_db`;

-- 1. Incidents Table
-- Stores real-world event telemetry and simulation runs
CREATE TABLE IF NOT EXISTS `incidents` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `type` VARCHAR(50) NOT NULL COMMENT 'earthquake, tsunami, civil_unrest, accident',
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT,
    `latitude` DECIMAL(10, 8) NOT NULL,
    `longitude` DECIMAL(11, 8) NOT NULL,
    `severity` VARCHAR(20) NOT NULL COMMENT 'green, yellow, red',
    `magnitude` DECIMAL(3, 1) DEFAULT NULL COMMENT 'Used primarily for earthquakes',
    `timestamp` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `is_simulation` TINYINT(1) DEFAULT 0 COMMENT '1 = test drill, 0 = real disaster',
    INDEX `idx_timestamp` (`timestamp`),
    INDEX `idx_type` (`type`),
    INDEX `idx_severity` (`severity`),
    INDEX `idx_is_simulation` (`is_simulation`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Simulation Logs Table
-- Stores historical records of system drills and tests separately
CREATE TABLE IF NOT EXISTS `simulation_logs` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `incident_id` INT DEFAULT NULL,
    `triggered_by` VARCHAR(100) DEFAULT 'admin',
    `triggered_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`incident_id`) REFERENCES `incidents` (`id`) ON DELETE SET NULL,
    INDEX `idx_triggered_at` (`triggered_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Users Table
-- Stores user registration details for profile login
CREATE TABLE IF NOT EXISTS `users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(191) NOT NULL UNIQUE,
    `password_hash` VARCHAR(255) NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Favorites Table
-- Stores bookmarked warning incidents and custom personal memos
CREATE TABLE IF NOT EXISTS `favorites` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `incident_id` INT NOT NULL,
    `memo` TEXT DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    INDEX `idx_user_incident` (`user_id`, `incident_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

