import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { serveStatic } from '@hono/node-server/serve-static'
import { Pool } from 'pg'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'

dotenv.config()

const app = new Hono()

// Middleware
app.use('*', logger())
app.use('*', cors({
  origin: ['http://localhost:3000', 'http://localhost:3002', 'https://anywheredoor.vercel.app'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

// Serve static video files
app.use('/videos/*', serveStatic({ root: './public' }))
app.use('/thumbnails/*', serveStatic({ root: './public' }))

// Initialize PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
})

// Types
interface Video {
  id: string
  title: string
  description?: string
  thumbnail_url?: string
  video_url: string
  duration?: number
  location_name?: string
  latitude?: number
  longitude?: number
  country?: string
  city?: string
  category_id?: string
  view_count: number
  like_count: number
  upload_date: string
  uploader?: {
    id: string
    username: string
    display_name?: string
  }
  category?: {
    id: string
    name: string
    slug: string
  }
  tags?: string[]
}

interface Category {
  id: string
  name: string
  description?: string
  slug: string
}

// Routes

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok', message: 'AnyWhereDoor API is running' })
})

// Get all videos
app.get('/api/videos', async (c) => {
  try {
    const page = parseInt(c.req.query('page') || '1')
    const limit = parseInt(c.req.query('limit') || '12')
    const category = c.req.query('category')
    const search = c.req.query('search')
    const offset = (page - 1) * limit

    let query = `
      SELECT 
        v.*,
        u.username as uploader_username,
        u.display_name as uploader_display_name,
        c.name as category_name,
        c.slug as category_slug,
        array_agg(t.name) FILTER (WHERE t.name IS NOT NULL) as tags
      FROM videos v
      LEFT JOIN users u ON v.uploader_id = u.id
      LEFT JOIN categories c ON v.category_id = c.id
      LEFT JOIN video_tags vt ON v.id = vt.video_id
      LEFT JOIN tags t ON vt.tag_id = t.id
      WHERE v.status = 'approved'
    `

    const params: any[] = []
    let paramIndex = 1

    if (category) {
      query += ` AND c.slug = $${paramIndex}`
      params.push(category)
      paramIndex++
    }

    if (search) {
      query += ` AND (v.title ILIKE $${paramIndex} OR v.description ILIKE $${paramIndex} OR v.location_name ILIKE $${paramIndex})`
      params.push(`%${search}%`)
      paramIndex++
    }

    query += `
      GROUP BY v.id, u.username, u.display_name, c.name, c.slug
      ORDER BY v.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `
    params.push(limit, offset)

    const result = await pool.query(query, params)
    
    const videos: Video[] = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      thumbnail_url: row.thumbnail_url,
      video_url: row.video_url,
      duration: row.duration,
      location_name: row.location_name,
      latitude: row.latitude,
      longitude: row.longitude,
      country: row.country,
      city: row.city,
      view_count: row.view_count,
      like_count: row.like_count,
      upload_date: row.upload_date,
      uploader: row.uploader_username ? {
        id: row.uploader_id,
        username: row.uploader_username,
        display_name: row.uploader_display_name,
      } : undefined,
      category: row.category_name ? {
        id: row.category_id,
        name: row.category_name,
        slug: row.category_slug,
      } : undefined,
      tags: row.tags?.filter((tag: string) => tag !== null) || [],
    }))

    return c.json({ videos, page, limit, total: videos.length })
  } catch (error) {
    console.error('Error fetching videos:', error)
    return c.json({ error: 'Failed to fetch videos' }, 500)
  }
})

// Get categories
app.get('/api/categories', async (c) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY name')
    const categories: Category[] = result.rows
    return c.json({ categories })
  } catch (error) {
    console.error('Error fetching categories:', error)
    return c.json({ error: 'Failed to fetch categories' }, 500)
  }
})

