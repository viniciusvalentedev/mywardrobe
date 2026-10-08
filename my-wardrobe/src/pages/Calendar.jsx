import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import DaySheet from '../components/DaySheet'
import Toast from '../components/Toast'
import { ChartIcon, Chevron } from '../components/icons'
import { useToast } from '../hooks/useToast'
import { orderedPieces } from '../utils/outfits'
import { WEEKDAYS, addMonths, formatDay, formatMonth, monthCells, monthOf, monthRange, todayLocal } from '../utils/dates'

const plural = (n) => `${n} ${n === 1 ? 'look' : 'looks'}`

// Miniatura do dia: a peça de cima ou o vestido; se não houver, a primeira peça.
function thumbOf(log) {
  const pieces = orderedPieces(log.outfit_log_items)
  return (pieces.find((p) => p.slot === 'top' || p.slot === 'dress') ?? pieces[0])?.item
}

// `initialDay` reabre o calendário naquele dia (ao voltar da tela de montar).
export default function Calendar({ initialDay, initialToast, onBuild, onOpenStats }) {
  const today = todayLocal()
  const currentMonth = monthOf(today)

  const [month, setMonth] = useState(monthOf(initialDay ?? today))
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [reloads, setReloads] = useState(0)
  const [selectedDay, setSelectedDay] = useState(initialDay ?? null)
  const toast = useToast(initialToast)
  const swipe = useRef(null)

  // Busca só os looks do mês visível.
  useEffect(() => {
    let stale = false
    const [first, last] = monthRange(month)
    supabase
      .from('outfit_logs')
      .select('id, worn_on, outfit_id, created_at, outfit:outfits(name), outfit_log_items(slot, item:items(id, image_url, category, color, rating))')
      .gte('worn_on', first)
      .lte('worn_on', last)
      .order('created_at')
      .then(({ data, error }) => {
        if (stale) return
        if (error) {
          console.error(error)
          setLoadError(true)
        } else {
          setLogs(data)
          setLoadError(false)
        }
        setLoading(false)
      })
    return () => {
      stale = true
    }
  }, [month, reloads])

  const byDay = useMemo(() => {
    const map = new Map()
    for (const log of logs) {
      if (!map.has(log.worn_on)) map.set(log.worn_on, [])
      map.get(log.worn_on).push(log)
    }
    return map
  }, [logs])

  const canGoNext = month < currentMonth // o futuro ainda não tem o que mostrar

  function goMonth(step) {
    if (step > 0 && !canGoNext) return
    setLoading(true)
    setMonth((m) => addMonths(m, step))
  }

  function goToday() {
    if (month === currentMonth) return
    setLoading(true)
    setMonth(currentMonth)
  }

  // Deslizar para os lados troca de mês; rolagem vertical continua normal.
  function onTouchStart(e) {
    const t = e.touches[0]
    swipe.current = { x: t.clientX, y: t.clientY }
  }
  function onTouchEnd(e) {
    if (!swipe.current) return
    const t = e.changedTouches[0]
    const dx = t.clientX - swipe.current.x
    const dy = t.clientY - swipe.current.y
    swipe.current = null
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5) goMonth(dx < 0 ? 1 : -1)
  }

  const monthLogs = logs.filter((l) => monthOf(l.worn_on) === month)

  return (
    <div className="page page-narrow">
      <h1>Calendário</h1>

      <div className="cal-head">
        <button className="icon-btn icon-btn-edit" aria-label="Mês anterior" onClick={() => goMonth(-1)}>
          <Chevron left />
        </button>
        <h2 className="cal-title cap-first" aria-live="polite">
          {formatMonth(month)}
        </h2>
        <button className="icon-btn icon-btn-edit" aria-label="Próximo mês" disabled={!canGoNext} onClick={() => goMonth(1)}>
          <Chevron />
        </button>
      </div>

      {loadError && (
        <p className="msg msg-error" role="alert">
          Não deu para carregar o calendário agora. Tente de novo em instantes.
        </p>
      )}

      <div className="cal-weekdays" aria-hidden="true">
        {WEEKDAYS.map((w) => (
          <span key={w.long}>{w.short}</span>
        ))}
      </div>
      <div className="cal-grid" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {monthCells(month).map((day, i) => {
          if (day === null) return <span key={`vazio-${i}`} />
          const dayLogs = byDay.get(day) ?? []
          const thumb = dayLogs.length > 0 ? thumbOf(dayLogs[0]) : null
          const label = dayLogs.length > 0 ? `${formatDay(day)}, ${plural(dayLogs.length)}` : formatDay(day)
          return (
            <button
              key={day}
              className={dayLogs.length > 0 ? 'cal-day has-look' : 'cal-day'}
              aria-label={label}
              aria-current={day === today ? 'date' : undefined}
              disabled={day > today}
              onClick={() => setSelectedDay(day)}
            >
              <span className="cal-num">{Number(day.slice(8))}</span>
              {thumb ? (
                <img className="cal-thumb" src={thumb.image_url} alt="" />
              ) : (
                dayLogs.length > 0 && <span className="cal-dot" />
              )}
              {dayLogs.length > 1 && <span className="cal-count">{dayLogs.length}</span>}
            </button>
          )
        })}
      </div>

      <div className="cal-foot">
        <span className="small muted" aria-live="polite">
          {loading
            ? 'Carregando os looks do mês...'
            : monthLogs.length === 0
              ? 'Nenhum look registrado neste mês. Toque num dia para começar.'
              : `${plural(monthLogs.length)} neste mês`}
        </span>
        {month !== currentMonth && (
          <button className="btn btn-soft btn-sm" onClick={goToday}>
            Voltar para hoje
          </button>
        )}
      </div>

      <button className="stats-link" onClick={onOpenStats}>
        <span className="stats-link-icon">
          <ChartIcon />
        </span>
        <span className="stats-link-text">
          <strong>Ver estatísticas</strong>
          <span className="small">Peças mais usadas, esquecidas e suas cores</span>
        </span>
        <Chevron />
      </button>

      {selectedDay && (
        <DaySheet
          key={selectedDay}
          day={selectedDay}
          isToday={selectedDay === today}
          logs={byDay.get(selectedDay) ?? []}
          onChanged={() => setReloads((n) => n + 1)}
          onBuild={onBuild}
          onNotice={toast.show}
          onClose={() => setSelectedDay(null)}
        />
      )}

      <Toast message={toast.message} />
    </div>
  )
}
