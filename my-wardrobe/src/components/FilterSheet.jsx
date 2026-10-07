import { useEffect, useRef } from 'react'
import Chip from './Chip'
import { SORTS, plural } from '../hooks/useWardrobeFilters'

const FOCUSABLE = 'button:not([disabled]), [href], input, [tabindex]:not([tabindex="-1"])'

export default function FilterSheet({ filters, resultCount, onClose }) {
  const panel = useRef(null)
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  // Foco vai para o painel, fica preso nele, Esc fecha e o foco volta a quem abriu.
  useEffect(() => {
    const opener = document.activeElement
    const scrollLock = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panel.current.focus()

    function onKey(e) {
      if (e.key === 'Escape') {
        onCloseRef.current()
        return
      }
      if (e.key !== 'Tab') return
      const nodes = [...panel.current.querySelectorAll(FOCUSABLE)]
      if (nodes.length === 0) return
      const first = nodes[0]
      const last = nodes[nodes.length - 1]
      const current = document.activeElement
      const outside = !panel.current.contains(current) || current === panel.current
      if (e.shiftKey && (current === first || outside)) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && (current === last || outside)) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = scrollLock
      opener?.focus?.()
    }
  }, [])

  const { sort, categories, colors, categoryOptions, colorOptions, toggle, setSort, clear } = filters

  return (
    <div className="filter-overlay" onClick={onClose}>
      <div
        ref={panel}
        className="filter-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="filter-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="filter-handle" aria-hidden="true" />
        <div className="filter-body">
          <h2 id="filter-title">Filtrar e ordenar</h2>

          <section aria-labelledby="f-sort">
            <h3 id="f-sort" className="filter-section">Ordenar por</h3>
            <div className="chips">
              {SORTS.map((s) => (
                <Chip key={s.value} selected={sort === s.value} onClick={() => setSort(s.value)}>
                  {s.label}
                </Chip>
              ))}
            </div>
          </section>

          <section aria-labelledby="f-cat">
            <h3 id="f-cat" className="filter-section">Categoria</h3>
            <div className="chips">
              {categoryOptions.map((o) => (
                <Chip key={o.key} selected={categories.includes(o.key)} onClick={() => toggle('categories', o.key)}>
                  {o.label}
                </Chip>
              ))}
            </div>
          </section>

          <section aria-labelledby="f-color">
            <h3 id="f-color" className="filter-section">Cor</h3>
            <div className="chips">
              {colorOptions.map((o) => (
                <Chip key={o.key} selected={colors.includes(o.key)} onClick={() => toggle('colors', o.key)}>
                  {o.label}
                </Chip>
              ))}
            </div>
          </section>
        </div>

        <div className="filter-footer">
          <span className="visually-hidden" aria-live="polite">{plural(resultCount)}</span>
          <button type="button" className="btn btn-outline" onClick={clear}>
            Limpar
          </button>
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Ver {plural(resultCount)}
          </button>
        </div>
      </div>
    </div>
  )
}