// Get featured videos (must be before /api/videos/:id)
app.get('/api/videos/featured', async (c) => {
  try {
    const query = `
      SELECT 
        v.*,
        u.username as uploader_username,
        u.display_name as uploader_display_name,
        c.name as category_name,
        c.slug as category_slug
      FROM videos v
      LEFT JOIN users u ON v.uploader_id = u.id
      LEFT JOIN categories c ON v.category_id = c.id
      WHERE v.status = 'approved' AND v.is_featured = true
      ORDER BY v.created_at DESC
      LIMIT 6
    `

    const result = await pool.query(query)
    
    const videos: Video[] = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      thumbnail_url: row.thumbnail_url,
      video_url: row.video_url,
      duration: row.duration,
      location_name: row.location_name,
      latitude: row.latitude,
      longitude: row.longitude,
      country: row.country,
      city: row.city,
      view_count: row.view_count,
      like_count: row.like_count,
      upload_date: row.upload_date,
      uploader: row.uploader_username ? {
        id: row.uploader_id,
        username: row.uploader_username,
        display_name: row.uploader_display_name,
      } : undefined,
      category: row.category_name ? {
        id: row.category_id,
        name: row.category_name,
        slug: row.category_slug,
      } : undefined,
    }))

    return c.json({ videos })
  } catch (error) {
    console.error('Error fetching featured videos:', error)
    return c.json({ error: 'Failed to fetch featured videos' }, 500)
  }
})

// Get single video (must be after /api/videos/featured)
app.get('/api/videos/:id', async (c) => {
  try {
    const id = c.req.param('id')
    
    const query = `
      SELECT 
        v.*,
        u.username as uploader_username,
        u.display_name as uploader_display_name,
        c.name as category_name,
        c.slug as category_slug,
        array_agg(t.name) FILTER (WHERE t.name IS NOT NULL) as tags
      FROM videos v
      LEFT JOIN users u ON v.uploader_id = u.id
      LEFT JOIN categories c ON v.category_id = c.id
      LEFT JOIN video_tags vt ON v.id = vt.video_id
      LEFT JOIN tags t ON vt.tag_id = t.id
      WHERE v.id = $1 AND v.status = 'approved'
      GROUP BY v.id, u.username, u.display_name, c.name, c.slug
    `

    const result = await pool.query(query, [id])
    
    if (result.rows.length === 0) {
      return c.json({ error: 'Video not found' }, 404)
    }

    const row = result.rows[0]
    const video: Video = {
      id: row.id,
      title: row.title,
      description: row.description,
      thumbnail_url: row.thumbnail_url,
      video_url: row.video_url,
      duration: row.duration,
      location_name: row.location_name,
      latitude: row.latitude,
      longitude: row.longitude,
      country: row.country,
      city: row.city,
      view_count: row.view_count + 1, // Increment view count
      like_count: row.like_count,
      upload_date: row.upload_date,
      uploader: row.uploader_username ? {
        id: row.uploader_id,
        username: row.uploader_username,
        display_name: row.uploader_display_name,
      } : undefined,
      category: row.category_name ? {
        id: row.category_id,
        name: row.category_name,
        slug: row.category_slug,
      } : undefined,
      tags: row.tags?.filter((tag: string) => tag !== null) || [],
    }

    // Update view count
    await pool.query('UPDATE videos SET view_count = view_count + 1 WHERE id = $1', [id])

    return c.json({ video })
  } catch (error) {
    console.error('Error fetching video:', error)
    return c.json({ error: 'Failed to fetch video' }, 500)
  }
})

// Upload video to local storage
app.post('/api/upload', async (c) => {
  try {
    const formData = await c.req.formData()
    const file = formData.get('video') as File
    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const locationName = formData.get('locationName') as string
    const country = formData.get('country') as string
    const city = formData.get('city') as string

    if (!file || !title) {
      return c.json({ error: 'File and title are required' }, 400)
    }

    // Generate unique filename
    const timestamp = Date.now()
    const ext = path.extname(file.name)
    const filename = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    const filepath = path.join('./public/videos', filename)

    // Save file to local storage
    const buffer = await file.arrayBuffer()
    fs.writeFileSync(filepath, Buffer.from(buffer))

    // Create video record in database
    const videoUrl = `http://localhost:3001/videos/${filename}`
    const thumbnailUrl = `http://localhost:3001/thumbnails/default-360.svg`
    
    // Use demo user ID for now - in a real app, this would come from authentication
    const demoUserId = '12345678-1234-1234-1234-123456789012'
    
    // First, ensure demo user exists
    await pool.query(`
      INSERT INTO users (id, username, email, password_hash, display_name, bio)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (id) DO NOTHING
    `, [demoUserId, 'demo_user', 'demo@example.com', 'hashed_password', 'Demo User', 'Welcome to my 360° video collection!'])

    const insertResult = await pool.query(`
      INSERT INTO videos (title, description, video_url, thumbnail_url, location_name, country, city, uploader_id, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'approved')
      RETURNING id
    `, [title, description, videoUrl, thumbnailUrl, locationName, country, city, demoUserId])

    const videoId = insertResult.rows[0].id

    return c.json({ 
      success: true, 
      videoId,
      message: 'Video uploaded successfully' 
    })
  } catch (error) {
    console.error('Error uploading video:', error)
    return c.json({ error: 'Failed to upload video' }, 500)
  }
})

