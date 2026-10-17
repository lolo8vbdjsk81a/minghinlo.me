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
