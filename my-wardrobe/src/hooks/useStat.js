import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// Chama uma função de estatística do banco. Cada bloco da tela usa o seu, então
// cada um carrega (e falha) sozinho.
//   days: 30, 90 ou null (tudo) para as funções com período;
//         deixe sem passar nas que olham só o guarda-roupa atual.
export function useStat(name, days) {
  const key = `${name}:${days}`
  const [result, setResult] = useState({ key: null, data: null, error: null })

  useEffect(() => {
    let stale = false
    supabase.rpc(name, days === undefined ? undefined : { p_days: days }).then(({ data, error }) => {
      if (stale) return
      if (error) console.error(error)
      setResult({ key, data, error })
    })
    return () => {
      stale = true
    }
  }, [name, days, key])

  // resposta de outro período ainda na tela = carregando
  const loading = result.key !== key
  return { loading, data: loading ? null : result.data, error: loading ? null : result.error }
}
