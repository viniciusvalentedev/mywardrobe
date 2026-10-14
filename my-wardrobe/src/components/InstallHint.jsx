import { useState } from 'react'
import { Close, Share } from './icons'

const DISMISSED_KEY = 'mw-install-hint-dismissed'

// Só iPhone/iPad no Safari, e só enquanto o app não foi aberto pela Tela de Início.
function shouldShow() {
  const ua = navigator.userAgent
  // iPad recente se apresenta como Mac; o toque denuncia
  const isIos = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA/.test(ua)
  const standalone = navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches
  if (!isIos || !isSafari || standalone) return false
  try {
    return localStorage.getItem(DISMISSED_KEY) !== '1'
  } catch {
    return true
  }
}

export default function InstallHint() {
  const [visible, setVisible] = useState(shouldShow)

  if (!visible) return null

  function dismiss() {
    try {
      localStorage.setItem(DISMISSED_KEY, '1')
    } catch {
      // sem armazenamento (aba privada): some só nesta visita
    }
    setVisible(false)
  }

  return (
    <aside className="install-hint" aria-label="Instalar o app">
      <p>
        Para usar como app, toque em <Share /> <strong>Compartilhar</strong> e depois em{' '}
        <strong>Adicionar à Tela de Início</strong>.
      </p>
      <button className="icon-btn" aria-label="Dispensar aviso" onClick={dismiss}>
        <Close />
      </button>
    </aside>
  )
}
