<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit();
}

$pdo = null;
$lockAcquired = false;
$exitCode = 0;
$currentMigration = null;

try {
    $dbConfigPath = '/var/www/app/db.php';
    if (!file_exists($dbConfigPath)) {
        throw new RuntimeException("Database configuration file not found: {$dbConfigPath}");
    }
    require $dbConfigPath;
    if (!$pdo instanceof PDO) {
        throw new RuntimeException('Database configuration did not create a PDO connection.');
    }
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $dbName = (string) $pdo->query('SELECT DATABASE()')->fetchColumn();
    if ($dbName === '') {
        throw new RuntimeException('No database selected.');
    }

    // Acquire migration lock
    $lockName = 'migrations:' . substr(hash('sha256', $dbName), 0, 40);
    $lockStmt = $pdo->prepare('SELECT GET_LOCK(?, 0)');
    $lockStmt->execute([$lockName]);
    $lockAcquired = (int) $lockStmt->fetchColumn() === 1;
    $lockStmt->closeCursor();

    if (!$lockAcquired) {
        throw new RuntimeException('Another migration process holds the lock.');
    }
    
    // Check init complete, throw PDOException if not exists
    $pdo->query(
        'SELECT id, name, message, created_at
         FROM guestbook_entries
         LIMIT 0'
    )->closeCursor();

    $pdo->query(
        'SHOW CREATE EVENT cleanup_guestbook_entries'
    )->closeCursor();

    $pdo->query(
        'SHOW CREATE EVENT cap_guestbook_entries_at_1000'
    )->closeCursor();

    // Create/read migration-history table
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS schema_migrations (
            version VARCHAR(191) NOT NULL PRIMARY KEY,
            checksum CHAR(64) NOT NULL,
            applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
    );

    $applied = $pdo->query(
        'SELECT version, checksum FROM schema_migrations'
    )->fetchAll(PDO::FETCH_KEY_PAIR); // filename => checksum

    $migrationDirectory = dirname(__DIR__) . '/database/migrations';  // but script in scripts/. and .sql in database/migrations/.
    if (!is_dir($migrationDirectory)) {
        throw new RuntimeException(
            "Migration directory not found: {$migrationDirectory}"
        );
    }

    // Find and sort migration files
    $files = glob($migrationDirectory . '/*.sql');  // full path
    if ($files === false) {
        throw new RuntimeException('Could not list migration files.');
    }
    sort($files, SORT_STRING);

    $recordMigration = $pdo->prepare(
        'INSERT INTO schema_migrations (version, checksum)
        VALUES (?, ?)'
    );

    // Validate each .sql files
    $pending = [];

    foreach ($files as $file) {
        $version = basename($file);
        $sql = file_get_contents($file);

        if ($sql === false || trim($sql) === '') {
            throw new RuntimeException(
                "Unreadable or empty migration: {$version}"
            );
        }

        $checksum = hash('sha256', $sql); // integrity check

        if (isset($applied[$version])) {
            if (!hash_equals($applied[$version], $checksum)) {
                throw new RuntimeException(
                    "Previously applied migration was modified: {$version}"
                );
            }
            echo "SKIP {$version}\n";
            continue;
        }
        $pending[] = [
            'version' => $version,
            'checksum' => $checksum,
            'sql' => $sql,
        ];
    }

    // Execute migrations
    foreach ($pending as $migration) {
        $currentMigration = $migration['version'];

        echo "RUN  {$currentMigration}\n";
        $pdo->exec($migration['sql']);
        $recordMigration->execute([
            $migration['version'],
            $migration['checksum'],
        ]);
        echo "DONE {$currentMigration}\n";

        $currentMigration = null;
    }
    echo "Database migrations complete.\n";
} catch (Throwable $exception) {
    if ($currentMigration !== null) {
        fwrite(STDERR, "Failed while applying: {$currentMigration}\n");
    }
    fwrite(
        STDERR,
        "Migration failed: {$exception->getMessage()}\n"
    );
    fwrite(
        STDERR,
        "Inspect the database before retrying. "
        . "A schema change may have succeeded before the failure.\n"
    );
    $exitCode = 1;
} finally {
    // Release lock
    if ($lockAcquired && $pdo instanceof PDO) {
        try {
            $unlockStmt = $pdo->prepare('SELECT RELEASE_LOCK(?)');
            $unlockStmt->execute([$lockName]);
            $unlockStmt->closeCursor();
        } catch (Throwable $unlockException) {
            fwrite(
                STDERR,
                "Warning: could not explicitly release migration lock.\n"
            );
        }
    }
}

exit($exitCode);
