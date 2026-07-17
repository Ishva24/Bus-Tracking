# BusTrack

Backend-first implementation of the real-time bus tracking monorepo described in `realtime_bus_tracker_master_prompt.md`.

> Status: Work in progress. This project is not completed yet.

## What is implemented

- Shared TypeScript package for transport, auth, ETA, and realtime event types
- Express API with JWT auth, rate limiting, route search, bus search, favorites, and ETA endpoints
- Socket.IO server that broadcasts Redis-backed live bus position updates
- Prisma schema and seed data for Chennai routes, stops, buses, and demo auth data
- Bus simulator that publishes realistic moving positions every 3 seconds
- Docker Compose for MySQL and Redis

## Current gaps

- The mobile React Native app still needs the native runtime dependencies and final screen implementation before it can run on a device or emulator.
- External map and notification provider keys still need to be configured.
- Production deployment targets and native release infrastructure are still pending.

## Quick start

1. `npm install`
2. `Copy-Item backend\\.env.example backend\\.env`
3. `Copy-Item simulator\\.env.example simulator\\.env`
4. `docker compose up -d`
5. `npm run generate -w @bustrack/backend`
6. `npm run migrate -w @bustrack/backend`
7. `npm run seed -w @bustrack/backend`
8. `npm run build`
9. `npm run backend`
10. `npm run simulator`

Demo credentials: `demo@bustrack.app` / `Demo1234!`

Docs are available at `/docs` after the backend starts.
