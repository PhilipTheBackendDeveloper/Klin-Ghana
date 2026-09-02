import { createIotServer } from './iotServer';

const port = Number(process.env.IOT_SERVER_PORT || 3001);
const server = createIotServer(port);

server.listen(port, () => {
  console.log(`[IOT-SERVER] Listening on http://localhost:${port}/api/iot-telemetry`);
});

process.on('SIGINT', () => {
  server.close(() => process.exit(0));
});
