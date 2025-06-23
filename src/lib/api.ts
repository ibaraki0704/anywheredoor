const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export interface Video {
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

export interface Category {
  id: string
  name: string
  description?: string
  slug: string
}

export interface ApiResponse<T> {
  data?: T
  error?: string
}

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    
    try {
      const headers: Record<string, string> = {}
      
      // Only add Content-Type for non-FormData requests
      if (!(options?.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json'
      }
      
      const response = await fetch(url, {
        headers: {
          ...headers,
          ...options?.headers,
        },
        ...options,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return response.json()
    } catch (error) {
      console.error('API request failed:', error)
      throw error
    }
  }

  // Videos
  async getVideos(params?: {
    page?: number
    limit?: number
    category?: string
    search?: string
  }) {
    const searchParams = new URLSearchParams()
    
    if (params?.page) searchParams.append('page', params.page.toString())
    if (params?.limit) searchParams.append('limit', params.limit.toString())
    if (params?.category) searchParams.append('category', params.category)
    if (params?.search) searchParams.append('search', params.search)

    const queryString = searchParams.toString()
    const endpoint = `/api/videos${queryString ? `?${queryString}` : ''}`
    
    return this.request<{ videos: Video[]; page: number; limit: number; total: number }>(endpoint)
  }

  async getVideo(id: string) {
    return this.request<{ video: Video }>(`/api/videos/${id}`)
  }

  async getFeaturedVideos() {
    return this.request<{ videos: Video[] }>('/api/videos/featured')
  }

  // Categories
  async getCategories() {
    return this.request<{ categories: Category[] }>('/api/categories')
  }

  // Upload to local storage
  async uploadVideoLocal(formData: FormData) {
    return this.request<{ success: boolean; videoId: string; message: string }>('/api/upload', {
      method: 'POST',
      body: formData,
      headers: {
        // Don't set Content-Type for FormData, let browser set it
      },
    })
  }

  // Get local videos
  async getLocalVideos() {
    return this.request<{ videos: Array<{ filename: string; url: string; size: number; created: string }> }>('/api/local-videos')
  }
}

export const apiClient = new ApiClient()

// Helper functions for common API calls
export const getVideos = (params?: Parameters<typeof apiClient.getVideos>[0]) => 
  apiClient.getVideos(params)

export const getVideo = (id: string) => 
  apiClient.getVideo(id)

export const getFeaturedVideos = () => 
  apiClient.getFeaturedVideos()

export const getCategories = () => 
  apiClient.getCategories()

export const uploadVideoLocal = async (file: File, videoData: {
  title: string
  description?: string
  locationName?: string
  country?: string
  city?: string
}) => {
  try {
    const formData = new FormData()
    formData.append('video', file)
    formData.append('title', videoData.title)
    if (videoData.description) formData.append('description', videoData.description)
    if (videoData.locationName) formData.append('locationName', videoData.locationName)
    if (videoData.country) formData.append('country', videoData.country)
    if (videoData.city) formData.append('city', videoData.city)

    const result = await apiClient.uploadVideoLocal(formData)
    return result
  } catch (error) {
    console.error('Upload failed:', error)
    throw error
  }
}

export const getLocalVideos = () => apiClient.getLocalVideos()