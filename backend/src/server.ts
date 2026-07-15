import { createServer } from 'http';
import { app } from './app';
import { config, validateConfig } from './config';
import { prisma } from './db/prisma';
import { redis } from './db/redis';
import { createSocketServer } from './realtime/socket';
import { startMqttIngestion } from './services/mqttIngestion';
import { startTcpGateway } from './services/tcpGateway';

async function start() {
  validateConfig();

  try {
    await prisma.$connect();
    await redis.connect();
  } catch (error) {
    console.error('Startup dependency failure', error);
    process.exit(1);
  }

  // Launch real-time production GPS telemetry listeners
  try {
    startMqttIngestion();
    startTcpGateway();
  } catch (err) {
    console.error('Failed to start GPS ingestion servers', err);
  }

  const server = createServer(app);
  createSocketServer(server);

  server.listen(config.port, () => {
    console.log(`BusTrack API listening on port ${config.port}`);
  });
}

start();
