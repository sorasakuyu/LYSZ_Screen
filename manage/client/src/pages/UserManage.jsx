import { useEffect, useState } from 'react'
import { 
  Search, 
  Plus, 
  Edit2, 
  Trash2,
  Shield,
  Loader2,
  X,
  User,
  Key
} from 'lucide-react'
import axios from 'axios'
import clsx from 'clsx'
import { useAuthStore } from '../stores/authStore'

const api = axios.create({
  baseURL: '/api'
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default function UserManage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState('add')
  const [formData, setFormData] = useState({ id: null, username: '', password: '', role: 'user' })
  const [saving, setSaving] = useState(false)
  const currentUser = useAuthStore((state) => state.user)

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const res = await api.get('/users')
      setUsers(res.data)
    } catch (err) {
      console.error('获取用户失败:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const openAddModal = () => {
    setFormData({ id: null, username: '', password: '', role: 'user' })
    setModalMode('add')
    setShowModal(true)
  }

  const openEditModal = (user) => {
    setFormData({ id: user.id, username: user.username, password: '', role: user.role })
    setModalMode('edit')
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (modalMode === 'add') {
        await api.post('/users', formData)
      } else {
        const updateData = { username: formData.username, role: formData.role }
        if (formData.password) {
          updateData.password = formData.password
        }
        await api.put(`/users/${formData.id}`, updateData)
      }
      setShowModal(false)
      fetchUsers()
    } catch (err) {
      alert(err.response?.data?.message || '操作失败')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('确定要删除此用户吗？')) return
    try {
      await api.delete(`/users/${id}`)
      fetchUsers()
    } catch (err) {
      alert(err.response?.data?.message || '删除失败')
    }
  }

  const getRoleLabel = (role) => {
    switch (role) {
      case 'super_admin': return '超级管理员'
      case 'admin': return '管理员'
      default: return '普通用户'
    }
  }

  const getRoleStyle = (role) => {
    switch (role) {
      case 'super_admin': return 'bg-red-100 text-red-600'
      case 'admin': return 'bg-purple-100 text-purple-600'
      default: return 'bg-cyan-100 text-cyan-600'
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">用户管理</h1>
          <p className="text-gray-500 mt-1">管理系统用户账号和权限</p>
        </div>
        <button onClick={openAddModal} className="btn-primary flex items-center gap-2 self-start">
          <Plus className="w-4 h-4" />
          <span>添加用户</span>
        </button>
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <div className="flex-1 flex items-center gap-2 px-4 py-2.5 bg-gray-100 rounded-xl border border-gray-200">
              <Search className="w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="搜索用户..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent border-none outline-none text-sm text-gray-800 placeholder-gray-400 flex-1"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left text-sm font-medium text-gray-500 px-6 py-4">用户</th>
                <th className="text-left text-sm font-medium text-gray-500 px-6 py-4">角色</th>
                <th className="text-left text-sm font-medium text-gray-500 px-6 py-4">创建时间</th>
                <th className="text-right text-sm font-medium text-gray-500 px-6 py-4">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-purple-500" />
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                    未找到用户
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user, index) => (
                  <tr 
                    key={user.id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-all animate-slide-up"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-100 to-purple-100 flex items-center justify-center">
                          <User className="w-5 h-5 text-gray-500" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{user.username}</p>
                          <p className="text-sm text-gray-400">ID: {user.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={clsx(
                        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium",
                        getRoleStyle(user.role)
                      )}>
                        <Shield className="w-3 h-3" />
                        {getRoleLabel(user.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">
                        {new Date(user.created_at).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => openEditModal(user)}
                          className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {currentUser?.role === 'super_admin' && user.id !== currentUser.id && (
                          <button 
                            onClick={() => handleDelete(user.id)}
                            className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            共 <span className="text-gray-700 font-medium">{filteredUsers.length}</span> 个用户
          </p>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative glass rounded-2xl p-6 w-full max-w-md animate-slide-up shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800">
                {modalMode === 'add' ? '添加用户' : '编辑用户'}
              </h2>
              <button 
                onClick={() => setShowModal(false)}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">用户名</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="input-field pl-10"
                    placeholder="请输入用户名"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  密码 {modalMode === 'edit' && <span className="text-gray-400">(留空则不修改)</span>}
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="input-field pl-10"
                    placeholder={modalMode === 'add' ? '请输入密码' : '留空则不修改'}
                    required={modalMode === 'add'}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">角色</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="input-field"
                >
                  <option value="user">普通用户</option>
                  <option value="admin">管理员</option>
                  {currentUser?.role === 'super_admin' && (
                    <option value="super_admin">超级管理员</option>
                  )}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 rounded-xl font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 btn-primary py-3 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>保存中...</span>
                    </>
                  ) : (
                    <span>保存</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
