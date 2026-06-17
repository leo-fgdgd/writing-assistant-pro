import { useState, useEffect, useCallback } from 'react'
import { MessageSquare, CheckCircle, XCircle, Eye, ChevronLeft, ChevronRight } from 'lucide-react'
import NavBar from '../components/NavBar'

interface FeedbackPageProps {
  showToast: (message: string) => void
}

interface FeedbackItem {
  id: string
  userId: string
  nickName: string | null
  content: string
  contact: string | null
  status: 'pending' | 'resolved' | 'closed'
  adminNote: string
  createdAt: string
}

export default function FeedbackPage({ showToast }: FeedbackPageProps) {
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const fetchFeedbacks = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      params.set('page', String(page))
      params.set('limit', '20')

      const res = await fetch(`/api/feedback?${params.toString()}`)
      const data = await res.json()
      setFeedbacks(data.items || [])
      setTotalPages(data.totalPages || 1)
    } catch {
      showToast('加载反馈失败')
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchFeedbacks()
  }, [fetchFeedbacks])

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/feedback/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        showToast('状态已更新')
        fetchFeedbacks()
      }
    } catch {
      showToast('更新失败')
    }
  }

  const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
    pending: { label: '待处理', color: '#D97706', bg: '#FEF3C7' },
    resolved: { label: '已解决', color: '#059669', bg: '#D1FAE5' },
    closed: { label: '已关闭', color: '#6B7280', bg: '#F3F4F6' },
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--page-bg)' }}>
      <NavBar showToast={showToast} />

      <div className="px-5 pt-2 pb-6">
        <h2 className="text-[20px] font-semibold mb-5" style={{ color: 'var(--text-primary)' }}>
          <MessageSquare size={20} className="inline mr-2" strokeWidth={1.5} />
          用户反馈
        </h2>

        {/* Status Filter */}
        <div className="flex gap-2 mb-4">
          {[
            { value: '', label: '全部' },
            { value: 'pending', label: '待处理' },
            { value: 'resolved', label: '已解决' },
            { value: 'closed', label: '已关闭' },
          ].map(({ value, label }) => (
            <button
              key={value}
              onClick={() => { setStatusFilter(value); setPage(1) }}
              className="px-4 py-2 rounded-full text-[13px] font-medium transition-colors"
              style={{
                background: statusFilter === value ? '#E0A146' : '#FFFFFF',
                color: statusFilter === value ? '#FFFFFF' : 'var(--text-secondary)',
                boxShadow: statusFilter === value ? 'none' : '0 1px 4px rgba(0,0,0,0.04)',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Feedback List */}
        <div className="space-y-3 mb-5">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-6 h-6 border-2 border-[#E0A146] border-t-transparent rounded-full" />
            </div>
          ) : feedbacks.length === 0 ? (
            <div className="rounded-2xl p-12 text-center" style={{ background: '#FFFFFF', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <MessageSquare size={32} color="#C7C7CC" className="mx-auto mb-3" />
              <div className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>暂无反馈数据</div>
            </div>
          ) : (
            feedbacks.map(fb => {
              const cfg = statusConfig[fb.status]
              const isExpanded = expandedId === fb.id

              return (
                <div
                  key={fb.id}
                  className="rounded-2xl overflow-hidden"
                  style={{ background: '#FFFFFF', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: cfg.bg, color: cfg.color }}>
                            {cfg.label}
                          </span>
                          <span className="text-[12px]" style={{ color: '#C7C7CC' }}>
                            {new Date(fb.createdAt).toLocaleString('zh-CN')}
                          </span>
                        </div>
                        <p
                          className="text-[14px] leading-relaxed cursor-pointer"
                          style={{ color: 'var(--text-primary)' }}
                          onClick={() => setExpandedId(isExpanded ? null : fb.id)}
                        >
                          {isExpanded ? fb.content : (fb.content.length > 80 ? fb.content.slice(0, 80) + '...' : fb.content)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                      {fb.nickName && <span>用户: {fb.nickName}</span>}
                      {fb.contact && <span>联系: {fb.contact}</span>}
                      <span>ID: {fb.userId?.slice(0, 8)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex border-t border-[#F2F2F7]">
                    {fb.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleStatusChange(fb.id, 'resolved')}
                          className="flex-1 flex items-center justify-center gap-1 py-2.5 text-[12px] font-medium text-[#059669] hover:bg-[#F0FDF4] transition-colors"
                        >
                          <CheckCircle size={14} /> 标记已解决
                        </button>
                        <button
                          onClick={() => handleStatusChange(fb.id, 'closed')}
                          className="flex-1 flex items-center justify-center gap-1 py-2.5 text-[12px] font-medium text-[#6B7280] hover:bg-[#F9FAFB] transition-colors border-l border-[#F2F2F7]"
                        >
                          <XCircle size={14} /> 关闭
                        </button>
                      </>
                    )}
                    {fb.status === 'resolved' && (
                      <button
                        onClick={() => handleStatusChange(fb.id, 'closed')}
                        className="flex-1 flex items-center justify-center gap-1 py-2.5 text-[12px] font-medium text-[#6B7280] hover:bg-[#F9FAFB] transition-colors"
                      >
                        <XCircle size={14} /> 关闭
                      </button>
                    )}
                    {fb.status === 'closed' && (
                      <button
                        onClick={() => handleStatusChange(fb.id, 'pending')}
                        className="flex-1 flex items-center justify-center gap-1 py-2.5 text-[12px] font-medium text-[#D97706] hover:bg-[#FFFBEB] transition-colors"
                      >
                        <Eye size={14} /> 重新打开
                      </button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-xl disabled:opacity-30"
              style={{ background: '#FFFFFF', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-xl disabled:opacity-30"
              style={{ background: '#FFFFFF', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
