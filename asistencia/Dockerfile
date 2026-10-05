FROM php:8.2-apache

RUN docker-php-ext-install mysqli \
    && cp "$PHP_INI_DIR/php.ini-development" "$PHP_INI_DIR/php.ini"

# Store PHP sessions on a mounted volume (see docker-compose.yml) instead of
# the container's /tmp, so they survive `docker compose up --build`/recreate
# during local development instead of silently expiring every rebuild.
RUN mkdir -p /var/lib/php/sessions \
    && chown www-data:www-data /var/lib/php/sessions \
    && chmod 1733 /var/lib/php/sessions \
    && echo 'session.save_path = "/var/lib/php/sessions"' > "$PHP_INI_DIR/conf.d/session-save-path.ini"

# Venezuela time for every date() call that does not set its own timezone
# (e.g. the default dates of the report filters), matching the database.
RUN echo 'date.timezone = America/Caracas' > "$PHP_INI_DIR/conf.d/timezone.ini"

COPY . /var/www/html/

RUN chown -R www-data:www-data /var/www/html/admin/files
