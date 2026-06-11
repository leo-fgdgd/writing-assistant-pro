import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { Share2 } from 'lucide-react'

interface NavBarProps {
  title?: string
  showBack?: boolean
  transparent?: boolean
  showToast?: (message: string) => void
}

export default function NavBar({ title, showBack, transparent, showToast }: NavBarProps) {
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 64)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header
      className="sticky top-0 z-[1000] transition-all duration-300"
      style={{
        background: transparent && !scrolled ? 'transparent' : scrolled ? 'rgba(255,255,255,0.85)' : 'var(--page-bg)',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(12px)' : 'none',
      }}
    >
      <div className="flex items-center justify-between h-12 px-5">
        <div className="flex items-center gap-3">
          {showBack ? (
            <button
              onClick={() => navigate(-1)}
              className="w-8 h-8 flex items-center justify-center -ml-1"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1C1C1E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          ) : (
            <img
              src="/avatar.jpg"
              alt="avatar"
              className="w-8 h-8 rounded-full object-cover"
              style={{ border: '1px solid #FFFFFF', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}
            />
          )}
          {title && (
            <span className="text-[16px] font-semibold" style={{ color: 'var(--text-primary)' }}>
              {title}
            </span>
          )}
        </div>
        <button
          className="w-8 h-8 flex items-center justify-center"
          onClick={() => showToast?.('分享功能开发中')}
          aria-label="分享"
        >
          <Share2 size={20} strokeWidth={1.5} color="#1C1C1E" />
        </button>
      </div>
    </header>
  )
}
