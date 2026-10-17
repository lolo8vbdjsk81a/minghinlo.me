CREATE TABLE IF NOT EXISTS admin (
    id          BIGINT          UNSIGNED    AUTO_INCREMENT  PRIMARY KEY,
    username    VARCHAR(80)     NOT NULL,
    password_hash VARCHAR(255)  NOT NULL,
    UNIQUE KEY uk_admin_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
