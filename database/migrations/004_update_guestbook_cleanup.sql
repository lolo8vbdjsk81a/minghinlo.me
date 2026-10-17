ALTER EVENT cleanup_guestbook_entries
DO
    DELETE FROM guestbook_entries
    WHERE created_at < NOW() - INTERVAL 90 DAY
        OR EXISTS (
            SELECT 1
            FROM guestbook_deletions
            WHERE guestbook_deletions.entry_id = guestbook_entries.id
        );
