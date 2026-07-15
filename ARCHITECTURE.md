# Architecture

## Services

- `packages/shared`: shared DTOs and utility functions used across the monorepo
- `backend`: Express REST API, Socket.IO server, Prisma access layer, Redis-backed live state
- `simulator`: reads active buses and route stops from MySQL, computes moving positions, writes them to Redis, and publishes update events
- `mobile`: placeholder workspace only

## Realtime flow

1. The simulator loads active buses and ordered route stops from MySQL.
2. Every tick it advances each bus along the next route segment.
3. The simulator stores `bus:position:{busId}` in Redis with a 30 second TTL.
4. The simulator publishes the same payload to Redis channel `bus:position:update`.
5. The backend subscribes to that Redis channel and fans out updates over Socket.IO rooms: `bus:{busId}` and `route:{routeId}`.
6. Clients can request point-in-time ETA through REST or `request:eta` over Socket.IO.
