import { serve } from '@hono/node-server';
import { AddressInfo } from 'net';
import app from '../api/app';

let server: any;
let serverAddress: string;

export const startTestServer = async (): Promise<string> => {
  return new Promise((resolve, reject) => {
    server = serve({
      fetch: app.fetch,
      port: 0, // Use random available port
    });

    server.on('listening', () => {
      const address = server.address() as AddressInfo;
      serverAddress = `http://localhost:${address.port}`;
      resolve(serverAddress);
    });

    server.on('error', reject);
  });
};

export const stopTestServer = async (): Promise<void> => {
  return new Promise((resolve) => {
    if (server) {
      server.close(() => {
        resolve();
      });
    } else {
      resolve();
    }
  });
};

export const getServerAddress = (): string => {
  return serverAddress;
};