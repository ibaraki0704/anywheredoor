# AnyWhereDoor 🌍

A YouTube-like platform for 360-degree scenic videos that lets users explore the world through immersive experiences.

## Features

- 🎥 **360° Video Player**: Immersive video experience with Three.js
- 🏔️ **Scenic Content**: Curated collection of world landscapes 
- 🔍 **Smart Search**: Find videos by location, category, or description
- 📱 **Responsive Design**: Works seamlessly across devices
- ☁️ **Cloud Storage**: Videos stored securely on Google Cloud Storage
- 🗃️ **PostgreSQL Database**: Robust data management
- 🚀 **Modern Stack**: Next.js 15, TypeScript, Hono API

## Tech Stack

### Frontend
- **Next.js 15** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Three.js** for 360° video rendering
- **React 19** with modern hooks

### Backend
- **Hono** - Fast, lightweight API framework
- **PostgreSQL** - Primary database
- **Google Cloud Storage** - Video file storage
- **Drizzle ORM** - Type-safe database operations

### Infrastructure
- **Google Cloud Platform (GCP)**
- **Cloud Storage** for video files
- **Cloud SQL** for PostgreSQL hosting

## Database Schema

The application uses a comprehensive PostgreSQL schema supporting:

- **Users** - User accounts and profiles
- **Videos** - 360° video metadata and storage URLs
- **Categories** - Organized content classification
- **Tags** - Flexible video tagging system
- **Views & Likes** - User interaction tracking
- **Comments** - Community engagement
- **Playlists** - User-curated video collections

See `database/schema.sql` for complete schema definition.

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- Google Cloud Platform account
- GCP Service Account with Storage permissions

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd anywheredoor
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Configure the following variables:
   ```env
   # Database
   DATABASE_URL=postgresql://username:password@localhost:5432/anywheredoor
   
   # Google Cloud Platform
   GOOGLE_CLOUD_PROJECT_ID=your-project-id
   GOOGLE_CLOUD_KEY_FILE=path/to/service-account-key.json
   GOOGLE_CLOUD_STORAGE_BUCKET=anywheredoor-videos
   
   # API
   PORT=3001
   NODE_ENV=development
   
   # Next.js
   NEXT_PUBLIC_API_URL=http://localhost:3001
   ```

4. **Set up the database**
   ```bash
   # Create database and run schema
   psql -U postgres -d anywheredoor -f database/schema.sql
   ```

5. **Start the development servers**
   ```bash
   # Terminal 1: Start the API server
   npm run dev:api
   
   # Terminal 2: Start the Next.js app
   npm run dev
   ```

6. **Open the application**
   - Frontend: http://localhost:3000
   - API: http://localhost:3001

## Project Structure

```
anywheredoor/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── page.tsx           # Homepage
│   │   ├── video/[id]/        # Video detail pages
│   │   ├── upload/            # Video upload page
│   │   └── globals.css        # Global styles
│   ├── components/            # Reusable React components
│   │   ├── VideoPlayer360.tsx # 360° video player
│   │   └── VideoCard.tsx      # Video preview cards
│   └── lib/                   # Utility functions
│       └── api.ts             # API client
├── api/                       # Hono API server
│   └── index.ts              # API routes and logic
├── database/                  # Database schema and migrations
│   └── schema.sql            # PostgreSQL schema
├── .env.example              # Environment variables template
└── README.md                 # This file
```

## API Endpoints

### Videos
- `GET /api/videos` - List videos with filtering
- `GET /api/videos/:id` - Get single video
- `GET /api/videos/featured` - Get featured videos

### Categories
- `GET /api/categories` - List all categories

### Upload
- `POST /api/upload/signed-url` - Generate signed upload URL

## Development Commands

```bash
# Development
npm run dev          # Start Next.js dev server
npm run dev:api      # Start Hono API server

# Building
npm run build        # Build for production
npm run start        # Start production server

# Code Quality
npm run lint         # Run ESLint
npm run typecheck    # Run TypeScript checks
```

## 360° Video Guidelines

When uploading videos to AnyWhereDoor:

- ✅ Upload genuine 360-degree videos of scenic locations
- ✅ Ensure good video quality and stable footage
- ✅ Provide accurate location information
- ✅ Respect local laws and privacy when filming
- ✅ Videos are reviewed before publication

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Three.js community for 360° video rendering capabilities
- Next.js team for the excellent full-stack framework
- Hono for the lightweight, fast API framework
- Google Cloud Platform for reliable infrastructure
