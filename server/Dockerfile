FROM php:8.2-cli

# Install system deps + MySQL driver for Laravel
RUN apt-get update && apt-get install -y \
    git unzip zip libzip-dev \
  && docker-php-ext-install pdo pdo_mysql \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /var/www