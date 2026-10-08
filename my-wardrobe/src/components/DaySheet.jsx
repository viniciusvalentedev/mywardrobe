import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { logOutfit, LOG_ERROR } from '../lib/logs'
import OutfitRating from './OutfitRating'
import OutfitStack from './OutfitStack'
import { Trash } from './icons'
import { outfitRating } from '../utils/outfits'
import { formatDay } from '../utils/dates'

const titleOf = (outfit) => outfit.name || 'Conjunto sem nome'

// Painel inferior com os looks de um dia do calendário: ver, remover e adicionar.
// `logs` são os registros daquele dia; `onChanged` pede para recarregar o mês.
export default function DaySheet({ day, isToday, logs, onChanged, onBuild, onNotice, onClose }) {
  const [adding, setAdding] = useState(false) // false | 'menu' | 'saved'
  const [saved, setSaved] = useState(null) // conjuntos salvos; só busca quando ela pede
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleRemove(log) {
    const question = `Remover este look de ${formatDay(day)}? As peças e os conjuntos continuam no app.`
    if (!window.confirm(question)) return
    setBusy(true)
    setError('')

    // as peças do registro somem junto (on delete cascade)
    const { error: dbError } = await supabase.from('outfit_logs').delete().eq('id', log.id)
    if (dbError) {
      console.error(dbError)
      setError('Não deu para remover agora. Tente de novo em instantes.')
    } else {
      onChanged()
    }
    setBusy(false)
  }

  function openSaved() {
    setAdding('saved')
    setError('')
    if (saved !== null) return
    supabase
      .from('outfits')
      .select('id, name, outfit_items(slot, item:items(id, image_url, category, color, rating))')
      .order('created_at', { ascending: false })
      .then(({ data, error: dbError }) => {
        if (dbError) {
          console.error(dbError)
          setError('Não deu para carregar seus conjuntos agora. Tente de novo em instantes.')
          setAdding('menu')
        } else {
          setSaved(data)
        }
      })
  }

  // Copia as peças atuais do conjunto para este dia.
  async function handlePickSaved(outfit) {
    setBusy(true)
    setError('')
    const { error: logError } = await logOutfit({ wornOn: day, outfitId: outfit.id })
    if (logError) {
      console.error(logError)
      setError(LOG_ERROR)
    } else {
      setAdding(false)
      onChanged()
      onNotice(isToday ? 'Look de hoje registrado ♥' : 'Look registrado ♥')
    }
    setBusy(false)
  }

  function close() {
    if (!busy) onClose()
  }

  return (
    <div className="overlay" onClick={close}>
      <div
        className="sheet day-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="day-title"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.key === 'Escape' && close()}
      >
        <h2 id="day-title" className="cap-first">
          {formatDay(day)}
        </h2>
        {isToday && <p className="small muted day-today">Hoje</p>}

        {logs.length === 0 && (
          <div className="day-empty">
            <p>
              <strong>Nenhum look registrado neste dia.</strong>
            </p>
            <p className="small muted">
              {isToday ? 'Quando decidir o que vestir, registre aqui.' : 'Se você lembra o que usou, ainda dá para registrar.'}
            </p>
          </div>
        )}

        {logs.map((log) => {
          const rating = outfitRating(log.outfit_log_items.map((link) => link.item))
          return (
            <article className="look" key={log.id}>
              <OutfitStack links={log.outfit_log_items} small />
              <div className="look-info">
                <strong>{log.outfit ? titleOf(log.outfit) : 'Look avulso'}</strong>
                {rating === null ? <span className="small muted">Sem nota</span> : <OutfitRating value={rating} small />}
                <button className="btn btn-danger btn-sm" disabled={busy} onClick={() => handleRemove(log)}>
                  <Trash /> Remover look
                </button>
              </div>
            </article>
          )
        })}

        {error && (
          <p className="msg msg-error" role="alert">
            {error}
          </p>
        )}

        {adding === 'menu' && (
          <div className="day-add">
            <h3>Como você quer registrar?</h3>
            <button className="btn btn-soft btn-block" onClick={openSaved}>
              Escolher um conjunto salvo
            </button>
            <button className="btn btn-soft btn-block" onClick={() => onBuild(day)}>
              Montar na hora
            </button>
          </div>
        )}

        {adding === 'saved' && (
          <div className="day-add">
            <h3>Qual conjunto você usou?</h3>
            {saved === null && <p className="muted">Carregando seus conjuntos...</p>}
            {saved?.length === 0 && (
              <>
                <p className="muted">Você ainda não tem conjuntos salvos.</p>
                <button className="btn btn-soft btn-block" onClick={() => onBuild(day)}>
                  Montar na hora
                </button>
              </>
            )}
            {saved?.map((o) => (
              <button className="saved-row" key={o.id} disabled={busy} onClick={() => handlePickSaved(o)}>
                <OutfitStack links={o.outfit_items} small />
                <span>{titleOf(o)}</span>
              </button>
            ))}
          </div>
        )}

        <div className="actions">
          {adding === false && (
            <button className="btn btn-primary btn-block" onClick={() => setAdding('menu')}>
              {logs.length === 0 ? 'Adicionar look' : 'Adicionar outro look'}
            </button>
          )}
          <button className="btn btn-outline btn-block" disabled={busy} onClick={close}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
