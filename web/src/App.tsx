import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import VotePage from './pages/VotePage'
import AdminLoginPage from './pages/admin/AdminLoginPage'
import AdminOverviewPage from './pages/admin/AdminOverviewPage'
import AdminDishesPage from './pages/admin/AdminDishesPage'
import AdminTokensPage from './pages/admin/AdminTokensPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/vote" replace />} />
        <Route path="/vote" element={<VotePage />} />
        <Route path="/results" element={<div className="p-8 text-center text-xmas-gold font-bold">競賽結果 (即將推出)</div>} />

        {/* 後台管理路由 */}
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin" element={<AdminOverviewPage />} />
        <Route path="/admin/dishes" element={<AdminDishesPage />} />
        <Route path="/admin/tokens" element={<AdminTokensPage />} />
        <Route path="/admin/print" element={<div className="p-8 text-center text-xmas-gold font-bold">列印頁 (即將推出)</div>} />

        <Route path="*" element={<Navigate to="/vote" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
