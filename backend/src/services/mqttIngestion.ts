import mqtt from 'mqtt';
import { processGpsTelemetry } from './gpsIngestion';

export function startMqttIngestion() {
  // Use HiveMQ public broker for default out-of-the-box sandbox testing, easily configured via process.env
  const mqttUrl = process.env.MQTT_BROKER_URL || 'mqtt://broker.hivemq.com';
  const topic = 'tamilnadu/buses/+/positions';

  console.log(`[MQTT Ingestion] Connecting to MQTT broker at ${mqttUrl}...`);
  const client = mqtt.connect(mqttUrl);

  client.on('connect', () => {
    console.log(`[MQTT Ingestion] Connected to MQTT broker. Subscribing to topic: ${topic}`);
    client.subscribe(topic, (err) => {
      if (err) {
        console.error(`[MQTT Ingestion] Failed to subscribe to topic ${topic}`, err);
      }
    });
  });

  client.on('message', async (receivedTopic, message) => {
    try {
      const payload = JSON.parse(message.toString());
      
      // Parse vehicleNo from topic or payload
      // Topic structure: tamilnadu/buses/{vehicleNo}/positions
      const topicParts = receivedTopic.split('/');
      const vehicleNoFromTopic = topicParts[2];

      const vehicleNo = payload.vehicleNo || vehicleNoFromTopic;
      if (!vehicleNo) {
        console.warn(`[MQTT Ingestion] Missing vehicleNo in payload or topic: ${receivedTopic}`);
        return;
      }

      await processGpsTelemetry({
        vehicleNo,
        lat: parseFloat(payload.lat),
        lon: parseFloat(payload.lon),
        speed: payload.speed !== undefined ? parseFloat(payload.speed) : undefined,
        bearing: payload.bearing !== undefined ? parseFloat(payload.bearing) : undefined,
        timestamp: payload.timestamp || new Date().toISOString(),
      });
    } catch (error) {
      console.error('[MQTT Ingestion] Error parsing MQTT message:', (error as any).message);
    }
  });

  client.on('error', (error: any) => {
    console.error('[MQTT Ingestion] MQTT Connection error:', error.message);
  });
}
