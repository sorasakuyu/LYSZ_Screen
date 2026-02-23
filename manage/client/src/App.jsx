import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import { useDeviceStore } from './stores/deviceStore'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import UserManage from './pages/UserManage'
import DaysManage from './pages/DaysManage'
import QuotesManage from './pages/QuotesManage'
import About from './pages/About'
import NoticeSettings from './pages/NoticeSettings'
import VideoMode from './pages/VideoMode'
import ChangePassword from './pages/ChangePassword'
import DeviceSelect from './pages/DeviceSelect'
import DeviceManage from './pages/DeviceManage'
import AdminLayout from './layouts/AdminLayout'

function PrivateRoute({ children }) {
  const { isAuthenticated } = useAuthStore()
  return isAuthenticated ? children : <Navigate to="/login" />
}

function DeviceRoute({ children }) {
  const { isAuthenticated } = useAuthStore()
  const { currentDevice } = useDeviceStore()
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />
  }
  
  if (!currentDevice) {
    return <Navigate to="/select-device" />
  }
  
  return children
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/select-device" element={
          <PrivateRoute>
            <DeviceSelect />
          </PrivateRoute>
        } />
        <Route path="/" element={
          <DeviceRoute>
            <AdminLayout />
          </DeviceRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="users" element={<UserManage />} />
          <Route path="days" element={<DaysManage />} />
          <Route path="quotes" element={<QuotesManage />} />
          <Route path="notice" element={<NoticeSettings />} />
          <Route path="video" element={<VideoMode />} />
          <Route path="password" element={<ChangePassword />} />
          <Route path="devices" element={<DeviceManage />} />
          <Route path="about" element={<About />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
