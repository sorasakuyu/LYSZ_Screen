import { useEffect, useState } from 'react'
import { 
  Monitor, 
  Plus, 
  Edit2, 
  Trash2,
  X,
  Loader2
} from 'lucide-react'
import axios from 'axios'
import clsx from 'clsx'
import { useAuthStore } from '../stores/authStore'

const deviceApi = axios.create({
  baseURL: '/device'
})

export default function DeviceManage() {
  const [devices, setDevices] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState('add')
  const [formData, setFormData] = useState({ device_id: '', remark: '' })
  const [editDeviceId, setEditDeviceId] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const user = useAuthStore((state) => state.user)
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin'

  const fetchDevices = async () => {
    try {
      const res = await deviceApi.get('/')
      setDevices(res.data)
    } catch (err) {
      console.error('获取设备列表失败:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDevices()
  }, [])

  const openAddModal = () => {
    if (!isAdmin) return
    setModalMode('add')
    setFormData({ device_id: '', remark: '' })
    setModalOpen(true)
  }

  const openEditModal = (device) => {
    if (!isAdmin) return
    setModalMode('edit')
    setEditDeviceId(device.device_id)
    setFormData({ device_id: device.device_id, remark: device.remark || '' })
    setModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.device_id) return
    
    setSubmitting(true)
    try {
      if (modalMode === 'add') {
        await deviceApi.post('/update', formData)
      } else {
        await deviceApi.put(`/remark/${editDeviceId}`, { remark: formData.remark })
      }
      setModalOpen(false)
      fetchDevices()
    } catch (err) {
      console.error('操作失败:', err)
      alert(err.response?.data?.message || '操作失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (deviceId) => {
    try {
      await deviceApi.delete(`/delete/${deviceId}`)
      setDeleteConfirm(null)
      fetchDevices()
    } catch (err) {
      console.error('删除失败:', err)
      alert('删除失败，请重试')
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">设备管理</h1>
          <p className="text-gray-500 mt-1">管理所有设备</p>
        </div>
        {isAdmin && (
          <button onClick={openAddModal} className="btn-primary flex items-center gap-2 self-start">
            <Plus className="w-4 h-4" />
            <span>添加设备</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      ) : devices.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <Monitor className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-400">暂无设备，点击上方按钮添加</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {devices.map((device, index) => (
            <div
              key={device.device_id}
              className="glass rounded-2xl p-5 hover:scale-[1.02] transition-all duration-300 animate-slide-up group"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-100 to-purple-100 flex items-center justify-center">
                  <Monitor className="w-6 h-6 text-purple-600" />
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => openEditModal(device)}
                      className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setDeleteConfirm(device.device_id)}
                      className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <h3 className="text-lg font-semibold text-gray-800 mb-2 truncate">{device.device_id}</h3>
              <p className="text-sm text-gray-500">{device.remark || '未设置备注'}</p>
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
                {modalMode === 'add' ? '添加设备' : '编辑设备'}
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
                <label className="block text-sm font-medium text-gray-700 mb-2">设备ID</label>
                <input
                  type="text"
                  value={formData.device_id}
                  onChange={(e) => modalMode === 'add' && setFormData({ ...formData, device_id: e.target.value })}
                  className="input-field"
                  placeholder="请输入设备ID"
                  disabled={modalMode === 'edit'}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">备注</label>
                <input
                  type="text"
                  value={formData.remark}
                  onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                  className="input-field"
                  placeholder="请输入备注"
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
            <p className="text-gray-500 mb-6">删除后无法恢复，确定要删除这个设备吗？</p>
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
