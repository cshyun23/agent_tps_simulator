import { useEffect } from 'react'
import { useToastStore } from '../../store'

export function Toast() {
  const toasts = useToastStore(s => s.toasts)
  const removeToast = useToastStore(s => s.removeToast)

  return (
    <div style={{
      position: 'fixed',
      top: 16,
      right: 16,
      zIndex: 10000,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
    }}>
      {toasts.map(toast => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  )
}

function ToastItem({ toast, onClose }: { toast: any; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, toast.duration || 3000)
    return () => clearTimeout(timer)
  }, [toast.id, onClose, toast.duration])

  const bgColorMap: Record<string, string> = {
    success: 'var(--success)',
    error: 'var(--danger)',
    info: 'var(--primary)',
    warning: 'var(--warning)',
  }
  const bgColor = bgColorMap[toast.type] || 'var(--surface)'

  return (
    <div
      style={{
        background: bgColor,
        color: '#fff',
        padding: '12px 16px',
        borderRadius: 'var(--radius)',
        fontSize: 13,
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        maxWidth: 300,
        wordBreak: 'break-word',
        animation: 'slideIn 0.3s ease-out',
      }}
    >
      {toast.message}
    </div>
  )
}
