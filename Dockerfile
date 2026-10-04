FROM php:8.3-apache
RUN docker-php-ext-install pdo_mysql
COPY app/ /var/www/app/
COPY public/ /var/www/html/
EXPOSE 80
