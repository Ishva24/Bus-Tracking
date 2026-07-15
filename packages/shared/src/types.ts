// Bus and Route Types
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

export interface Bus {
  id: string;
  vehicleNo: string;
  busNumber: string;
  routeId: string;
  status: BusStatus;
  capacity: number;
  createdAt: string;
  updatedAt: string;
}

export type BusStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';

export interface BusWithPosition extends Bus {
  routeName: string;
  currentPosition: BusPosition | null;
}

// Route and Stop Types
export interface Route {
  id: string;
  name: string;
  number: string;
  description?: string;
  createdAt: string;
}

export interface RouteWithStops extends Route {
  stops: StopWithSequence[];
}

export interface Stop {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  createdAt: string;
}

export interface StopWithSequence extends Stop {
  stopId: string;
  sequence: number;
}

export interface RouteStop {
  id: string;
  routeId: string;
  stopId: string;
  sequence: number;
}

export interface RouteSummary {
  id: string;
  name: string;
  number: string;
  stopCount: number;
  activeBusCount: number;
}

// ETA and Trip Types
export interface TripETA {
  busId: string;
  boardingStopId: string;
  destinationStopId: string;
  boardingStopName: string;
  destinationStopName: string;
  etaToBoarding: string;   // ISO 8601
  etaToDestination: string; // ISO 8601
  distanceKm: number;
  distanceToBoardingKm?: number;
  distanceToDestinationKm?: number;
  stopsToBoarding: number;
  stopsToDestination: number;
  trafficFactor: number;   // multiplier, e.g., 1.3 = 30% slower
  trafficDescription: string;
  routeProgress: RouteProgress;
}

export interface RouteProgress {
  completedStops: number;
  totalStops: number;
  percentComplete: number;
}

export interface ETAMRequest {
  busId: string;
  boardingStopId: string;
  destinationStopId: string;
}

// User and Auth Types
export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile extends User {
  favoriteRoutes: string[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest extends LoginRequest {
  name: string;
  phone?: string;
}

export interface AuthResponse {
  success: true;
  data: AuthTokens & { user: User };
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: Pagination;
}

// WebSocket Event Types
export type SocketEventType =
  | 'subscribe:bus'
  | 'unsubscribe:bus'
  | 'subscribe:route'
  | 'unsubscribe:route'
  | 'request:eta'
  | 'bus:position'
  | 'bus:eta'
  | 'bus:stopped'
  | 'bus:departed'
  | 'route:update'
  | 'error'
  | 'connected';

export interface SocketSubscribeBus {
  busId: string;
}

export interface SocketSubscribeRoute {
  routeId: string;
}

export interface SocketRequestETA {
  busId: string;
  boardingStopId: string;
  destinationStopId: string;
}

export interface SocketBusStopped {
  busId: string;
  stopId: string;
  stopName: string;
}

export interface SocketBusDeparted {
  busId: string;
  stopId: string;
}

export interface SocketRouteUpdate {
  routeId: string;
  activeBuses: BusPosition[];
}

export interface SocketError {
  code: string;
  message: string;
}

export interface SocketConnected {
  userId: string;
}

// Nearby Stop Types
export interface NearbyStop extends Stop {
  distanceM: number;
  routes: string[];
}

// FCM Types
export interface FCMTokenRequest {
  token: string;
  platform: 'ios' | 'android';
}

// Favorite Routes
export interface FavoriteRoute {
  id: string;
  userId: string;
  routeId: string;
  createdAt: string;
}

// Map Provider Types
export type MapProvider = 'google' | 'maplibre' | 'osm';

export interface MapProviderConfig {
  id: string;
  providerName: MapProvider;
  apiKey?: string;
  isActive: boolean;
  usageLimitPerDay?: number;
  fallbackEnabled: boolean;
  updatedAt: string;
}