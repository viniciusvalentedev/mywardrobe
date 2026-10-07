import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Login from './pages/Login'
import Closet from './pages/Closet'
import AddItem from './pages/AddItem'
import Brand from './components/Brand'
import { Hanger, Plus } from './components/icons'

export default function App() {
  const [session, setSession] = useState(undefined)
  const [tab, setTab] = useState('closet')
  const [editing, setEditing] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => listener.subscription.unsubscribe()
  }, [])

  if (session === undefined) return <p className="page muted">Carregando...</p>
  if (!session) return <Login />

  function goCloset() {
    setEditing(null)
    setTab('closet')
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
