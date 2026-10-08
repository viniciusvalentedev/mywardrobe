import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Login from './pages/Login'
import Closet from './pages/Closet'
import AddItem from './pages/AddItem'
import Outfits from './pages/Outfits'
import BuildOutfit from './pages/BuildOutfit'
import Calendar from './pages/Calendar'
import Stats from './pages/Stats'
import Brand from './components/Brand'
import { CalendarIcon, Hanger, Plus, Shirt } from './components/icons'

// Estatísticas é a única tela com endereço próprio: abre por link direto e
// entra no histórico do navegador, para o botão voltar cair no Calendário.
const STATS_HASH = '#/estatisticas'
const onStatsUrl = () => window.location.hash === STATS_HASH
const clearStatsUrl = () => window.history.replaceState(null, '', window.location.pathname + window.location.search)

export default function App() {
  const [session, setSession] = useState(undefined)
  const [tab, setTab] = useState(() => (onStatsUrl() ? 'stats' : 'closet'))
  const [editing, setEditing] = useState(null)
  const [editingOutfit, setEditingOutfit] = useState(null)
  // calendário: dia que a tela de montar vai registrar, dia a reabrir na volta e aviso da volta
  const [logDate, setLogDate] = useState(null)
  const [calendarDay, setCalendarDay] = useState(null)
  const [calendarToast, setCalendarToast] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => listener.subscription.unsubscribe()
  }, [])

  // Voltar/avançar do navegador: o endereço decide se Estatísticas está aberta.
  // Sair dela pelo voltar cai no Calendário, que é a seção dela.
  useEffect(() => {
    function onPop() {
      setTab((current) => (onStatsUrl() ? 'stats' : current === 'stats' ? 'calendar' : current))
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  // Saiu de Estatísticas por outro caminho (barra de abas): o endereço dela não fica para trás.
  useEffect(() => {
    if (tab !== 'stats' && onStatsUrl()) clearStatsUrl()
  }, [tab])

  if (session === undefined) return <p className="page muted">Carregando...</p>
  if (!session) return <Login />

  function goCloset() {
    setEditing(null)
    setTab('closet')
  }

  function goCalendar() {
    setEditing(null)
    setCalendarDay(null)
    setCalendarToast('')
    setTab('calendar')
  }

  function openStats() {
    window.history.pushState({ fromCalendar: true }, '', STATS_HASH)
    setTab('stats')
  }

  // "← Calendário": se ela veio do calendário, é o mesmo que o voltar do navegador
  // (não deixa Estatísticas sobrando no histórico); por link direto, só troca a tela.
  function leaveStats() {
    if (window.history.state?.fromCalendar) window.history.back()
    else goCalendar()
  }

  return (
    <div className="app">
      <header className="header">
        <Brand />
        <button className="btn btn-outline btn-sm" onClick={() => supabase.auth.signOut()}>
          Sair ({session.user.user_metadata?.username})
        </button>
      </header>

      <main>
        {tab === 'closet' && (
          <Closet
            key="closet"
            onEdit={(item) => {
              setEditing(item)
              setTab('edit')
            }}
          />
        )}
        {tab === 'outfits' && (
          <Outfits
            key="outfits"
            onBuild={() => {
              setEditingOutfit(null)
              setLogDate(null)
              setTab('build')
            }}
            onEdit={(outfit) => {
              setEditingOutfit(outfit)
              setLogDate(null)
              setTab('build')
            }}
          />
        )}
        {tab === 'build' && (
          <BuildOutfit
            key={logDate ? `log-${logDate}` : (editingOutfit?.id ?? 'build')}
            outfit={editingOutfit}
            logDate={logDate}
            onDone={() => setTab(logDate ? 'calendar' : 'outfits')}
            onLogged={() => {
              setCalendarToast('Look registrado ♥')
              setTab('calendar')
            }}
            onAddItem={() => setTab('add')}
          />
        )}
        {tab === 'calendar' && (
          <Calendar
            key="calendar"
            initialDay={calendarDay}
            initialToast={calendarToast}
            onBuild={(day) => {
              // "Montar na hora": a tela de montar abre em modo registro para esse dia
              setCalendarDay(day)
              setCalendarToast('')
              setEditingOutfit(null)
              setLogDate(day)
              setTab('build')
            }}
            onOpenStats={openStats}
          />
        )}
        {tab === 'stats' && <Stats key="stats" onGoCalendar={leaveStats} />}
        {tab === 'add' && <AddItem key="add" session={session} onGoCloset={goCloset} />}
        {tab === 'edit' && editing && (
          <AddItem key={editing.id} item={editing} session={session} onGoCloset={goCloset} />
        )}
      </main>

      <nav className="tabbar" aria-label="Navegação principal">
        <button className="tab" aria-current={tab === 'closet' ? 'page' : undefined} onClick={goCloset}>
          <Hanger /> Guarda-roupa
        </button>
        <button
          className="tab"
          aria-current={tab === 'outfits' || (tab === 'build' && !logDate) ? 'page' : undefined}
          onClick={() => {
            setEditing(null)
            setTab('outfits')
          }}
        >
          <Shirt /> Conjuntos
        </button>
        <button
          className="tab"
          aria-current={tab === 'calendar' || tab === 'stats' || (tab === 'build' && logDate) ? 'page' : undefined}
          onClick={goCalendar}
        >
          <CalendarIcon /> Calendário
        </button>
        <button
          className="tab"
          aria-current={tab === 'add' ? 'page' : undefined}
          onClick={() => {
            setEditing(null)
            setTab('add')
          }}
        >
          <Plus /> Adicionar peça
        </button>
      </nav>
    </div>
  )
}
