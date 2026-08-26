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

# Gunicorn workers do not set RUN_MAIN, so AppConfig.ready() is not enough on
# remote. Warm Redis once per container before the server starts.
if [ -n "$REDIS_URL" ]; then
  >&2 echo "Waiting for Redis..."
  python -c "
import os, socket, time, urllib.parse
u = urllib.parse.urlparse(os.environ['REDIS_URL'])
host, port = u.hostname or '127.0.0.1', int(u.port or 6379)
for _ in range(60):
    try:
        s = socket.create_connection((host, port), 2)
        s.close()
        raise SystemExit(0)
    except OSError:
        time.sleep(1)
raise SystemExit(1)
" || >&2 echo "Redis wait timed out (continuing)"
fi
>&2 echo "Warming datastore cache..."
python manage.py refresh_datastore_cache || >&2 echo "Datastore cache warm failed (continuing)"

exec "$@"
