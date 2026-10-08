import { useCallback, useEffect, useRef, useState } from 'react'

const VISIBLE_MS = 3500

// Aviso curto que some sozinho. Use com <Toast message={toast.message} />.
export function useToast(initial = '') {
  const [message, setMessage] = useState(initial)
  const timer = useRef(null)

  const show = useCallback((text) => {
    clearTimeout(timer.current)
    setMessage(text)
    timer.current = setTimeout(() => setMessage(''), VISIBLE_MS)
  }, [])

  useEffect(() => {
    if (initial) timer.current = setTimeout(() => setMessage(''), VISIBLE_MS)
    return () => clearTimeout(timer.current)
  }, [initial])

  return { message, show }
}
