import { useEffect, useState } from 'react'
import { 
  Quote, 
  Plus, 
  Edit2, 
  Trash2,
  X,
  Loader2,
  Tag
} from 'lucide-react'
import axios from 'axios'
import clsx from 'clsx'
import { useAuthStore } from '../stores/authStore'

const api = axios.create({
  baseURL: '/quotes-api'
})

export default function QuotesManage() {
  const [quotes, setQuotes] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState('add')
  const [formData, setFormData] = useState({ content: '', defination: '', theme: '' })
  const [editId, setEditId] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const user = useAuthStore((state) => state.user)
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin'

  const fetchQuotes = async () => {
    try {
      const res = await api.get('/list')
      setQuotes(res.data.data || [])
      setTotal(res.data.total || 0)
    } catch (err) {
      console.error('获取金句失败:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchQuotes()
  }, [])

  const openAddModal = () => {
    if (!isAdmin) return
    setModalMode('add')
    setFormData({ content: '', defination: '', theme: '' })
    setModalOpen(true)
  }

  const openEditModal = (item) => {
    if (!isAdmin) return
    setModalMode('edit')
    setEditId(item.id)
    setFormData({ 
      content: item.content, 
      defination: item.defination || '', 
      theme: item.theme || '' 
    })
    setModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.content.trim()) return
    
    setSubmitting(true)
    try {
      const payload = { content: formData.content }
      if (formData.defination) payload.defination = formData.defination
      if (formData.theme) payload.theme = formData.theme

      if (modalMode === 'add') {
        await api.post('/add', payload)
      } else {
        await api.put(`/update/${editId}`, payload)
      }
      setModalOpen(false)
      fetchQuotes()
    } catch (err) {
      console.error('操作失败:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      await api.delete(`/delete/${id}`)
      setDeleteConfirm(null)
      fetchQuotes()
    } catch (err) {
      console.error('删除失败:', err)
    }
  }

  const themeColors = {
    '励志': 'bg-orange-100 text-orange-600',
    '人生': 'bg-purple-100 text-purple-600',
    '学习': 'bg-cyan-100 text-cyan-600',
    '爱情': 'bg-red-100 text-red-600',
    '友情': 'bg-green-100 text-green-600',
  }

  const getThemeStyle = (theme) => {
    if (!theme) return 'bg-gray-100 text-gray-500'
    return themeColors[theme] || 'bg-indigo-100 text-indigo-600'
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">每日金句管理</h1>
          <p className="text-gray-500 mt-1">共 {total} 条金句</p>
        </div>
        {isAdmin && (
          <button onClick={openAddModal} className="btn-primary flex items-center gap-2 self-start">
            <Plus className="w-4 h-4" />
            <span>添加金句</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      ) : quotes.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <Quote className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-400">暂无金句</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {quotes.map((item, index) => (
            <div
              key={item.id}
              className="glass rounded-2xl p-6 hover:scale-[1.02] transition-all duration-300 animate-slide-up group"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-100 to-purple-100 flex items-center justify-center">
                  <Quote className="w-5 h-5 text-purple-600" />
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

              <p className="text-lg text-gray-800 leading-relaxed mb-4 line-clamp-3">
                "{item.content}"
              </p>

              {item.theme && (
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-gray-400" />
                  <span className={clsx("px-3 py-1 rounded-full text-xs font-medium", getThemeStyle(item.theme))}>
                    {item.theme}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <div className="relative glass rounded-2xl p-6 w-full max-w-md animate-slide-up shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800">
                {modalMode === 'add' ? '添加金句' : '编辑金句'}
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  金句内容 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="input-field min-h-[100px] resize-none"
                  placeholder="请输入金句内容"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  释义 <span className="text-gray-400 text-xs">(选填)</span>
                </label>
                <input
                  type="text"
                  value={formData.defination}
                  onChange={(e) => setFormData({ ...formData, defination: e.target.value })}
                  className="input-field"
                  placeholder="金句的释义"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  主题 <span className="text-gray-400 text-xs">(选填)</span>
                </label>
                <input
                  type="text"
                  value={formData.theme}
                  onChange={(e) => setFormData({ ...formData, theme: e.target.value })}
                  className="input-field"
                  placeholder="如：励志、人生、学习"
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
            <p className="text-gray-500 mb-6">删除后无法恢复，确定要删除这条金句吗？</p>
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
