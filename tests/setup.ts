import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

// Test database setup
let testPool: Pool | null = null;

beforeAll(async () => {
  // Use test database
  testPool = new Pool({
    connectionString: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
    ssl: false,
  });
});

afterAll(async () => {
  if (testPool) {
    await testPool.end();
  }
});

// Global test utilities
global.testPool = testPool;

// Mock console.log in tests to avoid noise
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
};