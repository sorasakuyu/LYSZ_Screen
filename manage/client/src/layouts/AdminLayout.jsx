import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { 
  LayoutDashboard, 
  Users, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  Bell,
  Search,
  ChevronDown,
  Calendar,
  Quote,
  Info,
  Video,
  FileText,
  Key
} from 'lucide-react'
import axios from 'axios'
import { useAuthStore } from '../stores/authStore'
import clsx from 'clsx'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import kaguyaSvg from '../img/Kaguya.svg'

const navItems = [
  { path: '/', icon: LayoutDashboard, label: '仪表盘', adminOnly: false },
  { path: '/users', icon: Users, label: '用户管理', adminOnly: true },
  { path: '/days', icon: Calendar, label: '倒数日管理', adminOnly: true },
  { path: '/quotes', icon: Quote, label: '每日金句', adminOnly: true },
  { path: '/notice', icon: Bell, label: '通知设置', adminOnly: true },
  { path: '/video', icon: Video, label: '视频模式', adminOnly: true },
  // { path: '/password', icon: Key, label: '修改密码', adminOnly: false },
  { path: '/about', icon: Info, label: '关于', adminOnly: false },
]

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [announcementOpen, setAnnouncementOpen] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const [announcementLoading, setAnnouncementLoading] = useState(true)
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin'

  const filteredNavItems = navItems.filter(item => !item.adminOnly || isAdmin)

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
    fetchAnnouncement()
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside 
        className={clsx(
          "fixed lg:static inset-y-0 left-0 z-50 flex flex-col glass border-r border-gray-200 transition-all duration-300",
          sidebarOpen ? "w-64" : "w-0 lg:w-20"
        )}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <img src={kaguyaSvg} alt="Kaguya" className="w-10 h-10" />
            <span className={clsx("font-bold text-lg gradient-text", !sidebarOpen && "lg:hidden")}>Kaguya管理系统</span>
          </div>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-2 overflow-y-auto">
          {filteredNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-300 group",
                  isActive 
                    ? "bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-purple-600 border border-purple-300" 
                    : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                )
              }
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span className={clsx("font-medium", !sidebarOpen && "lg:hidden")}>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-200 flex-shrink-0">
          <button
            onClick={handleLogout}
            className={clsx(
              "flex items-center gap-3 w-full px-3 py-3 rounded-xl text-gray-500 hover:text-red-500 hover:bg-red-50 transition-all duration-300"
            )}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span className={clsx("font-medium", !sidebarOpen && "lg:hidden")}>退出登录</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 glass border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-all"
            >
              <Menu className="w-5 h-5" />
            </button>
            
            <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-xl border border-gray-200">
              <Search className="w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="搜索..." 
                className="bg-transparent border-none outline-none text-sm text-gray-800 placeholder-gray-400 w-48"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => setAnnouncementOpen(true)}
              className="relative p-2 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-all"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>

            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-100 transition-all"
              >
                <span className="text-sm font-medium text-gray-700">{user?.username || '管理员'}</span>
                <ChevronDown className={clsx("w-4 h-4 text-gray-400 transition-transform", userMenuOpen && "rotate-180")} />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 glass rounded-xl border border-gray-200 py-2 animate-slide-up shadow-lg z-50">
                  <NavLink 
                    to="/password"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 transition-all"
                  >
                    <Key className="w-4 h-4" />
                    <span>修改密码</span>
                  </NavLink>
                  <button 
                    onClick={handleLogout}
                    className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition-all"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>退出登录</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>

      {announcementOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setAnnouncementOpen(false)} />
          <div className="relative glass rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] animate-slide-up shadow-xl flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-100 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-cyan-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-800">系统公告</h2>
              </div>
              <button 
                onClick={() => setAnnouncementOpen(false)}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto prose prose-sm max-w-none prose-headings:text-gray-800 prose-p:text-gray-600 prose-a:text-cyan-600 prose-code:text-purple-600 prose-pre:bg-gray-100">
              {announcementLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-gray-300 border-t-cyan-500 rounded-full animate-spin" />
                </div>
              ) : (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {announcement}
                </ReactMarkdown>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
