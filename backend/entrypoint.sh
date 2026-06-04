#!/bin/sh
# set -e

# Wait for the database to be ready before migrating
if [ ! -z "$POSTGRES_HOST" ]; then
  >&2 echo "Waiting for database connection on $POSTGRES_HOST:$POSTGRES_PORT"
  until nc -z $POSTGRES_HOST $POSTGRES_PORT
  do
    >&2 echo "Waiting for database connection..."
    sleep 1
  done
  >&2 echo "Waiting for database connection... Done"
fi

if [ "$DJANGO_MANAGE_MIGRATE" = 'on' ]; then
  python manage.py collectstatic --noinput
  python manage.py migrate --noinput
  python manage.py createcachetable
  if [ -n "$DJANGO_SUPERUSER_USERNAME" ] && [ -n "$DJANGO_SUPERUSER_PASSWORD" ]; then
    python manage.py createsuperuser --noinput \
      --username "$DJANGO_SUPERUSER_USERNAME" \
      --email "${DJANGO_SUPERUSER_EMAIL:-admin@localhost}" || true
  fi
fi

exec "$@"
