export default function Chip({ selected, onClick, children }) {
  return (
    <button type="button" className="filter-chip" aria-pressed={selected} onClick={onClick}>
      {children}
    </button>
  )
}
