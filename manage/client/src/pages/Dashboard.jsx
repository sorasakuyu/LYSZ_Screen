import { useEffect, useState } from 'react'
import { 
  Loader2,
  Settings,
  Bell,
  Video,
  FileText
} from 'lucide-react'
import axios from 'axios'
import clsx from 'clsx'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useAuthStore } from '../stores/authStore'
import { useDeviceStore } from '../stores/deviceStore'

const configApi = axios.create({
  baseURL: '/config-api'
})

export default function Dashboard() {
  const [config, setConfig] = useState({ mode: 'default', notice_mode: 'text' })
  const [loading, setLoading] = useState(true)
  const [announcement, setAnnouncement] = useState('')
  const [announcementLoading, setAnnouncementLoading] = useState(true)
  const user = useAuthStore((state) => state.user)
  const { currentDevice } = useDeviceStore()

  const fetchConfig = async () => {
    try {
      const res = await configApi.get(`/?device=${currentDevice?.device_id}`)
      setConfig(res.data)
    } catch (err) {
      console.error('获取配置失败:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchAnnouncement = async () => {
    try {
      const res = await axios.get('https://www.sorasaku.vip/kaguya.md')
      setAnnouncement(res.data)
    } catch (err) {
      console.error('获取公告失败:', err)
      setAnnouncement('暂无法加载公告')
    } finally {
      setAnnouncementLoading(false)
    }
  }

  useEffect(() => {
    if (currentDevice) {
      fetchConfig()
      fetchAnnouncement()
    }
  }, [currentDevice])

  const getModeLabel = (mode) => {
    switch (mode) {
      case 'notice': return '通知模式'
      case 'video': return '视频模式'
      default: return '默认模式'
    }
  }

  const getNoticeModeLabel = (noticeMode) => {
    switch (noticeMode) {
      case 'text': return '文字通知'
      case 'picture': return '图片通知'
      default: return '文字通知'
    }
  }

  const getModeIcon = (mode) => {
    switch (mode) {
      case 'notice': return Bell
      case 'video': return Video
      default: return Settings
    }
  }

  const getModeStyle = (mode) => {
    switch (mode) {
      case 'notice': return { bg: 'bg-purple-100', text: 'text-purple-600', icon: 'text-purple-500' }
      case 'video': return { bg: 'bg-cyan-100', text: 'text-cyan-600', icon: 'text-cyan-500' }
      default: return { bg: 'bg-gray-100', text: 'text-gray-600', icon: 'text-gray-500' }
    }
  }

  const ModeIcon = getModeIcon(config.mode)
  const modeStyle = getModeStyle(config.mode)

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">你好，{user?.username || '管理员'}</h1>
            <p className="text-gray-500 mt-1">欢迎回来，这是您的系统概览</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center", modeStyle.bg)}>
              <ModeIcon className={clsx("w-5 h-5", modeStyle.icon)} />
            </div>
            <h2 className="text-lg font-semibold text-gray-800">当前模式</h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">系统模式</span>
                  <span className={clsx("px-3 py-1 rounded-full text-sm font-medium", modeStyle.bg, modeStyle.text)}>
                    {getModeLabel(config.mode)}
                  </span>
                </div>
              </div>

              {config.mode === 'notice' && (
                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">通知方式</span>
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-600">
                      {getNoticeModeLabel(config.notice_mode)}
                    </span>
                  </div>
                </div>
              )}

              <div className="pt-2">
                <p className="text-sm text-gray-400">
                  {config.mode === 'default' && '系统正在以默认模式运行'}
                  {config.mode === 'notice' && '系统正在显示通知内容'}
                  {config.mode === 'video' && '系统正在播放视频'}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="glass rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-cyan-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-cyan-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-800">公告</h2>
          </div>

          {announcementLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
            </div>
          ) : (
            <div className="prose prose-sm max-w-none prose-headings:text-gray-800 prose-p:text-gray-600 prose-a:text-cyan-600 prose-code:text-purple-600 prose-pre:bg-gray-100">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {announcement}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </div>

      <div className="glass rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">快速操作</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <a href="/notice" className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all text-center group">
            <Bell className="w-8 h-8 text-purple-500 mx-auto mb-2 group-hover:scale-110 transition-transform" />
            <span className="text-sm text-gray-600">通知设置</span>
          </a>
          <a href="/video" className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all text-center group">
            <Video className="w-8 h-8 text-cyan-500 mx-auto mb-2 group-hover:scale-110 transition-transform" />
            <span className="text-sm text-gray-600">视频模式</span>
          </a>
          <a href="/days" className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all text-center group">
            <Settings className="w-8 h-8 text-orange-500 mx-auto mb-2 group-hover:scale-110 transition-transform" />
            <span className="text-sm text-gray-600">倒数日</span>
          </a>
          <a href="/quotes" className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all text-center group">
            <FileText className="w-8 h-8 text-green-500 mx-auto mb-2 group-hover:scale-110 transition-transform" />
            <span className="text-sm text-gray-600">每日金句</span>
          </a>
        </div>
      </div>
    </div>
  )
}
