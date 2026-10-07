import { useRef, useState } from 'react'
import { removeBackground } from '@imgly/background-removal'
import { supabase } from '../lib/supabase'
import { pathFromUrl } from '../utils/storage'
import { Camera, Image, Star } from '../components/icons'

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
        setMessage('Não deu para remover o fundo agora. Tente outra foto ou salve sem remover.')
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
        if (upError) {
          console.error(upError)
          throw new Error('Não deu para enviar a foto agora. Tente de novo em instantes.')
        }

        imageUrl = supabase.storage.from('wardrobe').getPublicUrl(path).data.publicUrl
      }

      if (editing) {
        const { error: dbError } = await supabase
          .from('items')
          .update({ image_url: imageUrl, category, color, rating })
          .eq('id', item.id)
        if (dbError) {
          console.error(dbError)
          throw new Error('Não deu para salvar agora. Tente de novo em instantes.')
        }

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
        if (dbError) {
          console.error(dbError)
          throw new Error('Não deu para salvar agora. Tente de novo em instantes.')
        }

        resetAll()
        if (andAnother) setMessage('Peça salva com carinho. Pode adicionar a próxima.')
        else onGoCloset()
      }
    } catch (err) {
      console.error(err)
      setMessage(err.message)
    } finally {
      setSaving(false)
    }
  }

  const pickButtons = (
    <div className="btn-row">
      <label className={`btn file-btn ${editing ? 'btn-soft' : 'btn-primary'}`}>
        <Camera /> {editing ? 'Trocar foto' : 'Tirar foto'}
        <input
          className="visually-hidden"
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFile}
        />
      </label>
      <label className="btn btn-soft file-btn">
        <Image /> Escolher da galeria
        <input className="visually-hidden" type="file" accept="image/*" onChange={handleFile} />
      </label>
    </div>
  )

  return (
    <div className="page page-narrow">
      <h1>{editing ? 'Editar peça' : 'Adicionar peça'}</h1>

      {!showEditor && (
        <>
          {pickButtons}
          <p className="field-hint">
            Dica: abra a peça sobre uma superfície lisa de cor diferente (peça clara em fundo escuro,
            peça escura em fundo claro) e deixe uma margem em volta.
          </p>
        </>
      )}

      {showEditor && (
        <>
          <div className={processing ? 'photo photo-lg photo-busy' : 'photo photo-lg'}>
            <img src={shownUrl} alt="Foto da peça" />
          </div>
          {processing && !useOriginal && (
            <p className="photo-note" role="status">
              Removendo o fundo... só um instante, as opções liberam em seguida.
            </p>
          )}

          {!hasNewPhoto && editing && <div style={{ marginTop: 'var(--space-3)' }}>{pickButtons}</div>}

          {hasNewPhoto && (
            <div className="chips" style={{ marginTop: 'var(--space-3)' }}>
              <button className="chip chip-ghost" onClick={discardPhoto}>
                {editing ? 'Voltar à foto atual' : 'Tirar outra foto'}
              </button>
              {!useOriginal && (
                <button className="chip chip-ghost" onClick={() => setUseOriginal(true)}>
                  Salvar sem remover fundo
                </button>
              )}
              {useOriginal && (
                <button className="chip chip-ghost" onClick={() => setUseOriginal(false)}>
                  Usar versão sem fundo
                </button>
              )}
            </div>
          )}

          <div className={blocked ? 'gated blocked' : 'gated'}>
            <h2 className="section-title">Categoria</h2>
            <div className="chips">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  className="chip"
                  aria-pressed={category === c}
                  onClick={() => setCategory(c)}
                >
                  {c}
                </button>
              ))}
            </div>

            <h2 className="section-title">Cor</h2>
            <div className="swatches">
              {COLORS.map((c) => (
                <button
                  key={c.name}
                  className="swatch"
                  title={c.name}
                  aria-label={c.name}
                  aria-pressed={color === c.name}
                  onClick={() => setColor(c.name)}
                  style={{ background: c.hex }}
                />
              ))}
            </div>
            {color && <p style={{ margin: 'var(--space-2) 0 0' }}>{color}</p>}

            <h2 className="section-title">Quanto você gosta?</h2>
            <div className="stars" role="group" aria-label="Nota da peça">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  className="star-btn"
                  aria-label={`Nota ${n} de 5`}
                  aria-pressed={n === rating}
                  onClick={() => setRating(n)}
                >
                  <Star filled={n <= rating} />
                </button>
              ))}
            </div>
          </div>

          <div className="actions">
            {editing ? (
              <button className="btn btn-primary btn-block" disabled={!canSave} onClick={() => handleSave(false)}>
                {saving ? 'Salvando...' : 'Salvar alterações'}
              </button>
            ) : (
              <>
                <button className="btn btn-primary btn-block" disabled={!canSave} onClick={() => handleSave(false)}>
                  {saving ? 'Salvando...' : 'Salvar peça'}
                </button>
                <button className="btn btn-soft btn-block" disabled={!canSave} onClick={() => handleSave(true)}>
                  Salvar e adicionar outra
                </button>
              </>
            )}
            <button className="btn btn-outline btn-block" disabled={saving} onClick={handleCancel}>
              Cancelar
            </button>
          </div>
        </>
      )}

      {message && (
        <p
          className={message.startsWith('Peça salva') ? 'msg msg-ok' : 'msg msg-error'}
          role={message.startsWith('Peça salva') ? 'status' : 'alert'}
        >
          {message}
        </p>
      )}
    </div>
  )
}
