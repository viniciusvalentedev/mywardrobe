import { Close } from './icons'

export default function ActiveFilters({ active, onClear }) {
  if (active.length === 0) return null
  return (
    <div className="active-filters">
      {active.map((f) => (
        <span className="tag tag-removable" key={f.id}>
          {f.text}
          <button
            type="button"
            className="tag-remove"
            aria-label={`Remover filtro ${f.text}`}
            onClick={f.remove}
          >
            <Close />
          </button>
        </span>
      ))}
      <button type="button" className="link-btn" onClick={onClear}>
        Limpar tudo
      </button>
    </div>
  )
}
