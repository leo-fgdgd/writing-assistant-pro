import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams, useSearchParams } from 'react-router'
import { Send, Copy, RotateCcw, Sparkles, Zap, StopCircle } from 'lucide-react'
import NavBar from '../components/NavBar'
import { streamChatMessage, getConversation } from '../lib/api'
import type { Message } from '../types/api'

interface ChatProps {
  showToast: (message: string) => void
}

const scenePrompts: Record<string, string> = {
  academic: '我需要写一篇学术论文的摘要部分，主题是人工智能在医疗诊断中的应用，请帮我梳理一个结构清晰的摘要框架。',
  business: '请帮我写一封商务邮件，向客户介绍我们公司新推出的企业服务方案，语气要专业且友好。',
  creative: '我想写一个短视频脚本，主题是"城市里的治愈瞬间"，时长约1分钟，需要有画面感和情感共鸣。',
  resume: '请帮我写一段简洁有力的个人简介，我是一名有5年经验的产品经理，想突出数据驱动和用户体验设计能力。',
}

export default function Chat({ showToast }: ChatProps) {
  const { sceneId } = useParams<{ sceneId?: string }>()
  const [searchParams] = useSearchParams()
  const historyConversationId = searchParams.get('conversationId')
  const [messages, setMessages] = useState<Message[]>([])
  const [conversationId, setConversationId] = useState<string | undefined>(historyConversationId || undefined)
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingContent, scrollToBottom])

  const sendMessage = useCallback(async (message: string, scene?: string) => {
    if (!message.trim()) return

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: message.trim(),
      timestamp: new Date().toISOString(),
    }

    setMessages(prev => [...prev, userMsg])
    setInputValue('')
    setIsTyping(true)
    setStreamingContent('')

    const controller = new AbortController()
    abortRef.current = controller

    try {
      await streamChatMessage(
        {
          conversationId,
          sceneId: scene || sceneId,
          message: message.trim(),
        },
        {
          onMeta(data) {
            setConversationId(data.conversationId)
          },
          onToken(content) {
            setStreamingContent(prev => prev + content)
          },
          onDone(data) {
            // Add the complete assistant message to the message list
            const assistantMsg: Message = {
              id: `${Date.now()}-ast`,
              role: 'assistant',
              content: streamingContent,
              timestamp: new Date().toISOString(),
            }
            // Use a fresh closure to avoid stale state issues
            setMessages(prev => [...prev, assistantMsg])
            setStreamingContent('')
            setIsTyping(false)
            setConversationId(data.conversationId)
          },
          onError(message) {
            showToast(message || 'AI 调用失败')
            setMessages(prev => prev.filter(m => m.id !== userMsg.id))
            setStreamingContent('')
            setIsTyping(false)
          },
        },
        controller.signal,
      )
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        // User cancelled
        if (streamingContent) {
          const partialMsg: Message = {
            id: `${Date.now()}-ast`,
            role: 'assistant',
            content: streamingContent + '\n\n[已中断]',
            timestamp: new Date().toISOString(),
          }
          setMessages(prev => [...prev, partialMsg])
        }
        setStreamingContent('')
      } else {
        showToast(err instanceof Error ? err.message : '发送失败，请重试')
        setMessages(prev => prev.filter(m => m.id !== userMsg.id))
        setStreamingContent('')
      }
      setIsTyping(false)
    } finally {
      abortRef.current = null
    }
  }, [conversationId, sceneId, showToast, streamingContent])

  // Load conversation from history if conversationId is in URL
  useEffect(() => {
    if (historyConversationId && !initialized) {
      setConversationId(historyConversationId)
      getConversation(historyConversationId)
        .then(conv => {
          setMessages(conv.messages.map(m => ({
            ...m,
            timestamp: m.timestamp || new Date().toISOString(),
          })))
          setInitialized(true)
        })
        .catch(() => showToast('加载对话失败'))
    }
  }, [historyConversationId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-send scene prompt if coming from scene card (only once)
  useEffect(() => {
    if (sceneId && scenePrompts[sceneId] && !initialized && !historyConversationId) {
      setInitialized(true)
      sendMessage(scenePrompts[sceneId], sceneId)
    }
  }, [sceneId, initialized, sendMessage, historyConversationId])

  const handleSend = () => {
    if (!inputValue.trim() || isTyping) return
    sendMessage(inputValue.trim())
  }

  const handleStop = () => {
    abortRef.current?.abort()
  }

  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content)
      showToast('已复制到剪贴板')
    } catch {
      showToast('复制失败，请手动复制')
    }
  }

  const handleRegenerate = async () => {
    if (!conversationId || isTyping) return

    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')
    if (!lastUserMsg) {
      showToast('没有可重新生成的消息')
      return
    }

    showToast('重新生成中...')
    setIsTyping(true)

    setMessages(prev => {
      const lastIdx = prev.length - 1
      if (lastIdx >= 0 && prev[lastIdx].role === 'assistant') {
        return prev.slice(0, lastIdx)
      }
      return prev
    })

    try {
      await sendMessage(lastUserMsg.content)
    } catch {
      setIsTyping(false)
      showToast('重新生成失败')
    }
  }

  const quickPrompts = [
    { icon: <Zap size={14} />, text: '写工作总结' },
    { icon: <Sparkles size={14} />, text: '朋友圈文案' },
    { icon: <Zap size={14} />, text: '演讲稿' },
    { icon: <Sparkles size={14} />, text: '短视频脚本' },
  ]

  return (
    <div className="flex flex-col" style={{ background: 'var(--page-bg)', minHeight: '100vh' }}>
      <NavBar title="语灵 AI" showBack showToast={showToast} />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-hide">
        {messages.length === 0 && !streamingContent && (
          <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
              style={{ background: 'rgba(224, 161, 70, 0.12)' }}
            >
              <Sparkles size={28} color="#E0A146" />
            </div>
            <h2
              className="text-[20px] font-semibold mb-2"
              style={{ color: 'var(--text-primary)' }}
            >
              语灵 AI 助手
            </h2>
            <p
              className="text-[14px] text-center mb-6"
              style={{ color: 'var(--text-secondary)' }}
            >
              告诉我你想写什么，我来帮你创作
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {quickPrompts.map(({ icon, text }) => (
                <button
                  key={text}
                  onClick={() => {
                    setInputValue(`帮我${text}`)
                    inputRef.current?.focus()
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-full text-[13px]"
                  style={{
                    background: '#FFFFFF',
                    color: 'var(--text-primary)',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                    border: '1px solid #E5E5EA',
                  }}
                >
                  {icon}
                  {text}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex mb-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center mr-2 flex-shrink-0 mt-1"
                style={{ background: 'rgba(224, 161, 70, 0.12)' }}
              >
                <Sparkles size={16} color="#E0A146" />
              </div>
            )}
            <div
              className="max-w-[80%] rounded-[18px] px-4 py-3 relative group"
              style={{
                background: msg.role === 'user' ? '#1C1C1E' : '#FFFFFF',
                color: msg.role === 'user' ? '#FFFFFF' : 'var(--text-primary)',
                fontSize: '15px',
                lineHeight: 1.75,
                boxShadow: msg.role === 'assistant' ? '0 1px 4px rgba(0,0,0,0.04)' : 'none',
                borderBottomLeftRadius: msg.role === 'assistant' ? '4px' : '18px',
                borderBottomRightRadius: msg.role === 'user' ? '4px' : '18px',
              }}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>

              {msg.role === 'assistant' && !isTyping && (
                <div className="flex items-center gap-2 mt-3 pt-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}
                >
                  <button
                    onClick={() => handleCopy(msg.content)}
                    className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-md"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <Copy size={12} />
                    复制
                  </button>
                  <button
                    onClick={handleRegenerate}
                    className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-md"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <RotateCcw size={12} />
                    重新生成
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Streaming message bubble */}
        {streamingContent && (
          <div className="flex mb-4 justify-start">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center mr-2 flex-shrink-0 mt-1"
              style={{ background: 'rgba(0, 255, 136, 0.15)' }}
            >
              <Sparkles size={16} color="#00ff88" />
            </div>
            <div
              className="max-w-[80%] rounded-[18px] px-4 py-3 relative"
              style={{
                background: '#FFFFFF',
                color: 'var(--text-primary)',
                fontSize: '15px',
                lineHeight: 1.75,
                borderBottomLeftRadius: '4px',
                boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              }}
            >
              <div className="whitespace-pre-wrap">
                {streamingContent}
                <span className="inline-block w-0.5 h-4 ml-0.5 bg-current animate-pulse align-text-bottom" />
              </div>
            </div>
          </div>
        )}

        {isTyping && !streamingContent && (
          <div className="flex mb-4 justify-start">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center mr-2 flex-shrink-0"
              style={{ background: 'rgba(224, 161, 70, 0.12)' }}
            >
              <Sparkles size={16} color="#E0A146" />
            </div>
            <div
              className="rounded-[18px] px-4 py-3 flex items-center gap-1"
              style={{
                background: '#FFFFFF',
                borderBottomLeftRadius: '4px',
                boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              }}
            >
              <span className="w-2 h-2 rounded-full animate-typing" style={{ background: '#C7C7CC', animationDelay: '0ms' }} />
              <span className="w-2 h-2 rounded-full animate-typing" style={{ background: '#C7C7CC', animationDelay: '150ms' }} />
              <span className="w-2 h-2 rounded-full animate-typing" style={{ background: '#C7C7CC', animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div
        className="shrink-0 px-4 py-3"
        style={{
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: '1px solid #E5E5EA',
        }}
      >
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder="输入你的写作需求..."
            rows={1}
            className="flex-1 resize-none rounded-[16px] px-4 py-3 text-[15px] outline-none max-h-[120px]"
            style={{
              background: '#F2F2F7',
              color: 'var(--text-primary)',
              lineHeight: 1.5,
            }}
          />
          {isTyping ? (
            <button
              onClick={handleStop}
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all active:scale-95"
              style={{ background: '#FF3B30' }}
            >
              <StopCircle size={18} color="#FFFFFF" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!inputValue.trim()}
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all active:scale-95 disabled:opacity-40"
              style={{
                background: inputValue.trim() ? '#1C1C1E' : '#C7C7CC',
              }}
            >
              <Send size={18} color="#FFFFFF" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
