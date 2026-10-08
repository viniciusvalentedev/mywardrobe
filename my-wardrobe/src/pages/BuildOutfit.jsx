import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { logOutfit, LOG_ERROR } from '../lib/logs'
import SlotCarousel from '../components/SlotCarousel'
import OutfitRating from '../components/OutfitRating'
import Chip from '../components/Chip'
import Toast from '../components/Toast'
import { Hanger, Sparkles } from '../components/icons'
import { useToast } from '../hooks/useToast'
import { formatDay, todayLocal } from '../utils/dates'
import {
  SLOTS,
  OCCASIONS,
  EMPTY_PICK,
  MAX_SLOTS,
  MIN_SLOTS,
  groupBySlot,
  pickItem,
  pickKey,
  filledSlots,
  outfitRating,
  pickOfOutfit,
  rowsOfPick,
} from '../utils/outfits'
import { isLocked, surprisePick, surpriseSaved } from '../utils/surprise'

const SAVE_ERROR = 'Não deu para salvar agora. Tente de novo em instantes.'
const occasionsKey = (list) => [...list].sort().join('|')

// "Me surpreenda": como chamar o que falta no guarda-roupa
const MISSING_LABEL = { top: 'peças de cima', bottom: 'peças de baixo', shoes: 'calçados' }
const andList = new Intl.ListFormat('pt-BR', { type: 'conjunction' })
// animação do sorteio: poucas trocas rápidas, menos de meio segundo no total
const ROLL_FRAMES = 6
const ROLL_MS = 70

function statusText(count, alreadySaved, action) {
  if (alreadySaved) return 'Este conjunto já está salvo. Troque alguma peça para salvar um novo.'
  if (count === 0) return 'Deslize cada fileira e toque nas peças para escolher.'
  if (count < MIN_SLOTS) return `${count} de ${MAX_SLOTS} espaços. Falta mais um para poder ${action}.`
  return `${count} de ${MAX_SLOTS} espaços preenchidos`
}

