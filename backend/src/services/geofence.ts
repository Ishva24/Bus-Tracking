import { GeoPoint, haversineDistanceMeters } from './routeDeviation.js';

export type GeofenceType = 'CIRCULAR' | 'POLYGON';

export interface GeofenceDefinition {
  id: string;
  name: string;
  type: GeofenceType;
  center?: GeoPoint;
  radiusMeters?: number;
  polygon?: GeoPoint[];
  metadata?: Record<string, any>;
}

export type GeofenceEventType = 'ENTER' | 'DWELL' | 'EXIT';

export interface GeofenceEvent {
  geofenceId: string;
  entityId: string;
  eventType: GeofenceEventType;
  point: GeoPoint;
  timestamp: Date;
}

export class GeofenceManager {
  private geofences: Map<string, GeofenceDefinition> = new Map();
  private entityInsideState: Map<string, Set<string>> = new Map();

  public registerGeofence(fence: GeofenceDefinition): void {
    this.geofences.set(fence.id, fence);
  }

  public removeGeofence(id: string): void {
    this.geofences.delete(id);
  }

  public isPointInside(point: GeoPoint, fenceId: string): boolean {
    const fence = this.geofences.get(fenceId);
    if (!fence) return false;

    if (fence.type === 'CIRCULAR' && fence.center && fence.radiusMeters) {
      const dist = haversineDistanceMeters(point, fence.center);
      return dist <= fence.radiusMeters;
    }

    if (fence.type === 'POLYGON' && fence.polygon && fence.polygon.length >= 3) {
      return this.pointInPolygon(point, fence.polygon);
    }

    return false;
  }

  public evaluateEntityPosition(entityId: string, point: GeoPoint): GeofenceEvent[] {
    const events: GeofenceEvent[] = [];
    let currentInside = this.entityInsideState.get(entityId);
    if (!currentInside) {
      currentInside = new Set<string>();
      this.entityInsideState.set(entityId, currentInside);
    }

    for (const [id, fence] of this.geofences.entries()) {
      const isInside = this.isPointInside(point, id);
      const wasInside = currentInside.has(id);

      if (isInside && !wasInside) {
        currentInside.add(id);
        events.push({
          geofenceId: id,
          entityId,
          eventType: 'ENTER',
          point,
          timestamp: new Date(),
        });
      } else if (!isInside && wasInside) {
        currentInside.delete(id);
        events.push({
          geofenceId: id,
          entityId,
          eventType: 'EXIT',
          point,
          timestamp: new Date(),
        });
      } else if (isInside && wasInside) {
        events.push({
          geofenceId: id,
          entityId,
          eventType: 'DWELL',
          point,
          timestamp: new Date(),
        });
      }
    }

    return events;
  }

  private pointInPolygon(point: GeoPoint, polygon: GeoPoint[]): boolean {
    const x = point.longitude;
    const y = point.latitude;
    let inside = false;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].longitude;
      const yi = polygon[i].latitude;
      const xj = polygon[j].longitude;
      const yj = polygon[j].latitude;

      const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }

    return inside;
  }
}
