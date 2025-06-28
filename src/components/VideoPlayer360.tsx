'use client'

import { useRef, useEffect, useState } from 'react'
import * as THREE from 'three'

interface VideoPlayer360Props {
  videoUrl: string
  autoplay?: boolean
  controls?: boolean
  className?: string
}

export default function VideoPlayer360({ 
  videoUrl, 
  autoplay = false, 
  controls = true,
  className = '' 
}: VideoPlayer360Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene>()
  const rendererRef = useRef<THREE.WebGLRenderer>()
  const cameraRef = useRef<THREE.PerspectiveCamera>()
  const videoRef = useRef<HTMLVideoElement>()
  const sphereRef = useRef<THREE.Mesh>()
  const animationIdRef = useRef<number>()
  
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Mouse interaction states
  const mouseRef = useRef({ x: 0, y: 0, isDown: false })
  const cameraRotationRef = useRef({ x: 0, y: 0 })

  // Initialize fullscreen state
  useEffect(() => {
    const doc = document as Document & {
      webkitFullscreenElement?: Element
      mozFullScreenElement?: Element
      msFullscreenElement?: Element
    }
    const isCurrentlyFullscreen = !!(
      document.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement
    )
    setIsFullscreen(isCurrentlyFullscreen)
  }, [])

  useEffect(() => {
    if (!containerRef.current) return

    // Cache container reference for cleanup
    const container = containerRef.current

    // Initialize Three.js scene
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    
    renderer.setSize(container.clientWidth, container.clientHeight)
    container.appendChild(renderer.domElement)

    // Create video element
    const video = document.createElement('video')
    video.src = videoUrl
    video.crossOrigin = 'anonymous'
    video.loop = true
    video.muted = !autoplay // Autoplay requires muted
    video.playsInline = true
    
    if (autoplay) {
      video.autoplay = true
    }

    // Create video texture
    const videoTexture = new THREE.VideoTexture(video)
    videoTexture.minFilter = THREE.LinearFilter
    videoTexture.magFilter = THREE.LinearFilter

    // Create sphere geometry (inside-out for 360 viewing)
    const geometry = new THREE.SphereGeometry(500, 60, 40)
    geometry.scale(-1, 1, 1) // Invert to view from inside

    // Create material with video texture
    const material = new THREE.MeshBasicMaterial({ map: videoTexture })
    const sphere = new THREE.Mesh(geometry, material)
    scene.add(sphere)

    // Set initial camera position
    camera.position.set(0, 0, 0.1)

    // Store references
    sceneRef.current = scene
    rendererRef.current = renderer
    cameraRef.current = camera
    videoRef.current = video
    sphereRef.current = sphere

    // Video event listeners
    const handleLoadedMetadata = () => {
      setDuration(video.duration)
      setIsLoading(false)
    }

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime)
    }

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)

    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)

    // Mouse interaction handlers
    const handleMouseDown = (event: MouseEvent) => {
      mouseRef.current.isDown = true
      mouseRef.current.x = event.clientX
      mouseRef.current.y = event.clientY
    }

    const handleMouseUp = () => {
      mouseRef.current.isDown = false
    }

    const handleMouseMove = (event: MouseEvent) => {
      if (!mouseRef.current.isDown) return

      const deltaX = event.clientX - mouseRef.current.x
      const deltaY = event.clientY - mouseRef.current.y

      cameraRotationRef.current.x += deltaX * 0.005
      cameraRotationRef.current.y += deltaY * 0.005

      // Limit vertical rotation
      cameraRotationRef.current.y = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, cameraRotationRef.current.y))

      mouseRef.current.x = event.clientX
      mouseRef.current.y = event.clientY
    }

    // Touch handlers for mobile
    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length === 1) {
        mouseRef.current.isDown = true
        mouseRef.current.x = event.touches[0].clientX
        mouseRef.current.y = event.touches[0].clientY
      }
    }

    const handleTouchEnd = () => {
      mouseRef.current.isDown = false
    }

    const handleTouchMove = (event: TouchEvent) => {
      if (!mouseRef.current.isDown || event.touches.length !== 1) return

      const deltaX = event.touches[0].clientX - mouseRef.current.x
      const deltaY = event.touches[0].clientY - mouseRef.current.y

      cameraRotationRef.current.x += deltaX * 0.005
      cameraRotationRef.current.y += deltaY * 0.005

      cameraRotationRef.current.y = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, cameraRotationRef.current.y))

      mouseRef.current.x = event.touches[0].clientX
      mouseRef.current.y = event.touches[0].clientY
    }

    const canvas = renderer.domElement
    canvas.addEventListener('mousedown', handleMouseDown)
    canvas.addEventListener('mouseup', handleMouseUp)
    canvas.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('touchstart', handleTouchStart)
    canvas.addEventListener('touchend', handleTouchEnd)
    canvas.addEventListener('touchmove', handleTouchMove)

    // Animation loop
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate)

      // Update camera rotation
      camera.rotation.order = 'YXZ'
      camera.rotation.y = cameraRotationRef.current.x
      camera.rotation.x = cameraRotationRef.current.y

      renderer.render(scene, camera)
    }

    animate()

    // Handle window resize
    const handleResize = () => {
      if (!containerRef.current) return
      
      const width = containerRef.current.clientWidth
      const height = containerRef.current.clientHeight
      
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
    }

    window.addEventListener('resize', handleResize)

    // Handle fullscreen change events
    const handleFullscreenChange = () => {
      const doc = document as Document & {
        webkitFullscreenElement?: Element
        mozFullScreenElement?: Element
        msFullscreenElement?: Element
      }
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement
      )
      setIsFullscreen(isCurrentlyFullscreen)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
    document.addEventListener('mozfullscreenchange', handleFullscreenChange)
    document.addEventListener('MSFullscreenChange', handleFullscreenChange)

    // Cleanup
    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current)
      }
      
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      
      canvas.removeEventListener('mousedown', handleMouseDown)
      canvas.removeEventListener('mouseup', handleMouseUp)
      canvas.removeEventListener('mousemove', handleMouseMove)
      canvas.removeEventListener('touchstart', handleTouchStart)
      canvas.removeEventListener('touchend', handleTouchEnd)
      canvas.removeEventListener('touchmove', handleTouchMove)
      
      window.removeEventListener('resize', handleResize)
      
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange)
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange)
      
      // Use cached container reference to avoid stale closure
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement)
      }
      
      renderer.dispose()
      geometry.dispose()
      material.dispose()
      videoTexture.dispose()
    }
  }, [videoUrl, autoplay])

  const togglePlay = () => {
    if (!videoRef.current) return
    
    if (isPlaying) {
      videoRef.current.pause()
    } else {
      videoRef.current.play()
    }
  }

  const handleSeek = (time: number) => {
    if (!videoRef.current) return
    videoRef.current.currentTime = time
  }

  const handleVolumeChange = (newVolume: number) => {
    if (!videoRef.current) return
    videoRef.current.volume = newVolume
    setVolume(newVolume)
  }

  const toggleFullscreen = async () => {
    if (!containerRef.current) return

    try {
      // Define types for fullscreen API compatibility
      const doc = document as Document & {
        webkitFullscreenElement?: Element
        mozFullScreenElement?: Element
        msFullscreenElement?: Element
        webkitExitFullscreen?: () => Promise<void>
        mozCancelFullScreen?: () => Promise<void>
        msExitFullscreen?: () => Promise<void>
      }

      const element = containerRef.current as HTMLElement & {
        webkitRequestFullscreen?: () => Promise<void>
        mozRequestFullScreen?: () => Promise<void>
        msRequestFullscreen?: () => Promise<void>
      }

      // Check if currently in fullscreen
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement
      )

      if (!isCurrentlyFullscreen) {
        // Enter fullscreen
        if (element.requestFullscreen) {
          await element.requestFullscreen()
        } else if (element.webkitRequestFullscreen) {
          await element.webkitRequestFullscreen()
        } else if (element.mozRequestFullScreen) {
          await element.mozRequestFullScreen()
        } else if (element.msRequestFullscreen) {
          await element.msRequestFullscreen()
        }
      } else {
        // Exit fullscreen
        if (doc.exitFullscreen) {
          await doc.exitFullscreen()
        } else if (doc.webkitExitFullscreen) {
          await doc.webkitExitFullscreen()
        } else if (doc.mozCancelFullScreen) {
          await doc.mozCancelFullScreen()
        } else if (doc.msExitFullscreen) {
          await doc.msExitFullscreen()
        }
      }
    } catch (err) {
      console.error('Error toggling fullscreen:', err)
      // Fallback: update state based on actual fullscreen status
      setIsFullscreen(!!document.fullscreenElement)
    }
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  return (
    <div className={`relative bg-black ${className}`}>
      <div 
        ref={containerRef} 
        className="w-full h-full min-h-[400px] cursor-grab active:cursor-grabbing"
        style={{ touchAction: 'none' }}
      />
      
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="text-white text-xl">Loading 360° Video...</div>
        </div>
      )}

      {controls && !isLoading && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
          <div className="flex items-center space-x-4">
            {/* Play/Pause Button */}
            <button
              onClick={togglePlay}
              className="text-white hover:text-gray-300 transition-colors"
            >
              {isPlaying ? (
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
              )}
            </button>

            {/* Time Display */}
            <div className="text-white text-sm">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>

            {/* Progress Bar */}
            <div className="flex-1">
              <input
                type="range"
                min="0"
                max={duration}
                value={currentTime}
                onChange={(e) => handleSeek(Number(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>

            {/* Volume Control */}
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.824L4.94 13.68A1 1 0 014.444 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.444a1 1 0 01.496-.18l3.443-3.144A1 1 0 019.383 3.076zM15 8a1 1 0 011-1 3 3 0 010 6 1 1 0 11-2 0 1 1 0 010-2 1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={(e) => handleVolumeChange(Number(e.target.value))}
                className="w-20 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              className="text-white hover:text-gray-300 transition-colors"
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              {isFullscreen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.5 3.5M15 9h4.5M15 9V4.5M15 9l5.5-5.5M9 15v4.5M9 15H4.5M9 15l-5.5 5.5M15 15h4.5M15 15v4.5m0-4.5l5.5 5.5" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Instructions overlay */}
      <div className="absolute top-4 left-4 text-white text-sm bg-black bg-opacity-50 px-3 py-2 rounded">
        Drag to look around • Scroll to zoom
      </div>
    </div>
  )
}