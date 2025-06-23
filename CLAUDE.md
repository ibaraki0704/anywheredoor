# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `npm run dev` - Start Next.js frontend development server (localhost:3000)
- `npm run dev:api` - Start Hono API backend server (localhost:3001)
- `npm run build` - Build Next.js application for production
- `npm run start` - Start production Next.js server
- `npm run lint` - Run ESLint checks
- `npm run typecheck` - Run TypeScript type checking

### Development Workflow
This project requires running both frontend and backend servers simultaneously:
1. Terminal 1: `npm run dev:api` (API server)
2. Terminal 2: `npm run dev` (Next.js app)

### Database Setup
PostgreSQL must be running with the database initialized:
```bash
brew services start postgresql@15
createdb anywheredoor
psql -d anywheredoor -f database/schema.sql
```

### Process Management
- Kill API server: `lsof -ti:3001 | xargs kill -9`
- Kill frontend: `lsof -ti:3000 | xargs kill -9`
- Background API start: `nohup npm run dev:api > api.log 2>&1 &`

## Architecture Overview

### Dual-Server Architecture
AnyWhereDoor uses a **separated frontend/backend architecture**:
- **Frontend**: Next.js 15 app with App Router (`src/app/`)
- **Backend**: Hono API server (`api/index.ts`) 
- **Communication**: REST API calls from frontend to backend

### Key Architectural Patterns

**Frontend-Backend Separation**: Unlike typical Next.js apps with API routes, this project uses an external Hono server. The frontend communicates with the backend via HTTP requests using the API client in `src/lib/api.ts`.

**360° Video Rendering**: Custom Three.js implementation in `VideoPlayer360.tsx` that:
- Creates inverted sphere geometry for inside-out viewing
- Handles mouse/touch controls for camera rotation  
- Manages video texture mapping and playback controls

**Local File Storage**: Videos are stored locally in `public/videos/` and served via Hono's static file middleware. For production, this can be replaced with cloud storage.

**Database Schema**: PostgreSQL with comprehensive relational design supporting users, videos, categories, tags, views, likes, comments, and playlists. See `database/schema.sql` for complete structure.

### Critical Environment Setup

**Local Development Environment**:
- `DATABASE_URL=postgresql://localhost:5432/anywheredoor`
- `NEXT_PUBLIC_API_URL=http://localhost:3001`
- `PORT=3001`
- `NODE_ENV=development`

**Optional GCP Variables** (for production cloud storage):
- `GOOGLE_CLOUD_PROJECT_ID` - GCP project identifier
- `GOOGLE_CLOUD_KEY_FILE` - Path to GCP service account JSON
- `GOOGLE_CLOUD_STORAGE_BUCKET` - GCS bucket name for videos

### Route Order Critical Pattern

**API Route Ordering**: Hono routes are processed in definition order. Specific routes must come before parameterized routes:
```javascript
app.get('/api/videos/featured', ...)  // Must be BEFORE
app.get('/api/videos/:id', ...)       // the parameterized route
```
This prevents "featured" from being interpreted as a UUID parameter.

### Data Flow for Video Operations

**Local Video Upload Flow**:
1. Frontend sends FormData with video file to `/api/upload`
2. Backend saves file to `public/videos/` directory
3. Video metadata inserted into PostgreSQL with local file URL
4. Frontend redirects to video page for immediate viewing

**Video Viewing Flow**:
1. Frontend fetches video metadata via `/api/videos/:id`
2. Backend increments view count and returns video data with local URL
3. Three.js VideoPlayer360 component renders video from `http://localhost:3001/videos/filename`
4. Static file middleware serves video directly from filesystem

### Static File Serving

Videos and thumbnails are served via Hono's serveStatic middleware:
- `/videos/*` maps to `./public/videos/`
- `/thumbnails/*` maps to `./public/thumbnails/`

### Type Safety
Shared TypeScript interfaces between frontend (`src/lib/api.ts`) and backend (`api/index.ts`) ensure type consistency for Video, Category, and other domain objects across the application boundary.

## 開発日誌を作成すること

`dev_diary/yyyy-mm-dd_hhmm.md`の形式で開発日誌を作成してください。内容は以下のとおりです

- 日付：yyyy-mm-dd
- 作業内容：何をしたか、どんな問題があったか、どう解決したか
- 次回の予定：
- 感想：開発の進捗や学び
- 気分：いい感じのことを書く
- 愚痴：いい感じのことを書く
