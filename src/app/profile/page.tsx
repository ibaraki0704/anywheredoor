'use client'

import { useState, useEffect } from 'react'
import { getUserProfile, getUserVideos, getWatchHistory, getCategories, updateVideo, deleteVideo, User, Video, WatchHistoryItem, Category } from '@/lib/api'
import VideoCard from '@/components/VideoCard'
import Link from 'next/link'

// Mock user ID for demonstration - In a real app, this would come from authentication
const MOCK_USER_ID = '12345678-1234-1234-1234-123456789012'

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null)
  const [userVideos, setUserVideos] = useState<Video[]>([])
  const [watchHistory, setWatchHistory] = useState<WatchHistoryItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [activeTab, setActiveTab] = useState<'videos' | 'history'>('videos')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Edit modal state
  const [editingVideo, setEditingVideo] = useState<Video | null>(null)
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    location_name: '',
    country: '',
    city: '',
    category_id: '',
  })

  useEffect(() => {
    loadProfileData()
  }, [])

  const loadProfileData = async () => {
    try {
      setLoading(true)
      const [profileData, videosData, historyData, categoriesData] = await Promise.all([
        getUserProfile(MOCK_USER_ID).catch(() => ({ user: createMockUser() })),
        getUserVideos(MOCK_USER_ID).catch(() => ({ videos: [], page: 1, limit: 12, total: 0 })),
        getWatchHistory(MOCK_USER_ID).catch(() => ({ watchHistory: [], page: 1, limit: 20, total: 0 })),
        getCategories(),
      ])
      
      setUser(profileData.user)
      setUserVideos(videosData.videos)
      setWatchHistory(historyData.watchHistory)
      setCategories(categoriesData.categories)
    } catch (err) {
      setError('Failed to load profile data')
      console.error('Error loading profile data:', err)
    } finally {
      setLoading(false)
    }
  }

  const createMockUser = (): User => ({
    id: MOCK_USER_ID,
    username: 'demo_user',
    display_name: 'Demo User',
    bio: 'Welcome to my 360° video collection!',
    created_at: '2024-01-01T00:00:00Z',
  })

  const handleEditVideo = (video: Video) => {
    setEditingVideo(video)
    setEditForm({
      title: video.title,
      description: video.description || '',
      location_name: video.location_name || '',
      country: video.country || '',
      city: video.city || '',
      category_id: video.category?.id || '',
    })
  }

  const handleUpdateVideo = async () => {
    if (!editingVideo) return

    try {
      await updateVideo(editingVideo.id, editForm)
      setEditingVideo(null)
      loadProfileData() // Reload data
    } catch (err) {
      console.error('Error updating video:', err)
      alert('Failed to update video')
    }
  }

  const handleDeleteVideo = async (videoId: string) => {
    if (!confirm('Are you sure you want to delete this video?')) return

    try {
      await deleteVideo(videoId)
      loadProfileData() // Reload data
    } catch (err) {
      console.error('Error deleting video:', err)
      alert('Failed to delete video')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded mb-4"></div>
            <div className="h-32 bg-gray-300 dark:bg-gray-700 rounded mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="space-y-3">
                  <div className="aspect-video bg-gray-300 dark:bg-gray-700 rounded-lg"></div>
                  <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded"></div>
                  <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-3/4"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Oops! Something went wrong
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={loadProfileData}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-700 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                AnyWhereDoor
              </h1>
            </Link>

            <nav className="hidden md:flex items-center space-x-6">
              <Link href="/" className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                Home
              </Link>
              <Link href="/upload" className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                Upload
              </Link>
              <Link href="/profile" className="text-blue-600 dark:text-blue-400 font-medium">
                My Profile
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-start space-x-6">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-purple-700 rounded-full flex items-center justify-center">
              <span className="text-2xl font-bold text-white">
                {user?.display_name?.[0] || user?.username?.[0] || 'U'}
              </span>
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {user?.display_name || user?.username}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                @{user?.username}
              </p>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                User ID: {user?.id}
              </p>
              {user?.bio && (
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  {user.bio}
                </p>
              )}
              <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                <span>Joined {new Date(user?.created_at || '').toLocaleDateString()}</span>
                <span>•</span>
                <span>{userVideos.length} videos uploaded</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('videos')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'videos'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                My Videos ({userVideos.length})
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'history'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Watch History ({watchHistory.length})
              </button>
            </nav>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'videos' && (
          <section>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                My Uploaded Videos
              </h3>
              <Link
                href="/upload"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Upload New Video
              </Link>
            </div>
            
            {userVideos.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0021 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  No videos uploaded yet
                </h4>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Share your first 360° video with the world!
                </p>
                <Link
                  href="/upload"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Upload Your First Video
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {userVideos.map((video) => (
                  <div key={video.id} className="relative">
                    <VideoCard video={video} />
                    <div className="absolute top-2 right-2 flex space-x-1">
                      <button
                        onClick={() => handleEditVideo(video)}
                        className="p-1 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
                        title="Edit video"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteVideo(video.id)}
                        className="p-1 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                        title="Delete video"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === 'history' && (
          <section>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Watch History
            </h3>
            
            {watchHistory.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  No watch history yet
                </h4>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Start exploring 360° videos to build your watch history!
                </p>
                <Link
                  href="/"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Explore Videos
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {watchHistory.map((item, index) => (
                  <div key={`${item.video.id}-${index}`} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <img
                          src={item.video.thumbnail_url || '/thumbnails/default-360.svg'}
                          alt={item.video.title}
                          className="w-32 h-18 object-cover rounded-lg"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link href={`/video/${item.video.id}`} className="block">
                          <h4 className="text-lg font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                            {item.video.title}
                          </h4>
                        </Link>
                        {item.video.uploader && (
                          <p className="text-gray-600 dark:text-gray-400 mt-1">
                            by {item.video.uploader.display_name || item.video.uploader.username}
                          </p>
                        )}
                        {item.video.location_name && (
                          <p className="text-gray-500 dark:text-gray-500 text-sm mt-1">
                            📍 {item.video.location_name}
                          </p>
                        )}
                        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                          <span>Watched {new Date(item.viewed_at).toLocaleDateString()}</span>
                          <span>•</span>
                          <span>{Math.floor(item.duration_watched / 60)}:{(item.duration_watched % 60).toString().padStart(2, '0')} watched</span>
                          <span>•</span>
                          <span>{item.video.view_count.toLocaleString()} views</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      {/* Edit Video Modal */}
      {editingVideo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Edit Video
                </h3>
                <button
                  onClick={() => setEditingVideo(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleUpdateVideo(); }} className="space-y-4">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    id="title"
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    id="description"
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label htmlFor="location_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Location Name
                  </label>
                  <input
                    type="text"
                    id="location_name"
                    value={editForm.location_name}
                    onChange={(e) => setEditForm({ ...editForm, location_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="country" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Country
                    </label>
                    <input
                      type="text"
                      id="country"
                      value={editForm.country}
                      onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label htmlFor="city" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      City
                    </label>
                    <input
                      type="text"
                      id="city"
                      value={editForm.city}
                      onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Category
                  </label>
                  <select
                    id="category"
                    value={editForm.category_id}
                    onChange={(e) => setEditForm({ ...editForm, category_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Select a category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setEditingVideo(null)}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Update Video
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}