import { useRef, useState } from 'react'
import { removeBackground } from '@imgly/background-removal'
import { supabase } from '../lib/supabase'
import { pathFromUrl } from '../utils/storage'

const CATEGORIES = [
  'Camiseta', 'Blusa', 'Regata', 'Casaco', 'Calça', 'Short',
  'Saia', 'Vestido', 'Tênis', 'Sapato', 'Sandália', 'Acessório',
]

const COLORS = [
  { name: 'Preto', hex: '#1a1a1a' },
  { name: 'Branco', hex: '#ffffff' },
  { name: 'Cinza', hex: '#9e9e9e' },
  { name: 'Bege', hex: '#e8d5b7' },
  { name: 'Marrom', hex: '#7b4a2d' },
  { name: 'Vermelho', hex: '#e03131' },
  { name: 'Rosa', hex: '#ff8fb8' },
  { name: 'Laranja', hex: '#f08c00' },
  { name: 'Amarelo', hex: '#fcc419' },
  { name: 'Verde', hex: '#2f9e44' },
  { name: 'Azul', hex: '#1c7ed6' },
  { name: 'Roxo', hex: '#7048e8' },
  { name: 'Jeans', hex: '#4a6fa5' },
]

async function resizeImage(file, maxSize = 1024) {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9))
}

