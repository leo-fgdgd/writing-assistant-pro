import { Routes, Route } from 'react-router'
import { useState, useCallback } from 'react'
import Home from './pages/Home'
import Chat from './pages/Chat'
import Polish from './pages/Polish'
import History from './pages/History'
import Profile from './pages/Profile'
import Settings from './pages/Settings'
import Logs from './pages/Logs'
import Feedback from './pages/Feedback'
import BottomNav from './components/BottomNav'
import Toast from './components/Toast'

export interface ToastData {
  id: number
  message: string
}

export default function App() {
  const [toasts, setToasts] = useState<ToastData[]>([])

  const showToast = useCallback((message: string) => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 2200)
  }, [])

  return (
    <div className="min-h-screen max-w-md mx-auto relative" style={{ background: 'var(--page-bg)' }}>
      <div className="pb-20">
        <Routes>
          <Route path="/" element={<Home showToast={showToast} />} />
          <Route path="/chat" element={<Chat showToast={showToast} />} />
          <Route path="/chat/:sceneId" element={<Chat showToast={showToast} />} />
          <Route path="/polish" element={<Polish showToast={showToast} />} />
          <Route path="/history" element={<History showToast={showToast} />} />
          <Route path="/profile" element={<Profile showToast={showToast} />} />
          <Route path="/settings" element={<Settings showToast={showToast} />} />
          <Route path="/logs" element={<Logs showToast={showToast} />} />
          <Route path="/feedback-admin" element={<Feedback showToast={showToast} />} />
        </Routes>
      </div>
      <BottomNav />
      <div className="fixed top-6 left-0 right-0 z-[3000] flex flex-col items-center gap-2 pointer-events-none px-4">
        {toasts.map(toast => (
          <Toast key={toast.id} message={toast.message} />
        ))}
      </div>
    </div>
  )
}
