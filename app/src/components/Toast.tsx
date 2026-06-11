import { CheckCircle } from 'lucide-react'

interface ToastProps {
  message: string
}

export default function Toast({ message }: ToastProps) {
  return (
    <div
      className="pointer-events-auto flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg animate-fade-in"
      style={{
        background: '#1C1C1E',
        color: '#FFFFFF',
        fontSize: '14px',
        fontWeight: 500,
      }}
    >
      <CheckCircle size={16} strokeWidth={2} />
      <span>{message}</span>
    </div>
  )
}
