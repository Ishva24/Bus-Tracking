import { RouteDeviationEngine, RouteWaypoint, haversineDistanceMeters } from '../services/routeDeviation.js';
import { GeofenceManager, GeofenceDefinition } from '../services/geofence.js';

describe('RouteDeviationEngine', () => {
  const sampleRoute: RouteWaypoint[] = [
    { sequence: 1, latitude: 12.9716, longitude: 77.5946 }, // Majestic
    { sequence: 2, latitude: 12.9750, longitude: 77.6000 },
    { sequence: 3, latitude: 12.9800, longitude: 77.6100 }, // MG Road
  ];

  it('reports NORMAL status when bus is exactly on path', () => {
    const engine = new RouteDeviationEngine(80, 180);
    const pos = { latitude: 12.9716, longitude: 77.5946 };
    const status = engine.evaluatePosition('bus-101', 'route-A', pos, sampleRoute);

    expect(status.isDeviated).toBe(false);
    expect(status.severity).toBe('NORMAL');
    expect(status.distanceFromRouteMeters).toBeLessThan(10);
  });

  it('detects WARNING deviation when bus drifts beyond 80m', () => {
    const engine = new RouteDeviationEngine(80, 180);
    // Drift approximately 100m west
    const pos = { latitude: 12.9750, longitude: 77.5990 };
    const status = engine.evaluatePosition('bus-101', 'route-A', pos, sampleRoute);

    expect(status.isDeviated).toBe(true);
    expect(['WARNING', 'CRITICAL']).toContain(status.severity);
  });

  it('detects CRITICAL deviation when bus drifts far off course', () => {
    const engine = new RouteDeviationEngine(80, 180);
    // Drift > 1km away
    const pos = { latitude: 12.9900, longitude: 77.6500 };
    const status = engine.evaluatePosition('bus-101', 'route-A', pos, sampleRoute);

    expect(status.isDeviated).toBe(true);
    expect(status.severity).toBe('CRITICAL');
    expect(status.distanceFromRouteMeters).toBeGreaterThan(180);
  });
});

describe('GeofenceManager', () => {
  const terminalGeofence: GeofenceDefinition = {
    id: 'terminal-hub-1',
    name: 'City Central Terminal',
    type: 'CIRCULAR',
    center: { latitude: 12.9716, longitude: 77.5946 },
    radiusMeters: 200,
  };

  it('detects ENTER and EXIT events as vehicle moves', () => {
    const manager = new GeofenceManager();
    manager.registerGeofence(terminalGeofence);

    // Initial position outside (500m away)
    const posOutside = { latitude: 12.9760, longitude: 77.5946 };
    const events1 = manager.evaluateEntityPosition('bus-101', posOutside);
    expect(events1.length).toBe(0);

    // Move inside terminal (at center)
    const posInside = { latitude: 12.9716, longitude: 77.5946 };
    const events2 = manager.evaluateEntityPosition('bus-101', posInside);
    expect(events2.length).toBe(1);
    expect(events2[0].eventType).toBe('ENTER');
    expect(events2[0].geofenceId).toBe('terminal-hub-1');

    // Dwell inside
    const events3 = manager.evaluateEntityPosition('bus-101', posInside);
    expect(events3.length).toBe(1);
    expect(events3[0].eventType).toBe('DWELL');

    // Exit terminal
    const events4 = manager.evaluateEntityPosition('bus-101', posOutside);
    expect(events4.length).toBe(1);
    expect(events4[0].eventType).toBe('EXIT');
  });
});
