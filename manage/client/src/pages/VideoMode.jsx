import { useEffect, useState, useRef } from 'react'
import { 
  Video, 
  Loader2,
  Upload,
  RefreshCw,
  Check,
  X,
  Film,
  Play
} from 'lucide-react'
import axios from 'axios'
import clsx from 'clsx'
import { useAuthStore } from '../stores/authStore'
import { useDeviceStore } from '../stores/deviceStore'

const configApi = axios.create({
  baseURL: '/config-api'
})

const videoApi = axios.create({
  baseURL: '/video-api'
})

export default function VideoMode() {
  const [config, setConfig] = useState({ mode: 'default' })
  const [loading, setLoading] = useState(true)
  const [modeChanging, setModeChanging] = useState(false)

  const [videos, setVideos] = useState([])
  const [selectedVideo, setSelectedVideo] = useState(null)
  const [currentVideo, setCurrentVideo] = useState('')
  const [videosLoading, setVideosLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [hoveredVideo, setHoveredVideo] = useState(null)
  const fileInputRef = useRef(null)
  const user = useAuthStore((state) => state.user)
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin'
  const { currentDevice } = useDeviceStore()

  const fetchConfig = async () => {
    try {
      const res = await configApi.get(`/?device=${currentDevice?.device_id}`)
      setConfig(res.data)
    } catch (err) {
      console.error('获取配置失败:', err)
    }
  }

  const fetchVideos = async () => {
    setVideosLoading(true)
    try {
      const res = await videoApi.get(`/files?device=${currentDevice?.device_id}`)
      setVideos(res.data.items || [])
    } catch (err) {
      console.error('获取视频列表失败:', err)
    } finally {
      setVideosLoading(false)
    }
  }

  const fetchCurrentVideo = async () => {
    try {
      const res = await videoApi.get(`?device=${currentDevice?.device_id}`)
      const url = res.data.url || ''
      const filename = url.split('/').pop() || ''
      setCurrentVideo(filename)
    } catch (err) {
      console.error('获取当前视频失败:', err)
    }
  }

  const handleFileUpload = async (file) => {
    if (!file || !file.type.startsWith('video/')) {
      alert('请选择视频文件')
      return
    }

    setUploading(true)
    setUploadProgress(0)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('device', currentDevice?.device_id)

    try {
      await videoApi.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          setUploadProgress(percentCompleted)
        }
      })
      fetchVideos()
      alert('上传成功！')
    } catch (err) {
      console.error('上传失败:', err)
      alert('上传失败，请重试')
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileUpload(file)
  }

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file) handleFileUpload(file)
  }

  const handleConfirmVideo = async () => {
    if (!selectedVideo) {
      alert('请先选择一个视频')
      return
    }

    try {
      await videoApi.put('/', { device: currentDevice?.device_id, filename: selectedVideo })
      setCurrentVideo(selectedVideo)
      setSelectedVideo(null)
      alert('设置成功！')
    } catch (err) {
      console.error('设置视频失败:', err)
      alert('设置失败，请重试')
    }
  }

  useEffect(() => {
    if (currentDevice) {
      const init = async () => {
        await fetchConfig()
        setLoading(false)
      }
      init()
    }
  }, [currentDevice])

  useEffect(() => {
    if (currentDevice && config.mode === 'video') {
      fetchVideos()
      fetchCurrentVideo()
    }
  }, [config.mode, currentDevice])

  const isVideoEnabled = config.mode === 'video'

  const handleModeChange = async (enabled) => {
    if (!isAdmin) return
    setModeChanging(true)
    try {
      const newMode = enabled ? 'video' : 'default'
      await configApi.put('/config/mode', { value: newMode, device: currentDevice?.device_id })
      setConfig(prev => ({ ...prev, mode: newMode }))
    } catch (err) {
      console.error('更改模式失败:', err)
    } finally {
      setModeChanging(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">视频模式</h1>
        <p className="text-gray-500 mt-1">配置视频播放模式</p>
      </div>

      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
              <Video className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">视频模式</h3>
              <p className="text-sm text-gray-500">开启后将播放视频</p>
            </div>
          </div>
        </div>

        {isAdmin ? (
          <div className="flex gap-3">
            <button
              onClick={() => handleModeChange(true)}
              disabled={modeChanging}
              className={clsx(
                "flex-1 py-3 rounded-xl font-medium transition-all duration-300",
                isVideoEnabled 
                  ? "bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow-lg shadow-purple-500/30" 
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              )}
            >
              {modeChanging ? <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> : null}
              开启
            </button>
            <button
              onClick={() => handleModeChange(false)}
              disabled={modeChanging}
              className={clsx(
                "flex-1 py-3 rounded-xl font-medium transition-all duration-300",
                !isVideoEnabled 
                  ? "bg-gradient-to-r from-red-500 to-orange-600 text-white shadow-lg shadow-red-500/30" 
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              )}
            >
              {modeChanging ? <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> : null}
              关闭
            </button>
          </div>
        ) : (
          <div className="p-4 bg-gray-50 rounded-xl">
            <span className="text-gray-600">当前状态：</span>
            <span className={clsx("font-medium ml-2", isVideoEnabled ? "text-green-600" : "text-gray-500")}>
              {isVideoEnabled ? '已开启' : '已关闭'}
            </span>
          </div>
        )}
      </div>

      {isVideoEnabled && (
        <div className="space-y-6 animate-slide-up">
          {isAdmin && (
            <div className="glass rounded-2xl p-6">
              <h3 className="font-semibold text-gray-800 mb-4">上传视频</h3>

              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={clsx(
                  "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300",
                  isDragging 
                    ? "border-cyan-500 bg-cyan-50" 
                    : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                {uploading ? (
                  <div className="flex flex-col items-center gap-3 w-full max-w-xs">
                    <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                    <span className="text-gray-500">上传中...</span>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-cyan-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-400">{uploadProgress}%</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-8 h-8 text-gray-400" />
                    <span className="text-gray-500">点击或拖拽视频到此处上传</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">视频列表</h3>
              <div className="flex items-center gap-3">
                {currentVideo && (
                  <span className="text-sm text-purple-600">当前: {currentVideo}</span>
                )}
                <button
                  onClick={() => { fetchVideos(); fetchCurrentVideo(); }}
                  disabled={videosLoading}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-800 bg-gray-100 rounded-lg transition-all"
                >
                  <RefreshCw className={clsx("w-4 h-4", videosLoading && "animate-spin")} />
                  刷新
                </button>
              </div>
            </div>

            {videosLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
              </div>
            ) : videos.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                暂无视频，请先上传
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {videos.map((item) => {
                  const videoItem = typeof item === 'string' ? { filename: item, url: '', preview: '' } : item
                  const isSelected = selectedVideo === videoItem.filename
                  const isCurrent = currentVideo === videoItem.filename
                  return (
                    <div
                      key={videoItem.filename}
                      onClick={() => isAdmin && setSelectedVideo(isSelected ? null : videoItem.filename)}
                      onMouseEnter={() => setHoveredVideo(videoItem)}
                      onMouseLeave={() => setHoveredVideo(null)}
                      className={clsx(
                        "relative rounded-xl overflow-hidden transition-all duration-300 group",
                        isAdmin ? "cursor-pointer" : "cursor-default",
                        isSelected 
                          ? "ring-2 ring-cyan-500 ring-offset-2 ring-offset-gray-100 scale-[1.02]" 
                          : "hover:scale-[1.02]"
                      )}
                    >
                      <div className="aspect-video bg-gray-200 flex items-center justify-center relative">
                        {videoItem.preview ? (
                          <img 
                            src={videoItem.preview} 
                            alt={videoItem.filename}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-gray-300/80 flex items-center justify-center">
                            <Play className="w-8 h-8 text-gray-500 ml-1" />
                          </div>
                        )}
                        {hoveredVideo?.filename === videoItem.filename && (
                          <video
                            src={videoItem.url}
                            className="absolute inset-0 w-full h-full object-cover"
                            autoPlay
                            muted
                            loop
                          />
                        )}
                      </div>
                      {isCurrent && (
                        <div className="absolute top-2 left-2 px-2 py-0.5 bg-cyan-500 text-white text-xs rounded-full z-10">
                          当前
                        </div>
                      )}
                      {isSelected && (
                        <div className="absolute inset-0 bg-cyan-500/20 flex items-center justify-center z-10">
                          <div className="w-12 h-12 rounded-full bg-cyan-500 flex items-center justify-center">
                            <Check className="w-6 h-6 text-white" />
                          </div>
                        </div>
                      )}
                      <div className="p-3 bg-gray-50">
                        <div className="flex items-center gap-2">
                          <Film className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <p className="text-sm text-gray-700 truncate">{videoItem.filename}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {isAdmin && selectedVideo && (
              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => setSelectedVideo(null)}
                  className="flex-1 py-3 rounded-xl font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
                >
                  <X className="w-4 h-4" />
                  取消
                </button>
                <button
                  onClick={handleConfirmVideo}
                  className="flex-1 btn-primary py-3 flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>确定</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
