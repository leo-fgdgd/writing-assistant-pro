import { useLocation, useNavigate } from 'react-router'
import { Home, Sparkles, Wrench, User } from 'lucide-react'

const tabs = [
  { path: '/', label: '工作台', Icon: Home },
  { path: '/polish', label: '灵感库', Icon: Sparkles },
  { path: '/history', label: '工具箱', Icon: Wrench },
  { path: '/profile', label: '我的', Icon: User },
]

export default function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[999] border-t"
      style={{
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderColor: '#E5E5EA',
      }}
    >
      <div
        className="max-w-md mx-auto flex items-center justify-around h-16"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {tabs.map(({ path, label, Icon }) => {
          const isActive = location.pathname === path
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="flex flex-col items-center justify-center gap-0.5 w-16 h-full select-none"
            >
              <Icon
                size={22}
                strokeWidth={isActive ? 2.5 : 1.5}
                color={isActive ? '#E0A146' : '#8E8E93'}
              />
              <span
                className="text-[10px]"
                style={{
                  color: isActive ? '#E0A146' : '#8E8E93',
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                {label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