// Se `outfit` vier preenchido, a tela funciona em modo edição.
// Se `logDate` ('AAAA-MM-DD') vier preenchido, funciona em modo registro: em vez de
// salvar um conjunto, registra no calendário o look usado naquele dia.
export default function BuildOutfit({ outfit, logDate, onDone, onLogged, onAddItem }) {
  const editing = !!outfit
  const logMode = !!logDate

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [pick, setPick] = useState(() => (outfit ? pickOfOutfit(outfit) : EMPTY_PICK))
  const [occasions, setOccasions] = useState(outfit?.occasions ?? [])
  const [asking, setAsking] = useState(false)
  const [name, setName] = useState(outfit?.name ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // "Me surpreenda"
  const [savedOutfits, setSavedOutfits] = useState([])
  const [locked, setLocked] = useState({}) // por espaço, o id da peça travada
  const [surpriseOccasion, setSurpriseOccasion] = useState(null) // null = Qualquer
  const [notice, setNotice] = useState(null) // { text, offerFree }
  const [rolling, setRolling] = useState(false)
  const [savedKey, setSavedKey] = useState(null) // combinação que veio de um conjunto salvo
  const [savedId, setSavedId] = useState(null) // e de qual conjunto ela veio
  const rollTimer = useRef(null)

  // "Usei hoje" / registro no calendário
  const [logging, setLogging] = useState(false)
  const [loggedKey, setLoggedKey] = useState(null) // combinação já registrada hoje nesta tela
  const [logError, setLogError] = useState('')
  const toast = useToast()

  useEffect(() => () => clearInterval(rollTimer.current), [])

  useEffect(() => {
    // conjuntos salvos, para o sorteio por ocasião (se falhar, a tela segue sem eles)
    supabase
      .from('outfits')
      .select('id, name, occasions, outfit_items(slot, item:items(id, image_url, category, color, rating))')
      .then(({ data, error }) => {
        if (error) console.error(error)
        else setSavedOutfits(data)
      })

    supabase
      .from('items')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error(error)
          setLoadError(true)
        } else {
          setItems(data)
        }
        setLoading(false)
      })
  }, [])

  const groups = useMemo(() => groupBySlot(items), [items])
  const count = filledSlots(pick)
  // calculada a cada escolha; nunca vai para o banco
  const rating = outfitRating(Object.values(pick))
  // sorteou um conjunto salvo e não mexeu: salvar criaria uma cópia igual
  const alreadySaved = !editing && savedKey !== null && pickKey(pick) === savedKey
  const canSave = count >= MIN_SLOTS && !alreadySaved && !rolling

  // Mostra o resultado do sorteio. Antes, os espaços que vão mudar trocam de peça
  // algumas vezes bem rápido; quem pediu menos movimento vê o resultado direto.
  function reveal(result) {
    const moving = SLOTS.map((s) => s.key).filter(
      (slot) => result[slot] && result[slot].id !== pick[slot]?.id && groups[slot].length > 1
    )
    if (moving.length === 0 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setPick(result)
      return
    }
    setRolling(true)
    let frame = 0
    rollTimer.current = setInterval(() => {
      frame++
      if (frame > ROLL_FRAMES) {
        clearInterval(rollTimer.current)
        setPick(result)
        setRolling(false)
        return
      }
      const shuffled = { ...result }
      for (const slot of moving) {
        shuffled[slot] = groups[slot][Math.floor(Math.random() * groups[slot].length)]
      }
      setPick(shuffled)
    }, ROLL_MS)
  }

  // Sorteio livre: uma peça por espaço, ponderado pela nota (regras em utils/surprise.js).
  function surpriseFree() {
    const { pick: drawn, missing } = surprisePick({ groups, pick, locked })
    if (missing.length === 0) {
      setNotice(null)
    } else {
      const what = andList.format(missing.map((slot) => MISSING_LABEL[slot]))
      setNotice({
        text:
          filledSlots(drawn) >= MIN_SLOTS
            ? `Você ainda não cadastrou ${what}. Sorteei o que dava.`
            : `Você ainda não cadastrou ${what}, então ainda não dá para fechar um conjunto.`,
      })
    }
    setSavedKey(null)
    reveal(drawn)
  }

  // Com ocasião escolhida: sorteia um dos conjuntos salvos com aquela tag.
  function surpriseFromSaved() {
    const { outfit: drawn, pick: drawnPick, tagged } = surpriseSaved({
      outfits: savedOutfits.filter((o) => o.id !== outfit?.id),
      occasion: surpriseOccasion,
      pick,
      locked,
    })
    if (!drawn) {
      setNotice({
        text:
          tagged === 0
            ? `Você ainda não salvou nenhum conjunto de ${surpriseOccasion}.`
            : `Nenhum conjunto salvo de ${surpriseOccasion} usa as peças travadas.`,
        offerFree: true,
      })
      return
    }
    setNotice({ text: `Saiu dos seus conjuntos salvos: ${drawn.name || 'Conjunto sem nome'}.` })
    setSavedKey(pickKey(drawnPick))
    setSavedId(drawn.id)
    reveal(drawnPick)
  }

  function chooseSurpriseOccasion(occasion) {
    setSurpriseOccasion(occasion)
    setNotice(null)
  }

  function toggleLock(slot) {
    setLocked((l) => ({ ...l, [slot]: isLocked(pick, l, slot) ? null : pick[slot].id }))
  }

  // só importa na edição: há algo diferente do que está salvo?
  const dirty =
    editing &&
    (pickKey(pick) !== pickKey(pickOfOutfit(outfit)) ||
      occasionsKey(occasions) !== occasionsKey(outfit.occasions ?? []) ||
      name.trim() !== (outfit.name ?? ''))

  function toggleOccasion(occasion) {
    setOccasions((list) => (list.includes(occasion) ? list.filter((o) => o !== occasion) : [...list, occasion]))
  }

  async function createOutfit() {
    // 1) cria o conjunto (user_id e is_favorite vêm do padrão do banco)
    const { data: created, error: outfitError } = await supabase
      .from('outfits')
      .insert({ name: name.trim() || null, occasions })
      .select('id')
      .single()
    if (outfitError) return outfitError

    // 2) liga as peças escolhidas, cada uma no seu espaço
    const rows = rowsOfPick(pick).map((row) => ({ ...row, outfit_id: created.id }))
    const { error: itemsError } = await supabase.from('outfit_items').insert(rows)
    if (itemsError) {
      // não deixa um conjunto vazio para trás
      const { error: undoError } = await supabase.from('outfits').delete().eq('id', created.id)
      if (undoError) console.error(undoError)
    }
    return itemsError
  }

  // Nome, ocasiões e peças mudam juntos numa transação no banco (função update_outfit):
  // ou salva tudo, ou o conjunto fica como estava. Favorito e data de criação não mudam.
  async function updateOutfit() {
    const { error: rpcError } = await supabase.rpc('update_outfit', {
      p_outfit_id: outfit.id,
      p_name: name,
      p_occasions: occasions,
      p_items: rowsOfPick(pick),
    })
    return rpcError
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!canSave || saving) return
    setSaving(true)
    setError('')

    const saveError = await (editing ? updateOutfit() : createOutfit())
    if (saveError) {
      console.error(saveError)
      setError(SAVE_ERROR)
      setSaving(false)
      return
    }
    onDone()
  }

  const canLog = count >= MIN_SLOTS && !rolling && !logging
  const loggedToday = loggedKey !== null && pickKey(pick) === loggedKey

  // Registra no calendário as peças que estão nos espaços, sem precisar salvar o conjunto.
  // No modo registro vale o dia escolhido no calendário; fora dele, hoje.
  async function handleLog() {
    if (!canLog) return
    if (loggedToday && !window.confirm('Você já registrou este look hoje. Registrar de novo?')) return
    setLogging(true)
    setLogError('')

    // conjunto de origem (só informativo): vale enquanto as peças forem as dele
    const key = pickKey(pick)
    let outfitId = null
    if (editing && key === pickKey(pickOfOutfit(outfit))) outfitId = outfit.id
    else if (savedKey !== null && key === savedKey) outfitId = savedId

    const { error: rpcError } = await logOutfit({ wornOn: logDate ?? todayLocal(), pick, outfitId })
    setLogging(false)
    if (rpcError) {
      console.error(rpcError)
      setLogError(LOG_ERROR)
      return
    }
    if (logMode) {
      onLogged(logDate)
    } else {
      setLoggedKey(key)
      toast.show('Look de hoje registrado ♥')
    }
  }

  function handleLeave() {
    if (dirty && !window.confirm('Sair sem salvar? As alterações neste conjunto serão perdidas.')) return
    onDone()
  }

  function closeDialog() {
    if (saving) return
    setAsking(false)
    setError('')
  }

  return (
    <div className="page page-narrow">
      <h1>{logMode ? 'Registrar look' : editing ? 'Editar conjunto' : 'Montar conjunto'}</h1>
      {logMode && <p className="muted log-day">O que você usou em {formatDay(logDate)}?</p>}
      {loading && <p className="muted">Carregando suas peças...</p>}
      {loadError && (
        <p className="msg msg-error" role="alert">
          Não deu para carregar suas peças agora. Tente de novo em instantes.
        </p>
      )}

      {!loading && !loadError && items.length === 0 && (
        <div className="empty">
          <Hanger size={40} />
          <h2>Ainda não há peças para combinar.</h2>
          <p>Adicione algumas peças ao guarda-roupa e volte para montar o primeiro conjunto.</p>
          <button className="btn btn-primary" style={{ marginTop: 'var(--space-4)' }} onClick={onAddItem}>
            Adicionar peça
          </button>
        </div>
      )}

      {items.length > 0 && (
        <>
          <div className="outfit-bar">
            <div className="outfit-bar-info" aria-live="polite">
              {rolling ? (
                <strong>Sorteando...</strong>
              ) : rating === null ? (
                <strong>Sem nota por enquanto</strong>
              ) : (
                <OutfitRating value={rating} />
              )}
              <span className="small muted">
                {logMode ? statusText(count, false, 'registrar') : statusText(count, alreadySaved, 'salvar')}
              </span>
            </div>
            {logMode ? (
              <button className="btn btn-primary btn-sm" disabled={!canLog} onClick={handleLog}>
                {logging ? 'Registrando...' : 'Registrar'}
              </button>
            ) : (
              <button className="btn btn-primary btn-sm" disabled={!canSave} onClick={() => setAsking(true)}>
                Salvar
              </button>
            )}
          </div>

          {logError && (
            <p className="msg msg-error" role="alert">
              {logError}
            </p>
          )}

          <section className="surprise" aria-label="Me surpreenda">
            <div className="chip-row" role="group" aria-label="Sortear por ocasião">
              <Chip selected={surpriseOccasion === null} onClick={() => chooseSurpriseOccasion(null)}>
                Qualquer
              </Chip>
              {OCCASIONS.map((o) => (
                <Chip key={o} selected={surpriseOccasion === o} onClick={() => chooseSurpriseOccasion(o)}>
                  {o}
                </Chip>
              ))}
            </div>
            <button
              className="btn btn-surprise btn-block"
              disabled={rolling}
              onClick={surpriseOccasion ? surpriseFromSaved : surpriseFree}
            >
              <Sparkles /> Me surpreenda
            </button>
            <p className="field-hint">
              {surpriseOccasion
                ? `Sorteia um dos seus conjuntos salvos de ${surpriseOccasion}.`
                : 'Sorteia peças do guarda-roupa. Use o cadeado para manter as que você já escolheu.'}
            </p>
            {notice && (
              <div className="msg msg-ok" role="status">
                {notice.text}
                {notice.offerFree && (
                  <button className="link-btn" onClick={surpriseFree}>
                    Sortear peças do guarda-roupa
                  </button>
                )}
              </div>
            )}
          </section>

          <div className={rolling ? 'rolling' : undefined}>
            {SLOTS.map((slot) => (
              <SlotCarousel
                key={slot.key}
                slot={slot}
                items={groups[slot.key]}
                selected={pick[slot.key]}
                locked={isLocked(pick, locked, slot.key)}
                takenByDress={!!pick.dress && (slot.key === 'top' || slot.key === 'bottom')}
                onPick={(item) => setPick((p) => pickItem(p, slot.key, item))}
                onClear={() => setPick((p) => ({ ...p, [slot.key]: null }))}
                onToggleLock={() => toggleLock(slot.key)}
              />
            ))}
          </div>

          {/* as tags são do conjunto salvo; um registro do calendário não tem */}
          {!logMode && (
            <section className="slot" aria-labelledby="occasions-title">
              <div className="slot-head">
                <h2 id="occasions-title" className="slot-title">
                  Ocasião
                </h2>
              </div>
              <div className="chips">
                {OCCASIONS.map((o) => (
                  <Chip key={o} selected={occasions.includes(o)} onClick={() => toggleOccasion(o)}>
                    {o}
                  </Chip>
                ))}
              </div>
              <p className="field-hint">Opcional. Pode marcar mais de uma.</p>
            </section>
          )}
        </>
      )}

      <div className="actions">
        {!logMode && items.length > 0 && (
          <div>
            <button className="btn btn-soft btn-block" disabled={!canLog} onClick={handleLog}>
              {logging ? 'Registrando...' : loggedToday ? 'Registrado hoje ♥' : 'Usei hoje'}
            </button>
            <p className="field-hint">
              Marca no calendário as peças que estão na tela, sem precisar salvar o conjunto.
            </p>
          </div>
        )}
        <button className="btn btn-outline btn-block" onClick={handleLeave}>
          {logMode ? 'Voltar para o calendário' : editing ? 'Cancelar' : 'Voltar para meus conjuntos'}
        </button>
      </div>

      <Toast message={toast.message} />

      {asking && (
        <div className="overlay" onClick={closeDialog}>
          <form
            className="sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="save-outfit-title"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.key === 'Escape' && closeDialog()}
            onSubmit={handleSave}
          >
            <h2 id="save-outfit-title">{editing ? 'Salvar alterações' : 'Salvar conjunto'}</h2>
            <label className="field" style={{ marginTop: 'var(--space-4)' }}>
              <span className="field-label">Nome do conjunto (opcional)</span>
              <input
                className="input"
                type="text"
                placeholder="Ex.: Passeio de domingo"
                maxLength={60}
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </label>

            {error && (
              <p className="msg msg-error" role="alert">
                {error}
              </p>
            )}

            <div className="actions">
              <button type="submit" className="btn btn-primary btn-block" disabled={saving}>
                {saving ? 'Salvando...' : editing ? 'Salvar alterações' : 'Salvar conjunto'}
              </button>
              <button type="button" className="btn btn-outline btn-block" disabled={saving} onClick={closeDialog}>
                Voltar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
