import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { logOutfit, LOG_ERROR } from '../lib/logs'
import OutfitRating from '../components/OutfitRating'
import OutfitStack from '../components/OutfitStack'
import Chip from '../components/Chip'
import Toast from '../components/Toast'
import { Heart, Pencil, Shirt, Trash } from '../components/icons'
import { useToast } from '../hooks/useToast'
import { OCCASIONS, outfitRating } from '../utils/outfits'
import { todayLocal } from '../utils/dates'

const plural = (n) => `${n} ${n === 1 ? 'conjunto' : 'conjuntos'}`
const titleOf = (outfit) => outfit.name || 'Conjunto sem nome'

export default function Outfits({ onBuild, onEdit }) {
  const [outfits, setOutfits] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [onlyFavorites, setOnlyFavorites] = useState(false)
  const [occasions, setOccasions] = useState([]) // vazio = Todos
  const [deletingId, setDeletingId] = useState(null)
  const [error, setError] = useState('')
  const [wornToday, setWornToday] = useState(() => new Set()) // ids dos conjuntos já registrados hoje
  const [loggingId, setLoggingId] = useState(null)
  const toast = useToast()

  useEffect(() => {
    // quais conjuntos já foram usados hoje (se falhar, os botões só não mostram o estado)
    supabase
      .from('outfit_logs')
      .select('outfit_id')
      .eq('worn_on', todayLocal())
      .then(({ data, error }) => {
        if (error) console.error(error)
        else setWornToday(new Set(data.map((l) => l.outfit_id).filter(Boolean)))
      })

    supabase
      .from('outfits')
      .select('id, name, occasions, is_favorite, created_at, outfit_items(slot, item:items(id, image_url, category, color, rating))')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error(error)
          setLoadError(true)
        } else {
          setOutfits(data)
        }
        setLoading(false)
      })
  }, [])

  const setFavorite = (id, value) =>
    setOutfits((prev) => prev.map((o) => (o.id === id ? { ...o, is_favorite: value } : o)))

  async function toggleFavorite(outfit) {
    const next = !outfit.is_favorite
    setError('')
    setFavorite(outfit.id, next) // o coração responde na hora; se falhar, volta
    const { error: dbError } = await supabase.from('outfits').update({ is_favorite: next }).eq('id', outfit.id)
    if (dbError) {
      console.error(dbError)
      setFavorite(outfit.id, !next)
      setError('Não deu para favoritar agora. Tente de novo em instantes.')
    }
  }

  async function handleDelete(outfit) {
    const question = `Excluir “${titleOf(outfit)}”? As peças continuam no guarda-roupa. Isso não pode ser desfeito.`
    if (!window.confirm(question)) return
    setDeletingId(outfit.id)
    setError('')

    // os vínculos em outfit_items somem junto (on delete cascade)
    const { error: dbError } = await supabase.from('outfits').delete().eq('id', outfit.id)
    if (dbError) {
      console.error(dbError)
      setError('Não deu para excluir agora. Tente de novo em instantes.')
    } else {
      setOutfits((prev) => prev.filter((o) => o.id !== outfit.id))
    }
    setDeletingId(null)
  }

  // Copia as peças atuais do conjunto para o calendário, no dia de hoje.
  async function handleWornToday(outfit) {
    if (wornToday.has(outfit.id) && !window.confirm('Você já registrou este conjunto hoje. Registrar de novo?')) return
    setLoggingId(outfit.id)
    setError('')

    const { error: logError } = await logOutfit({ wornOn: todayLocal(), outfitId: outfit.id })
    if (logError) {
      console.error(logError)
      setError(LOG_ERROR)
    } else {
      setWornToday((prev) => new Set(prev).add(outfit.id))
      toast.show('Look de hoje registrado ♥')
    }
    setLoggingId(null)
  }

  function toggleOccasion(occasion) {
    setOccasions((list) => (list.includes(occasion) ? list.filter((x) => x !== occasion) : [...list, occasion]))
  }

  function clearFilters() {
    setOnlyFavorites(false)
    setOccasions([])
  }

  // Os dois filtros valem juntos: favorito E pelo menos uma das ocasiões marcadas.
  const shown = outfits.filter(
    (o) =>
      (!onlyFavorites || o.is_favorite) &&
      (occasions.length === 0 || occasions.some((x) => (o.occasions ?? []).includes(x)))
  )
  const onlyFavoritesEmpty = onlyFavorites && occasions.length === 0

  return (
    <div className="page">
      <h1>Meus conjuntos</h1>
      {loading && <p className="muted">Carregando seus conjuntos...</p>}
      {loadError && (
        <p className="msg msg-error" role="alert">
          Não deu para carregar seus conjuntos agora. Tente de novo em instantes.
        </p>
      )}

      {!loading && !loadError && outfits.length === 0 && (
        <div className="empty">
          <Shirt size={40} />
          <h2>Seus conjuntos vão morar aqui.</h2>
          <p>Combine as peças do guarda-roupa e guarde os looks de que você mais gosta.</p>
          <button className="btn btn-primary" style={{ marginTop: 'var(--space-4)' }} onClick={onBuild}>
            Montar conjunto
          </button>
        </div>
      )}

      {outfits.length > 0 && (
        <>
          <div className="toolbar">
            <Chip selected={onlyFavorites} onClick={() => setOnlyFavorites((v) => !v)}>
              Só favoritos
            </Chip>
            <button className="btn btn-primary btn-sm" onClick={onBuild}>
              Montar conjunto
            </button>
          </div>
          <div className="chip-row" role="group" aria-label="Filtrar por ocasião">
            <Chip selected={occasions.length === 0} onClick={() => setOccasions([])}>
              Todos
            </Chip>
            {OCCASIONS.map((x) => (
              <Chip key={x} selected={occasions.includes(x)} onClick={() => toggleOccasion(x)}>
                {x}
              </Chip>
            ))}
          </div>
          <p className="small muted" aria-live="polite" style={{ margin: '0 0 var(--space-4)' }}>
            {plural(shown.length)}
          </p>
        </>
      )}

      {error && (
        <p className="msg msg-error" role="alert">
          {error}
        </p>
      )}

      {outfits.length > 0 && shown.length === 0 && (
        <div className="empty">
          {onlyFavoritesEmpty ? <Heart size={40} /> : <Shirt size={40} />}
          <h2>{onlyFavoritesEmpty ? 'Nenhum favorito por enquanto.' : 'Nenhum conjunto com esses filtros.'}</h2>
          <p>
            {onlyFavoritesEmpty
              ? 'Toque no coração de um conjunto para guardá-lo entre os preferidos.'
              : 'Experimente outra ocasião ou limpe os filtros para ver todos de novo.'}
          </p>
          <button className="btn btn-soft" style={{ marginTop: 'var(--space-4)' }} onClick={clearFilters}>
            Limpar filtros
          </button>
        </div>
      )}

      <div className="grid outfit-grid">
        {shown.map((o) => {
          const rating = outfitRating(o.outfit_items.map((link) => link.item))
          return (
            <article className="card" key={o.id}>
              <OutfitStack links={o.outfit_items} />
              <h3>{titleOf(o)}</h3>
              {o.occasions?.length > 0 && (
                <div className="tags">
                  {o.occasions.map((x) => (
                    <span className="tag" key={x}>
                      {x}
                    </span>
                  ))}
                </div>
              )}
              <div className="card-foot">
                {rating === null ? <span className="small muted">Sem nota</span> : <OutfitRating value={rating} small />}
                <div className="card-actions">
                  <button
                    className="icon-btn icon-btn-heart"
                    aria-pressed={o.is_favorite}
                    aria-label={`Favoritar ${titleOf(o)}`}
                    onClick={() => toggleFavorite(o)}
                  >
                    <Heart filled={o.is_favorite} />
                  </button>
                  <button className="icon-btn icon-btn-edit" aria-label={`Editar ${titleOf(o)}`} onClick={() => onEdit(o)}>
                    <Pencil />
                  </button>
                  <button
                    className="icon-btn icon-btn-danger"
                    aria-label={`Excluir ${titleOf(o)}`}
                    disabled={deletingId === o.id}
                    onClick={() => handleDelete(o)}
                  >
                    <Trash />
                  </button>
                </div>
              </div>
              <button
                className="btn btn-soft btn-sm btn-block card-wear"
                disabled={loggingId === o.id}
                onClick={() => handleWornToday(o)}
              >
                {loggingId === o.id ? 'Registrando...' : wornToday.has(o.id) ? 'Registrado hoje ♥' : 'Usei hoje'}
              </button>
            </article>
          )
        })}
      </div>

      <Toast message={toast.message} />
    </div>
  )
}
