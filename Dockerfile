FROM php:8.3-apache
RUN docker-php-ext-install pdo_mysql
COPY app/ /var/www/app/
COPY public/ /var/www/html/
COPY scripts/migrate.php /var/www/scripts/migrate.php
COPY database/migrations/ /var/www/database/migrations/
EXPOSE 80
