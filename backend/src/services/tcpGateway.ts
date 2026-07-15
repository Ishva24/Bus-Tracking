import net from 'net';
import { processGpsTelemetry } from './gpsIngestion';

export function startTcpGateway() {
  const port = parseInt(process.env.TCP_GATEWAY_PORT || '5001', 10);

  const server = net.createServer((socket) => {
    console.log(`[TCP Gateway] GPS device connected from ${socket.remoteAddress}:${socket.remotePort}`);

    let buffer = '';

    socket.on('data', async (data) => {
      buffer += data.toString();
      
      // Split by newlines (standard GPS sentences end with CR/LF or LF)
      let lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        try {
          console.log(`[TCP Gateway] Raw GPS payload: ${trimmed}`);
          
          if (trimmed.startsWith('$GPRMC')) {
            // NMEA $GPRMC raw format parsing:
            // e.g., $GPRMC,123519,A,1304.044,N,8014.004,E,022.4,084.4,230394,003.1,W*6A
            // For NMEA, we assume the format is: VEHICLE_NO:$GPRMC...
            // Or if they just send raw NMEA we won't know the vehicle. Let's support "VEHICLE_NO:$GPRMC..."
            const prefixIndex = trimmed.indexOf(':');
            if (prefixIndex === -1) {
              console.warn(`[TCP Gateway] Received raw NMEA without VEHICLE_NO prefix. Example expected format: TN01AB1234:$GPRMC...`);
              continue;
            }
            
            const vehicleNo = trimmed.substring(0, prefixIndex).trim();
            const nmeaPart = trimmed.substring(prefixIndex + 1).trim();

            const parts = nmeaPart.split(',');
            if (parts[2] === 'A') { // Status A = Active / Valid GPS
              const rawLat = parts[3];
              const latDir = parts[4];
              const rawLon = parts[5];
              const lonDir = parts[6];
              const speedKnots = parseFloat(parts[7]) || 0;
              const bearingDeg = parseFloat(parts[8]) || 0;

              // NMEA coordinate mapping: e.g. 1304.044 -> 13 degrees, 4.044 minutes -> 13 + 4.044/60 = 13.0674
              const lat = parseNmeaCoordinate(rawLat, latDir, 2);
              const lon = parseNmeaCoordinate(rawLon, lonDir, 3);
              const speedKmh = Math.round(speedKnots * 1.852);

              if (lat && lon) {
                await processGpsTelemetry({
                  vehicleNo,
                  lat,
                  lon,
                  speed: speedKmh,
                  bearing: Math.round(bearingDeg),
                });
              }
            }
          } else {
            // Custom direct format: VEHICLE_NO,LAT,LON,SPEED,BEARING
            // e.g., TN01AB1234,13.0674,80.2058,35,90
            const parts = trimmed.split(',');
            if (parts.length >= 3) {
              const vehicleNo = parts[0].trim();
              const lat = parseFloat(parts[1]);
              const lon = parseFloat(parts[2]);
              const speed = parts[3] ? parseFloat(parts[3]) : 0;
              const bearing = parts[4] ? parseFloat(parts[4]) : 0;

              if (!isNaN(lat) && !isNaN(lon)) {
                await processGpsTelemetry({
                  vehicleNo,
                  lat,
                  lon,
                  speed,
                  bearing,
                });
              }
            }
          }
        } catch (err) {
          console.error('[TCP Gateway] Error parsing GPS line:', (err as any).message);
        }
      }
    });

    socket.on('close', () => {
      console.log(`[TCP Gateway] GPS device disconnected`);
    });

    socket.on('error', (err: any) => {
      console.error('[TCP Gateway] Socket connection error:', err.message);
    });
  });

  server.listen(port, () => {
    console.log(`[TCP Gateway] Ingestion listening on TCP port ${port}`);
  });
}

function parseNmeaCoordinate(val: string, dir: string, degLength: number): number {
  if (!val || !dir) return 0;
  const degrees = parseInt(val.substring(0, degLength), 10);
  const minutes = parseFloat(val.substring(degLength));
  let decimal = degrees + minutes / 60;
  if (dir === 'S' || dir === 'W') decimal = -decimal;
  return decimal;
}
