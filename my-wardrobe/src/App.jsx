import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Login from './pages/Login'
import Closet from './pages/Closet'
import AddItem from './pages/AddItem'

export default function App() {
  const [session, setSession] = useState(undefined)
  const [tab, setTab] = useState('closet')
  const [editing, setEditing] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => listener.subscription.unsubscribe()
  }, [])

  if (session === undefined) return <p style={{ padding: 16 }}>Carregando...</p>
  if (!session) return <Login />

  const tabStyle = (name) => ({
    flex: 1,
    padding: 14,
    border: 'none',
    background: tab === name ? '#ffe3ee' : '#fff',
    fontWeight: tab === name ? 'bold' : 'normal',
    fontSize: 15,
    cursor: 'pointer',
  })

  function goCloset() {
    setEditing(null)
    setTab('closet')
  }

  return (
    <div style={{ fontFamily: 'sans-serif' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: '8px 16px',
          background: '#ff8fb8',
        }}
      >
        <b>My Wardrobe</b>
        <button
          onClick={() => supabase.auth.signOut()}
          style={{ border: 'none', background: 'none', cursor: 'pointer' }}
        >
          Sair ({session.user.user_metadata?.username})
        </button>
      </div>

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

      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          display: 'flex',
          borderTop: '1px solid #ddd',
        }}
      >
        <button style={tabStyle('closet')} onClick={goCloset}>
          👗 Guarda-roupa
        </button>
        <button
          style={tabStyle('add')}
          onClick={() => {
            setEditing(null)
            setTab('add')
          }}
        >
          ➕ Adicionar
        </button>
      </div>
    </div>
  )
}