import { useEffect, useRef } from 'react'
import { categoriesOfSlot } from '../utils/outfits'
import { Lock } from './icons'

// Um espaço do conjunto: fileira que desliza na horizontal; tocar escolhe a peça,
// tocar de novo tira. `takenByDress` deixa o espaço apagado enquanto há vestido.
// `locked`: a peça escolhida está travada e o "Me surpreenda" não mexe nela.
export default function SlotCarousel({ slot, items, selected, locked, takenByDress, onPick, onClear, onToggleLock }) {
  const track = useRef(null)
  const selectedId = selected?.id

  // Leva a peça escolhida para o meio, para as escolhas ficarem empilhadas.
  useEffect(() => {
    const el = track.current?.querySelector('[aria-pressed="true"]')
    if (!el) return
    track.current.scrollTo({ left: el.offsetLeft - (track.current.clientWidth - el.offsetWidth) / 2 })
  }, [selectedId])

  const titleId = `slot-${slot.key}`

  return (
    <section className={`slot slot-${slot.key}${takenByDress ? ' slot-off' : ''}`} aria-labelledby={titleId}>
      <div className="slot-head">
        <h2 id={titleId} className="slot-title">
          {slot.label}
        </h2>
        {slot.key === 'dress' && <span className="tag tag-lilac">ocupa Cima + Baixo</span>}
        {selected && (
          <div className="slot-tools">
            <button className="link-btn" aria-label={`Tirar peça de ${slot.label}`} onClick={onClear}>
              Tirar
            </button>
            <button
              className="icon-btn icon-btn-lock"
              aria-pressed={locked}
              aria-label={`Travar peça de ${slot.label}`}
              title={locked ? 'Travada: não muda no Me surpreenda' : 'Travar esta peça no Me surpreenda'}
              onClick={onToggleLock}
            >
              <Lock closed={locked} />
            </button>
          </div>
        )}
      </div>

      {takenByDress && items.length > 0 && (
        <p className="field-hint slot-note">
          O vestido está ocupando este espaço. Toque numa peça para trocar o vestido por ela.
        </p>
      )}

      {items.length === 0 ? (
        <p className="slot-empty">
          {slot.empty} Peças marcadas como {categoriesOfSlot(slot.key)} aparecem aqui.
        </p>
      ) : (
        <ul ref={track} className="carousel">
          {items.map((it) => (
            <li key={it.id}>
              <button className="piece" aria-pressed={it.id === selectedId} onClick={() => onPick(it)}>
                <img src={it.image_url} alt={`${it.category} ${it.color}`} loading="lazy" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
