import { useState, useEffect, useCallback } from 'react'
import { BarChart3, Eye, MousePointer, AlertCircle, Zap, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'
import NavBar from '../components/NavBar'

interface LogsPageProps {
  showToast: (message: string) => void
}

interface LogEntry {
  action: string
  page: string
  userId: string
  timestamp: string
  device: { platform?: string; model?: string }
  extra: Record<string, unknown>
}

interface LogStats {
  totalLogs: number
  byAction: Record<string, number>
  byPage: Record<string, number>
  dailyCounts: Record<string, number>
}

const actionIcons: Record<string, React.ReactNode> = {
  page_view: <Eye size={14} strokeWidth={1.5} color="#3B82F6" />,
  button_click: <MousePointer size={14} strokeWidth={1.5} color="#10B981" />,
  api_call: <Zap size={14} strokeWidth={1.5} color="#F59E0B" />,
  error: <AlertCircle size={14} strokeWidth={1.5} color="#EF4444" />,
  lifecycle: <RefreshCw size={14} strokeWidth={1.5} color="#8B5CF6" />,
}

const actionLabels: Record<string, string> = {
  page_view: '页面浏览',
  button_click: '按钮点击',
  api_call: 'API 调用',
  error: '错误',
  lifecycle: '生命周期',
}

export default function LogsPage({ showToast }: LogsPageProps) {
  const [stats, setStats] = useState<LogStats | null>(null)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filterAction, setFilterAction] = useState('')


  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterAction) params.set('action', filterAction)
      params.set('page', String(page))
      params.set('limit', '30')

      const res = await fetch(`/api/logs?${params.toString()}`)
      const data = await res.json()
      setLogs(data.items || [])
      setTotalPages(data.totalPages || 1)
    } catch {
      showToast('加载日志失败')
    } finally {
      setLoading(false)
    }
  }, [page, filterAction]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/logs/stats')
      const data = await res.json()
      setStats(data)
    } catch {
      // silent
    }
  }, [])

  useEffect(() => {
    fetchStats()
    fetchLogs()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchLogs()
  }, [page, filterAction, fetchLogs])

  return (
    <div className="min-h-screen" style={{ background: 'var(--page-bg)' }}>
      <NavBar showToast={showToast} />

      <div className="px-5 pt-2 pb-6">
        <h2 className="text-[20px] font-semibold mb-5" style={{ color: 'var(--text-primary)' }}>
          <BarChart3 size={20} className="inline mr-2" strokeWidth={1.5} />
          操作日志
        </h2>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="rounded-2xl p-4" style={{ background: '#FFFFFF', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <div className="text-[12px] mb-1" style={{ color: 'var(--text-secondary)' }}>近 7 日总操作</div>
              <div className="text-[28px] font-semibold" style={{ color: 'var(--text-primary)' }}>{stats.totalLogs.toLocaleString()}</div>
            </div>
            <div className="rounded-2xl p-4" style={{ background: '#FFFFFF', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <div className="text-[12px] mb-1" style={{ color: 'var(--text-secondary)' }}>今日操作</div>
              <div className="text-[28px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                {Object.entries(stats.dailyCounts).slice(-1)[0]?.[1]?.toLocaleString() || '0'}
              </div>
            </div>
          </div>
        )}

        {/* Action Distribution */}
        {stats && Object.keys(stats.byAction).length > 0 && (
          <div className="rounded-2xl p-4 mb-5" style={{ background: '#FFFFFF', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div className="text-[13px] font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>操作类型分布</div>
            <div className="space-y-2">
              {Object.entries(stats.byAction).map(([action, count]) => (
                <div key={action} className="flex items-center gap-2">
                  {actionIcons[action]}
                  <span className="text-[13px] flex-1" style={{ color: 'var(--text-primary)' }}>{actionLabels[action] || action}</span>
                  <span className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{count.toLocaleString()}</span>
                  <div className="w-20 h-2 rounded-full overflow-hidden" style={{ background: '#F2F2F7' }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, (count / stats.totalLogs) * 100)}%`,
                        background: action === 'error' ? '#EF4444' : action === 'page_view' ? '#3B82F6' : '#E0A146',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-2 mb-4">
          <select
            value={filterAction}
            onChange={e => { setFilterAction(e.target.value); setPage(1) }}
            className="setting-select flex-1"
          >
            <option value="">全部类型</option>
            {Object.entries(actionLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <button
            onClick={() => { fetchLogs(); fetchStats() }}
            className="px-3 py-2 rounded-xl flex items-center gap-1 text-[13px]"
            style={{ background: '#FFFFFF', color: 'var(--text-secondary)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
          >
            <RefreshCw size={14} strokeWidth={1.5} />
            刷新
          </button>
        </div>

        {/* Log List */}
        <div className="rounded-2xl overflow-hidden mb-5" style={{ background: '#FFFFFF', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-6 h-6 border-2 border-[#E0A146] border-t-transparent rounded-full" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
              暂无日志数据
            </div>
          ) : (
            logs.map((log, idx) => (
              <div
                key={`${log.timestamp}-${idx}`}
                className="px-4 py-3 border-b border-[#F2F2F7] last:border-b-0"
              >
                <div className="flex items-center gap-2 mb-1">
                  {actionIcons[log.action]}
                  <span className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
                    {actionLabels[log.action] || log.action}
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: '#F2F2F7', color: 'var(--text-secondary)' }}>
                    {log.page}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px]" style={{ color: '#C7C7CC' }}>
                  <span>{new Date(log.timestamp).toLocaleString('zh-CN')}</span>
                  <span>用户: {log.userId}</span>
                  {log.device?.platform && <span>{log.device.platform}</span>}
                  {log.extra?.label != null && <span>操作: {String(log.extra.label)}</span>}
                </div>
              </div>
            ))
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