// Se `item` vier preenchido, a tela funciona em modo edição.
export default function AddItem({ session, item, onGoCloset }) {
  const editing = !!item

  const [originalUrl, setOriginalUrl] = useState(null)
  const [resultUrl, setResultUrl] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [useOriginal, setUseOriginal] = useState(false)
  const [category, setCategory] = useState(item?.category ?? '')
  const [color, setColor] = useState(item?.color ?? '')
  const [rating, setRating] = useState(item?.rating ?? 0)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const originalBlob = useRef(null)
  const resultBlob = useRef(null)
  const jobId = useRef(0)

  async function handleFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    const id = ++jobId.current
    setMessage('')
    setResultUrl(null)
    setUseOriginal(false)
    resultBlob.current = null

    const small = await resizeImage(file)
    originalBlob.current = small
    setOriginalUrl(URL.createObjectURL(small))
    setProcessing(true)

    // dá um respiro para a tela mostrar o aviso antes do cálculo pesado
    await new Promise((r) => setTimeout(r, 50))

    try {
      const blob = await removeBackground(small)
      if (id !== jobId.current) return // ela trocou de foto ou cancelou
      resultBlob.current = blob
      setResultUrl(URL.createObjectURL(blob))
    } catch (err) {
      console.error(err)
      if (id === jobId.current) {
        setMessage('Não consegui remover o fundo. Tire outra foto ou salve sem remover.')
      }
    } finally {
      if (id === jobId.current) setProcessing(false)
    }
  }

  // descarta só a foto nova (mantém categoria, cor e estrelas)
  function discardPhoto() {
    jobId.current++
    setOriginalUrl(null)
    setResultUrl(null)
    setProcessing(false)
    setUseOriginal(false)
    originalBlob.current = null
    resultBlob.current = null
  }

  // limpa tudo (usado depois de salvar uma peça nova)
  function resetAll() {
    discardPhoto()
    setCategory('')
    setColor('')
    setRating(0)
  }

  function handleCancel() {
    jobId.current++ // ignora qualquer remoção de fundo em andamento
    onGoCloset() // a tela é desmontada e nada é salvo
  }

  const hasNewPhoto = !!originalUrl
  const photoReady = useOriginal || (!!resultUrl && !processing)
  const photoOk = editing ? !hasNewPhoto || photoReady : hasNewPhoto && photoReady
  const canSave = photoOk && category && color && rating > 0 && !saving
  const blocked = processing && !useOriginal
  const showEditor = editing || hasNewPhoto

  const shownUrl = hasNewPhoto
    ? useOriginal || !resultUrl
      ? originalUrl
      : resultUrl
    : item?.image_url

  async function handleSave(andAnother) {
    setSaving(true)
    setMessage('')

    try {
      let imageUrl = item?.image_url

      if (hasNewPhoto) {
        const blob = useOriginal ? originalBlob.current : resultBlob.current
        const ext = useOriginal ? 'jpg' : 'png'
        const contentType = useOriginal ? 'image/jpeg' : 'image/png'
        const fileId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
        const path = `${session.user.id}/${fileId}.${ext}`

        const { error: upError } = await supabase.storage
          .from('wardrobe')
          .upload(path, blob, { contentType })
        if (upError) throw new Error('Erro ao enviar a foto: ' + upError.message)

        imageUrl = supabase.storage.from('wardrobe').getPublicUrl(path).data.publicUrl
      }

      if (editing) {
        const { error: dbError } = await supabase
          .from('items')
          .update({ image_url: imageUrl, category, color, rating })
          .eq('id', item.id)
        if (dbError) throw new Error('Erro ao salvar a peça: ' + dbError.message)

        // se trocou a foto, apaga a antiga do Storage (sem travar se falhar)
        if (hasNewPhoto) {
          const oldPath = pathFromUrl(item.image_url)
          if (oldPath) {
            const { error: rmError } = await supabase.storage.from('wardrobe').remove([oldPath])
            if (rmError) console.error(rmError)
          }
        }
        onGoCloset()
      } else {
        const { error: dbError } = await supabase
          .from('items')
          .insert({ image_url: imageUrl, category, color, rating })
        if (dbError) throw new Error('Erro ao salvar a peça: ' + dbError.message)

        resetAll()
        if (andAnother) setMessage('Peça salva! ✅ Pode tirar a próxima.')
        else onGoCloset()
      }
    } catch (err) {
      console.error(err)
      setMessage(err.message)
    } finally {
      setSaving(false)
    }
  }

  const pickBtn = {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    border: 'none',
    background: '#ff8fb8',
    fontSize: 16,
    textAlign: 'center',
    cursor: 'pointer',
  }
  const chip = (active) => ({
    padding: '8px 12px',
    borderRadius: 20,
    border: active ? '2px solid #d6336c' : '1px solid #ccc',
    background: active ? '#ffe3ee' : '#fff',
    fontSize: 15,
    cursor: 'pointer',
  })

  const pickButtons = (
    <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
      <label style={pickBtn}>
        📷 {editing ? 'Trocar foto' : 'Tirar foto'}
        <input type="file" accept="image/*" capture="environment" onChange={handleFile} hidden />
      </label>
      <label style={{ ...pickBtn, background: '#ffe3ee' }}>
        🖼️ Galeria
        <input type="file" accept="image/*" onChange={handleFile} hidden />
      </label>
    </div>
  )

  return (
    <div style={{ padding: 16, paddingBottom: 90, maxWidth: 480, margin: '0 auto' }}>
      <h2>{editing ? 'Editar peça' : 'Adicionar peça'}</h2>

      {!showEditor && (
        <>
          {pickButtons}
          <p style={{ color: '#666', fontSize: 14 }}>
            Dica: abra a peça sobre uma superfície lisa de cor diferente (peça clara em fundo escuro,
            peça escura em fundo claro) e deixe uma margem em volta.
          </p>
        </>
      )}

      {showEditor && (
        <>
          <div
            style={{
              background: '#fff0f6',
              borderRadius: 12,
              padding: 8,
              textAlign: 'center',
              position: 'relative',
            }}
          >
            <img
              src={shownUrl}
              style={{ maxWidth: '100%', maxHeight: 320, borderRadius: 8, opacity: processing ? 0.5 : 1 }}
            />
            {processing && !useOriginal && (
              <p style={{ margin: 4 }}>
                ✨ Removendo o fundo... só um instante, as opções liberam em seguida
              </p>
            )}
          </div>

          {!hasNewPhoto && editing && pickButtons}

          {hasNewPhoto && (
            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              <button style={chip(false)} onClick={discardPhoto}>
                {editing ? '↩️ Voltar à foto atual' : '🔄 Tirar outra foto'}
              </button>
              {!useOriginal && (
                <button style={chip(false)} onClick={() => setUseOriginal(true)}>
                  Salvar sem remover fundo
                </button>
              )}
              {useOriginal && (
                <button style={chip(false)} onClick={() => setUseOriginal(false)}>
                  Usar versão sem fundo
                </button>
              )}
            </div>
          )}

          <div style={{ opacity: blocked ? 0.35 : 1, pointerEvents: blocked ? 'none' : 'auto' }}>
            <h4>Categoria</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {CATEGORIES.map((c) => (
                <button key={c} style={chip(category === c)} onClick={() => setCategory(c)}>
                  {c}
                </button>
              ))}
            </div>

            <h4>Cor</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {COLORS.map((c) => (
                <button
                  key={c.name}
                  title={c.name}
                  aria-label={c.name}
                  onClick={() => setColor(c.name)}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: c.hex,
                    border: color === c.name ? '3px solid #d6336c' : '1px solid #bbb',
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>
            {color && <p style={{ margin: '6px 0 0' }}>{color}</p>}

            <h4>Quanto você gosta?</h4>
            <div>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setRating(n)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: 36,
                    cursor: 'pointer',
                    color: n <= rating ? '#fcc419' : '#ccc',
                  }}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            {editing ? (
              <button
                style={{ ...pickBtn, opacity: canSave ? 1 : 0.4 }}
                disabled={!canSave}
                onClick={() => handleSave(false)}
              >
                {saving ? 'Salvando...' : 'Salvar alterações'}
              </button>
            ) : (
              <>
                <button
                  style={{ ...pickBtn, opacity: canSave ? 1 : 0.4 }}
                  disabled={!canSave}
                  onClick={() => handleSave(true)}
                >
                  {saving ? 'Salvando...' : 'Salvar e tirar outra'}
                </button>
                <button
                  style={{ ...pickBtn, background: '#ffe3ee', opacity: canSave ? 1 : 0.4 }}
                  disabled={!canSave}
                  onClick={() => handleSave(false)}
                >
                  Salvar
                </button>
              </>
            )}
          </div>

          <button
            style={{
              width: '100%',
              marginTop: 10,
              padding: 12,
              borderRadius: 10,
              border: '1px solid #ccc',
              background: '#fff',
              fontSize: 16,
              cursor: 'pointer',
            }}
            disabled={saving}
            onClick={handleCancel}
          >
            Cancelar
          </button>
        </>
      )}

      {message && (
        <p style={{ color: message.startsWith('Peça salva') ? 'green' : 'crimson' }}>{message}</p>
      )}
    </div>
  )
}