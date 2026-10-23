import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import VotePage from './pages/VotePage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/vote" replace />} />
        <Route path="/vote" element={<VotePage />} />
        <Route path="/results" element={<div className="p-8 text-center text-xmas-gold font-bold">競賽結果 (即將推出)</div>} />
        <Route path="/admin/*" element={<div className="p-8 text-center text-xmas-gold font-bold">管理後台 (即將推出)</div>} />
        <Route path="*" element={<Navigate to="/vote" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