// Get local video files
app.get('/api/local-videos', async (c) => {
  try {
    const videosDir = './public/videos'
    if (!fs.existsSync(videosDir)) {
      return c.json({ videos: [] })
    }

    const files = fs.readdirSync(videosDir)
    const videoFiles = files.filter(file => 
      ['.mp4', '.webm', '.mov', '.avi'].includes(path.extname(file).toLowerCase())
    )

    const videos = videoFiles.map(file => ({
      filename: file,
      url: `http://localhost:3001/videos/${file}`,
      size: fs.statSync(path.join(videosDir, file)).size,
      created: fs.statSync(path.join(videosDir, file)).mtime
    }))

    return c.json({ videos })
  } catch (error) {
    console.error('Error listing local videos:', error)
    return c.json({ error: 'Failed to list videos' }, 500)
  }
})

// Get user profile
app.get('/api/users/:id', async (c) => {
  try {
    const id = c.req.param('id')
    
    const query = `
      SELECT id, username, display_name, avatar_url, bio, created_at
      FROM users
      WHERE id = $1
    `

    const result = await pool.query(query, [id])
    
    if (result.rows.length === 0) {
      return c.json({ error: 'User not found' }, 404)
    }

    const user = result.rows[0]
    return c.json({ user })
  } catch (error) {
    console.error('Error fetching user profile:', error)
    return c.json({ error: 'Failed to fetch user profile' }, 500)
  }
})

// Get user's uploaded videos
app.get('/api/users/:id/videos', async (c) => {
  try {
    const id = c.req.param('id')
    const page = parseInt(c.req.query('page') || '1')
    const limit = parseInt(c.req.query('limit') || '12')
    const offset = (page - 1) * limit

    const query = `
      SELECT 
        v.*,
        c.name as category_name,
        c.slug as category_slug,
        array_agg(t.name) FILTER (WHERE t.name IS NOT NULL) as tags
      FROM videos v
      LEFT JOIN categories c ON v.category_id = c.id
      LEFT JOIN video_tags vt ON v.id = vt.video_id
      LEFT JOIN tags t ON vt.tag_id = t.id
      WHERE v.uploader_id = $1
      GROUP BY v.id, c.name, c.slug
      ORDER BY v.created_at DESC
      LIMIT $2 OFFSET $3
    `

    const result = await pool.query(query, [id, limit, offset])
    
    const videos: Video[] = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      thumbnail_url: row.thumbnail_url,
      video_url: row.video_url,
      duration: row.duration,
      location_name: row.location_name,
      latitude: row.latitude,
      longitude: row.longitude,
      country: row.country,
      city: row.city,
      view_count: row.view_count,
      like_count: row.like_count,
      upload_date: row.upload_date,
      category: row.category_name ? {
        id: row.category_id,
        name: row.category_name,
        slug: row.category_slug,
      } : undefined,
      tags: row.tags?.filter((tag: string) => tag !== null) || [],
    }))

    return c.json({ videos, page, limit, total: videos.length })
  } catch (error) {
    console.error('Error fetching user videos:', error)
    return c.json({ error: 'Failed to fetch user videos' }, 500)
  }
})

