import http from 'node:http';
import { appConfig } from './config/app.config';
import './config/database.config';
import './config/auth.config';
import './config/integration.config';
import { createApp } from './app';
import { dbPool } from './database/connection';
import { initializeSocketServer } from './socket/socketServer';

const app = createApp();
const httpServer = http.createServer(app);
const io = initializeSocketServer(httpServer);

httpServer.listen(appConfig.port, () => {
  console.log(
    `[contactless-api] Listening on port ${appConfig.port} (${appConfig.nodeEnv}) in UTC mode`,
  );
});

async function shutdown(signal: string): Promise<void> {
  console.log(`[contactless-api] Received ${signal}; shutting down gracefully...`);
  io.close();
  httpServer.close(async () => {
    await dbPool.end();
    process.exit(0);
  });
}

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});
