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
  const [deleting, setDeleting] = useState(false) // false | 'checking' | 'deleting'
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
    setDeleting('checking')
    setError('')
    const fail = (err) => {
      console.error(err)
      setError('Não deu para excluir agora. Tente de novo em instantes.')
      setDeleting(false)
    }

    // 1) antes de perguntar, descobre em quantos conjuntos e em quantos dias
    //    do histórico a peça aparece
    const [outfitLinks, logLinks] = await Promise.all([
      supabase.from('outfit_items').select('outfit_id').eq('item_id', selected.id),
      supabase.from('outfit_log_items').select('log:outfit_logs(worn_on)').eq('item_id', selected.id),
    ])
    if (outfitLinks.error) return fail(outfitLinks.error)
    if (logLinks.error) return fail(logLinks.error)
    const n = new Set(outfitLinks.data.map((l) => l.outfit_id)).size
    const days = new Set(logLinks.data.map((l) => l.log?.worn_on).filter(Boolean)).size

    const warnings = []
    if (n > 0) {
      warnings.push(
        `Essa peça está em ${n} ${n === 1 ? 'conjunto' : 'conjuntos'}. ` +
          `Excluir a peça também apaga ${n === 1 ? 'esse conjunto' : 'esses conjuntos'}.`
      )
    }
    if (days > 0) {
      warnings.push(
        `Essa peça ${n > 0 ? 'também ' : ''}aparece no histórico de ${days} ${days === 1 ? 'dia' : 'dias'}. ` +
          'Ela sai desses looks, e um look que ficar sem nenhuma peça é apagado do calendário.'
      )
    }
    const question =
      warnings.length === 0
        ? 'Excluir esta peça? Isso não pode ser desfeito.'
        : [...warnings, 'Isso não pode ser desfeito.'].join('\n\n')
    if (!window.confirm(question)) {
      setDeleting(false)
      return
    }
    setDeleting('deleting')

    // 2) apaga tudo numa transação só (função delete_item no banco): os conjuntos
    //    que usam a peça, as linhas dela no histórico, os looks que ficarem vazios
    //    e a peça. Se algo falhar, nada é apagado.
    const { error: dbError } = await supabase.rpc('delete_item', { p_item_id: selected.id })
    if (dbError) return fail(dbError)

    // 3) apaga o arquivo da foto no Storage (sem travar se falhar)
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
                <Trash /> {deleting === 'deleting' ? 'Excluindo...' : 'Excluir peça'}
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
