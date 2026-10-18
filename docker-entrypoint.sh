#!/bin/sh
set -e
pnpm prisma migrate deploy
pnpm prisma db seed
exec node dist/main.js