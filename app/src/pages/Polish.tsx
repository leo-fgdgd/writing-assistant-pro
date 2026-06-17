import { useState } from 'react'
import { Wand2, Check, MessageCircle, FileText, Feather } from 'lucide-react'
import NavBar from '../components/NavBar'
import { polishText } from '../lib/api'

interface PolishProps {
  showToast: (message: string) => void
}

const polishModes = [
  {
    id: 'refine',
    title: '文字润色',
    desc: '优化表达，让文字更流畅',
    Icon: Wand2,
    color: '#E0A146',
    bgColor: '#FEF3C7',
  },
  {
    id: 'rewrite',
    title: '句式改写',
    desc: '换个说法，保持原意',
    Icon: Feather,
    color: '#3D5A42',
    bgColor: '#D1FAE5',
  },
  {
    id: 'formal',
    title: '正式化',
    desc: '转为商务/学术用语',
    Icon: FileText,
    color: '#7C3AED',
    bgColor: '#EDE9FE',
  },
  {
    id: 'casual',
    title: '口语化',
    desc: '转为轻松日常表达',
    Icon: MessageCircle,
    color: '#DB2777',
    bgColor: '#FCE7F3',
  },
]

const examples = [
  '本季度销售额同比增长25%，主要得益于新产品线的成功推出和市场推广策略的有效执行。',
  '随着人工智能技术的快速发展，各行各业都在积极探索AI在业务场景中的落地应用。',
  '感谢各位同事在本次项目中的辛勤付出，正是因为大家的通力合作，我们才能如期交付。',
]

export default function Polish({ showToast }: PolishProps) {
  const [inputText, setInputText] = useState('')
  const [selectedMode, setSelectedMode] = useState('refine')
  const [result, setResult] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  const handlePolish = async () => {
    if (!inputText.trim()) {
      showToast('请先输入需要润色的文字')
      return
    }
    setIsProcessing(true)
    setResult('')
    try {
      const response = await polishText({
        text: inputText.trim(),
        mode: selectedMode as 'refine' | 'rewrite' | 'formal' | 'casual',
      })
      setResult(response.result)
    } catch (err) {
      showToast(err instanceof Error ? err.message : '润色失败，请重试')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleUseExample = (example: string) => {
    setInputText(example)
    setResult('')
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result)
      showToast('已复制到剪贴板')
    } catch {
      showToast('复制失败，请手动复制')
    }
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--page-bg)' }}>
      <NavBar title="文风润色" showBack showToast={showToast} />

      <div className="px-5 pt-4 pb-6">
        {/* Mode Selection */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {polishModes.map(({ id, title, desc, Icon, color, bgColor }) => (
            <button
              key={id}
              onClick={() => {
                setSelectedMode(id)
                setResult('')
              }}
              className="rounded-[16px] p-3.5 text-left transition-all"
              style={{
                background: selectedMode === id ? bgColor : '#FFFFFF',
                border: selectedMode === id ? `2px solid ${color}` : '2px solid transparent',
                boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              }}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <Icon size={18} color={color} strokeWidth={1.5} />
                <span
                  className="text-[14px] font-semibold"
                  style={{ color: selectedMode === id ? color : 'var(--text-primary)' }}
                >
                  {title}
                </span>
              </div>
              <p className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                {desc}
              </p>
            </button>
          ))}
        </div>

        {/* Input Area */}
        <div className="mb-4">
          <label
            className="text-[14px] font-medium mb-2 block"
            style={{ color: 'var(--text-secondary)' }}
          >
            输入原文
          </label>
          <textarea
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value)
              if (result) setResult('')
            }}
            placeholder="粘贴或输入需要润色的文字..."
            rows={5}
            className="w-full rounded-[16px] px-4 py-3 text-[15px] resize-none outline-none"
            style={{
              background: '#FFFFFF',
              color: 'var(--text-primary)',
              lineHeight: 1.75,
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            }}
          />
        </div>

        {/* Example Chips */}
        {!inputText && (
          <div className="mb-5">
            <label
              className="text-[12px] font-medium mb-2 block"
              style={{ color: 'var(--text-secondary)' }}
            >
              快速示例
            </label>
            <div className="flex flex-wrap gap-2">
              {examples.map((example, idx) => (
                <button
                  key={idx}
                  onClick={() => handleUseExample(example)}
                  className="text-[12px] px-3 py-1.5 rounded-full truncate max-w-[200px]"
                  style={{
                    background: '#FFFFFF',
                    color: 'var(--text-secondary)',
                    border: '1px solid #E5E5EA',
                  }}
                >
                  {example.slice(0, 20)}...
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Polish Button */}
        <button
          onClick={handlePolish}
          disabled={isProcessing}
          className="w-full h-12 rounded-full flex items-center justify-center gap-2 text-[15px] font-semibold active:scale-[0.98] transition-transform disabled:opacity-60"
          style={{
            background: '#1C1C1E',
            color: '#FFFFFF',
          }}
        >
          {isProcessing ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              润色中...
            </>
          ) : (
            <>
              <Wand2 size={18} />
              开始润色
            </>
          )}
        </button>

        {/* Result */}
        {result && (
          <div className="mt-6 animate-slide-up">
            <div className="flex items-center justify-between mb-2">
              <label
                className="text-[14px] font-medium"
                style={{ color: 'var(--text-secondary)' }}
              >
                润色结果
              </label>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-[12px] px-3 py-1 rounded-full"
                style={{
                  background: 'var(--card-surface)',
                  color: 'var(--text-secondary)',
                  border: '1px solid #E5E5EA',
                }}
              >
                <Check size={12} />
                复制
              </button>
            </div>
            <div
              className="rounded-[16px] p-4"
              style={{
                background: '#FFFFFF',
                boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                borderLeft: '4px solid #E0A146',
              }}
            >
              <p
                className="text-[15px] leading-relaxed"
                style={{ color: 'var(--text-primary)', lineHeight: 1.75 }}
              >
                {result}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
