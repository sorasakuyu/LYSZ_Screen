import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Monitor, Loader2, ChevronRight, Plus, X } from 'lucide-react'
import axios from 'axios'
import clsx from 'clsx'
import { useAuthStore } from '../stores/authStore'
import { useDeviceStore } from '../stores/deviceStore'
import kaguyaSvg from '../img/Kaguya.svg'

const deviceApi = axios.create({
  baseURL: '/device'
})

export default function DeviceSelect() {
  const [devices, setDevices] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [formData, setFormData] = useState({ device_id: '', remark: '' })
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuthStore()
  const { setDevice } = useDeviceStore()
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin'

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }

    fetchDevices()
  }, [isAuthenticated, navigate])

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

  const handleSelectDevice = (device) => {
    setDevice(device)
    navigate('/')
  }

  const openAddModal = () => {
    if (!isAdmin) return
    setFormData({ device_id: '', remark: '' })
    setModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.device_id) return
    
    setSubmitting(true)
    try {
      await deviceApi.post('/update', formData)
      setModalOpen(false)
      fetchDevices()
    } catch (err) {
      console.error('添加设备失败:', err)
      alert(err.response?.data?.message || '添加设备失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gray-50">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-200/50 rounded-full blur-3xl animate-pulse-slow" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-200/50 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
      
      <div className="relative z-10 w-full max-w-md px-6">
        <div className="glass rounded-2xl p-8 shadow-xl animate-fade-in">
          <div className="text-center mb-8">
            <img src={kaguyaSvg} alt="Kaguya" className="w-16 h-16 mx-auto mb-4" />
            <h1 className="text-2xl font-bold gradient-text">选择设备</h1>
            <p className="text-gray-500 mt-2 text-sm">请选择要管理的设备</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            </div>
          ) : devices.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              暂无设备
              {isAdmin && (
                <button 
                  onClick={openAddModal}
                  className="block mx-auto mt-3 text-purple-500 hover:text-purple-600 transition-colors"
                >
                  + 添加设备
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {devices.map((device) => (
                  <button
                    key={device.device_id}
                    onClick={() => handleSelectDevice(device)}
                    className="w-full flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-100 to-purple-100 flex items-center justify-center">
                      <Monitor className="w-6 h-6 text-purple-600" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-gray-800">{device.device_id}</p>
                      <p className="text-sm text-gray-500">{device.remark || '未设置备注'}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all" />
                  </button>
                ))}
              </div>
              {isAdmin && (
                <button
                  onClick={openAddModal}
                  className="w-full mt-4 flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 hover:border-purple-300 hover:text-purple-500 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>添加设备</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <div className="relative glass rounded-2xl p-6 w-full max-w-md animate-slide-up shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800">添加设备</h2>
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
                  onChange={(e) => setFormData({ ...formData, device_id: e.target.value })}
                  className="input-field"
                  placeholder="请输入设备ID"
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
                    <span>添加</span>
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
