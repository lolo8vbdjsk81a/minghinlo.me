USE homepage;

CREATE TABLE IF NOT EXISTS admin (
    id          BIGINT          UNSIGNED    AUTO_INCREMENT  PRIMARY KEY,
    username    VARCHAR(80)     NOT NULL,
    password_hash VARCHAR(255)  NOT NULL,
    UNIQUE KEY uk_admin_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS guestbook_entries (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(80) NOT NULL,
    message VARCHAR(500) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_guestbook_entries_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS guestbook_deletions (
    id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    admin_id   BIGINT UNSIGNED NOT NULL,
    entry_id   BIGINT UNSIGNED NOT NULL,
    deleted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_guestbook_deletions_deleted_at (deleted_at),

    -- Do not delete an admin while my deletion logs still reference them.
    FOREIGN KEY (admin_id)
        REFERENCES admin (id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


SET GLOBAL event_scheduler = ON;

CREATE EVENT IF NOT EXISTS cleanup_guestbook_entries
ON SCHEDULE EVERY 1 DAY
STARTS CURRENT_TIMESTAMP + INTERVAL 1 HOUR
DO
    DELETE FROM guestbook_entries
    WHERE created_at < NOW() - INTERVAL 90 DAY
        OR EXISTS (
            SELECT 1
            FROM guestbook_deletions
            WHERE guestbook_deletions.entry_id = guestbook_entries.id
        );

-- it can exceed 1000 entries before the event runs
CREATE EVENT IF NOT EXISTS cap_guestbook_entries_at_1000
ON SCHEDULE EVERY 1 DAY
STARTS CURRENT_TIMESTAMP + INTERVAL 1 HOUR
DO
    DELETE FROM guestbook_entries
    WHERE id NOT IN (
        SELECT id
        FROM (
            SELECT id
            FROM guestbook_entries
            ORDER BY created_at DESC, id DESC
            LIMIT 1000
        ) AS newest_entries
    );