// Get user's watch history
app.get('/api/users/:id/watch-history', async (c) => {
  try {
    const id = c.req.param('id')
    const page = parseInt(c.req.query('page') || '1')
    const limit = parseInt(c.req.query('limit') || '20')
    const offset = (page - 1) * limit

    const query = `
      SELECT 
        v.*,
        u.username as uploader_username,
        u.display_name as uploader_display_name,
        c.name as category_name,
        c.slug as category_slug,
        vw.viewed_at,
        vw.duration_watched
      FROM video_views vw
      JOIN videos v ON vw.video_id = v.id
      LEFT JOIN users u ON v.uploader_id = u.id
      LEFT JOIN categories c ON v.category_id = c.id
      WHERE vw.user_id = $1 AND v.status = 'approved'
      ORDER BY vw.viewed_at DESC
      LIMIT $2 OFFSET $3
    `

    const result = await pool.query(query, [id, limit, offset])
    
    const watchHistory = result.rows.map(row => ({
      video: {
        id: row.id,
        title: row.title,
        description: row.description,
        thumbnail_url: row.thumbnail_url,
        video_url: row.video_url,
        duration: row.duration,
        location_name: row.location_name,
        country: row.country,
        city: row.city,
        view_count: row.view_count,
        like_count: row.like_count,
        upload_date: row.upload_date,
        uploader: row.uploader_username ? {
          id: row.uploader_id,
          username: row.uploader_username,
          display_name: row.uploader_display_name,
        } : undefined,
        category: row.category_name ? {
          id: row.category_id,
          name: row.category_name,
          slug: row.category_slug,
        } : undefined,
      },
      viewed_at: row.viewed_at,
      duration_watched: row.duration_watched,
    }))

    return c.json({ watchHistory, page, limit, total: watchHistory.length })
  } catch (error) {
    console.error('Error fetching watch history:', error)
    return c.json({ error: 'Failed to fetch watch history' }, 500)
  }
})

// Update video
app.put('/api/videos/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const { title, description, location_name, country, city, category_id } = await c.req.json()

    if (!title?.trim()) {
      return c.json({ error: 'Title is required' }, 400)
    }

    const query = `
      UPDATE videos 
      SET title = $1, description = $2, location_name = $3, country = $4, city = $5, category_id = $6, updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `

    const result = await pool.query(query, [title, description, location_name, country, city, category_id, id])
    
    if (result.rows.length === 0) {
      return c.json({ error: 'Video not found' }, 404)
    }

    return c.json({ video: result.rows[0], message: 'Video updated successfully' })
  } catch (error) {
    console.error('Error updating video:', error)
    return c.json({ error: 'Failed to update video' }, 500)
  }
})

// Delete video
app.delete('/api/videos/:id', async (c) => {
  try {
    const id = c.req.param('id')

    const result = await pool.query('DELETE FROM videos WHERE id = $1 RETURNING *', [id])
    
    if (result.rows.length === 0) {
      return c.json({ error: 'Video not found' }, 404)
    }

    return c.json({ message: 'Video deleted successfully' })
  } catch (error) {
    console.error('Error deleting video:', error)
    return c.json({ error: 'Failed to delete video' }, 500)
  }
})

// Update existing videos to have uploader_id (development helper endpoint)
app.post('/api/dev/fix-uploader-ids', async (c) => {
  try {
    const demoUserId = '12345678-1234-1234-1234-123456789012'
    
    // First, ensure demo user exists
    await pool.query(`
      INSERT INTO users (id, username, email, password_hash, display_name, bio)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (id) DO NOTHING
    `, [demoUserId, 'demo_user', 'demo@example.com', 'hashed_password', 'Demo User', 'Welcome to my 360° video collection!'])
    
    // Update videos without uploader_id
    const result = await pool.query(`
      UPDATE videos 
      SET uploader_id = $1 
      WHERE uploader_id IS NULL
      RETURNING id, title
    `, [demoUserId])
    
    return c.json({ 
      message: `Updated ${result.rows.length} videos with uploader_id`,
      updatedVideos: result.rows
    })
  } catch (error) {
    console.error('Error fixing uploader IDs:', error)
    return c.json({ error: 'Failed to fix uploader IDs' }, 500)
  }
})

export default app