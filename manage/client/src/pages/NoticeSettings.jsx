import { useEffect, useState, useRef } from 'react'
import { 
  Bell, 
  Loader2, 
  Save,
  Type,
  Image,
  Upload,
  RefreshCw,
  Check,
  X
} from 'lucide-react'
import axios from 'axios'
import clsx from 'clsx'
import { useAuthStore } from '../stores/authStore'
import { useDeviceStore } from '../stores/deviceStore'

const configApi = axios.create({
  baseURL: '/config-api'
})

const noticeApi = axios.create({
  baseURL: '/notice-api'
})

const pictureApi = axios.create({
  baseURL: '/picture-api'
})

export default function NoticeSettings() {
  const [config, setConfig] = useState({ mode: 'default', notice_mode: 'text' })
  const [notice, setNotice] = useState({ title: '', context: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [modeChanging, setModeChanging] = useState(false)

  const [images, setImages] = useState([])
  const [selectedImage, setSelectedImage] = useState(null)
  const [currentPicture, setCurrentPicture] = useState('')
  const [imagesLoading, setImagesLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [previewImage, setPreviewImage] = useState(null)
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

  const fetchNotice = async () => {
    try {
      const res = await noticeApi.get(`/?device=${currentDevice?.device_id}`)
      setNotice(res.data)
    } catch (err) {
      console.error('获取通知失败:', err)
    }
  }

  const fetchImages = async () => {
    setImagesLoading(true)
    try {
      const res = await pictureApi.get(`/files`)
      setImages(res.data.items || [])
    } catch (err) {
      console.error('获取图片列表失败:', err)
    } finally {
      setImagesLoading(false)
    }
  }

  const fetchCurrentPicture = async () => {
    try {
      const res = await pictureApi.get(`/?device=${currentDevice?.device_id}`)
      const url = res.data.url || ''
      const filename = url.split('/').pop() || ''
      setCurrentPicture(filename)
    } catch (err) {
      console.error('获取当前图片失败:', err)
    }
  }

  const handleFileUpload = async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      alert('请选择图片文件')
      return
    }

    setUploading(true)
    setUploadProgress(0)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('device', currentDevice?.device_id)

    try {
      await pictureApi.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          setUploadProgress(percentCompleted)
        }
      })
      fetchImages()
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

  const handleConfirmImage = async () => {
    if (!selectedImage) {
      alert('请先选择一张图片')
      return
    }

    setSaving(true)
    try {
      await pictureApi.put('/', { device: currentDevice?.device_id, filename: selectedImage })
      setCurrentPicture(selectedImage)
      setSelectedImage(null)
      alert('设置成功！')
    } catch (err) {
      console.error('设置图片失败:', err)
      alert('设置失败，请重试')
    } finally {
      setSaving(false)
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
    if (currentDevice && config.mode === 'notice' && config.notice_mode === 'text') {
      fetchNotice()
    }
    if (currentDevice && config.mode === 'notice' && config.notice_mode === 'picture') {
      fetchImages()
      fetchCurrentPicture()
    }
  }, [config.mode, config.notice_mode, currentDevice])

  const isNoticeEnabled = config.mode === 'notice'

  const handleModeChange = async (enabled) => {
    if (!isAdmin) return
    setModeChanging(true)
    try {
      const newMode = enabled ? 'notice' : 'default'
      await configApi.put('/config/mode', { value: newMode, device: currentDevice?.device_id })
      setConfig(prev => ({ ...prev, mode: newMode }))
    } catch (err) {
      console.error('更改模式失败:', err)
    } finally {
      setModeChanging(false)
    }
  }

  const handleNoticeModeChange = async (mode) => {
    if (!isAdmin) return
    try {
      await configApi.put('/config/notice_mode', { value: mode, device: currentDevice?.device_id })
      setConfig(prev => ({ ...prev, notice_mode: mode }))
    } catch (err) {
      console.error('更改通知方式失败:', err)
    }
  }

  const handleSaveNotice = async () => {
    if (!isAdmin) return
    setSaving(true)
    try {
      await noticeApi.put('/update-notice', { ...notice, device: currentDevice?.device_id })
      alert('保存成功！')
    } catch (err) {
      console.error('保存通知失败:', err)
      alert('保存失败，请重试')
    } finally {
      setSaving(false)
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
        <h1 className="text-2xl font-bold text-gray-800">通知设置</h1>
        <p className="text-gray-500 mt-1">配置系统通知模式和内容</p>
      </div>

      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
              <Bell className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">通知模式</h3>
              <p className="text-sm text-gray-500">开启后将显示通知内容</p>
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
                isNoticeEnabled 
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
                !isNoticeEnabled 
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
            <span className={clsx("font-medium ml-2", isNoticeEnabled ? "text-green-600" : "text-gray-500")}>
              {isNoticeEnabled ? '已开启' : '已关闭'}
            </span>
          </div>
        )}
      </div>

      {isNoticeEnabled && (
        <div className="space-y-6 animate-slide-up">
          <div className="glass rounded-2xl p-6">
            <h3 className="font-semibold text-gray-800 mb-4">通知方式</h3>
            {isAdmin ? (
              <div className="flex gap-3">
                <button
                  onClick={() => handleNoticeModeChange('text')}
                  className={clsx(
                    "flex-1 py-3 rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-2",
                    config.notice_mode === 'text'
                      ? "bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow-lg shadow-purple-500/30"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  )}
                >
                  <Type className="w-4 h-4" />
                  文字
                </button>
                <button
                  onClick={() => handleNoticeModeChange('picture')}
                  className={clsx(
                    "flex-1 py-3 rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-2",
                    config.notice_mode === 'picture'
                      ? "bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow-lg shadow-purple-500/30"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  )}
                >
                  <Image className="w-4 h-4" />
                  图片
                </button>
              </div>
            ) : (
              <div className="p-4 bg-gray-50 rounded-xl">
                <span className="text-gray-600">当前方式：</span>
                <span className="font-medium ml-2 text-purple-600">
                  {config.notice_mode === 'text' ? '文字通知' : '图片通知'}
                </span>
              </div>
            )}
          </div>

          {config.notice_mode === 'text' && (
            <div className="glass rounded-2xl p-6 animate-slide-up">
              <h3 className="font-semibold text-gray-800 mb-4">通知内容</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">标题</label>
                  <input
                    type="text"
                    value={notice.title}
                    onChange={(e) => isAdmin && setNotice({ ...notice, title: e.target.value })}
                    className="input-field"
                    placeholder="请输入通知标题"
                    disabled={!isAdmin}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">内容</label>
                  <textarea
                    value={notice.context}
                    onChange={(e) => isAdmin && setNotice({ ...notice, context: e.target.value })}
                    className="input-field min-h-[120px] resize-none"
                    placeholder="请输入通知内容"
                    disabled={!isAdmin}
                  />
                </div>

                {isAdmin && (
                  <button
                    onClick={handleSaveNotice}
                    disabled={saving}
                    className="btn-primary flex items-center justify-center gap-2 w-full py-3"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>保存中...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>保存</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}

          {config.notice_mode === 'picture' && (
            <div className="space-y-6 animate-slide-up">
              {isAdmin && (
                <div className="glass rounded-2xl p-6">
                  <h3 className="font-semibold text-gray-800 mb-4">上传图片</h3>
                  <div className="flex gap-4">
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={clsx(
                        "flex-1 border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 min-h-[160px] flex items-center justify-center",
                        isDragging 
                          ? "border-cyan-500 bg-cyan-50" 
                          : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                      )}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
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
                          <span className="text-gray-500">点击或拖拽图片到此处上传</span>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => window.open('http://daemon.api.kaguya.lysz.sorasaku.vip:5244/Image', 'resourceLibrary', 'width=1200,height=800,scrollbars=yes,resizable=yes')}
                      className="flex-1 border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 min-h-[160px] flex items-center justify-center border-purple-300 hover:border-purple-400 hover:bg-purple-50 bg-purple-50/30"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <svg className="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                        </svg>
                        <span className="text-purple-600 font-medium">打开资源库</span>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              <div className="glass rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-800">图片列表</h3>
                  <div className="flex items-center gap-3">
                    {currentPicture && (
                      <span className="text-sm text-purple-600">当前: {currentPicture}</span>
                    )}
                    <button
                      onClick={() => { fetchImages(); fetchCurrentPicture(); }}
                      disabled={imagesLoading}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-800 bg-gray-100 rounded-lg transition-all"
                    >
                      <RefreshCw className={clsx("w-4 h-4", imagesLoading && "animate-spin")} />
                      刷新
                    </button>
                  </div>
                </div>

                {imagesLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                  </div>
                ) : images.length === 0 ? (
                  <div className="text-center py-10 text-gray-400">
                    暂无图片，请先上传
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                    {images.map((item) => {
                      const isSelected = selectedImage === item.filename
                      const isCurrent = currentPicture === item.filename
                      return (
                        <div
                          key={item.filename}
                          onClick={() => isAdmin && setSelectedImage(isSelected ? null : item.filename)}
                          onMouseEnter={() => setPreviewImage(item)}
                          onMouseLeave={() => setPreviewImage(null)}
                          className={clsx(
                            "relative aspect-square rounded-xl overflow-hidden transition-all duration-300 group",
                            isAdmin ? "cursor-pointer" : "cursor-default",
                            isSelected 
                              ? "ring-2 ring-cyan-500 ring-offset-2 ring-offset-gray-100 scale-105" 
                              : "hover:scale-105"
                          )}
                        >
                          <img
                            src={item.thumbnail}
                            alt={item.filename}
                            className="w-full h-full object-cover"
                          />
                          {isCurrent && (
                            <div className="absolute top-1 left-1 px-2 py-0.5 bg-cyan-500 text-white text-xs rounded-full">
                              当前
                            </div>
                          )}
                          {isSelected && (
                            <div className="absolute inset-0 bg-cyan-500/30 flex items-center justify-center">
                              <Check className="w-6 h-6 text-white" />
                            </div>
                          )}
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <p className="text-xs text-white truncate">{item.filename}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {previewImage && (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none">
                    <div className="relative glass rounded-2xl p-4 max-w-2xl max-h-[80vh] animate-slide-up shadow-xl">
                      <img
                        src={previewImage.thumbnail}
                        alt={previewImage.filename}
                        className="max-w-full max-h-[60vh] object-contain rounded-lg"
                      />
                      <p className="text-sm text-gray-700 text-center mt-2 truncate">{previewImage.filename}</p>
                    </div>
                  </div>
                )}

                {isAdmin && selectedImage && (
                  <div className="mt-4 flex gap-3">
                    <button
                      onClick={() => setSelectedImage(null)}
                      className="flex-1 py-3 rounded-xl font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      取消
                    </button>
                    <button
                      onClick={handleConfirmImage}
                      disabled={saving}
                      className="flex-1 btn-primary py-3 flex items-center justify-center gap-2"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>设置中...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>确定</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
