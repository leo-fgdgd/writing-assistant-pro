import { useState, useEffect } from 'react'
import {
  Save, RotateCcw, AlertTriangle, Settings as SettingsIcon,
  Brain, Sliders, ToggleLeft, Bell, Wrench,
} from 'lucide-react'
import NavBar from '../components/NavBar'
import { getSettings, updateSettings } from '../lib/api'
import type { SystemSettings } from '../types/api'

interface SettingsPageProps {
  showToast: (message: string) => void
}

const defaultSettings: SystemSettings = {
  ai: { maxTokens: 4096, temperature: 0.7, modelVersion: 'default', maxContextLength: 10 },
  limits: { maxFreeMessagesPerDay: 50, maxTokensPerMessage: 2048, proMaxMessagesPerDay: 500, proMaxTokensPerMessage: 8192 },
  features: { enablePolish: true, enableHistoryExport: false, enableProSubscription: false, enableFeedback: true, maintenanceMode: false },
  announcement: { enabled: false, title: '', content: '', url: '' },
  appVersion: '2.1.0',
  contactEmail: 'feedback@yuling-ai.com',
}

export default function SettingsPage({ showToast }: SettingsPageProps) {
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'ai' | 'limits' | 'features' | 'announcement'>('ai')

  useEffect(() => {
    getSettings()
      .then(data => setSettings({ ...defaultSettings, ...data }))
      .catch(() => showToast('加载设置失败'))
      .finally(() => setLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateSettings(settings)
      showToast('设置已保存')
    } catch {
      showToast('保存失败')
    } finally {
      setSaving(false)
    }
  }

  const updateValue = (path: string, value: unknown) => {
    const keys = path.split('.')
    setSettings(prev => {
      const next = structuredClone(prev)
      let target: Record<string, unknown> = next as unknown as Record<string, unknown>
      for (let i = 0; i < keys.length - 1; i++) {
        target = target[keys[i]] as Record<string, unknown>
      }
      target[keys[keys.length - 1]] = value
      return next
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--page-bg)' }}>
        <NavBar showToast={showToast} />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-[#E0A146] border-t-transparent rounded-full" />
        </div>
      </div>
    )
  }

  const tabs = [
    { key: 'ai' as const, label: 'AI 模型', icon: Brain },
    { key: 'limits' as const, label: '用量限制', icon: Sliders },
    { key: 'features' as const, label: '功能开关', icon: ToggleLeft },
    { key: 'announcement' as const, label: '系统公告', icon: Bell },
  ]

  return (
    <div className="min-h-screen" style={{ background: 'var(--page-bg)' }}>
      <NavBar showToast={showToast} />

      <div className="px-5 pt-2 pb-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[20px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            <SettingsIcon size={20} className="inline mr-2" strokeWidth={1.5} />
            系统设置
          </h2>
        </div>

        {/* Tab Bar */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-medium whitespace-nowrap transition-colors"
              style={{
                background: activeTab === key ? '#E0A146' : '#FFFFFF',
                color: activeTab === key ? '#FFFFFF' : 'var(--text-secondary)',
                boxShadow: activeTab === key ? 'none' : '0 1px 4px rgba(0,0,0,0.04)',
              }}
            >
              <Icon size={14} strokeWidth={1.5} />
              {label}
            </button>
          ))}
        </div>

        {/* AI Model Settings */}
        {activeTab === 'ai' && (
          <div className="space-y-4">
            <SettingCard title="模型参数">
              <SettingRow label="最大 Token 数">
                <input
                  type="number"
                  value={settings.ai.maxTokens}
                  onChange={e => updateValue('ai.maxTokens', parseInt(e.target.value) || 4096)}
                  className="setting-input"
                />
              </SettingRow>
              <SettingRow label="Temperature (温度)" hint="0-2，越高越有创意">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="2"
                  value={settings.ai.temperature}
                  onChange={e => updateValue('ai.temperature', parseFloat(e.target.value) || 0.7)}
                  className="setting-input"
                />
              </SettingRow>
              <SettingRow label="模型版本">
                <select
                  value={settings.ai.modelVersion}
                  onChange={e => updateValue('ai.modelVersion', e.target.value)}
                  className="setting-select"
                >
                  <option value="default">默认</option>
                  <option value="pro">Pro（高级）</option>
                  <option value="fast">Fast（快速）</option>
                </select>
              </SettingRow>
              <SettingRow label="上下文轮数" hint="保留最近 N 轮对话">
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={settings.ai.maxContextLength}
                  onChange={e => updateValue('ai.maxContextLength', parseInt(e.target.value) || 10)}
                  className="setting-input"
                />
              </SettingRow>
            </SettingCard>
          </div>
        )}

        {/* Limits Settings */}
        {activeTab === 'limits' && (
          <div className="space-y-4">
            <SettingCard title="免费用户">
              <SettingRow label="每日最大消息数">
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={settings.limits.maxFreeMessagesPerDay}
                  onChange={e => updateValue('limits.maxFreeMessagesPerDay', parseInt(e.target.value) || 50)}
                  className="setting-input"
                />
              </SettingRow>
              <SettingRow label="单条最大 Token">
                <input
                  type="number"
                  min="256"
                  max="16384"
                  value={settings.limits.maxTokensPerMessage}
                  onChange={e => updateValue('limits.maxTokensPerMessage', parseInt(e.target.value) || 2048)}
                  className="setting-input"
                />
              </SettingRow>
            </SettingCard>
            <SettingCard title="Pro 用户">
              <SettingRow label="每日最大消息数">
                <input
                  type="number"
                  min="1"
                  max="5000"
                  value={settings.limits.proMaxMessagesPerDay}
                  onChange={e => updateValue('limits.proMaxMessagesPerDay', parseInt(e.target.value) || 500)}
                  className="setting-input"
                />
              </SettingRow>
              <SettingRow label="单条最大 Token">
                <input
                  type="number"
                  min="256"
                  max="65536"
                  value={settings.limits.proMaxTokensPerMessage}
                  onChange={e => updateValue('limits.proMaxTokensPerMessage', parseInt(e.target.value) || 8192)}
                  className="setting-input"
                />
              </SettingRow>
            </SettingCard>
          </div>
        )}

        {/* Feature Toggles */}
        {activeTab === 'features' && (
          <div className="space-y-4">
            <SettingCard title="功能开关">
              <ToggleRow
                label="文风润色"
                enabled={settings.features.enablePolish}
                onChange={v => updateValue('features.enablePolish', v)}
              />
              <ToggleRow
                label="历史导出"
                enabled={settings.features.enableHistoryExport}
                onChange={v => updateValue('features.enableHistoryExport', v)}
              />
              <ToggleRow
                label="Pro 订阅"
                enabled={settings.features.enableProSubscription}
                onChange={v => updateValue('features.enableProSubscription', v)}
              />
              <ToggleRow
                label="用户反馈"
                enabled={settings.features.enableFeedback}
                onChange={v => updateValue('features.enableFeedback', v)}
              />
              <div className="flex items-center justify-between px-4 py-3.5 border-t border-[#F2F2F7]">
                <div>
                  <div className="flex items-center gap-2 text-[15px] font-medium" style={{ color: 'var(--text-primary)' }}>
                    <Wrench size={16} strokeWidth={1.5} color="#D45D4B" />
                    维护模式
                  </div>
                  <div className="text-[12px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                    开启后所有用户将看到维护提示
                  </div>
                </div>
                <button
                  onClick={() => updateValue('features.maintenanceMode', !settings.features.maintenanceMode)}
                  className={`relative w-12 h-7 rounded-full transition-colors ${settings.features.maintenanceMode ? 'bg-[#D45D4B]' : 'bg-[#E5E5EA]'}`}
                >
                  <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.features.maintenanceMode ? 'left-6' : 'left-1'}`} />
                </button>
              </div>
            </SettingCard>
          </div>
        )}

        {/* Announcement */}
        {activeTab === 'announcement' && (
          <div className="space-y-4">
            <SettingCard title="系统公告">
              <ToggleRow
                label="启用公告"
                enabled={settings.announcement.enabled}
                onChange={v => updateValue('announcement.enabled', v)}
              />
              <div className="px-4 py-3 border-t border-[#F2F2F7]">
                <label className="text-[13px] font-medium mb-2 block" style={{ color: 'var(--text-primary)' }}>
                  公告标题
                </label>
                <input
                  type="text"
                  value={settings.announcement.title}
                  onChange={e => updateValue('announcement.title', e.target.value)}
                  placeholder="输入公告标题..."
                  className="setting-input w-full"
                />
              </div>
              <div className="px-4 py-3 border-t border-[#F2F2F7]">
                <label className="text-[13px] font-medium mb-2 block" style={{ color: 'var(--text-primary)' }}>
                  公告内容
                </label>
                <textarea
                  value={settings.announcement.content}
                  onChange={e => updateValue('announcement.content', e.target.value)}
                  placeholder="输入公告内容..."
                  rows={4}
                  className="setting-textarea"
                />
              </div>
              <div className="px-4 py-3 border-t border-[#F2F2F7]">
                <label className="text-[13px] font-medium mb-2 block" style={{ color: 'var(--text-primary)' }}>
                  跳转链接（可选）
                </label>
                <input
                  type="text"
                  value={settings.announcement.url}
                  onChange={e => updateValue('announcement.url', e.target.value)}
                  placeholder="https://..."
                  className="setting-input w-full"
                />
              </div>
            </SettingCard>
          </div>
        )}

        {/* Save Button */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={() => setSettings(defaultSettings)}
            className="flex-1 h-12 rounded-2xl flex items-center justify-center gap-2 text-[15px] font-medium"
            style={{ background: '#F2F2F7', color: 'var(--text-primary)' }}
          >
            <RotateCcw size={16} strokeWidth={1.5} />
            恢复默认
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 h-12 rounded-2xl flex items-center justify-center gap-2 text-[15px] font-semibold text-white transition-opacity"
            style={{ background: '#E0A146', opacity: saving ? 0.6 : 1 }}
          >
            <Save size={16} strokeWidth={1.5} />
            {saving ? '保存中...' : '保存设置'}
          </button>
        </div>

        {/* Danger Zone */}
        <div className="mt-8 p-5 rounded-2xl" style={{ background: '#FFF5F5', border: '1px solid #FECACA' }}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} color="#D45D4B" />
            <span className="text-[14px] font-semibold" style={{ color: '#D45D4B' }}>
              注意事项
            </span>
          </div>
          <p className="text-[12px] leading-relaxed" style={{ color: '#9B2C2C' }}>
            修改 AI 模型参数和用量限制可能影响所有用户的体验。修改前请确认当前值的影响范围。维护模式开启后，客户端将显示维护提示。
          </p>
        </div>
      </div>
    </div>
  )
}

// ---- Sub-components ----

function SettingCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[20px] overflow-hidden" style={{ background: '#FFFFFF', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      <div className="px-4 py-3 text-[13px] font-medium" style={{ color: 'var(--text-secondary)', borderBottom: '1px solid #F2F2F7' }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function SettingRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-[#F2F2F7]">
      <div>
        <div className="text-[14px]" style={{ color: 'var(--text-primary)' }}>{label}</div>
        {hint && <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>{hint}</div>}
      </div>
      {children}
    </div>
  )
}

function ToggleRow({ label, enabled, onChange }: { label: string; enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between px-4 py-3.5 border-t border-[#F2F2F7]">
      <span className="text-[15px]" style={{ color: 'var(--text-primary)' }}>{label}</span>
      <button
        onClick={() => onChange(!enabled)}
        className={`relative w-12 h-7 rounded-full transition-colors ${enabled ? 'bg-[#E0A146]' : 'bg-[#E5E5EA]'}`}
      >
        <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${enabled ? 'left-6' : 'left-1'}`} />
      </button>
    </div>
  )
}
