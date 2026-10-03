import { useState } from 'react'
import { supabase } from '../lib/supabase'

// Domínio inventado: o Supabase exige e-mail, então montamos um por trás.
// A usuária nunca vê isso.
const FAKE_DOMAIN = 'mywardrobe.app'

export default function Login() {
  const [mode, setMode] = useState('login') // 'login' ou 'signup'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const clean = username.trim().toLowerCase()
    if (!/^[a-z0-9_.]{3,20}$/.test(clean)) {
      setMessage('Usuário: 3 a 20 caracteres, só letras, números, _ ou .')
      setLoading(false)
      return
    }

    const fakeEmail = `${clean}@${FAKE_DOMAIN}`

    const { error } =
      mode === 'login'
        ? await supabase.auth.signInWithPassword({ email: fakeEmail, password })
        : await supabase.auth.signUp({
            email: fakeEmail,
            password,
            options: { data: { username: clean } },
          })

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        setMessage('Usuário ou senha incorretos.')
      } else if (error.message.includes('already registered')) {
        setMessage('Esse nome de usuário já existe.')
      } else {
        setMessage(error.message)
      }
    }
    setLoading(false)
  }

  const input = {
    display: 'block',
    width: '100%',
    boxSizing: 'border-box',
    padding: 12,
    marginBottom: 12,
    borderRadius: 8,
    border: '1px solid #ccc',
    fontSize: 16,
  }

  return (
    <div style={{ maxWidth: 360, margin: '60px auto', padding: 16, fontFamily: 'sans-serif' }}>
      <h2>My Wardrobe</h2>
      <p>{mode === 'login' ? 'Entre na sua conta' : 'Crie sua conta'}</p>

      <form onSubmit={handleSubmit}>
        <input
          style={input}
          type="text"
          placeholder="Nome de usuário"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoCapitalize="none"
          autoCorrect="off"
          required
        />
        <input
          style={input}
          type="password"
          placeholder="Senha (mínimo 6 caracteres)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          required
        />
        <button
          style={{ ...input, background: '#ff8fb8', border: 'none', cursor: 'pointer' }}
          disabled={loading}
        >
          {loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
        </button>
      </form>

      {message && <p style={{ color: 'crimson' }}>{message}</p>}

      <p>
        {mode === 'login' ? 'Ainda não tem conta? ' : 'Já tem conta? '}
        <button
          style={{ background: 'none', border: 'none', color: '#d6336c', cursor: 'pointer', fontSize: 16 }}
          onClick={() => {
            setMode(mode === 'login' ? 'signup' : 'login')
            setMessage('')
          }}
        >
          {mode === 'login' ? 'Cadastre-se' : 'Entrar'}
        </button>
      </p>
    </div>
  )
}