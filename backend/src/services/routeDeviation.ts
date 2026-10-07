export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface RouteWaypoint extends GeoPoint {
  stopId?: string;
  sequence: number;
}

export interface DeviationStatus {
  busId: string;
  routeId: string;
  isDeviated: boolean;
  distanceFromRouteMeters: number;
  nearestSegmentIndex: number;
  timestamp: Date;
  severity: 'NORMAL' | 'WARNING' | 'CRITICAL';
}

const EARTH_RADIUS_METERS = 6371000;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function haversineDistanceMeters(p1: GeoPoint, p2: GeoPoint): number {
  const dLat = toRadians(p2.latitude - p1.latitude);
  const dLon = toRadians(p2.longitude - p1.longitude);
  const lat1 = toRadians(p1.latitude);
  const lat2 = toRadians(p2.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
}

function perpendicularDistanceMeters(point: GeoPoint, lineStart: GeoPoint, lineEnd: GeoPoint): number {
  const dAB = haversineDistanceMeters(lineStart, lineEnd);
  if (dAB === 0) {
    return haversineDistanceMeters(point, lineStart);
  }

  const dAP = haversineDistanceMeters(lineStart, point);
  const dBP = haversineDistanceMeters(lineEnd, point);

  // If projection falls outside segment endpoints
  if (dAP * dAP >= dBP * dBP + dAB * dAB) return dBP;
  if (dBP * dBP >= dAP * dAP + dAB * dAB) return dAP;

  // Cross-track approximation
  const s = (dAP + dBP + dAB) / 2;
  const area = Math.sqrt(Math.max(0, s * (s - dAP) * (s - dBP) * (s - dAB)));
  return (2 * area) / dAB;
}

export class RouteDeviationEngine {
  private thresholdWarningMeters: number;
  private thresholdCriticalMeters: number;
  private busStates: Map<string, { lastDeviated: boolean; lastAlertTimestamp?: Date }> = new Map();

  constructor(thresholdWarningMeters = 80, thresholdCriticalMeters = 180) {
    this.thresholdWarningMeters = thresholdWarningMeters;
    this.thresholdCriticalMeters = thresholdCriticalMeters;
  }

  public evaluatePosition(
    busId: string,
    routeId: string,
    currentPos: GeoPoint,
    routePolyline: RouteWaypoint[]
  ): DeviationStatus {
    if (routePolyline.length === 0) {
      return {
        busId,
        routeId,
        isDeviated: false,
        distanceFromRouteMeters: 0,
        nearestSegmentIndex: -1,
        timestamp: new Date(),
        severity: 'NORMAL',
      };
    }

    if (routePolyline.length === 1) {
      const dist = haversineDistanceMeters(currentPos, routePolyline[0]);
      return {
        busId,
        routeId,
        isDeviated: dist > this.thresholdWarningMeters,
        distanceFromRouteMeters: Math.round(dist),
        nearestSegmentIndex: 0,
        timestamp: new Date(),
        severity: dist > this.thresholdCriticalMeters ? 'CRITICAL' : dist > this.thresholdWarningMeters ? 'WARNING' : 'NORMAL',
      };
    }

    let minDistance = Infinity;
    let nearestIndex = 0;

    for (let i = 0; i < routePolyline.length - 1; i++) {
      const d = perpendicularDistanceMeters(currentPos, routePolyline[i], routePolyline[i + 1]);
      if (d < minDistance) {
        minDistance = d;
        nearestIndex = i;
      }
    }

    const roundedDistance = Math.round(minDistance);
    const isDeviated = roundedDistance > this.thresholdWarningMeters;
    let severity: 'NORMAL' | 'WARNING' | 'CRITICAL' = 'NORMAL';

    if (roundedDistance >= this.thresholdCriticalMeters) {
      severity = 'CRITICAL';
    } else if (roundedDistance >= this.thresholdWarningMeters) {
      severity = 'WARNING';
    }

    const prior = this.busStates.get(busId);
    this.busStates.set(busId, {
      lastDeviated: isDeviated,
      lastAlertTimestamp: isDeviated ? new Date() : prior?.lastAlertTimestamp,
    });

    return {
      busId,
      routeId,
      isDeviated,
      distanceFromRouteMeters: roundedDistance,
      nearestSegmentIndex: nearestIndex,
      timestamp: new Date(),
      severity,
    };
  }

  public resetBusState(busId: string): void {
    this.busStates.delete(busId);
  }
}
