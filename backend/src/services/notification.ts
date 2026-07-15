import { BusPosition } from '@bustrack/shared';
import { prisma } from '../db/prisma';
import { haversineDistance } from '@bustrack/shared';

export async function evaluateProximityAlerts(position: BusPosition) {
  try {
    const alerts = await prisma.proximityAlert.findMany({
      where: { busId: position.busId, triggered: false },
      include: {
        user: {
          include: {
            fcmTokens: true,
          },
        },
        stop: true,
        bus: true,
      },
    });

    if (alerts.length === 0) return;

    const routeStops = await prisma.routeStop.findMany({
      where: { routeId: position.routeId },
      orderBy: { sequence: 'asc' },
      include: { stop: true },
    });

    const stops = routeStops.map((rs) => ({
      stopId: rs.stopId,
      name: rs.stop.name,
      lat: rs.stop.latitude,
      lon: rs.stop.longitude,
    }));

    let currentStopIdx = 0;
    if (position.currentStopId) {
      const exact = stops.findIndex((stop) => stop.stopId === position.currentStopId);
      if (exact >= 0) currentStopIdx = exact;
    } else {
      let nearestIndex = 0;
      let nearestDistance = Number.MAX_SAFE_INTEGER;
      stops.forEach((stop, index) => {
        const distance = haversineDistance(position.lat, position.lon, stop.lat, stop.lon);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = index;
        }
      });
      currentStopIdx = nearestIndex;
    }

    for (const alert of alerts) {
      const boardingIdx = stops.findIndex((stop) => stop.stopId === alert.boardingStopId);
      if (boardingIdx === -1) continue;

      const stopsAway = boardingIdx - currentStopIdx;

      if (stopsAway >= 0 && stopsAway <= alert.stopsThreshold) {
        console.log(`🔔 PROXIMITY ALERT TRIGGERED: Bus ${alert.bus.busNumber} is ${stopsAway} stops away from ${alert.stop.name} for User ${alert.user.name}`);

        if (alert.user.fcmTokens.length > 0) {
          for (const tokenRecord of alert.user.fcmTokens) {
            console.log(`📱 Sending FCM Push Notification to device token "${tokenRecord.token}" (${tokenRecord.platform}):`);
            console.log(`   Title: Bus Approaching!`);
            console.log(`   Body: Bus ${alert.bus.busNumber} is ${stopsAway} stops away from your boarding stop: ${alert.stop.name}.`);
          }
        } else {
          console.log(`   (User ${alert.user.name} has no registered FCM tokens; skipped sending push payload)`);
        }

        await prisma.proximityAlert.update({
          where: { id: alert.id },
          data: { triggered: true },
        });
      }
    }
  } catch (error: any) {
    console.error('Error evaluating proximity alerts:', error.message);
  }
}
