import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { Settings, ChevronRight, Crown, Zap, Shield, HelpCircle, Star, FileText, Award, BarChart3, MessageSquare, Eye } from 'lucide-react'
import NavBar from '../components/NavBar'
import { getProfile } from '../lib/api'
import type { Profile as ProfileData } from '../types/api'

interface ProfileProps {
  showToast: (message: string) => void
}

export default function Profile({ showToast }: ProfileProps) {
  const navigate = useNavigate()
  const [profile, setProfile] = useState<ProfileData | null>(null)

  useEffect(() => {
    getProfile()
      .then(setProfile)
      .catch(() => showToast('加载个人资料失败'))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const isPro = profile?.isPro ?? false

  const handleMenuClick = (label: string) => {
    switch (label) {
      case '通用设置':
        navigate('/settings')
        break
      case '隐私协议':
        showToast('隐私协议页面在微信小程序内查看')
        break
      case '帮助与反馈':
        showToast('帮助与反馈页面在微信小程序内查看')
        break
      case '系统设置':
        navigate('/settings')
        break
      case '操作日志':
        navigate('/logs')
        break
      case '用户反馈':
        navigate('/feedback-admin')
        break
      default:
        showToast(`${label} 功能开发中`)
    }
  }

  const menuGroups = [
    {
      title: '我的创作',
      items: [
        { icon: FileText, label: '草稿箱', value: '12篇', color: '#E0A146' },
        { icon: Star, label: '收藏夹', value: '8条', color: '#E0A146' },
        { icon: Award, label: '创作成就', value: '', color: '#E0A146' },
      ],
    },
    {
      title: '设置与支持',
      items: [
        { icon: Settings, label: '通用设置', value: '', color: '#6E6E73' },
        { icon: Shield, label: '隐私协议', value: '', color: '#6E6E73' },
        { icon: HelpCircle, label: '帮助与反馈', value: '', color: '#6E6E73' },
      ],
    },
    {
      title: '管理后台',
      items: [
        { icon: BarChart3, label: '系统设置', value: '', color: '#3B82F6' },
        { icon: Eye, label: '操作日志', value: '', color: '#10B981' },
        { icon: MessageSquare, label: '用户反馈', value: '', color: '#8B5CF6' },
      ],
    },
  ]

  return (
    <div className="min-h-screen" style={{ background: 'var(--page-bg)' }}>
      <NavBar showToast={showToast} />

      <div className="px-5 pt-2 pb-6">
        {/* User Card */}
        <div
          className="rounded-[24px] p-5 mb-6"
          style={{
            background: '#FFFFFF',
            boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
          }}
        >
          <div className="flex items-center gap-4 mb-5">
            <img
              src={profile?.avatar || "/avatar.jpg"}
              alt="avatar"
              className="w-16 h-16 rounded-full object-cover"
              style={{ border: '2px solid #FFFFFF', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h2
                  className="text-[18px] font-semibold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {profile?.name || '创作者'}
                </h2>
                {isPro && (
                  <span
                    className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium"
                    style={{
                      background: 'linear-gradient(135deg, #E0A146 0%, #D45D4B 50%, #7A86B6 100%)',
                      color: '#FFFFFF',
                    }}
                  >
                    <Crown size={10} />
                    Pro
                  </span>
                )}
              </div>
              <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                ID: write_pro_2024
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-around py-3" style={{ borderTop: '1px solid #F2F2F7' }}>
            <div className="text-center">
              <div
                className="text-[20px] font-semibold font-display"
                style={{ color: 'var(--text-primary)' }}
              >
                {profile?.stats.totalCreations ?? 0}
              </div>
              <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                创作次数
              </div>
            </div>
            <div
              className="w-px h-8"
              style={{ background: '#E5E5EA' }}
            />
            <div className="text-center">
              <div
                className="text-[20px] font-semibold font-display"
                style={{ color: 'var(--text-primary)' }}
              >
                {profile ? `${(profile.stats.totalTokens / 1000).toFixed(1)}k` : '0k'}
              </div>
              <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                消耗 tokens
              </div>
            </div>
            <div
              className="w-px h-8"
              style={{ background: '#E5E5EA' }}
            />
            <div className="text-center">
              <div
                className="text-[20px] font-semibold font-display"
                style={{ color: 'var(--text-primary)' }}
              >
                {profile?.stats.streakDays ?? 0}
              </div>
              <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                连续天数
              </div>
            </div>
          </div>
        </div>

        {/* Pro Banner */}
        <button
          onClick={() => showToast('Pro 会员功能开发中')}
          className="w-full rounded-[20px] p-4 mb-6 text-left active:scale-[0.98] transition-transform"
          style={{
            background: 'linear-gradient(135deg, #1C1C1E 0%, #2C2C2E 100%)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Zap size={18} color="#E0A146" />
                <span className="text-[16px] font-semibold text-white">
                  Pro 高级灵感引擎
                </span>
              </div>
              <p className="text-[13px]" style={{ color: 'rgba(255,255,255,0.6)' }}>
                解锁无限创作、优先响应、高级模型
              </p>
            </div>
            <ChevronRight size={18} color="rgba(255,255,255,0.4)" />
          </div>
        </button>

        {/* Menu Groups */}
        {menuGroups.map(({ title, items }) => (
          <div key={title} className="mb-6">
            <h3
              className="text-[13px] font-medium mb-3 px-1"
              style={{ color: 'var(--text-secondary)' }}
            >
              {title}
            </h3>
            <div
              className="rounded-[20px] overflow-hidden"
              style={{
                background: '#FFFFFF',
                boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              }}
            >
              {items.map(({ icon: Icon, label, value, color }, idx) => (
                <button
                  key={label}
                  onClick={() => handleMenuClick(label)}
                  className="w-full flex items-center justify-between px-4 py-3.5 text-left active:bg-[#F9F9F9] transition-colors"
                  style={{
                    borderBottom: idx < items.length - 1 ? '1px solid #F2F2F7' : 'none',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <Icon size={20} color={color} strokeWidth={1.5} />
                    <span
                      className="text-[15px]"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {value && (
                      <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                        {value}
                      </span>
                    )}
                    <ChevronRight size={16} color="#C7C7CC" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* Version Info */}
        <div className="text-center py-4">
          <p className="text-[11px]" style={{ color: '#C7C7CC' }}>
            语灵 AI v2.1.0
          </p>
        </div>
      </div>
    </div>
  )
}
