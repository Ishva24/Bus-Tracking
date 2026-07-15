# 🚌 Real-Time Bus Location Tracking App — Master Implementation Prompt
> **Version:** 1.0.0 | **Target Audience:** AI Engineering Team / LLM Implementation Agent  
> **Type:** Full-Stack Mobile Product — Production-Ready Specification

---

## ⚠️ HOW TO USE THIS DOCUMENT

This document is a **self-contained implementation contract**. Every section is actionable. You are expected to:
1. Read the entire document before writing any code.
2. Follow the phased plan strictly — do not implement Phase 2/3 features during Phase 1.
3. Use the exact API contracts and data models defined here.
4. Produce working, tested, documented code — not pseudocode.
5. Flag any ambiguity via inline `// TODO:` comments with the specific question.

---

## TABLE OF CONTENTS

1. [Project Overview & Objectives](#1-project-overview--objectives)
2. [Roles & Team Structure](#2-roles--team-structure)
3. [Tech Stack & Architecture](#3-tech-stack--architecture)
4. [System Architecture Diagram](#4-system-architecture-diagram)
5. [Data Models](#5-data-models)
6. [API Contracts](#6-api-contracts)
7. [Real-Time Data Flow](#7-real-time-data-flow)
8. [Map Integration Strategy](#8-map-integration-strategy)
9. [Authentication & Security](#9-authentication--security)
10. [User Stories & Acceptance Criteria](#10-user-stories--acceptance-criteria)
11. [Phased Development Plan](#11-phased-development-plan)
12. [Sample Code — Critical Components](#12-sample-code--critical-components)
13. [Testing Strategy](#13-testing-strategy)
14. [Local Development Setup](#14-local-development-setup)
15. [Production Deployment Plan](#15-production-deployment-plan)
16. [Non-Functional Requirements](#16-non-functional-requirements)
17. [Deliverables Checklist](#17-deliverables-checklist)

---

## 1. PROJECT OVERVIEW & OBJECTIVES

### 1.1 Product Vision

Build a cross-platform mobile application (iOS + Android) that provides **real-time bus location tracking** for commuters. Users can search for a bus by number or route, watch live bus positions on a map, input a boarding point and destination, and receive ETA updates adjusted for live traffic.

### 1.2 Core Problems Solved

| Problem | Solution |
|---|---|
| Uncertainty about when the bus arrives | Live GPS position + computed ETA |
| Not knowing which bus to board | Search by bus number or route |
| Missing the bus at a stop | Push notifications for proximity alerts |
| Unreliable schedules | Traffic-adjusted ETA, live re-computation |

### 1.3 Scope

**In Scope (MVP):**
- User registration, login, profile management
- Search buses by bus number or route
- Real-time bus position on map (Google Maps, free tier)
- Bus detail screen: route, vehicle ID, current stop, ETA
- Boarding point + destination input → live route progress
- Backend WebSocket stream for bus position updates
- Simulated GPS data for development/testing

**Out of Scope (MVP, deferred to later phases):**
- Fare payment integration
- Multi-language support
- Accessibility (WCAG) — Phase 3
- Admin dashboard for bus operators
- Hardware GPS device integration — Phase 3

---

## 2. ROLES & TEAM STRUCTURE

### 2.1 Engineering Roles

| Role | Responsibility |
|---|---|
| **Frontend Engineer (React Native)** | Mobile UI, navigation, map rendering, WebSocket client, state management |
| **Backend Engineer (Node.js)** | REST API, WebSocket server, authentication, business logic |
| **Data Engineer** | Bus data ingestion pipeline, simulated GPS feed, data models |
| **DevOps Engineer** | CI/CD, Docker, environment config, staging/production infrastructure |
| **QA Engineer** | Unit, integration, E2E test suites; performance benchmarking |

### 2.2 Constraints Per Role

- **Frontend:** Must not embed API keys directly in source. Use environment-injected config.
- **Backend:** Must enforce rate limiting on all public endpoints. Log all auth events.
- **Data Engineer:** Simulated bus data must be statistically realistic (bus speed 0–60 km/h, dwell time at stops 10–60 s).
- **DevOps:** All secrets stored in environment variables, never committed to version control.
- **QA:** Every API endpoint must have at least one happy-path and one error-path test.

---

## 3. TECH STACK & ARCHITECTURE

### 3.1 Frontend (Mobile)

| Component | Choice | Reason |
|---|---|---|
| Framework | React Native 0.73+ (TypeScript) | Single codebase for iOS + Android |
| Navigation | React Navigation v6 | Industry standard, deep-link support |
| State Management | Zustand + React Query | Lightweight global state + server state caching |
| Maps | `react-native-maps` (Google Maps SDK) | Free tier; unified API |
| Real-Time | Socket.IO client (`socket.io-client`) | Matches backend Socket.IO server |
| HTTP Client | Axios with interceptors | Request/response transform, auth header injection |
| Local Storage | AsyncStorage + MMKV | Credentials in MMKV (encrypted); routes in AsyncStorage |
| Push Notifications | Firebase Cloud Messaging (FCM) | Free tier, cross-platform |
| Forms | React Hook Form + Zod | Validation and type safety |

### 3.2 Backend

| Component | Choice | Reason |
|---|---|---|
| Runtime | Node.js 20 LTS | Async I/O ideal for WebSocket workloads |
| Framework | Express.js 4.x | Lightweight, proven |
| Real-Time | Socket.IO 4.x | WebSocket with fallback, room-based pub/sub |
| Database | PostgreSQL 15 (with PostGIS) | Spatial queries; route/stop geometry |
| Cache | Redis 7 | Bus position caching; session store |
| ORM | Prisma | Type-safe DB access, migration management |
| Auth | JWT (access + refresh token pair) | Stateless, scalable |
| Validation | Zod (shared with frontend) | Single source of truth for schemas |
| Queue | Bull (Redis-backed) | Background jobs: ETA re-computation, notifications |
| API Docs | Swagger / OpenAPI 3.0 | Auto-generated from route decorators |

### 3.3 Infrastructure & DevOps

| Component | Choice |
|---|---|
| Containerization | Docker + Docker Compose (dev); Kubernetes (prod) |
| CI/CD | GitHub Actions |
| Cloud | AWS (EC2 / ECS Fargate) or GCP Cloud Run |
| Secrets | AWS Secrets Manager / `.env` files (dev only) |
| Monitoring | Prometheus + Grafana; Sentry (error tracking) |
| CDN | CloudFront (static assets, map tiles) |

---

## 4. SYSTEM ARCHITECTURE DIAGRAM

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        MOBILE CLIENT (React Native)                     │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐  ┌──────────────┐  │
│  │  Auth Screen│  │ Bus List/Map │  │ Bus Details  │  │ Route Planner│  │
│  └──────┬──────┘  └──────┬───────┘  └──────┬──────┘  └──────┬───────┘  │
│         │                │                  │                │           │
│  ┌──────▼──────────────────────────────────────────────────────────┐    │
│  │              App State (Zustand) + React Query Cache             │    │
│  └──────┬──────────────────────────────────────────────────────────┘    │
│         │ Axios (REST)            Socket.IO Client (WebSocket)           │
└─────────┼──────────────────────────────────────────────────────────────-┘
          │ HTTPS                           WSS
          ▼                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                            API GATEWAY / NGINX                          │
│  Rate Limiting │ TLS Termination │ Load Balancing │ CORS                │
└─────────────────────────────────────────────────────────────────────────┘
          │                                 │
          ▼                                 ▼
┌─────────────────────┐       ┌─────────────────────────────────────────┐
│   REST API SERVER   │       │         SOCKET.IO SERVER                │
│   (Express.js)      │       │  Rooms: route:{routeId}, bus:{busId}    │
│  /auth /buses       │       │  Events: bus:update, eta:update         │
│  /routes /users     │       │  Broadcasts every 3s                    │
│  /trips /stops      │       └──────────────────────┬──────────────────┘
└──────────┬──────────┘                              │
           │                                         │
           ▼                                         ▼
┌──────────────────────────────────────────────────────────────────────┐
│                        REDIS CACHE                                   │
│  bus:position:{busId}  │  session:{userId}  │  route:geometry:{id}  │
└──────────────────────────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     POSTGRESQL (+ PostGIS)                           │
│  users │ buses │ routes │ stops │ trips │ route_stops │ fcm_tokens   │
└──────────────────────────────────────────────────────────────────────┘
           ▲
           │
┌──────────────────────────────────────────────────────────────────────┐
│              BUS GPS DATA PIPELINE                                   │
│  [Phase 1: Simulator] → [Phase 3: Hardware GPS → MQTT → Broker]     │
│  Publishes bus position to Redis every 3 seconds                     │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 5. DATA MODELS

### 5.1 Prisma Schema (PostgreSQL)

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id              String        @id @default(uuid())
  email           String        @unique
  passwordHash    String
  name            String
  phone           String?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  favoriteRoutes  FavoriteRoute[]
  fcmTokens       FcmToken[]
  refreshTokens   RefreshToken[]
}

model RefreshToken {
  id          String   @id @default(uuid())
  token       String   @unique
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt   DateTime
  createdAt   DateTime @default(now())
}

model FcmToken {
  id        String   @id @default(uuid())
  token     String   @unique
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  platform  String   // "ios" | "android"
  createdAt DateTime @default(now())
}

model FavoriteRoute {
  id        String   @id @default(uuid())
  userId    String
  routeId   String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  route     Route    @relation(fields: [routeId], references: [id])
  createdAt DateTime @default(now())
  @@unique([userId, routeId])
}

model Bus {
  id          String     @id @default(uuid())
  vehicleNo   String     @unique   // e.g., "TN01AB1234"
  busNumber   String                // e.g., "47C" (route-facing number)
  routeId     String
  route       Route      @relation(fields: [routeId], references: [id])
  status      BusStatus  @default(ACTIVE)
  capacity    Int        @default(50)
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
}

enum BusStatus {
  ACTIVE
  INACTIVE
  MAINTENANCE
}

model Route {
  id          String       @id @default(uuid())
  name        String       // e.g., "Tambaram to Broadway"
  number      String       @unique  // e.g., "47C"
  description String?
  createdAt   DateTime     @default(now())
  routeStops  RouteStop[]
  buses       Bus[]
  favoriteBy  FavoriteRoute[]
}

model Stop {
  id          String      @id @default(uuid())
  name        String
  latitude    Float
  longitude   Float
  createdAt   DateTime    @default(now())
  routeStops  RouteStop[]
}

model RouteStop {
  id          String   @id @default(uuid())
  routeId     String
  stopId      String
  sequence    Int      // Order along route (1, 2, 3, ...)
  route       Route    @relation(fields: [routeId], references: [id])
  stop        Stop     @relation(fields: [stopId], references: [id])
  @@unique([routeId, sequence])
}

model MapProviderConfig {
  id              String   @id @default(uuid())
  providerName    String   // "google" | "osm" | "maplibre"
  apiKey          String?
  isActive        Boolean  @default(false)
  usageLimitPerDay Int?
  fallbackEnabled Boolean  @default(false)
  updatedAt       DateTime @updatedAt
}
```

### 5.2 Redis Key Schema

```
bus:position:{busId}          → JSON { lat, lon, speed, bearing, lastUpdated, currentStopId }
bus:eta:{busId}:{stopId}      → JSON { eta (ISO), distanceKm, trafficFactor }
route:geometry:{routeId}      → GeoJSON LineString (encoded)
session:{userId}              → userId (TTL: 24h)
rate:limit:{ip}               → counter (TTL: 60s)
```

### 5.3 TypeScript Interface Definitions (Shared)

```typescript
// packages/shared/src/types.ts

export interface BusPosition {
  busId: string;
  vehicleNo: string;
  busNumber: string;
  routeId: string;
  lat: number;
  lon: number;
  speed: number;        // km/h
  bearing: number;      // degrees 0–360
  lastUpdated: string;  // ISO 8601
  currentStopId: string | null;
}

export interface RouteWithStops {
  id: string;
  name: string;
  number: string;
  stops: StopWithSequence[];
}

export interface StopWithSequence {
  stopId: string;
  name: string;
  latitude: number;
  longitude: number;
  sequence: number;
}

export interface TripETA {
  origin: string;         // stopId
  destination: string;    // stopId
  boardingPoint: string;  // stopId
  etaISO: string;
  distanceKm: number;
  trafficFactor: number;  // multiplier, e.g., 1.3 = 30% slower
  stopsRemaining: number;
  busId: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  phone?: string;
  favoriteRoutes: string[];  // routeIds
}
```

---

## 6. API CONTRACTS

**Base URL:** `https://api.bustrack.app/v1`  
**Auth Header:** `Authorization: Bearer <accessToken>`  
**Content-Type:** `application/json`  
**Error Format:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable message",
    "details": {}
  }
}
```

---

### 6.1 Authentication Endpoints

#### `POST /auth/register`

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "Ravi Kumar",
  "phone": "+919876543210"
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "rt_a1b2c3d4...",
    "expiresIn": 900,
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "Ravi Kumar"
    }
  }
}
```

**Validation Rules:** email valid format; password min 8 chars, 1 uppercase, 1 number, 1 special char; name 2–80 chars; phone optional E.164 format.

---

#### `POST /auth/login`

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response 200:** Same structure as register response.

**Response 401:**
```json
{
  "success": false,
  "error": { "code": "INVALID_CREDENTIALS", "message": "Email or password is incorrect" }
}
```

---

#### `POST /auth/refresh`

**Request:**
```json
{ "refreshToken": "rt_a1b2c3d4..." }
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "expiresIn": 900
  }
}
```

---

#### `POST /auth/logout`

**Auth Required.** Invalidates the refresh token.

**Request:**
```json
{ "refreshToken": "rt_a1b2c3d4..." }
```

**Response 200:**
```json
{ "success": true, "data": { "message": "Logged out successfully" } }
```

---

### 6.2 User Profile Endpoints

#### `GET /users/me`

**Auth Required.**

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "Ravi Kumar",
    "phone": "+919876543210",
    "favoriteRoutes": ["routeId1", "routeId2"]
  }
}
```

---

#### `PATCH /users/me`

**Auth Required.**

**Request (partial update):**
```json
{
  "name": "Ravi K",
  "phone": "+919876543211"
}
```

**Response 200:** Returns updated user object.

---

#### `POST /users/me/favorites`

**Auth Required.**

**Request:**
```json
{ "routeId": "uuid" }
```

**Response 201:**
```json
{ "success": true, "data": { "message": "Route added to favorites" } }
```

---

#### `DELETE /users/me/favorites/:routeId`

**Auth Required.**

**Response 200:**
```json
{ "success": true, "data": { "message": "Route removed from favorites" } }
```

---

### 6.3 Bus Endpoints

#### `GET /buses`

**Query Parameters:**

| Param | Type | Description |
|---|---|---|
| `busNumber` | string | Filter by bus number (e.g., "47C") |
| `routeId` | string | Filter by route |
| `status` | string | "ACTIVE" \| "INACTIVE" |
| `page` | integer | Default 1 |
| `limit` | integer | Default 20, max 100 |

**Response 200:**
```json
{
  "success": true,
  "data": {
    "buses": [
      {
        "id": "uuid",
        "vehicleNo": "TN01AB1234",
        "busNumber": "47C",
        "routeId": "uuid",
        "routeName": "Tambaram to Broadway",
        "status": "ACTIVE",
        "currentPosition": {
          "lat": 12.9716,
          "lon": 80.2209,
          "speed": 32.5,
          "bearing": 45,
          "lastUpdated": "2024-01-15T09:30:00Z"
        }
      }
    ],
    "pagination": { "page": 1, "limit": 20, "total": 45, "totalPages": 3 }
  }
}
```

---

#### `GET /buses/:busId`

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "vehicleNo": "TN01AB1234",
    "busNumber": "47C",
    "capacity": 50,
    "status": "ACTIVE",
    "route": {
      "id": "uuid",
      "name": "Tambaram to Broadway",
      "number": "47C",
      "stops": [
        { "stopId": "uuid", "name": "Tambaram", "latitude": 12.9249, "longitude": 80.1239, "sequence": 1 },
        { "stopId": "uuid", "name": "Chromepet", "latitude": 12.9516, "longitude": 80.1430, "sequence": 2 }
      ]
    },
    "currentPosition": {
      "lat": 12.9516,
      "lon": 80.1430,
      "speed": 0,
      "bearing": 90,
      "currentStopId": "uuid",
      "currentStopName": "Chromepet",
      "lastUpdated": "2024-01-15T09:30:00Z"
    }
  }
}
```

---

### 6.4 Route Endpoints

#### `GET /routes`

**Query Parameters:** `search` (string, partial name/number match), `page`, `limit`

**Response 200:**
```json
{
  "success": true,
  "data": {
    "routes": [
      {
        "id": "uuid",
        "name": "Tambaram to Broadway",
        "number": "47C",
        "stopCount": 18,
        "activeBusCount": 4
      }
    ],
    "pagination": { "page": 1, "limit": 20, "total": 120, "totalPages": 6 }
  }
}
```

---

#### `GET /routes/:routeId`

**Response 200:** Full route object including all stops in sequence, active buses with live positions.

---

#### `GET /routes/:routeId/buses`

**Response 200:** List of buses on this route with live positions.

---

### 6.5 Trip / ETA Endpoints

#### `POST /trips/eta`

**Auth Required.**

**Request:**
```json
{
  "busId": "uuid",
  "boardingStopId": "uuid",
  "destinationStopId": "uuid"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "busId": "uuid",
    "boardingStopId": "uuid",
    "destinationStopId": "uuid",
    "boardingStopName": "Chromepet",
    "destinationStopName": "Broadway",
    "etaToBoarding": "2024-01-15T09:38:00Z",
    "etaToDestination": "2024-01-15T10:05:00Z",
    "distanceKm": 24.3,
    "stopsToBoarding": 2,
    "stopsToDestination": 10,
    "trafficFactor": 1.2,
    "trafficDescription": "Moderate traffic",
    "routeProgress": {
      "completedStops": 5,
      "totalStops": 18,
      "percentComplete": 27.8
    }
  }
}
```

---

#### `GET /stops/nearby`

**Query Parameters:** `lat` (float), `lon` (float), `radiusM` (int, default 500, max 2000)

**Response 200:**
```json
{
  "success": true,
  "data": {
    "stops": [
      {
        "stopId": "uuid",
        "name": "Chromepet",
        "latitude": 12.9516,
        "longitude": 80.1430,
        "distanceM": 120,
        "routes": ["47C", "19H"]
      }
    ]
  }
}
```

---

#### `POST /users/me/fcm-token`

**Auth Required.**

**Request:**
```json
{
  "token": "fcm_token_string",
  "platform": "android"
}
```

**Response 201:**
```json
{ "success": true, "data": { "message": "FCM token registered" } }
```

---

## 7. REAL-TIME DATA FLOW

### 7.1 WebSocket Events (Socket.IO)

**Connection:**
```
WSS wss://api.bustrack.app/socket
Query: ?token=<accessToken>
```

On connection, server validates JWT. Invalid token → disconnect with error event.

---

**Client → Server Events:**

| Event | Payload | Description |
|---|---|---|
| `subscribe:bus` | `{ busId: string }` | Subscribe to single bus updates |
| `unsubscribe:bus` | `{ busId: string }` | Unsubscribe from bus updates |
| `subscribe:route` | `{ routeId: string }` | Subscribe to all buses on a route |
| `unsubscribe:route` | `{ routeId: string }` | Unsubscribe from route |
| `request:eta` | `{ busId, boardingStopId, destinationStopId }` | Request immediate ETA push |

---

**Server → Client Events:**

| Event | Payload | Description |
|---|---|---|
| `bus:position` | `BusPosition` | Emitted every 3s per subscribed bus |
| `bus:eta` | `TripETA` | Emitted on ETA update or when bus passes a stop |
| `bus:stopped` | `{ busId, stopId, stopName }` | Bus has arrived at a stop |
| `bus:departed` | `{ busId, stopId }` | Bus has left a stop |
| `route:update` | `{ routeId, activeBuses: BusPosition[] }` | Full snapshot of all buses on route |
| `error` | `{ code, message }` | Server-side error |
| `connected` | `{ userId }` | Acknowledgement of auth |

---

### 7.2 Bus GPS Simulator (Phase 1 / Phase 3)

The simulator runs as a standalone Node.js process. It reads route geometry from the database, then moves bus markers along the polyline at a configurable speed, writing positions to Redis every 3 seconds.

```
Simulator → Redis (SETEX bus:position:{busId} 30 <json>) → Socket.IO Server (Redis PubSub) → Client
```

The Socket.IO server subscribes to Redis keyspace events and broadcasts to relevant rooms.

---

### 7.3 ETA Computation Algorithm

```
1. Fetch route stop sequence for busId (from Redis cache, fall back to DB).
2. Identify currentStopIndex: closest stop to bus current position.
3. Identify boardingStopIndex, destinationStopIndex from request.
4. stopsToBoarding = boardingStopIndex - currentStopIndex (if negative → bus passed stop).
5. For each stop segment, estimate travelTime:
     segmentDistanceKm = haversine(stop[i], stop[i+1])
     baseTimeMin = (segmentDistanceKm / averageSpeedKmh) * 60
     adjustedTimeMin = baseTimeMin * trafficFactor
6. Sum adjustedTimeMin for all segments to boarding, then to destination.
7. trafficFactor = fetch from Google Maps Traffic API (free tier) or default 1.0.
8. etaToBoarding = now + sum(segments to boarding)
9. etaToDestination = now + sum(all segments)
10. Cache result in Redis for 30s (bus:eta:{busId}:{stopId}).
```

---

## 8. MAP INTEGRATION STRATEGY

### 8.1 Phase 1 — Google Maps (Free Tier)

**Free tier limits (as of 2024):**
- Maps SDK (mobile): Free, no per-session cost
- Directions API: $5/1,000 requests (~$200/month free credit)
- Distance Matrix API: $5/1,000 elements
- Places API: $17/1,000 requests
- **Strategy:** Use mobile SDK for rendering (free). Minimize Directions API calls — compute ETA server-side and send to client. Cache route geometries in Redis (TTL 1h).

**Implementation:**
```
react-native-maps with PROVIDER_GOOGLE
MapView renders: route polyline, bus markers, stop markers, user location dot
Server computes ETA (not client) to avoid Directions API calls from device
```

**Quota Protection:**
- Track daily API usage in Redis counter.
- If counter > 80% of daily limit → activate fallback flag in `MapProviderConfig`.
- Frontend polls `/config/map-provider` every 5 minutes to check active provider.

---

### 8.2 Phase 2+ — Fallback to OpenStreetMap / MapLibre

**When triggered:** Google Maps free quota exhausted OR cost threshold exceeded.

**Replacement stack:**

| Component | Google Maps | Fallback |
|---|---|---|
| Map rendering | `react-native-maps` (Google) | `@maplibre/maplibre-react-native` |
| Tile server | Google | OpenFreeMap or self-hosted Tileserver-GL |
| Routing | Google Directions API | OSRM (self-hosted, free) |
| Geocoding | Google Geocoding | Nominatim (OSM) |
| Traffic | Google Traffic Layer | None (estimate from historical data) |

**MapLibre Integration Steps:**
```bash
npm install @maplibre/maplibre-react-native
```

```typescript
// Tile URL (OpenFreeMap)
const TILE_URL = 'https://tiles.openfreemap.org/styles/liberty/{z}/{x}/{y}.png';

// In component:
<MapLibreGL.MapView styleURL={TILE_URL}>
  <MapLibreGL.Camera centerCoordinate={[lon, lat]} zoomLevel={13} />
  <MapLibreGL.ShapeSource id="busRoute" shape={routeGeoJSON}>
    <MapLibreGL.LineLayer id="routeLine" style={{ lineColor: '#0066FF', lineWidth: 3 }} />
  </MapLibreGL.ShapeSource>
</MapLibreGL.MapView>
```

**Configuration in app:**
```typescript
// services/mapConfig.ts
export async function getActiveMapProvider(): Promise<MapProvider> {
  const config = await api.get<MapProviderConfig>('/config/map-provider');
  return config.data.providerName; // "google" | "maplibre"
}
```

---

## 9. AUTHENTICATION & SECURITY

### 9.1 JWT Configuration

```typescript
// backend/src/config/auth.ts
export const AUTH_CONFIG = {
  accessToken: {
    secret: process.env.JWT_ACCESS_SECRET!,
    expiresIn: '15m',
  },
  refreshToken: {
    secret: process.env.JWT_REFRESH_SECRET!,
    expiresIn: '30d',
  },
};

// Access token payload
interface AccessTokenPayload {
  sub: string;       // userId
  email: string;
  iat: number;
  exp: number;
}
```

### 9.2 Security Constraints

| Concern | Implementation |
|---|---|
| Passwords | bcrypt, cost factor 12 |
| Transport | TLS 1.2+ enforced; HSTS header |
| Rate limiting | 100 req/15min per IP (auth endpoints: 10/15min) |
| CORS | Whitelist mobile app origin only |
| SQL injection | Prisma parameterized queries only |
| XSS | Not applicable (native app), but sanitize any user-generated text stored |
| API keys | Never in source; injected via environment variables |
| Refresh token rotation | Invalidate old token on each refresh |
| WebSocket auth | JWT verified on connect; re-validate every 15 min |

### 9.3 Environment Variables (Required)

```bash
# backend/.env.example
DATABASE_URL=postgresql://user:password@localhost:5432/bustrack
REDIS_URL=redis://localhost:6379
JWT_ACCESS_SECRET=<generate: openssl rand -hex 64>
JWT_REFRESH_SECRET=<generate: openssl rand -hex 64>
GOOGLE_MAPS_API_KEY=<your key>
FCM_SERVER_KEY=<firebase server key>
NODE_ENV=development
PORT=3000
CORS_ORIGIN=http://localhost:8081

# frontend/.env.example (injected at build time via react-native-config)
API_BASE_URL=https://api.bustrack.app/v1
SOCKET_URL=wss://api.bustrack.app
GOOGLE_MAPS_API_KEY_ANDROID=<android restricted key>
GOOGLE_MAPS_API_KEY_IOS=<ios restricted key>
```

---

## 10. USER STORIES & ACCEPTANCE CRITERIA

### Epic 1: Authentication

**US-01: Register Account**
> As a new user, I want to create an account so I can save my preferences.

- **AC:** Form validates email/password/name before submit.
- **AC:** On success, access and refresh tokens stored securely (MMKV).
- **AC:** User redirected to Home screen after register.
- **AC:** Duplicate email shows "Email already registered" error.

**US-02: Login**
> As a returning user, I want to log in so I can access my saved routes.

- **AC:** Successful login redirects to Home.
- **AC:** Failed login shows generic "Invalid credentials" message (no enumeration).
- **AC:** After 5 failed attempts, account locked for 15 min (backend enforced).

**US-03: Stay Logged In**
> As a user, I want to stay logged in between app sessions.

- **AC:** Access token silently refreshed using refresh token.
- **AC:** If refresh fails, user redirected to Login.

---

### Epic 2: Bus Discovery

**US-04: Search by Bus Number**
> As a user, I want to search for a bus by number so I can find it quickly.

- **AC:** Search field on Home screen; results appear as user types (debounce 300ms).
- **AC:** Results show bus number, route name, and live position indicator.
- **AC:** "No buses found" state shown for zero results.

**US-05: Browse Bus List**
> As a user, I want to see a list of all available buses.

- **AC:** Paginated list, 20 items per page.
- **AC:** Each row shows bus number, vehicle number, route name, and active/inactive badge.
- **AC:** Pull-to-refresh triggers live data reload.

---

### Epic 3: Live Map

**US-06: View Bus on Map**
> As a user, I want to see a bus marker on the map moving in real time.

- **AC:** Map centered on selected bus on entry.
- **AC:** Bus marker updates position every 3 seconds without full re-render.
- **AC:** Marker rotates to match bus bearing.
- **AC:** Route polyline drawn on map from first to last stop.
- **AC:** All stops shown as small dot markers; current stop highlighted.

**US-07: View My Location**
> As a user, I want to see my location on the map to orient myself.

- **AC:** User location dot shown (blue).
- **AC:** "Center on me" button re-centers map.
- **AC:** Prompts for location permission if not granted.

---

### Epic 4: Bus Details & ETA

**US-08: View Bus Details**
> As a user, I want to see full details for a selected bus.

- **AC:** Detail screen shows: vehicle number, bus number, route name, current stop, next stop, speed, last updated timestamp.
- **AC:** Live position updates on this screen too.

**US-09: Input Boarding & Destination**
> As a user, I want to enter where I'll board and where I'm going to get my ETA.

- **AC:** Boarding stop and destination stop can be selected from a list of stops on the route.
- **AC:** Selected bus's current stop pre-filled as boarding default.
- **AC:** ETA to boarding stop shown in minutes and wall clock time.
- **AC:** ETA to destination shown.
- **AC:** Traffic factor indicator shown ("Light / Moderate / Heavy").

**US-10: Live ETA Updates**
> As a user, I want the ETA to update as the bus moves.

- **AC:** ETA recalculates and updates on-screen each time bus position changes (every 3s).
- **AC:** If bus passes boarding stop without user boarding, show "Bus passed your stop" warning.
- **AC:** If ETA changes by >3 minutes, show subtle "ETA Updated" toast.

---

### Epic 5: Favorites & Preferences

**US-11: Favorite a Route**
> As a user, I want to save my frequently used routes.

- **AC:** Heart icon on Route screen toggles favorite status.
- **AC:** Favorites listed at top of Home screen.
- **AC:** Persists across sessions.

---

## 11. PHASED DEVELOPMENT PLAN

### Phase 1 — MVP (Weeks 1–6)

**Goal:** Working app with live bus positions, search, ETA, and auth.

| Week | Focus | Deliverables |
|---|---|---|
| 1 | Project setup, DB schema, backend scaffolding | Repo structure, Docker Compose, Prisma migrations, health endpoint |
| 2 | Auth API, user endpoints, JWT middleware | Auth working end-to-end, Postman collection |
| 3 | Bus/Route/Stop APIs, seed data | All REST endpoints tested; 10 seeded routes, 30 buses |
| 4 | GPS Simulator + WebSocket server | Buses moving in Redis; Socket.IO broadcasting |
| 5 | React Native app: Auth screens, Bus list, Search | Mobile screens 1–4 functional |
| 6 | Map screen, Bus details, ETA screen | Full user flow working; Google Maps integrated |

**MVP Exit Criteria:**
- [ ] User can register, log in, stay logged in.
- [ ] User can search for bus "47C" and see it on the map moving.
- [ ] User can tap bus → see details → enter boarding/destination → see ETA.
- [ ] ETA updates every 3 seconds on-screen.
- [ ] All endpoints return correct status codes for happy/error paths.
- [ ] App tested on Android emulator + iOS simulator.

---

### Phase 2 — Enhanced Features (Weeks 7–10)

| Feature | Description |
|---|---|
| Live traffic ETA | Integrate Google Maps Traffic API server-side; include trafficFactor in ETA |
| Multiple buses on route | Route map shows all active buses simultaneously |
| Route filtering | Filter bus list by route number |
| Push notifications | FCM: "Bus 47C is 2 stops away from your boarding point" |
| Favorite routes | Save and quick-access favorite routes |
| Stop proximity search | "Nearest stops to me" feature |
| Refresh token rotation | Security hardening |

---

### Phase 3 — Hardening & Scaling (Weeks 11–14)

| Feature | Description |
|---|---|
| Hardware GPS handoff | MQTT broker; bus GPS devices publish; simulator switch OFF |
| Offline mode | Cache last-known map tiles (MapLibre); cache route data; show "Offline" banner |
| Map provider fallback | Automatic switch to MapLibre/OSM when Google quota approached |
| Performance testing | Load test WebSocket server: 10,000 concurrent connections |
| Accessibility | Screen reader support, font scaling |
| Admin panel (web) | View all buses, manage routes, monitor GPS feed health |
| End-to-end encryption | Encrypt user PII fields at rest |

---

## 12. SAMPLE CODE — CRITICAL COMPONENTS

### 12.1 Backend: WebSocket Server with Redis Pub/Sub

```typescript
// backend/src/realtime/socketServer.ts
import { Server as SocketIOServer, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { verifyAccessToken } from '../auth/jwt';
import { BusPosition } from '@bustrack/shared/types';

export async function initSocketServer(httpServer: any) {
  const pubClient = createClient({ url: process.env.REDIS_URL });
  const subClient = pubClient.duplicate();
  await Promise.all([pubClient.connect(), subClient.connect()]);

  const io = new SocketIOServer(httpServer, {
    cors: { origin: process.env.CORS_ORIGIN, methods: ['GET', 'POST'] },
    transports: ['websocket'],
  });

  io.adapter(createAdapter(pubClient, subClient));

  // Auth middleware
  io.use(async (socket: Socket, next) => {
    const token = socket.handshake.query.token as string;
    if (!token) return next(new Error('AUTH_REQUIRED'));
    try {
      const payload = verifyAccessToken(token);
      socket.data.userId = payload.sub;
      next();
    } catch {
      next(new Error('INVALID_TOKEN'));
    }
  });

  io.on('connection', (socket: Socket) => {
    console.log(`[Socket] Connected: ${socket.data.userId}`);
    socket.emit('connected', { userId: socket.data.userId });

    // Subscribe to a specific bus
    socket.on('subscribe:bus', ({ busId }: { busId: string }) => {
      socket.join(`bus:${busId}`);
    });

    socket.on('unsubscribe:bus', ({ busId }: { busId: string }) => {
      socket.leave(`bus:${busId}`);
    });

    // Subscribe to all buses on a route
    socket.on('subscribe:route', ({ routeId }: { routeId: string }) => {
      socket.join(`route:${routeId}`);
    });

    socket.on('unsubscribe:route', ({ routeId }: { routeId: string }) => {
      socket.leave(`route:${routeId}`);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Disconnected: ${socket.data.userId}`);
    });
  });

  // Listen for bus position updates from Redis keyspace
  // The GPS simulator writes to Redis; this broadcasts to rooms
  await subClient.subscribe('bus:positions', (message) => {
    const position: BusPosition = JSON.parse(message);
    io.to(`bus:${position.busId}`).emit('bus:position', position);
    io.to(`route:${position.routeId}`).emit('bus:position', position);
  });

  return io;
}
```

---

### 12.2 Bus GPS Simulator

```typescript
// simulator/src/simulator.ts
import { createClient } from 'redis';
import { PrismaClient } from '@prisma/client';
import { haversineDistance } from './utils/geo';
import { BusPosition } from '@bustrack/shared/types';

const redis = createClient({ url: process.env.REDIS_URL });
const prisma = new PrismaClient();

interface SimulatedBus {
  busId: string;
  vehicleNo: string;
  busNumber: string;
  routeId: string;
  stops: Array<{ lat: number; lon: number; stopId: string }>;
  currentStopIndex: number;
  progressToNextStop: number;   // 0.0 – 1.0
  speed: number;                 // km/h
  dwellTimeRemaining: number;    // seconds remaining at stop
}

const buses: Map<string, SimulatedBus> = new Map();

async function loadBuses() {
  const dbBuses = await prisma.bus.findMany({
    where: { status: 'ACTIVE' },
    include: { route: { include: { routeStops: { include: { stop: true }, orderBy: { sequence: 'asc' } } } } },
  });

  for (const bus of dbBuses) {
    const stops = bus.route.routeStops.map((rs) => ({
      lat: rs.stop.latitude,
      lon: rs.stop.longitude,
      stopId: rs.stopId,
    }));

    buses.set(bus.id, {
      busId: bus.id,
      vehicleNo: bus.vehicleNo,
      busNumber: bus.busNumber,
      routeId: bus.routeId,
      stops,
      currentStopIndex: Math.floor(Math.random() * stops.length),
      progressToNextStop: Math.random(),
      speed: 20 + Math.random() * 20,
      dwellTimeRemaining: 0,
    });
  }
  console.log(`[Simulator] Loaded ${buses.size} buses`);
}

function computeCurrentPosition(bus: SimulatedBus): { lat: number; lon: number; bearing: number } {
  const nextIndex = Math.min(bus.currentStopIndex + 1, bus.stops.length - 1);
  const from = bus.stops[bus.currentStopIndex];
  const to = bus.stops[nextIndex];
  const lat = from.lat + (to.lat - from.lat) * bus.progressToNextStop;
  const lon = from.lon + (to.lon - from.lon) * bus.progressToNextStop;
  const bearing = Math.atan2(to.lon - from.lon, to.lat - from.lat) * (180 / Math.PI);
  return { lat, lon, bearing: (bearing + 360) % 360 };
}

async function tick() {
  const TICK_INTERVAL_S = 3;

  for (const [busId, bus] of buses.entries()) {
    // Dwell at stop
    if (bus.dwellTimeRemaining > 0) {
      bus.dwellTimeRemaining -= TICK_INTERVAL_S;
      bus.speed = 0;
    } else {
      // Move along route
      const nextIndex = Math.min(bus.currentStopIndex + 1, bus.stops.length - 1);
      const segmentDistKm = haversineDistance(bus.stops[bus.currentStopIndex], bus.stops[nextIndex]);
      const segmentTimeS = (segmentDistKm / Math.max(bus.speed, 1)) * 3600;
      const progressIncrement = TICK_INTERVAL_S / segmentTimeS;
      bus.progressToNextStop += progressIncrement;

      if (bus.progressToNextStop >= 1.0) {
        bus.progressToNextStop = 0;
        bus.currentStopIndex = nextIndex;
        bus.dwellTimeRemaining = 10 + Math.random() * 50;
        if (bus.currentStopIndex >= bus.stops.length - 1) {
          // Route complete — reverse or restart
          bus.currentStopIndex = 0;
        }
      }
      // Vary speed slightly
      bus.speed = Math.max(5, Math.min(60, bus.speed + (Math.random() - 0.5) * 4));
    }

    const { lat, lon, bearing } = computeCurrentPosition(bus);
    const position: BusPosition = {
      busId: bus.busId,
      vehicleNo: bus.vehicleNo,
      busNumber: bus.busNumber,
      routeId: bus.routeId,
      lat,
      lon,
      speed: Math.round(bus.speed),
      bearing: Math.round(bearing),
      lastUpdated: new Date().toISOString(),
      currentStopId: bus.dwellTimeRemaining > 0 ? bus.stops[bus.currentStopIndex].stopId : null,
    };

    // Write to Redis
    await redis.setEx(`bus:position:${busId}`, 30, JSON.stringify(position));
    // Publish to channel for Socket.IO server
    await redis.publish('bus:positions', JSON.stringify(position));
  }
}

async function main() {
  await redis.connect();
  await loadBuses();
  setInterval(tick, 3000);
  console.log('[Simulator] Running — publishing bus positions every 3s');
}

main().catch(console.error);
```

---

### 12.3 Frontend: WebSocket Hook

```typescript
// mobile/src/hooks/useBusTracking.ts
import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useBusStore } from '../store/busStore';
import { getAccessToken } from '../services/auth';
import { BusPosition, TripETA } from '@bustrack/shared/types';

const SOCKET_URL = process.env.SOCKET_URL!;

export function useBusTracking(busId: string | null) {
  const socketRef = useRef<Socket | null>(null);
  const { updateBusPosition, updateETA } = useBusStore();

  const connect = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) return;

    const socket = io(SOCKET_URL, {
      query: { token },
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected');
      if (busId) socket.emit('subscribe:bus', { busId });
    });

    socket.on('bus:position', (data: BusPosition) => {
      updateBusPosition(data);
    });

    socket.on('bus:eta', (data: TripETA) => {
      updateETA(data);
    });

    socket.on('connect_error', (err) => {
      console.error('[Socket] Connection error:', err.message);
    });

    socket.on('disconnect', (reason) => {
      console.warn('[Socket] Disconnected:', reason);
    });

    socketRef.current = socket;
  }, [busId]);

  useEffect(() => {
    connect();
    return () => {
      if (socketRef.current) {
        if (busId) socketRef.current.emit('unsubscribe:bus', { busId });
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [busId, connect]);

  return socketRef.current;
}
```

---

### 12.4 Frontend: Animated Bus Marker on Map

```typescript
// mobile/src/components/BusMarker.tsx
import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet, Text } from 'react-native';
import MapView, { Marker, AnimatedRegion } from 'react-native-maps';
import { BusPosition } from '@bustrack/shared/types';

interface Props {
  bus: BusPosition;
  onPress?: () => void;
  isSelected?: boolean;
}

export function BusMarker({ bus, onPress, isSelected }: Props) {
  const coordinate = useRef(
    new AnimatedRegion({
      latitude: bus.lat,
      longitude: bus.lon,
      latitudeDelta: 0,
      longitudeDelta: 0,
    })
  ).current;

  useEffect(() => {
    // Animate marker to new position over 2500ms (slightly less than 3s update interval)
    coordinate.timing({
      latitude: bus.lat,
      longitude: bus.lon,
      latitudeDelta: 0,
      longitudeDelta: 0,
      duration: 2500,
      useNativeDriver: false,
    }).start();
  }, [bus.lat, bus.lon]);

  return (
    <Marker.Animated
      coordinate={coordinate}
      onPress={onPress}
      anchor={{ x: 0.5, y: 0.5 }}
      flat
      rotation={bus.bearing}
    >
      <View style={[styles.markerContainer, isSelected && styles.selectedMarker]}>
        <Text style={styles.busNumber}>{bus.busNumber}</Text>
        {bus.speed === 0 && <View style={styles.stoppedIndicator} />}
      </View>
    </Marker.Animated>
  );
}

const styles = StyleSheet.create({
  markerContainer: {
    backgroundColor: '#0066FF',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  selectedMarker: {
    backgroundColor: '#FF6600',
    transform: [{ scale: 1.2 }],
  },
  busNumber: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  stoppedIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFD700',
    marginTop: 2,
  },
});
```

---

### 12.5 Frontend: ETA Display Screen

```typescript
// mobile/src/screens/TripETAScreen.tsx
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useBusStore } from '../store/busStore';
import { useBusTracking } from '../hooks/useBusTracking';
import { api } from '../services/api';
import { TripETA } from '@bustrack/shared/types';
import { formatETA, formatMinutes } from '../utils/time';

interface Props {
  busId: string;
  boardingStopId: string;
  destinationStopId: string;
}

export function TripETAScreen({ busId, boardingStopId, destinationStopId }: Props) {
  const [eta, setEta] = useState<TripETA | null>(null);
  const [loading, setLoading] = useState(true);
  const busPosition = useBusStore((s) => s.positions[busId]);

  useBusTracking(busId);

  const fetchETA = useCallback(async () => {
    try {
      const res = await api.post<TripETA>('/trips/eta', {
        busId,
        boardingStopId,
        destinationStopId,
      });
      setEta(res.data);
    } catch (err) {
      console.error('[ETA] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [busId, boardingStopId, destinationStopId]);

  // Re-fetch ETA each time bus position updates
  useEffect(() => {
    if (busPosition) fetchETA();
  }, [busPosition?.lastUpdated]);

  // Initial fetch
  useEffect(() => { fetchETA(); }, []);

  if (loading) return <ActivityIndicator size="large" style={styles.loader} />;
  if (!eta) return <Text style={styles.error}>Unable to compute ETA</Text>;

  const minutesToBoarding = Math.round(
    (new Date(eta.etaToBoarding).getTime() - Date.now()) / 60000
  );

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.label}>Bus arriving at your stop in</Text>
        <Text style={styles.etaLarge}>
          {minutesToBoarding <= 0 ? 'Arriving Now' : `${minutesToBoarding} min`}
        </Text>
        <Text style={styles.wallTime}>{formatETA(eta.etaToBoarding)}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Estimated arrival at destination</Text>
        <Text style={styles.etaMedium}>{formatETA(eta.etaToDestination)}</Text>
        <Text style={styles.distance}>{eta.distanceKm.toFixed(1)} km away</Text>
      </View>

      <View style={styles.trafficRow}>
        <View style={[styles.trafficDot, getTrafficColor(eta.trafficFactor)]} />
        <Text style={styles.trafficText}>{getTrafficLabel(eta.trafficFactor)}</Text>
      </View>

      <View style={styles.progressContainer}>
        <Text style={styles.label}>
          {eta.stopsToBoarding} stops to your boarding point
          ({eta.routeProgress.completedStops}/{eta.routeProgress.totalStops} completed)
        </Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${eta.routeProgress.percentComplete}%` }]} />
        </View>
      </View>
    </View>
  );
}

function getTrafficColor(factor: number): object {
  if (factor < 1.1) return { backgroundColor: '#22C55E' };
  if (factor < 1.4) return { backgroundColor: '#F59E0B' };
  return { backgroundColor: '#EF4444' };
}

function getTrafficLabel(factor: number): string {
  if (factor < 1.1) return 'Light traffic';
  if (factor < 1.4) return 'Moderate traffic';
  return 'Heavy traffic — delays expected';
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#F8FAFC' },
  loader: { flex: 1, justifyContent: 'center' },
  error: { textAlign: 'center', color: '#EF4444', marginTop: 20 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1,
    shadowRadius: 3, elevation: 2 },
  label: { fontSize: 13, color: '#64748B', marginBottom: 4 },
  etaLarge: { fontSize: 36, fontWeight: '800', color: '#0F172A' },
  etaMedium: { fontSize: 24, fontWeight: '700', color: '#0F172A' },
  wallTime: { fontSize: 14, color: '#64748B' },
  distance: { fontSize: 14, color: '#64748B' },
  trafficRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  trafficDot: { width: 12, height: 12, borderRadius: 6, marginRight: 8 },
  trafficText: { fontSize: 14, color: '#334155' },
  progressContainer: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16 },
  progressBar: { height: 8, backgroundColor: '#E2E8F0', borderRadius: 4, marginTop: 8 },
  progressFill: { height: 8, backgroundColor: '#0066FF', borderRadius: 4 },
});
```

---

### 12.6 Backend: ETA Computation Service

```typescript
// backend/src/services/etaService.ts
import { createClient } from 'redis';
import { prisma } from '../db/prisma';
import { BusPosition, TripETA } from '@bustrack/shared/types';

const redis = createClient({ url: process.env.REDIS_URL });

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function findClosestStopIndex(
  lat: number,
  lon: number,
  stops: Array<{ lat: number; lon: number }>
): number {
  let minDist = Infinity;
  let minIdx = 0;
  for (let i = 0; i < stops.length; i++) {
    const d = haversineKm(lat, lon, stops[i].lat, stops[i].lon);
    if (d < minDist) { minDist = d; minIdx = i; }
  }
  return minIdx;
}

async function getTrafficFactor(): Promise<number> {
  // Phase 1: return conservative estimate based on time of day
  const hour = new Date().getHours();
  if ((hour >= 8 && hour <= 10) || (hour >= 17 && hour <= 20)) return 1.4; // peak
  if ((hour >= 11 && hour <= 16)) return 1.1; // mid-day
  return 1.0; // off-peak
  // Phase 2: integrate Google Maps Traffic API here
}

export async function computeETA(
  busId: string,
  boardingStopId: string,
  destinationStopId: string
): Promise<TripETA> {
  // Check cache
  const cacheKey = `bus:eta:${busId}:${boardingStopId}:${destinationStopId}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  // Fetch bus position from Redis
  const posJson = await redis.get(`bus:position:${busId}`);
  if (!posJson) throw new Error('BUS_POSITION_NOT_FOUND');
  const pos: BusPosition = JSON.parse(posJson);

  // Fetch route stops in order
  const bus = await prisma.bus.findUnique({
    where: { id: busId },
    include: {
      route: {
        include: {
          routeStops: { include: { stop: true }, orderBy: { sequence: 'asc' } },
        },
      },
    },
  });
  if (!bus) throw new Error('BUS_NOT_FOUND');

  const stops = bus.route.routeStops.map((rs) => ({
    stopId: rs.stopId,
    lat: rs.stop.latitude,
    lon: rs.stop.longitude,
    name: rs.stop.name,
  }));

  const busStopIdx = findClosestStopIndex(pos.lat, pos.lon, stops);
  const boardingIdx = stops.findIndex((s) => s.stopId === boardingStopId);
  const destIdx = stops.findIndex((s) => s.stopId === destinationStopId);

  if (boardingIdx === -1 || destIdx === -1) throw new Error('STOP_NOT_ON_ROUTE');
  if (boardingIdx <= busStopIdx) {
    throw new Error('BUS_PASSED_BOARDING_STOP');
  }

  const trafficFactor = await getTrafficFactor();
  const AVG_SPEED_KMH = 22; // city bus average

  function timeMinutesBetween(fromIdx: number, toIdx: number): number {
    let totalKm = 0;
    for (let i = fromIdx; i < toIdx; i++) {
      totalKm += haversineKm(stops[i].lat, stops[i].lon, stops[i + 1].lat, stops[i + 1].lon);
    }
    return (totalKm / AVG_SPEED_KMH) * 60 * trafficFactor;
  }

  const minsToBoarding = timeMinutesBetween(busStopIdx, boardingIdx);
  const minsToDest = timeMinutesBetween(busStopIdx, destIdx);
  const now = Date.now();

  const eta: TripETA = {
    origin: stops[busStopIdx].stopId,
    destination: destinationStopId,
    boardingPoint: boardingStopId,
    etaToBoarding: new Date(now + minsToBoarding * 60000).toISOString(),
    etaToDestination: new Date(now + minsToDest * 60000).toISOString(),
    distanceKm: parseFloat(
      stops
        .slice(boardingIdx, destIdx)
        .reduce(
          (sum, s, i, arr) =>
            i < arr.length - 1
              ? sum + haversineKm(s.lat, s.lon, arr[i + 1].lat, arr[i + 1].lon)
              : sum,
          0
        )
        .toFixed(2)
    ),
    stopsToBoarding: boardingIdx - busStopIdx,
    stopsToDestination: destIdx - busStopIdx,
    trafficFactor,
    routeProgress: {
      completedStops: busStopIdx,
      totalStops: stops.length,
      percentComplete: parseFloat(((busStopIdx / stops.length) * 100).toFixed(1)),
    },
    busId,
  };

  // Cache for 30 seconds
  await redis.setEx(cacheKey, 30, JSON.stringify(eta));
  return eta;
}
```

---

### 12.7 Frontend: Auth Flow (Zustand Store + Axios)

```typescript
// mobile/src/store/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, setAuthTokens, clearAuthTokens } from '../services/api';
import { UserProfile } from '@bustrack/shared/types';

interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const res = await api.post('/auth/login', { email, password });
          const { accessToken, refreshToken, user } = res.data.data;
          await setAuthTokens(accessToken, refreshToken);
          set({ user, isAuthenticated: true, isLoading: false });
        } catch (err: any) {
          set({ isLoading: false });
          throw new Error(err.response?.data?.error?.message || 'Login failed');
        }
      },

      register: async (email, password, name) => {
        set({ isLoading: true });
        try {
          const res = await api.post('/auth/register', { email, password, name });
          const { accessToken, refreshToken, user } = res.data.data;
          await setAuthTokens(accessToken, refreshToken);
          set({ user, isAuthenticated: true, isLoading: false });
        } catch (err: any) {
          set({ isLoading: false });
          throw new Error(err.response?.data?.error?.message || 'Registration failed');
        }
      },

      logout: async () => {
        try {
          const refreshToken = await AsyncStorage.getItem('refreshToken');
          if (refreshToken) await api.post('/auth/logout', { refreshToken });
        } finally {
          await clearAuthTokens();
          set({ user: null, isAuthenticated: false });
        }
      },

      refreshSession: async () => {
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        if (!refreshToken) return false;
        try {
          const res = await api.post('/auth/refresh', { refreshToken });
          const { accessToken } = res.data.data;
          await AsyncStorage.setItem('accessToken', accessToken);
          return true;
        } catch {
          await clearAuthTokens();
          set({ user: null, isAuthenticated: false });
          return false;
        }
      },
    }),
    {
      name: 'auth-store',
      storage: AsyncStorage,
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);

// mobile/src/services/api.ts
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const api = axios.create({
  baseURL: process.env.API_BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach access token to every request
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401: attempt token refresh, retry once
let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      if (isRefreshing) {
        return new Promise((resolve) => {
          refreshQueue.push((token) => {
            original.headers.Authorization = `Bearer ${token}`;
            resolve(api(original));
          });
        });
      }
      isRefreshing = true;
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      try {
        const res = await axios.post(`${process.env.API_BASE_URL}/auth/refresh`, { refreshToken });
        const { accessToken } = res.data.data;
        await AsyncStorage.setItem('accessToken', accessToken);
        refreshQueue.forEach((cb) => cb(accessToken));
        refreshQueue = [];
        original.headers.Authorization = `Bearer ${accessToken}`;
        return api(original);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export async function setAuthTokens(access: string, refresh: string) {
  await AsyncStorage.multiSet([['accessToken', access], ['refreshToken', refresh]]);
}

export async function clearAuthTokens() {
  await AsyncStorage.multiRemove(['accessToken', 'refreshToken']);
}
```

---

## 13. TESTING STRATEGY

### 13.1 Unit Tests (Jest)

```typescript
// backend/src/__tests__/etaService.test.ts
describe('haversineKm', () => {
  it('calculates distance between two Chennai coordinates', () => {
    // Tambaram to Chromepet: ~3.1 km
    const dist = haversineKm(12.9249, 80.1239, 12.9516, 80.1430);
    expect(dist).toBeCloseTo(3.1, 0);
  });
});

describe('computeETA', () => {
  it('returns correct stop count to boarding', async () => {
    // Mock Redis and Prisma
    const eta = await computeETA('bus-001', 'stop-005', 'stop-010');
    expect(eta.stopsToBoarding).toBeGreaterThan(0);
    expect(new Date(eta.etaToBoarding).getTime()).toBeGreaterThan(Date.now());
  });

  it('throws BUS_PASSED_BOARDING_STOP when bus is ahead', async () => {
    await expect(computeETA('bus-001', 'stop-001', 'stop-005')).rejects.toThrow(
      'BUS_PASSED_BOARDING_STOP'
    );
  });
});
```

### 13.2 Integration Tests (Supertest)

```typescript
// backend/src/__tests__/auth.integration.test.ts
import request from 'supertest';
import { app } from '../app';

describe('POST /auth/register', () => {
  it('creates user and returns tokens', async () => {
    const res = await request(app).post('/v1/auth/register').send({
      email: `test${Date.now()}@example.com`,
      password: 'Test1234!',
      name: 'Test User',
    });
    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data).toHaveProperty('refreshToken');
  });

  it('returns 409 for duplicate email', async () => {
    const email = `dup${Date.now()}@example.com`;
    await request(app).post('/v1/auth/register').send({ email, password: 'Test1234!', name: 'A' });
    const res = await request(app)
      .post('/v1/auth/register')
      .send({ email, password: 'Test1234!', name: 'B' });
    expect(res.status).toBe(409);
  });
});
```

### 13.3 Performance Test (WebSocket Load)

```typescript
// tests/perf/wsLoad.ts  — run with: npx ts-node tests/perf/wsLoad.ts
import { io } from 'socket.io-client';

const CONCURRENT = 500;
const TOKEN = process.env.TEST_TOKEN!;
let connected = 0;
let updates = 0;

for (let i = 0; i < CONCURRENT; i++) {
  const socket = io(process.env.SOCKET_URL!, {
    query: { token: TOKEN },
    transports: ['websocket'],
  });
  socket.on('connect', () => {
    connected++;
    socket.emit('subscribe:route', { routeId: 'test-route-001' });
  });
  socket.on('bus:position', () => { updates++; });
}

setInterval(() => {
  console.log(`Connected: ${connected}/${CONCURRENT} | Position updates/3s: ${updates}`);
  updates = 0;
}, 3000);
```

**Acceptance target:** 500 concurrent WebSocket clients; each receiving bus:position updates every 3s; server CPU < 60%; memory < 1 GB.

---

## 14. LOCAL DEVELOPMENT SETUP

### 14.1 Prerequisites

```bash
Node.js 20 LTS
PostgreSQL 15 (or Docker)
Redis 7 (or Docker)
React Native CLI
Android Studio / Xcode
```

### 14.2 Repository Structure

```
bustrack/
├── packages/
│   └── shared/          # Shared TypeScript types (BusPosition, TripETA, etc.)
├── backend/
│   ├── src/
│   │   ├── routes/      # Express route handlers
│   │   ├── services/    # Business logic (etaService, busService)
│   │   ├── realtime/    # Socket.IO server
│   │   ├── middleware/  # Auth, rate limit, error handler
│   │   └── db/          # Prisma client
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   ├── .env.example
│   └── Dockerfile
├── simulator/
│   ├── src/simulator.ts
│   └── Dockerfile
├── mobile/
│   ├── src/
│   │   ├── screens/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── store/
│   │   └── navigation/
│   ├── android/
│   ├── ios/
│   └── .env.example
├── docker-compose.yml
└── README.md
```

### 14.3 Step-by-Step Setup

```bash
# 1. Clone repo
git clone https://github.com/your-org/bustrack.git && cd bustrack

# 2. Install all dependencies
npm install -ws  # workspaces

# 3. Start infrastructure (PostgreSQL + Redis)
docker compose up -d postgres redis

# 4. Set up backend environment
cp backend/.env.example backend/.env
# Edit backend/.env — add your Google Maps key, generate JWT secrets:
#   openssl rand -hex 64 (run twice, for access + refresh secrets)

# 5. Run DB migrations and seed data
cd backend
npx prisma migrate dev
npx ts-node prisma/seed.ts   # Seeds 10 routes, 50 stops, 30 buses

# 6. Start backend
npm run dev   # Starts on port 3000

# 7. Start GPS simulator (separate terminal)
cd ../simulator
npm run dev   # Starts pushing bus positions every 3s

# 8. Set up mobile environment
cd ../mobile
cp .env.example .env
# Edit .env — add API_BASE_URL=http://localhost:3000/v1

# 9. Install iOS pods (macOS only)
cd ios && pod install && cd ..

# 10. Run on Android
npx react-native run-android

# 11. Run on iOS
npx react-native run-ios
```

### 14.4 Docker Compose (Full Stack)

```yaml
# docker-compose.yml
version: '3.9'

services:
  postgres:
    image: postgis/postgis:15-3.3
    environment:
      POSTGRES_DB: bustrack
      POSTGRES_USER: bustrack
      POSTGRES_PASSWORD: bustrack_dev_password
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'

  backend:
    build: ./backend
    env_file: ./backend/.env
    ports:
      - '3000:3000'
    depends_on:
      - postgres
      - redis
    command: npm run dev

  simulator:
    build: ./simulator
    env_file: ./simulator/.env
    depends_on:
      - redis
      - postgres
    command: npm run dev

volumes:
  postgres_data:
```

---

## 15. PRODUCTION DEPLOYMENT PLAN

### 15.1 Infrastructure (AWS)

```
Route 53 (DNS)
    ↓
CloudFront (CDN for static assets)
    ↓
Application Load Balancer (HTTPS/WSS termination)
    ↓
ECS Fargate (Backend + Simulator containers)
    ↓
RDS PostgreSQL 15 (Multi-AZ)
    ↓
ElastiCache Redis (cluster mode)
```

### 15.2 CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci -ws
      - run: npm test -w backend
      - run: npm test -w mobile

  build-and-deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ap-south-1   # Mumbai for India latency
      - name: Build and push Docker image
        run: |
          aws ecr get-login-password | docker login --username AWS --password-stdin $ECR_REGISTRY
          docker build -t bustrack-backend ./backend
          docker tag bustrack-backend:latest $ECR_REGISTRY/bustrack-backend:$GITHUB_SHA
          docker push $ECR_REGISTRY/bustrack-backend:$GITHUB_SHA
      - name: Deploy to ECS
        run: |
          aws ecs update-service --cluster bustrack-prod \
            --service bustrack-backend \
            --force-new-deployment
```

### 15.3 Deployment Milestones

| Milestone | Date (relative) | Criteria |
|---|---|---|
| Dev environment up | Week 1 | Docker Compose running all services |
| Staging deploy | Week 4 | All MVP APIs deployed; simulator running |
| MVP release (closed beta) | Week 6 | 10 test users; buses showing live |
| Phase 2 release | Week 10 | Traffic ETA, push notifications live |
| Production open release | Week 12 | Load tested; monitoring in place |

### 15.4 Feature Flags

```typescript
// backend/src/config/features.ts
export const FEATURES = {
  TRAFFIC_ETA: process.env.FEATURE_TRAFFIC_ETA === 'true',
  PUSH_NOTIFICATIONS: process.env.FEATURE_PUSH_NOTIFICATIONS === 'true',
  OFFLINE_MAPS: process.env.FEATURE_OFFLINE_MAPS === 'true',
  MAP_PROVIDER_FALLBACK: process.env.FEATURE_MAP_FALLBACK === 'true',
};
```

---

## 16. NON-FUNCTIONAL REQUIREMENTS

| Category | Requirement |
|---|---|
| **Performance** | Map marker update latency < 500ms from bus GPS event to client render |
| **Scalability** | Backend handles 5,000 concurrent WebSocket connections per instance |
| **Availability** | 99.5% uptime SLA for production; auto-restart on crash |
| **Latency** | REST API p95 < 200ms; ETA computation < 150ms (cached) |
| **Data Freshness** | Bus positions never older than 10s on client screen |
| **Security** | No PII in logs; OWASP Top 10 addressed; annual pen-test |
| **Privacy** | User location used only for display, never stored server-side |
| **Offline** | Phase 3: app shows last-known bus position if network lost; banner shown |
| **Map quota** | Alert when Google Maps API at 80% daily quota; auto-fallback at 95% |
| **Battery** | Mobile: use coarse location for user; fine GPS only when tracking active |

---

## 17. DELIVERABLES CHECKLIST

### Backend
- [ ] `prisma/schema.prisma` — complete, migrations applied
- [ ] `prisma/seed.ts` — realistic seed: 5 routes, 20+ stops, 15+ buses
- [ ] All API endpoints matching contracts in Section 6
- [ ] Socket.IO server with room-based broadcasting
- [ ] JWT auth middleware
- [ ] Rate limiting middleware
- [ ] ETA computation service with caching
- [ ] Swagger / OpenAPI spec at `/docs`
- [ ] `.env.example` with all required keys
- [ ] Dockerfile + docker-compose.yml

### Simulator
- [ ] Reads routes from DB; moves buses realistically
- [ ] Publishes to Redis + Socket.IO channel every 3s
- [ ] Config: `SIMULATED_BUS_COUNT`, `TICK_INTERVAL_MS` env vars

### Mobile App
- [ ] Login / Register screens with validation
- [ ] Home screen: search + bus list
- [ ] Map screen: live bus marker + route polyline + stop markers
- [ ] Bus detail screen: all fields from GET /buses/:id
- [ ] ETA screen: boarding/destination selection + live ETA
- [ ] Favorites: save/remove routes
- [ ] `README.md` with setup instructions
- [ ] `.env.example` with all required keys

### Testing
- [ ] Unit tests: haversine, ETA computation, auth logic
- [ ] Integration tests: all auth endpoints, bus list, ETA endpoint
- [ ] WebSocket load test script (500 concurrent)
- [ ] Test coverage report: ≥ 70% for backend business logic

### Documentation
- [ ] `README.md` at root — local dev setup in ≤ 10 commands
- [ ] `ARCHITECTURE.md` — system diagram + data flow narrative
- [ ] Postman / Insomnia collection for all API endpoints
- [ ] Deployment runbook for staging and production

---

## APPENDIX A: SEED DATA TEMPLATE

```typescript
// backend/prisma/seed.ts (excerpt)
const routes = [
  { number: '47C', name: 'Tambaram to Broadway', stops: ['Tambaram', 'Chromepet', 'Pallavaram', 'Alandur', 'St. Thomas Mount', 'Guindy', 'Saidapet', 'T. Nagar', 'Egmore', 'Broadway'] },
  { number: '19H', name: 'Velachery to Central', stops: ['Velachery', 'Guindy', 'Saidapet', 'Nandanam', 'Anna Salai', 'Chennai Central'] },
];
// Coordinates should be real lat/lon for stops in Chennai
```

---

## APPENDIX B: GOOGLE MAPS API KEY RESTRICTIONS

- **Android key:** Restrict to `com.bustrack.app` package + SHA-1 fingerprint
- **iOS key:** Restrict to `com.bustrack.app` bundle ID
- **Backend key:** Restrict to server IP address; enable only Directions API, Distance Matrix API
- **Never** use an unrestricted key in any environment

---

## APPENDIX C: OSRM SELF-HOSTED ROUTING SETUP (Phase 3)

```bash
# Download Chennai OSM data
wget https://download.geofabrik.de/asia/india/tamil-nadu-latest.osm.pbf

# Process with OSRM
docker run -t -v "${PWD}:/data" ghcr.io/project-osrm/osrm-backend \
  osrm-extract -p /opt/car.lua /data/tamil-nadu-latest.osm.pbf
docker run -t -v "${PWD}:/data" ghcr.io/project-osrm/osrm-backend \
  osrm-partition /data/tamil-nadu-latest.osrm
docker run -t -v "${PWD}:/data" ghcr.io/project-osrm/osrm-backend \
  osrm-customize /data/tamil-nadu-latest.osrm

# Run OSRM HTTP server
docker run -t -i -p 5000:5000 -v "${PWD}:/data" ghcr.io/project-osrm/osrm-backend \
  osrm-routed --algorithm mld /data/tamil-nadu-latest.osrm

# Query routing
curl "http://localhost:5000/route/v1/driving/80.1239,12.9249;80.2209,13.0827?overview=full&geometries=geojson"
```

---

*End of Master Implementation Prompt — Version 1.0.0*  
*Maintain this document in `/docs/IMPLEMENTATION_PROMPT.md` in the monorepo root.*
