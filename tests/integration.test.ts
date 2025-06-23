import request from 'supertest';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { startTestServer, stopTestServer, getServerAddress } from './test-server';
import { setupTestDatabase, cleanupTestDatabase, seedTestData } from './test-utils';

dotenv.config();

// Skip integration tests if no test database is configured
const skipIntegrationTests = !process.env.TEST_DATABASE_URL && !process.env.DATABASE_URL;

describe('API Integration Tests', () => {
  let pool: Pool;
  let serverAddress: string;

  beforeAll(async () => {
    if (skipIntegrationTests) {
      console.log('Skipping integration tests - no test database configured');
      return;
    }

    // Start test server
    serverAddress = await startTestServer();

    pool = new Pool({
      connectionString: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
      ssl: false,
    });

    await setupTestDatabase(pool);
    await seedTestData(pool);
  });

  afterAll(async () => {
    if (pool) {
      await cleanupTestDatabase(pool);
      await pool.end();
    }
    await stopTestServer();
  });

  beforeEach(async () => {
    if (skipIntegrationTests) return;
    // Reset test data before each test
    await seedTestData(pool);
  });

  (skipIntegrationTests ? describe.skip : describe)('Real Database Tests', () => {
    it('should fetch videos from real database', async () => {
      const response = await request(serverAddress)
        .get('/api/videos')
        .expect(200);

      expect(response.body).toHaveProperty('videos');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('limit');
      expect(Array.isArray(response.body.videos)).toBe(true);
    });

    it('should fetch categories from real database', async () => {
      const response = await request(serverAddress)
        .get('/api/categories')
        .expect(200);

      expect(response.body).toHaveProperty('categories');
      expect(Array.isArray(response.body.categories)).toBe(true);
    });

    it('should fetch featured videos from real database', async () => {
      const response = await request(serverAddress)
        .get('/api/videos/featured')
        .expect(200);

      expect(response.body).toHaveProperty('videos');
      expect(Array.isArray(response.body.videos)).toBe(true);
    });

    it('should fetch specific video and increment view count', async () => {
      // First, get list of videos to find a video ID
      const videosResponse = await request(serverAddress)
        .get('/api/videos')
        .expect(200);

      if (videosResponse.body.videos.length === 0) {
        console.log('No videos found, skipping view count test');
        return;
      }

      const videoId = videosResponse.body.videos[0].id;

      // Get the initial view count
      const initialResponse = await request(serverAddress)
        .get(`/api/videos/${videoId}`)
        .expect(200);

      const initialViewCount = initialResponse.body.video.view_count;

      // Fetch the same video again
      const secondResponse = await request(serverAddress)
        .get(`/api/videos/${videoId}`)
        .expect(200);

      expect(secondResponse.body.video.view_count).toBe(initialViewCount + 1);
    });

    it('should handle search functionality', async () => {
      const response = await request(serverAddress)
        .get('/api/videos?search=test')
        .expect(200);

      expect(response.body).toHaveProperty('videos');
      // Should find videos with "test" in title or description
      const hasTestInResults = response.body.videos.some((video: any) => 
        video.title.toLowerCase().includes('test') || 
        (video.description && video.description.toLowerCase().includes('test'))
      );
      expect(hasTestInResults).toBe(true);
    });

    it('should handle category filtering', async () => {
      const response = await request(serverAddress)
        .get('/api/videos?category=travel')
        .expect(200);

      expect(response.body).toHaveProperty('videos');
      // All returned videos should be in travel category
      response.body.videos.forEach((video: any) => {
        if (video.category) {
          expect(video.category.slug).toBe('travel');
        }
      });
    });

    it('should handle pagination', async () => {
      const page1Response = await request(serverAddress)
        .get('/api/videos?page=1&limit=1')
        .expect(200);

      const page2Response = await request(serverAddress)
        .get('/api/videos?page=2&limit=1')
        .expect(200);

      expect(page1Response.body.page).toBe(1);
      expect(page1Response.body.limit).toBe(1);
      expect(page2Response.body.page).toBe(2);
      expect(page2Response.body.limit).toBe(1);

      // Videos should be different (if there are enough videos)
      if (page1Response.body.videos.length > 0 && page2Response.body.videos.length > 0) {
        expect(page1Response.body.videos[0].id).not.toBe(page2Response.body.videos[0].id);
      }
    });

    it('should return 404 for non-existent video', async () => {
      const response = await request(serverAddress)
        .get('/api/videos/non-existent-id')
        .expect(404);

      expect(response.body).toEqual({
        error: 'Video not found',
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed requests gracefully', async () => {
      const response = await request(serverAddress)
        .get('/api/videos?page=invalid&limit=invalid')
        .expect(200);

      // Should default to page 1, limit 12
      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(12);
    });

    it('should handle very large page numbers', async () => {
      const response = await request(serverAddress)
        .get('/api/videos?page=999999&limit=10')
        .expect(200);

      expect(response.body).toHaveProperty('videos');
      expect(Array.isArray(response.body.videos)).toBe(true);
      // Should return empty array for pages beyond available data
    });

    it('should handle very large limit values', async () => {
      const response = await request(serverAddress)
        .get('/api/videos?limit=999999')
        .expect(200);

      expect(response.body).toHaveProperty('videos');
      expect(Array.isArray(response.body.videos)).toBe(true);
      // Should still work, though might be slow
    });
  });

  describe('API Performance', () => {
    it('should respond to health check quickly', async () => {
      const startTime = Date.now();
      
      await request(serverAddress)
        .get('/health')
        .expect(200);
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      // Should respond within 100ms
      expect(responseTime).toBeLessThan(100);
    });

    it('should handle concurrent requests', async () => {
      const requests = Array(10).fill(null).map(() => 
        request(serverAddress).get('/api/videos').expect(200)
      );

      const responses = await Promise.all(requests);
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.body).toHaveProperty('videos');
      });
    });
  });
});