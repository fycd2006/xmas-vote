import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/vote" replace />} />
        <Route path="/vote" element={<div className="p-4 text-center">聖誕廚藝競賽投票系統 (建置中)</div>} />
        <Route path="/results" element={<div className="p-4 text-center">競賽結果 (建置中)</div>} />
        <Route path="/admin/*" element={<div className="p-4 text-center">管理後台 (建置中)</div>} />
        <Route path="*" element={<div className="p-4 text-center">404 找不到頁面</div>} />
      </Routes>
    </BrowserRouter>
  )
}
