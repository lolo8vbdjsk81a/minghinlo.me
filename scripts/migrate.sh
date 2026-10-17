#!/usr/bin/env bash
set -euo pipefail

echo "Applying database migrations..."

docker exec lolo-homepage \
    php /var/www/scripts/migrate.php

echo "Database migrations completed successfully!"
