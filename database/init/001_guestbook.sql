USE homepage;

CREATE TABLE IF NOT EXISTS guestbook_entries (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(80) NOT NULL,
    message VARCHAR(500) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_guestbook_entries_created_at (created_at)
);

SET GLOBAL event_scheduler = ON;

CREATE EVENT IF NOT EXISTS cleanup_guestbook_entries
ON SCHEDULE EVERY 1 DAY
STARTS CURRENT_TIMESTAMP + INTERVAL 1 HOUR
DO
    DELETE FROM guestbook_entries
    WHERE created_at < NOW() - INTERVAL 90 DAY;

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
