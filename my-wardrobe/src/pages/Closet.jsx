import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { pathFromUrl } from '../utils/storage'

export default function Closet({ onEdit }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase
      .from('items')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error) setItems(data)
        setLoading(false)
      })
  }, [])

  async function handleDelete() {
    if (!window.confirm('Excluir esta peça? Isso não pode ser desfeito.')) return
    setDeleting(true)
    setError('')

    // 1) apaga a linha da tabela (some da lista)
    const { error: dbError } = await supabase.from('items').delete().eq('id', selected.id)
    if (dbError) {
      setError('Erro ao excluir: ' + dbError.message)
      setDeleting(false)
      return
    }

    // 2) apaga o arquivo da foto no Storage (sem travar se falhar)
    const path = pathFromUrl(selected.image_url)
    if (path) {
      const { error: rmError } = await supabase.storage.from('wardrobe').remove([path])
      if (rmError) console.error(rmError)
    }

    setItems((prev) => prev.filter((i) => i.id !== selected.id))
    setSelected(null)
    setDeleting(false)
  }

  const sheetBtn = {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    border: 'none',
    fontSize: 16,
    cursor: 'pointer',
  }

  return (
    <div style={{ padding: 16, paddingBottom: 90 }}>
      <h2>Meu guarda-roupa</h2>
      {loading && <p>Carregando...</p>}
      {!loading && items.length === 0 && <p>Nenhuma peça ainda. Adicione a primeira! 👗</p>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        {items.map((it) => (
          <div
            key={it.id}
            onClick={() => {
              setError('')
              setSelected(it)
            }}
            style={{
              background: '#fff0f6',
              borderRadius: 12,
              padding: 8,
              textAlign: 'center',
              cursor: 'pointer',
            }}
          >
            <img src={it.image_url} style={{ width: '100%', height: 150, objectFit: 'contain' }} />
            <div style={{ fontSize: 14 }}>
              {it.category} · {it.color}
            </div>
            <div style={{ color: '#fcc419' }}>
              {'★'.repeat(it.rating)}
              <span style={{ color: '#ddd' }}>{'★'.repeat(5 - it.rating)}</span>
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <div
          onClick={() => !deleting && setSelected(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            zIndex: 10,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff',
              width: '100%',
              maxWidth: 480,
              borderRadius: '16px 16px 0 0',
              padding: 16,
              boxSizing: 'border-box',
            }}
          >
            <div style={{ background: '#fff0f6', borderRadius: 12, padding: 8, textAlign: 'center' }}>
              <img
                src={selected.image_url}
                style={{ maxWidth: '100%', maxHeight: 280, objectFit: 'contain' }}
              />
            </div>
            <p style={{ textAlign: 'center', margin: '8px 0' }}>
              {selected.category} · {selected.color} ·{' '}
              <span style={{ color: '#fcc419' }}>{'★'.repeat(selected.rating)}</span>
            </p>

            {error && <p style={{ color: 'crimson' }}>{error}</p>}

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                style={{ ...sheetBtn, background: '#ff8fb8' }}
                disabled={deleting}
                onClick={() => onEdit(selected)}
              >
                ✏️ Editar
              </button>
              <button
                style={{ ...sheetBtn, background: '#ffe3e3', color: '#c92a2a' }}
                disabled={deleting}
                onClick={handleDelete}
              >
                {deleting ? 'Excluindo...' : '🗑️ Excluir'}
              </button>
            </div>
            <button
              style={{ ...sheetBtn, width: '100%', marginTop: 10, background: '#f1f3f5' }}
              disabled={deleting}
              onClick={() => setSelected(null)}
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}