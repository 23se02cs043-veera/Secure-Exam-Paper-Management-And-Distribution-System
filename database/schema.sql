-- ============================================================
-- SECURE QUESTION PAPER DISTRIBUTION & MANAGEMENT SYSTEM
-- MySQL Database Schema v1.0
-- ============================================================

CREATE DATABASE IF NOT EXISTS secure_exam_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE secure_exam_db;

-- ============================================================
-- TABLE: users
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(255) NOT NULL,
    phone           VARCHAR(20) NULL,
    role            ENUM('super_admin','staff','coordinator','student') NOT NULL DEFAULT 'student',
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    last_login      DATETIME NULL,
    failed_logins   INT NOT NULL DEFAULT 0,
    locked_until    DATETIME NULL,
    oauth_provider  VARCHAR(50) NULL,
    oauth_id        VARCHAR(255) NULL,
    profile_image   VARCHAR(512) NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB;

-- ============================================================
-- TABLE: papers
-- ============================================================
CREATE TABLE IF NOT EXISTS papers (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    title               VARCHAR(255) NOT NULL,
    subject             VARCHAR(255) NOT NULL,
    semester            INT NOT NULL,
    course_code         VARCHAR(50) NOT NULL,
    uploaded_by_id      INT NOT NULL,
    file_path           VARCHAR(512) NOT NULL,
    original_filename   VARCHAR(255) NOT NULL,
    file_hash           VARCHAR(64) NOT NULL,
    encryption_type     ENUM('aes256gcm','aes256cbc','chacha20') NOT NULL DEFAULT 'aes256gcm',
    encryption_key      TEXT NULL,
    encryption_nonce    VARCHAR(255) NULL,
    watermark_enabled   BOOLEAN NOT NULL DEFAULT TRUE,
    watermark_config    JSON NULL,
    size_bytes          BIGINT NOT NULL DEFAULT 0,
    is_deleted          BOOLEAN NOT NULL DEFAULT FALSE,
    is_locked           BOOLEAN NOT NULL DEFAULT FALSE,
    locked_at           DATETIME NULL,
    locked_reason       VARCHAR(255) NULL,
    download_count      INT NOT NULL DEFAULT 0,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (uploaded_by_id) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_course_code (course_code),
    INDEX idx_uploaded_by (uploaded_by_id),
    INDEX idx_semester (semester),
    INDEX idx_is_deleted (is_deleted)
) ENGINE=InnoDB;

-- ============================================================
-- TABLE: paper_releases
-- ============================================================
CREATE TABLE IF NOT EXISTS paper_releases (
    id                      INT AUTO_INCREMENT PRIMARY KEY,
    paper_id                INT NOT NULL,
    scheduled_release_time  DATETIME NOT NULL,
    actual_release_time     DATETIME NULL,
    released_by_id          INT NOT NULL,
    expiry_time             DATETIME NULL,
    is_released             BOOLEAN NOT NULL DEFAULT FALSE,
    is_locked               BOOLEAN NOT NULL DEFAULT FALSE,
    scheduler_job_id        VARCHAR(255) NULL,
    release_notes           TEXT NULL,
    created_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (paper_id) REFERENCES papers(id) ON DELETE CASCADE,
    FOREIGN KEY (released_by_id) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_paper_id (paper_id),
    INDEX idx_scheduled_time (scheduled_release_time),
    INDEX idx_is_released (is_released)
) ENGINE=InnoDB;

-- ============================================================
-- TABLE: audit_logs
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    user_id         INT NULL,
    action          VARCHAR(100) NOT NULL,
    resource_type   VARCHAR(100) NULL,
    resource_id     INT NULL,
    details         JSON NULL,
    ip_address      VARCHAR(45) NULL,
    user_agent      VARCHAR(512) NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_action (action),
    INDEX idx_created_at (created_at),
    INDEX idx_resource (resource_type, resource_id)
) ENGINE=InnoDB;

-- ============================================================
-- TABLE: notifications
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    user_id         INT NOT NULL,
    type            ENUM('paper_released','paper_expiring','paper_locked','system','security') NOT NULL DEFAULT 'system',
    title           VARCHAR(255) NOT NULL,
    message         TEXT NOT NULL,
    related_paper_id INT NULL,
    is_read         BOOLEAN NOT NULL DEFAULT FALSE,
    action_url      VARCHAR(512) NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (related_paper_id) REFERENCES papers(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_is_read (is_read),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB;

-- ============================================================
-- TABLE: user_sessions
-- ============================================================
CREATE TABLE IF NOT EXISTS user_sessions (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    user_id         INT NOT NULL,
    token_hash      VARCHAR(255) NOT NULL UNIQUE,
    refresh_token_hash VARCHAR(255) NULL UNIQUE,
    is_blacklisted  BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at      DATETIME NOT NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_token_hash (token_hash),
    INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB;

-- ============================================================
-- TABLE: security_alerts
-- ============================================================
CREATE TABLE IF NOT EXISTS security_alerts (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    alert_type      ENUM('failed_login','unauthorized_access','file_tampering','suspicious_download','panic_lock','brute_force') NOT NULL,
    severity        ENUM('low','medium','high','critical') NOT NULL DEFAULT 'medium',
    description     TEXT NOT NULL,
    user_id         INT NULL,
    resource_type   VARCHAR(100) NULL,
    resource_id     INT NULL,
    ip_address      VARCHAR(45) NULL,
    resolved        BOOLEAN NOT NULL DEFAULT FALSE,
    resolved_by_id  INT NULL,
    resolved_at     DATETIME NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (resolved_by_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_alert_type (alert_type),
    INDEX idx_severity (severity),
    INDEX idx_resolved (resolved),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB;

-- ============================================================
-- TABLE: panic_locks
-- ============================================================
CREATE TABLE IF NOT EXISTS panic_locks (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    lock_type       ENUM('all','papers','downloads') NOT NULL DEFAULT 'all',
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    reason          TEXT NOT NULL,
    activated_by_id INT NOT NULL,
    active_until    DATETIME NULL,
    deactivated_at  DATETIME NULL,
    deactivated_by_id INT NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (activated_by_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (deactivated_by_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB;

-- ============================================================
-- TABLE: paper_access_logs
-- ============================================================
CREATE TABLE IF NOT EXISTS paper_access_logs (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    paper_id        INT NOT NULL,
    user_id         INT NOT NULL,
    action          ENUM('view','download') NOT NULL DEFAULT 'view',
    ip_address      VARCHAR(45) NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (paper_id) REFERENCES papers(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_paper_id (paper_id),
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB;
