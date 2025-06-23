import { Pool } from 'pg';

// Test data factories
export const createMockVideo = (overrides: any = {}) => ({
  id: 'test-video-1',
  title: 'Test Video',
  description: 'Test description',
  thumbnail_url: 'http://example.com/thumb.jpg',
  video_url: 'http://example.com/video.mp4',
  duration: 120,
  location_name: 'Test Location',
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
  status: 'approved',
  is_featured: false,
  ...overrides,
});

export const createMockCategory = (overrides: any = {}) => ({
  id: 'cat1',
  name: 'Travel',
  description: 'Travel videos',
  slug: 'travel',
  ...overrides,
});

export const createMockUser = (overrides: any = {}) => ({
  id: 'user1',
  username: 'testuser',
  display_name: 'Test User',
  email: 'test@example.com',
  created_at: new Date(),
  ...overrides,
});

// Database test helpers
export const setupTestDatabase = async (pool: Pool) => {
  // Create test tables if they don't exist
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      username VARCHAR(50) UNIQUE NOT NULL,
      display_name VARCHAR(100),
      email VARCHAR(255) UNIQUE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS categories (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL,
      description TEXT,
      slug VARCHAR(100) UNIQUE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS videos (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title VARCHAR(255) NOT NULL,
      description TEXT,
      thumbnail_url TEXT,
      video_url TEXT NOT NULL,
      duration INTEGER,
      location_name VARCHAR(255),
      latitude DECIMAL(10, 8),
      longitude DECIMAL(11, 8),
      country VARCHAR(100),
      city VARCHAR(100),
      category_id UUID REFERENCES categories(id),
      uploader_id UUID REFERENCES users(id),
      view_count INTEGER DEFAULT 0,
      like_count INTEGER DEFAULT 0,
      status VARCHAR(20) DEFAULT 'pending',
      is_featured BOOLEAN DEFAULT FALSE,
      upload_date DATE DEFAULT CURRENT_DATE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS tags (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(50) UNIQUE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS video_tags (
      video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
      tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (video_id, tag_id)
    )
  `);
};

export const cleanupTestDatabase = async (pool: Pool) => {
  await pool.query('DROP TABLE IF EXISTS video_tags CASCADE');
  await pool.query('DROP TABLE IF EXISTS tags CASCADE');
  await pool.query('DROP TABLE IF EXISTS videos CASCADE');
  await pool.query('DROP TABLE IF EXISTS categories CASCADE');
  await pool.query('DROP TABLE IF EXISTS users CASCADE');
};

export const seedTestData = async (pool: Pool) => {
  // Insert test user
  const userResult = await pool.query(`
    INSERT INTO users (username, display_name, email)
    VALUES ('testuser', 'Test User', 'test@example.com')
    ON CONFLICT (username) DO NOTHING
    RETURNING id
  `);

  // Insert test category
  const categoryResult = await pool.query(`
    INSERT INTO categories (name, description, slug)
    VALUES ('Travel', 'Travel videos', 'travel')
    ON CONFLICT (slug) DO NOTHING
    RETURNING id
  `);

  // Get the actual IDs from the database
  const userIdResult = await pool.query(`SELECT id FROM users WHERE username = 'testuser'`);
  const categoryIdResult = await pool.query(`SELECT id FROM categories WHERE slug = 'travel'`);

  const userId = userIdResult.rows[0]?.id;
  const categoryId = categoryIdResult.rows[0]?.id;

  if (userId && categoryId) {
    // Insert test video
    const videoResult = await pool.query(`
      INSERT INTO videos (
        title, description, thumbnail_url, video_url, 
        duration, location_name, latitude, longitude, country, city,
        category_id, uploader_id, view_count, like_count, status, is_featured
      )
      VALUES (
        'Test Video 1', 'Test description', 
        'http://example.com/thumb1.jpg', 'http://example.com/video1.mp4',
        120, 'Tokyo', 35.6762, 139.6503, 'Japan', 'Tokyo',
        $1, $2, 100, 10, 'approved', true
      )
      RETURNING id
    `, [categoryId, userId]);

    const videoId = videoResult.rows[0]?.id;

    if (videoId) {
      // Insert test tags
      const tag1Result = await pool.query(`
        INSERT INTO tags (name)
        VALUES ('test')
        ON CONFLICT (name) DO NOTHING
        RETURNING id
      `);

      const tag2Result = await pool.query(`
        INSERT INTO tags (name)
        VALUES ('video')
        ON CONFLICT (name) DO NOTHING
        RETURNING id
      `);

      // Get tag IDs
      const tag1IdResult = await pool.query(`SELECT id FROM tags WHERE name = 'test'`);
      const tag2IdResult = await pool.query(`SELECT id FROM tags WHERE name = 'video'`);

      const tag1Id = tag1IdResult.rows[0]?.id;
      const tag2Id = tag2IdResult.rows[0]?.id;

      if (tag1Id && tag2Id) {
        // Link video with tags
        await pool.query(`
          INSERT INTO video_tags (video_id, tag_id)
          VALUES ($1, $2), ($1, $3)
          ON CONFLICT DO NOTHING
        `, [videoId, tag1Id, tag2Id]);
      }
    }
  }
};