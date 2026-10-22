FROM php:8.3-apache
RUN php -r 'exit(version_compare(PHP_VERSION, "8.3.36", ">=") ? 0 : 1);' \
    && docker-php-ext-install pdo_mysql
COPY app/ /var/www/app/
COPY public/ /var/www/html/
COPY scripts/migrate.php /var/www/scripts/migrate.php
COPY database/migrations/ /var/www/database/migrations/
EXPOSE 80
