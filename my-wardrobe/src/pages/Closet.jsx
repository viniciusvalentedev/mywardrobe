import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { pathFromUrl } from '../utils/storage'
import Stars from '../components/Stars'
import { Hanger, Pencil, Trash } from '../components/icons'
import FilterButton from '../components/FilterButton'
import FilterSheet from '../components/FilterSheet'
import ActiveFilters from '../components/ActiveFilters'
import { useWardrobeFilters, plural } from '../hooks/useWardrobeFilters'

export default function Closet({ onEdit }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const filters = useWardrobeFilters(items)

  useEffect(() => {
    supabase
      .from('items')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error) setItems(data)
        setLoading(false)
      })
  }, [])

  async function handleDelete() {
    if (!window.confirm('Excluir esta peça? Isso não pode ser desfeito.')) return
    setDeleting(true)
    setError('')

    // 1) apaga a linha da tabela (some da lista)
    const { error: dbError } = await supabase.from('items').delete().eq('id', selected.id)
    if (dbError) {
      console.error(dbError)
      setError('Não deu para excluir agora. Tente de novo em instantes.')
      setDeleting(false)
      return
    }

    // 2) apaga o arquivo da foto no Storage (sem travar se falhar)
    const path = pathFromUrl(selected.image_url)
    if (path) {
      const { error: rmError } = await supabase.storage.from('wardrobe').remove([path])
      if (rmError) console.error(rmError)
    }

    setItems((prev) => prev.filter((i) => i.id !== selected.id))
    setSelected(null)
    setDeleting(false)
  }

  function open(it) {
    setError('')
    setSelected(it)
  }

  return (
    <div className="page">
      <h1>Meu guarda-roupa</h1>
      {loading && <p className="muted">Carregando suas peças...</p>}
      {!loading && items.length === 0 && (
        <div className="empty">
          <h2>Seu guarda-roupa está esperando as primeiras peças.</h2>
          <p>Toque em “Adicionar peça” para começar.</p>
        </div>
      )}

      {items.length > 0 && (
        <>
          <div className="toolbar">
            <span className="small muted" aria-live="polite">
              {plural(filters.filtered.length)}
            </span>
            <FilterButton count={filters.activeCount} onClick={() => setFilterOpen(true)} />
          </div>
          <ActiveFilters active={filters.active} onClear={filters.clear} />
        </>
      )}

      {items.length > 0 && filters.filtered.length === 0 && (
        <div className="empty">
          <Hanger size={40} />
          <h2>Nenhuma peça com esses filtros.</h2>
          <button className="btn btn-soft" style={{ marginTop: 'var(--space-4)' }} onClick={filters.clear}>
            Limpar filtros
          </button>
        </div>
      )}

      <div className="grid">
        {filters.filtered.map((it) => (
          <article className="card" key={it.id}>
            <div className="photo">
              <img src={it.image_url} alt={`${it.category} ${it.color}`} />
            </div>
            <h3>
              <button className="card-open" onClick={() => open(it)}>
                {it.category}
              </button>
            </h3>
            <div className="tags">
              <span className="tag">{it.category}</span>
              <span className="tag tag-lilac">{it.color}</span>
            </div>
            <div className="card-foot">
              <Stars value={it.rating} small />
            </div>
          </article>
        ))}
      </div>

      {filterOpen && (
        <FilterSheet
          filters={filters}
          resultCount={filters.filtered.length}
          onClose={() => setFilterOpen(false)}
        />
      )}

      {selected && (
        <div className="overlay" onClick={() => !deleting && setSelected(null)}>
          <div
            className="sheet"
            role="dialog"
            aria-modal="true"
            aria-label={`${selected.category} ${selected.color}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="photo photo-lg">
              <img src={selected.image_url} alt={`${selected.category} ${selected.color}`} />
            </div>
            <div className="tags">
              <span className="tag">{selected.category}</span>
              <span className="tag tag-lilac">{selected.color}</span>
            </div>
            <div className="stars-wrap">
              <Stars value={selected.rating} />
            </div>

            {error && (
              <p className="msg msg-error" role="alert">
                {error}
              </p>
            )}

            <div className="btn-row">
              <button className="btn btn-soft" disabled={deleting} onClick={() => onEdit(selected)}>
                <Pencil /> Editar peça
              </button>
              <button className="btn btn-danger" disabled={deleting} onClick={handleDelete}>
                <Trash /> {deleting ? 'Excluindo...' : 'Excluir peça'}
              </button>
            </div>
            <button
              className="btn btn-outline btn-block"
              disabled={deleting}
              onClick={() => setSelected(null)}
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
