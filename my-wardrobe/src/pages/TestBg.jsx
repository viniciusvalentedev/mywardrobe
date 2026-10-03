import { useState } from 'react'
import { removeBackground } from '@imgly/background-removal'

async function resizeImage(file, maxSize = 1024) {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9))
}

export default function TestBg() {
  const [original, setOriginal] = useState(null)
  const [result, setResult] = useState(null)
  const [status, setStatus] = useState('Escolha uma foto de roupa')
  const [seconds, setSeconds] = useState(null)
  const [bg, setBg] = useState('#ffd6e7')

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return

    setOriginal(URL.createObjectURL(file))
    setResult(null)
    setSeconds(null)
    setStatus('Processando... (na primeira vez baixa o modelo, pode demorar)')

    const start = performance.now()
    try {
      const small = await resizeImage(file)
      const blob = await removeBackground(small, {
        progress: (key, current, total) => {
          const pct = total ? Math.round((current / total) * 100) : 0
          setStatus(`${key}: ${pct}%`)
        },
      })
      setResult(URL.createObjectURL(blob))
      setSeconds(((performance.now() - start) / 1000).toFixed(1))
      setStatus('Pronto!')
    } catch (err) {
      console.error(err)
      setStatus('Erro: ' + err.message)
    }
  }

  const box = {
    flex: 1,
    minWidth: 0,
    borderRadius: 12,
    padding: 8,
    textAlign: 'center',
    border: '1px solid #ccc',
  }
  const img = { width: '100%', borderRadius: 8 }

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: 16, fontFamily: 'sans-serif' }}>
      <h2>Teste: remover fundo</h2>

      <input type="file" accept="image/*" onChange={handleFile} />

      <p>{status}</p>
      {seconds && <p><b>Tempo:</b> {seconds}s</p>}

      <label>
        Cor de fundo do resultado:{' '}
        <input type="color" value={bg} onChange={(e) => setBg(e.target.value)} />
      </label>

      <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
        <div style={box}>
          <p>Antes</p>
          {original && <img src={original} style={img} />}
        </div>
        <div style={{ ...box, background: bg }}>
          <p>Depois</p>
          {result && <img src={result} style={img} />}
        </div>
      </div>
    </div>
  )
}