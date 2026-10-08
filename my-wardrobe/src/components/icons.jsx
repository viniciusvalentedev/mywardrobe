// Ícones da marca: traço de 2px, pontas arredondadas. Cheios só quando ativos.
const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
}

export function Star({ filled }) {
  return (
    <svg {...base} fill={filled ? 'currentColor' : 'none'}>
      <path d="M12 2.5l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.3l-5.8 3.1 1.1-6.5L2.6 9.3l6.5-.9z" />
    </svg>
  )
}

export function Heart({ filled, size = 24 }) {
  return (
    <svg {...base} width={size} height={size} fill={filled ? 'currentColor' : 'none'}>
      <path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z" />
    </svg>
  )
}

export function Sparkles() {
  return (
    <svg {...base} width="20" height="20">
      <path d="M11 4l1.8 5.2L18 11l-5.2 1.8L11 18l-1.8-5.2L4 11l5.2-1.8z" />
      <path d="M19 3v4M17 5h4M19 17v4M17 19h4" />
    </svg>
  )
}

export function Lock({ closed }) {
  return (
    <svg {...base} width="20" height="20">
      <rect x="4" y="11" width="16" height="10" rx="2.5" />
      <path d={closed ? 'M8 11V7a4 4 0 0 1 8 0v4' : 'M8 11V7a4 4 0 0 1 7.8-1.2'} />
    </svg>
  )
}

export function CalendarIcon({ size = 20 }) {
  return (
    <svg {...base} width={size} height={size}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </svg>
  )
}

export function ChartIcon() {
  return (
    <svg {...base} width="20" height="20">
      <path d="M3 20h18M7 20v-8M12 20V5M17 20v-5" />
    </svg>
  )
}

export function Chevron({ left }) {
  return (
    <svg {...base} width="20" height="20">
      <path d={left ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} />
    </svg>
  )
}

export function Shirt({ size = 20 }) {
  return (
    <svg {...base} width={size} height={size}>
      <path d="M8 3L3 5.5 4.5 10 7 9v11h10V9l2.5 1L21 5.5 16 3a4 4 0 0 1-8 0z" />
    </svg>
  )
}

export function Hanger({ size = 20 }) {
  return (
    <svg {...base} width={size} height={size}>
      <path d="M12 7a2.5 2.5 0 1 0-2.5-2.5" />
      <path d="M12 7v2l9 6.2a1.6 1.6 0 0 1-.9 2.8H3.9A1.6 1.6 0 0 1 3 15.2L12 9" />
    </svg>
  )
}

export function Plus() {
  return (
    <svg {...base} width="20" height="20">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

export function Camera() {
  return (
    <svg {...base} width="20" height="20">
      <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  )
}

export function Image() {
  return (
    <svg {...base} width="20" height="20">
      <rect x="3.5" y="4.5" width="17" height="15" rx="3" />
      <circle cx="9" cy="10" r="1.5" />
      <path d="M4 17l5-5 4 4 2-2 5 5" />
    </svg>
  )
}

export function Pencil() {
  return (
    <svg {...base} width="20" height="20">
      <path d="M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19z" />
    </svg>
  )
}

export function Trash() {
  return (
    <svg {...base} width="20" height="20">
      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
    </svg>
  )
}

export function Sliders() {
  return (
    <svg {...base} width="20" height="20">
      <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
      <circle cx="15" cy="7" r="2" />
      <circle cx="9" cy="17" r="2" />
    </svg>
  )
}

export function Close() {
  return (
    <svg {...base} width="16" height="16">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}
