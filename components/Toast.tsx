'use client'

import { useEffect, useState } from 'react'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: number
  message: string
  type: ToastType
  link?: { href: string; label: string }
}

// Module-level state + pub-sub so any client component can call showToast
// without prop drilling.
let toasts: Toast[] = []
const subscribers = new Set<(toasts: Toast[]) => void>()
let nextId = 1

function notify() {
  for (const fn of subscribers) fn(toasts)
}

export function showToast(
  message: string,
  type: ToastType = 'info',
  link?: { href: string; label: string },
  durationMs = 6000,
) {
  const id = nextId++
  toasts = [...toasts, { id, message, type, link }]
  notify()
  setTimeout(() => {
    toasts = toasts.filter(t => t.id !== id)
    notify()
  }, durationMs)
  return id
}

export function dismissToast(id: number) {
  toasts = toasts.filter(t => t.id !== id)
  notify()
}

const ICONS: Record<ToastType, string> = {
  success: '✓',
  error: '×',
  info: 'i',
}

const COLORS: Record<ToastType, { bg: string; border: string; dot: string }> = {
  success: { bg: 'var(--accent-soft)', border: 'var(--accent)', dot: 'var(--accent)' },
  error: { bg: 'rgba(239, 68, 68, 0.10)', border: '#ef4444', dot: '#ef4444' },
  info: { bg: 'rgba(255, 255, 255, 0.06)', border: 'var(--border-strong)', dot: 'var(--fg-muted)' },
}

export default function ToastContainer() {
  const [list, setList] = useState<Toast[]>([])

  useEffect(() => {
    subscribers.add(setList)
    setList(toasts)
    return () => {
      subscribers.delete(setList)
    }
  }, [])

  if (list.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 max-w-[360px]">
      {list.map(t => {
        const c = COLORS[t.type]
        return (
          <div
            key={t.id}
            className="card flex items-start gap-3 p-3 shadow-xl"
            style={{ background: c.bg, borderColor: c.border, animation: 'panelRise 0.2s ease-out' }}
          >
            <span
              className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium mt-0.5"
              style={{ background: c.dot, color: '#000' }}
            >
              {ICONS[t.type]}
            </span>
            <div className="flex-1 min-w-0 text-xs leading-relaxed">
              <div>{t.message}</div>
              {t.link && (
                <a
                  href={t.link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mono text-[10px] mt-1 inline-block hover:underline"
                  style={{ color: c.dot }}
                >
                  {t.link.label} →
                </a>
              )}
            </div>
            <button
              onClick={() => dismissToast(t.id)}
              className="shrink-0 text-[var(--fg-muted)] hover:text-white text-base leading-none"
              aria-label="dismiss"
            >
              ×
            </button>
          </div>
        )
      })}
    </div>
  )
}
