import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { Search, Clock, Flame, Trash2, FileText, MessageSquare, Wand2 } from 'lucide-react'
import NavBar from '../components/NavBar'
import { getHistory, deleteHistoryItem } from '../lib/api'
import type { HistoryItem } from '../types/api'

interface HistoryProps {
  showToast: (message: string) => void
}

const typeIcons = {
  chat: MessageSquare,
  polish: Wand2,
}

const typeColors = {
  chat: '#E0A146',
  polish: '#3D5A42',
}

const typeLabels = {
  chat: '对话',
  polish: '润色',
}

export default function History({ showToast }: HistoryProps) {
  const navigate = useNavigate()
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'chat' | 'polish'>('all')
  const [loading, setLoading] = useState(true)

  const loadHistory = async (search?: string, f?: 'all' | 'chat' | 'polish') => {
    setLoading(true)
    try {
      const data = await getHistory({ search, filter: f || filter })
      setHistory(data)
    } catch {
      showToast('加载历史记录失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadHistory()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadHistory(searchQuery, filter)
  }, [filter]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = () => {
    loadHistory(searchQuery, filter)
  }

  const filtered = history

  const handleDelete = async (id: string | number) => {
    try {
      await deleteHistoryItem(id)
      setHistory(prev => prev.filter(item => item.id !== id))
      showToast('已删除')
    } catch {
      showToast('删除失败')
    }
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--page-bg)' }}>
      <NavBar title="历史记录" showBack showToast={showToast} />

      <div className="px-5 pt-4 pb-6">
        {/* Search Bar */}
        <div
          className="flex items-center gap-2 rounded-full px-4 h-10 mb-4"
          style={{
            background: '#FFFFFF',
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          }}
        >
          <Search size={18} color="#8E8E93" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSearch() }}
            placeholder="搜索历史记录..."
            className="flex-1 text-[14px] outline-none bg-transparent"
            style={{ color: 'var(--text-primary)' }}
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-5">
          {[
            { key: 'all' as const, label: '全部' },
            { key: 'chat' as const, label: '对话' },
            { key: 'polish' as const, label: '润色' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className="px-4 py-1.5 rounded-full text-[13px] font-medium transition-all"
              style={{
                background: filter === key ? '#1C1C1E' : '#FFFFFF',
                color: filter === key ? '#FFFFFF' : 'var(--text-secondary)',
                boxShadow: filter === key ? 'none' : '0 1px 4px rgba(0,0,0,0.04)',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* History List */}
        {loading && filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#E0A146] border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-[14px]" style={{ color: 'var(--text-secondary)' }}>
              加载中...
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {filtered.map((item) => {
                const Icon = typeIcons[item.type]
                const color = typeColors[item.type]
                return (
                  <div
                    key={item.id}
                    className="rounded-[16px] p-4 relative group"
                    style={{
                      background: '#FFFFFF',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                    }}
                  >
                    <button
                      onClick={() => {
                        if (item.type === 'chat' && item.refId) {
                          navigate(`/chat?conversationId=${item.refId}`)
                        } else if (item.type === 'polish') {
                          navigate('/polish')
                        } else {
                          navigate('/chat')
                        }
                      }}
                      className="w-full text-left"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                          style={{ background: `${color}15` }}
                        >
                          <Icon size={18} color={color} strokeWidth={1.5} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className="text-[15px] font-semibold truncate"
                              style={{ color: 'var(--text-primary)' }}
                            >
                              {item.title}
                            </span>
                            <span
                              className="text-[11px] px-2 py-0.5 rounded-full flex-shrink-0"
                              style={{
                                background: `${color}12`,
                                color,
                              }}
                            >
                              {typeLabels[item.type]}
                            </span>
                          </div>
                          <p
                            className="text-[13px] line-clamp-2 mb-2"
                            style={{
                              color: 'var(--text-secondary)',
                              lineHeight: 1.5,
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}
                          >
                            {item.preview}
                          </p>
                          <div className="flex items-center gap-3">
                            <span
                              className="flex items-center gap-1 text-[11px]"
                              style={{ color: 'var(--text-secondary)' }}
                            >
                              <Clock size={11} />
                              {item.date}
                            </span>
                            <span
                              className="flex items-center gap-1 text-[11px]"
                              style={{ color: 'var(--text-secondary)' }}
                            >
                              <Flame size={11} />
                              <span className="font-display">{item.tokens} tokens</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: '#F2F2F7' }}
                    >
                      <Trash2 size={14} color="#FF3B30" />
                    </button>
                  </div>
                )
              })}
            </div>

            {!loading && filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20">
                <FileText size={48} color="#C7C7CC" strokeWidth={1} />
                <p className="text-[14px] mt-3" style={{ color: 'var(--text-secondary)' }}>
                  暂无相关记录
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
