import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

// Mock PostgreSQL connection
const mockPool = {
  query: jest.fn(),
  end: jest.fn(),
} as any;

// Mock fs functions
jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

// Mock dotenv
jest.mock('dotenv', () => ({
  config: jest.fn(),
}));

// Mock Pool
jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => mockPool),
}));

// Mock @hono/node-server to prevent server startup
jest.mock('@hono/node-server', () => ({
  serve: jest.fn(),
  serveStatic: jest.fn(),
}));

// Import app after mocks are set up
import app from '../api/app';

// Helper function to make requests
const makeRequest = async (path: string, options: RequestInit = {}) => {
  const url = `http://localhost${path}`;
  const request = new Request(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  
  const response = await app.fetch(request);
  const body = await response.json().catch(() => ({}));
  
  return {
    status: response.status,
    body,
    headers: Object.fromEntries(response.headers.entries()),
  };
};

describe('AnyWhereDoor API Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await makeRequest('/health');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'ok',
        message: 'AnyWhereDoor API is running',
      });
    });
  });

  describe('GET /api/videos', () => {
    const mockVideosData = [
      {
        id: '1',
        title: 'Test Video 1',
        description: 'Test description',
        thumbnail_url: 'http://example.com/thumb1.jpg',
        video_url: 'http://example.com/video1.mp4',
        duration: 120,
        location_name: 'Tokyo',
        latitude: 35.6762,
        longitude: 139.6503,
        country: 'Japan',
        city: 'Tokyo',
        view_count: 100,
        like_count: 10,
        upload_date: '2024-01-01',
        uploader_id: 'user1',
        uploader_username: 'testuser',
        uploader_display_name: 'Test User',
        category_id: 'cat1',
        category_name: 'Travel',
        category_slug: 'travel',
        tags: ['test', 'video'],
        created_at: new Date(),
      },
    ];

    it('should return videos list with default pagination', async () => {
      mockPool.query.mockResolvedValue({ rows: mockVideosData });

      const response = await request(testApp)
        .get('/api/videos')
        .expect(200);

      expect(response.body).toHaveProperty('videos');
      expect(response.body).toHaveProperty('page', 1);
      expect(response.body).toHaveProperty('limit', 12);
      expect(response.body.videos).toHaveLength(1);
      expect(response.body.videos[0]).toMatchObject({
        id: '1',
        title: 'Test Video 1',
        description: 'Test description',
      });
    });

    it('should handle pagination parameters', async () => {
      mockPool.query.mockResolvedValue({ rows: mockVideosData });

      const response = await request(testApp)
        .get('/api/videos?page=2&limit=5')
        .expect(200);

      expect(response.body.page).toBe(2);
      expect(response.body.limit).toBe(5);

      // Verify query was called with correct parameters
      const queryCall = mockPool.query.mock.calls[0];
      expect(queryCall[1]).toContain(5); // limit
      expect(queryCall[1]).toContain(5); // offset (page-1)*limit
    });

    it('should filter by category', async () => {
      mockPool.query.mockResolvedValue({ rows: mockVideosData });

      await request(testApp)
        .get('/api/videos?category=travel')
        .expect(200);

      const queryCall = mockPool.query.mock.calls[0];
      expect(queryCall[0]).toContain('c.slug = $');
      expect(queryCall[1]).toContain('travel');
    });

    it('should search videos', async () => {
      mockPool.query.mockResolvedValue({ rows: mockVideosData });

      await request(testApp)
        .get('/api/videos?search=tokyo')
        .expect(200);

      const queryCall = mockPool.query.mock.calls[0];
      expect(queryCall[0]).toContain('ILIKE');
      expect(queryCall[1]).toContain('%tokyo%');
    });

    it('should handle database errors', async () => {
      mockPool.query.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(testApp)
        .get('/api/videos')
        .expect(500);

      expect(response.body).toEqual({
        error: 'Failed to fetch videos',
      });
    });
  });

  describe('GET /api/categories', () => {
    const mockCategoriesData = [
      {
        id: 'cat1',
        name: 'Travel',
        description: 'Travel videos',
        slug: 'travel',
      },
      {
        id: 'cat2',
        name: 'Nature',
        description: 'Nature videos',
        slug: 'nature',
      },
    ];

    it('should return categories list', async () => {
      mockPool.query.mockResolvedValue({ rows: mockCategoriesData });

      const response = await request(testApp)
        .get('/api/categories')
        .expect(200);

      expect(response.body).toHaveProperty('categories');
      expect(response.body.categories).toHaveLength(2);
      expect(response.body.categories[0]).toMatchObject({
        id: 'cat1',
        name: 'Travel',
        slug: 'travel',
      });
    });

    it('should handle database errors', async () => {
      mockPool.query.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(testApp)
        .get('/api/categories')
        .expect(500);

      expect(response.body).toEqual({
        error: 'Failed to fetch categories',
      });
    });
  });

  describe('GET /api/videos/featured', () => {
    const mockFeaturedVideos = [
      {
        id: '1',
        title: 'Featured Video 1',
        description: 'Featured description',
        thumbnail_url: 'http://example.com/thumb1.jpg',
        video_url: 'http://example.com/video1.mp4',
        view_count: 1000,
        like_count: 100,
        upload_date: '2024-01-01',
        created_at: new Date(),
      },
    ];

    it('should return featured videos', async () => {
      mockPool.query.mockResolvedValue({ rows: mockFeaturedVideos });

      const response = await request(testApp)
        .get('/api/videos/featured')
        .expect(200);

      expect(response.body).toHaveProperty('videos');
      expect(response.body.videos).toHaveLength(1);
      expect(response.body.videos[0]).toMatchObject({
        id: '1',
        title: 'Featured Video 1',
      });

      // Verify query filters for featured videos
      const queryCall = mockPool.query.mock.calls[0];
      expect(queryCall[0]).toContain('is_featured = true');
      expect(queryCall[0]).toContain('LIMIT 6');
    });

    it('should handle database errors', async () => {
      mockPool.query.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(testApp)
        .get('/api/videos/featured')
        .expect(500);

      expect(response.body).toEqual({
        error: 'Failed to fetch featured videos',
      });
    });
  });

  describe('GET /api/videos/:id', () => {
    const mockVideoData = {
      id: '123',
      title: 'Specific Video',
      description: 'Specific description',
      thumbnail_url: 'http://example.com/thumb.jpg',
      video_url: 'http://example.com/video.mp4',
      duration: 180,
      view_count: 50,
      like_count: 5,
      upload_date: '2024-01-01',
      uploader_id: 'user1',
      uploader_username: 'testuser',
      uploader_display_name: 'Test User',
      tags: ['specific', 'test'],
    };

    it('should return specific video and increment view count', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [mockVideoData] }) // First query for video
        .mockResolvedValueOnce({ rows: [] }); // Second query for view count update

      const response = await request(testApp)
        .get('/api/videos/123')
        .expect(200);

      expect(response.body).toHaveProperty('video');
      expect(response.body.video).toMatchObject({
        id: '123',
        title: 'Specific Video',
        view_count: 51, // Incremented
      });

      // Verify view count update query was called
      expect(mockPool.query).toHaveBeenCalledTimes(2);
      const updateCall = mockPool.query.mock.calls[1];
      expect(updateCall[0]).toContain('UPDATE videos SET view_count');
      expect(updateCall[1]).toContain('123');
    });

    it('should return 404 for non-existent video', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const response = await request(testApp)
        .get('/api/videos/nonexistent')
        .expect(404);

      expect(response.body).toEqual({
        error: 'Video not found',
      });
    });

    it('should handle database errors', async () => {
      mockPool.query.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(testApp)
        .get('/api/videos/123')
        .expect(500);

      expect(response.body).toEqual({
        error: 'Failed to fetch video',
      });
    });
  });

  describe('POST /api/upload', () => {
    beforeEach(() => {
      // Reset fs mocks
      mockFs.writeFileSync.mockImplementation(() => {});
      mockFs.existsSync.mockReturnValue(true);
    });

    it('should upload video successfully', async () => {
      const mockInsertResult = {
        rows: [{ id: 'new-video-id' }],
      };
      mockPool.query.mockResolvedValue(mockInsertResult);

      // Create a mock file buffer
      const fileBuffer = Buffer.from('fake video content');

      const response = await request(testApp)
        .post('/api/upload')
        .attach('video', fileBuffer, 'test-video.mp4')
        .field('title', 'Test Upload Video')
        .field('description', 'Test upload description')
        .field('locationName', 'Test Location')
        .field('country', 'Test Country')
        .field('city', 'Test City')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        videoId: 'new-video-id',
        message: 'Video uploaded successfully',
      });

      // Verify file was saved
      expect(mockFs.writeFileSync).toHaveBeenCalled();

      // Verify database insert
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO videos'),
        expect.arrayContaining([
          'Test Upload Video',
          'Test upload description',
          expect.stringContaining('http://localhost:3001/videos/'),
          expect.stringContaining('http://localhost:3001/thumbnails/'),
          'Test Location',
          'Test Country',
          'Test City',
        ])
      );
    });

    it('should return 400 when file is missing', async () => {
      const response = await request(testApp)
        .post('/api/upload')
        .field('title', 'Test Video')
        .expect(400);

      expect(response.body).toEqual({
        error: 'File and title are required',
      });
    });

    it('should return 400 when title is missing', async () => {
      const fileBuffer = Buffer.from('fake video content');

      const response = await request(testApp)
        .post('/api/upload')
        .attach('video', fileBuffer, 'test-video.mp4')
        .expect(400);

      expect(response.body).toEqual({
        error: 'File and title are required',
      });
    });

    it('should handle database errors during upload', async () => {
      const fileBuffer = Buffer.from('fake video content');
      mockPool.query.mockRejectedValue(new Error('Database insert failed'));

      const response = await request(testApp)
        .post('/api/upload')
        .attach('video', fileBuffer, 'test-video.mp4')
        .field('title', 'Test Video')
        .expect(500);

      expect(response.body).toEqual({
        error: 'Failed to upload video',
      });
    });
  });

  describe('GET /api/local-videos', () => {
    it('should list local video files', async () => {
      const mockFiles = ['video1.mp4', 'video2.webm', 'not-video.txt'];
      const mockStats = {
        size: 1024000,
        mtime: new Date('2024-01-01'),
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue(mockFiles as any);
      mockFs.statSync.mockReturnValue(mockStats as any);

      const response = await request(testApp)
        .get('/api/local-videos')
        .expect(200);

      expect(response.body).toHaveProperty('videos');
      expect(response.body.videos).toHaveLength(2); // Only video files
      expect(response.body.videos[0]).toMatchObject({
        filename: 'video1.mp4',
        url: 'http://localhost:3001/videos/video1.mp4',
        size: 1024000,
      });
    });

    it('should return empty array when videos directory does not exist', async () => {
      mockFs.existsSync.mockReturnValue(false);

      const response = await request(testApp)
        .get('/api/local-videos')
        .expect(200);

      expect(response.body).toEqual({
        videos: [],
      });
    });

    it('should handle file system errors', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockImplementation(() => {
        throw new Error('File system error');
      });

      const response = await request(testApp)
        .get('/api/local-videos')
        .expect(500);

      expect(response.body).toEqual({
        error: 'Failed to list videos',
      });
    });
  });

  describe('Static file serving', () => {
    it('should serve video files from /videos/*', async () => {
      // Note: Static file serving is handled by Hono middleware
      // This test would require actual file setup for integration testing
      const response = await request(testApp)
        .get('/videos/nonexistent.mp4')
        .expect(404);
      
      // At minimum, it should not crash
      expect(response.status).toBe(404);
    });

    it('should serve thumbnail files from /thumbnails/*', async () => {
      const response = await request(testApp)
        .get('/thumbnails/nonexistent.jpg')
        .expect(404);
      
      // At minimum, it should not crash
      expect(response.status).toBe(404);
    });
  });

  describe('CORS and middleware', () => {
    it('should have CORS headers', async () => {
      const response = await request(testApp)
        .get('/health')
        .expect(200);

      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });

    it('should handle OPTIONS requests', async () => {
      const response = await request(testApp)
        .options('/api/videos')
        .expect(200);

      expect(response.headers).toHaveProperty('access-control-allow-methods');
    });
  });
});