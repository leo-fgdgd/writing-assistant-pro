import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { BookOpen, Briefcase, PenTool, FileText, ChevronRight, Flame } from 'lucide-react'
import NavBar from '../components/NavBar'
import { getHistory } from '../lib/api'
import type { HistoryItem } from '../types/api'

interface HomeProps {
  showToast: (message: string) => void
}

const featureCapsules = [
  { icon: '✨', label: '智能创作', path: '/chat', disabled: false },
  { icon: '🎨', label: '文风润色', path: '/polish', disabled: false },
  { icon: '📸', label: '灵感拍图', path: '/chat', disabled: true },
]

const sceneCards = [
  {
    id: 'academic',
    title: '学术写作',
    subtitle: '论文摘要与研究报告',
    Icon: BookOpen,
    bgColor: '#EDE9FE',
    iconColor: '#7C3AED',
  },
  {
    id: 'business',
    title: '商务公文',
    subtitle: '邮件、报告与策划案',
    Icon: Briefcase,
    bgColor: '#FCE7F3',
    iconColor: '#DB2777',
  },
  {
    id: 'creative',
    title: '创意故事',
    subtitle: '短视频脚本与小说',
    Icon: PenTool,
    bgColor: '#D1FAE5',
    iconColor: '#059669',
  },
  {
    id: 'resume',
    title: '求职简历',
    subtitle: '个人简介与求职信',
    Icon: FileText,
    bgColor: '#FFEDD5',
    iconColor: '#D97706',
  },
]

export default function Home({ showToast }: HomeProps) {
  const navigate = useNavigate()
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([])

  useEffect(() => {
    getHistory()
      .then(data => setHistoryItems(data.slice(0, 3)))
      .catch(() => {})
  }, [])

  return (
    <div className="min-h-screen" style={{ background: 'var(--page-bg)' }}>
      <NavBar showToast={showToast} />

      {/* Hero Section */}
      <section className="px-5 pt-2 pb-6">
        <h1
          className="text-[28px] font-semibold tracking-wide"
          style={{ color: 'var(--text-primary)', lineHeight: 1.3 }}
        >
          你好，创作者
        </h1>
        <p
          className="text-[16px] mt-1"
          style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}
        >
          探索你的写作灵感。
        </p>
      </section>

      {/* Feature Capsules */}
      <section className="px-5 mb-6">
        <div className="flex gap-3">
          {featureCapsules.map(({ icon, label, path, disabled }) => (
            <button
              key={label}
              onClick={() => {
                if (disabled) {
                  showToast('相机功能开发中')
                  return
                }
                navigate(path)
              }}
              className="flex-1 h-11 rounded-full flex items-center justify-center gap-1.5 transition-colors active:bg-[#F2F2F2]"
              style={{
                background: '#FFFFFF',
                boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
                fontSize: '14px',
                color: 'var(--text-primary)',
                fontWeight: 500,
              }}
            >
              <span>{icon}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Spotlight Input */}
      <section className="px-5 mb-6">
        <button
          onClick={() => navigate('/chat')}
          className="w-full rounded-[24px] relative overflow-hidden text-left active:scale-[0.98] transition-transform"
          style={{
            background: 'var(--card-surface)',
            height: '420px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.03)',
          }}
        >
          {/* Breathing glow */}
          <div
            className="absolute inset-0 animate-breathe pointer-events-none"
            style={{
              background: 'radial-gradient(circle at 50% 30%, rgba(224, 161, 70, 0.18) 0%, rgba(224, 161, 70, 0) 70%)',
            }}
          />

          {/* Pro badge */}
          <div
            className="absolute top-5 left-5 rounded-full px-3 py-1"
            style={{
              background: 'rgba(255,255,255,0.6)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              fontSize: '12px',
              color: 'var(--text-secondary)',
              fontWeight: 500,
            }}
          >
            Pro · 高级灵感引擎
          </div>

          {/* Center text */}
          <div className="absolute inset-0 flex items-center justify-center">
            <h2
              className="text-[32px] font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              今天你想写什么？
            </h2>
          </div>

          {/* Bottom hint */}
          <div
            className="absolute bottom-5 left-0 right-0 text-center"
            style={{ color: 'var(--text-secondary)', fontSize: '13px' }}
          >
            点击开始对话
          </div>
        </button>
      </section>

      {/* Scene Cards */}
      <section className="px-5 mb-6">
        <div className="grid grid-cols-2 gap-3">
          {sceneCards.map(({ id, title, subtitle, Icon, bgColor, iconColor }) => (
            <button
              key={id}
              onClick={() => navigate(`/chat/${id}`)}
              className="rounded-[20px] p-4 text-left active:scale-[0.97] transition-transform"
              style={{
                background: '#FFFFFF',
                height: '140px',
                boxShadow: '0 2px 12px rgba(0,0,0,0.03)',
              }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center mb-8"
                style={{ background: bgColor }}
              >
                <Icon size={20} color={iconColor} strokeWidth={1.5} />
              </div>
              <div
                className="text-[16px] font-semibold mb-0.5"
                style={{ color: 'var(--text-primary)' }}
              >
                {title}
              </div>
              <div
                className="text-[12px]"
                style={{ color: 'var(--text-secondary)' }}
              >
                {subtitle}
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Recent History */}
      <section className="px-5 pb-6">
        <div className="flex items-center justify-between mb-4">
          <h3
            className="text-[18px] font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            最近的灵感
          </h3>
          <button
            onClick={() => navigate('/history')}
            className="text-[13px] font-medium"
            style={{ color: 'var(--text-secondary)' }}
          >
            查看全部 <ChevronRight size={14} className="inline" />
          </button>
        </div>

        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-5 px-5">
          {historyItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                if (item.type === 'polish') {
                  navigate('/polish')
                } else if (item.refId) {
                  navigate(`/chat?conversationId=${item.refId}`)
                } else {
                  navigate('/chat')
                }
              }}
              className="flex-shrink-0 rounded-[16px] p-4 text-left active:scale-[0.97] transition-transform"
              style={{
                background: '#FFFFFF',
                width: '220px',
                height: '160px',
                boxShadow: '0 2px 12px rgba(0,0,0,0.03)',
                borderLeft: '4px solid #E0A146',
              }}
            >
              <div
                className="text-[12px] mb-2"
                style={{ color: 'var(--text-secondary)' }}
              >
                {item.date}
              </div>
              <div
                className="text-[15px] font-semibold line-clamp-3 mb-3"
                style={{
                  color: 'var(--text-primary)',
                  lineHeight: 1.5,
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {item.title}
              </div>
              <div
                className="flex items-center gap-1"
                style={{ color: 'var(--text-secondary)', fontSize: '11px' }}
              >
                <Flame size={12} />
                <span className="font-display">{item.tokens} tokens</span>
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
