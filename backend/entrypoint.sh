#!/bin/sh
set -e
echo '==> Initialising database...'
python -c 'from app_production import app, db, init_db; init_db()'
echo '==> Starting Gunicorn...'
exec gunicorn --bind 0.0.0.0:5000 --workers 2 --timeout 120 app_production:app
