import { forwardRef } from 'react'
import { Sliders } from './icons'

const FilterButton = forwardRef(function FilterButton({ count, onClick }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      className="btn btn-soft btn-sm filter-btn"
      aria-haspopup="dialog"
      onClick={onClick}
    >
      <Sliders /> Filtrar
      {count > 0 && (
        <span className="filter-badge" aria-label={`${count} ${count === 1 ? 'ativo' : 'ativos'}`}>
          {count}
        </span>
      )}
    </button>
  )
})

export default FilterButton
