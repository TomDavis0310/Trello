import { Routes, Route, Navigate } from 'react-router-dom'
import DashboardPage from '../features/dashboard/pages/DashboardPage'
import BoardPage from '../features/board/pages/BoardPage'
import LoginPage from '../features/auth/pages/LoginPage'
import RegisterPage from '../features/auth/pages/RegisterPage'

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/board/:id" element={<BoardPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
