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
        setMessage('Usuário ou senha não conferem. Confira e tente de novo.')
      } else if (error.message.includes('already registered')) {
        setMessage('Esse nome de usuário já existe.')
      } else {
        setMessage(error.message)
      }
    }
    setLoading(false)
  }

  return (
    <div className="auth">
      <div className="auth-brand">
        <img className="brand-mark" src="/my-wardrobe-mark.svg" alt="" />
        <span className="brand-name">My Wardrobe</span>
      </div>

      <div className="auth-panel">
        <h1>{mode === 'login' ? 'Que bom te ver por aqui' : 'Vamos começar'}</h1>
        <p>{mode === 'login' ? 'Entre na sua conta' : 'Crie sua conta'}</p>

        <form onSubmit={handleSubmit}>
          <label className="field">
            <span className="field-label">Nome de usuário</span>
            <input
              className="input"
              type="text"
              placeholder="Ex.: gigi"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoCapitalize="none"
              autoCorrect="off"
              required
            />
          </label>
          <label className="field">
            <span className="field-label">Senha</span>
            <input
              className="input"
              type="password"
              placeholder="Mínimo de 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </label>
          <button className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Aguarde um instante...' : mode === 'login' ? 'Entrar' : 'Criar minha conta'}
          </button>
        </form>

        {message && (
          <p className="msg msg-error" role="alert">
            {message}
          </p>
        )}

        <p className="auth-switch">
          {mode === 'login' ? 'Ainda não tem conta? ' : 'Já tem conta? '}
          <button
            type="button"
            className="link-btn"
            onClick={() => {
              setMode(mode === 'login' ? 'signup' : 'login')
              setMessage('')
            }}
          >
            {mode === 'login' ? 'Cadastre-se' : 'Entrar'}
          </button>
        </p>
      </div>
    </div>
  )
}
