#!/bin/sh
set -e

# Applies any migrations the image was built with, then hands off to the server.
# `migrate deploy` only ever applies existing migrations — it never generates
# new ones and never resets, so it is safe to run on every boot.
if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "==> Applying database migrations"
  node node_modules/prisma/build/index.js migrate deploy
fi

exec "$@"
