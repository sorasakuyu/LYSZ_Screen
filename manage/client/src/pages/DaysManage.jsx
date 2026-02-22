import { useEffect, useState } from 'react'
import { 
  Calendar, 
  Plus, 
  Edit2, 
  Trash2,
  X,
  Loader2,
  Clock,
  AlertCircle
} from 'lucide-react'
import axios from 'axios'
import clsx from 'clsx'
import { useAuthStore } from '../stores/authStore'

const api = axios.create({
  baseURL: '/days-api'
})

export default function DaysManage() {
  const [days, setDays] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState('add')
  const [formData, setFormData] = useState({ content: '', time: '' })
  const [editId, setEditId] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const user = useAuthStore((state) => state.user)
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin'

  const fetchDays = async () => {
    try {
      const res = await api.get('/list')
      setDays(res.data)
    } catch (err) {
      console.error('获取倒数日失败:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDays()
  }, [])

  const calculateDaysLeft = (dateStr) => {
    const target = new Date(dateStr)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    target.setHours(0, 0, 0, 0)
    const diff = Math.ceil((target - today) / (1000 * 60 * 60 * 24))
    return diff
  }

  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  const openAddModal = () => {
    if (!isAdmin) return
    setModalMode('add')
    setFormData({ content: '', time: '' })
    setModalOpen(true)
  }

  const openEditModal = (item) => {
    if (!isAdmin) return
    setModalMode('edit')
    setEditId(item.id)
    setFormData({ content: item.content, time: item.time })
    setModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.content || !formData.time) return
    
    setSubmitting(true)
    try {
      if (modalMode === 'add') {
        await api.post('/', formData)
      } else {
        await api.put(`/${editId}`, formData)
      }
      setModalOpen(false)
      fetchDays()
    } catch (err) {
      console.error('操作失败:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      await api.delete(`/${id}`)
      setDeleteConfirm(null)
      fetchDays()
    } catch (err) {
      console.error('删除失败:', err)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">倒数日管理</h1>
          <p className="text-gray-500 mt-1">管理重要的倒数日事件</p>
        </div>
        {isAdmin && (
          <button onClick={openAddModal} className="btn-primary flex items-center gap-2 self-start">
            <Plus className="w-4 h-4" />
            <span>添加倒数日</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      ) : days.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <Calendar className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-400">暂无倒数日</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {days.map((item, index) => {
            const daysLeft = calculateDaysLeft(item.time)
            const isPast = daysLeft < 0
            const isToday = daysLeft === 0
            const isNear = daysLeft > 0 && daysLeft <= 7
            
            return (
              <div
                key={item.id}
                className="glass rounded-2xl p-5 hover:scale-[1.02] transition-all duration-300 animate-slide-up group"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={clsx(
                    "w-12 h-12 rounded-xl flex items-center justify-center",
                    isPast ? "bg-gray-100" : isToday ? "bg-green-100" : isNear ? "bg-yellow-100" : "bg-purple-100"
                  )}>
                    {isPast ? (
                      <AlertCircle className="w-6 h-6 text-gray-400" />
                    ) : isToday ? (
                      <Clock className="w-6 h-6 text-green-600" />
                    ) : (
                      <Calendar className={clsx("w-6 h-6", isNear ? "text-yellow-600" : "text-purple-600")} />
                    )}
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => openEditModal(item)}
                        className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setDeleteConfirm(item.id)}
                        className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                <h3 className="text-lg font-semibold text-gray-800 mb-2 truncate">{item.content}</h3>
                
                <p className="text-sm text-gray-500 mb-4">{formatDate(item.time)}</p>

                <div className={clsx(
                  "flex items-center justify-center py-3 rounded-xl",
                  isPast ? "bg-gray-100" : isToday ? "bg-green-50" : isNear ? "bg-yellow-50" : "bg-purple-50"
                )}>
                  {isPast ? (
                    <span className="text-gray-500 font-medium">已过去 {-daysLeft} 天</span>
                  ) : isToday ? (
                    <span className="text-green-600 font-bold text-lg">就是今天！</span>
                  ) : (
                    <div className="text-center">
                      <span className={clsx("text-3xl font-bold", isNear ? "text-yellow-600" : "text-purple-600")}>
                        {daysLeft}
                      </span>
                      <span className="text-gray-500 text-sm ml-1">天</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <div className="relative glass rounded-2xl p-6 w-full max-w-md animate-slide-up shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800">
                {modalMode === 'add' ? '添加倒数日' : '编辑倒数日'}
              </h2>
              <button 
                onClick={() => setModalOpen(false)}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">事件名称</label>
                <input
                  type="text"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="input-field"
                  placeholder="例如：开学"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">目标日期</label>
                <input
                  type="date"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  className="input-field"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 px-4 py-3 bg-gray-100 rounded-xl text-gray-600 font-medium hover:bg-gray-200 transition-all"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 btn-primary h-12 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>处理中...</span>
                    </>
                  ) : (
                    <span>{modalMode === 'add' ? '添加' : '保存'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
          <div className="relative glass rounded-2xl p-6 w-full max-w-sm animate-slide-up shadow-xl text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">确认删除</h3>
            <p className="text-gray-500 mb-6">删除后无法恢复，确定要删除这个倒数日吗？</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-3 bg-gray-100 rounded-xl text-gray-600 font-medium hover:bg-gray-200 transition-all"
              >
                取消
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-all"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
