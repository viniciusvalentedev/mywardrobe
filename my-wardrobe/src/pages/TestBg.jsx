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

  return (
    <div className="page page-narrow" style={{ maxWidth: 700 }}>
      <h1>Teste: remover fundo</h1>

      <input className="input" type="file" accept="image/*" onChange={handleFile} />

      <p>{status}</p>
      {seconds && <p><b>Tempo:</b> {seconds}s</p>}

      <label>
        Cor de fundo do resultado:{' '}
        <input type="color" value={bg} onChange={(e) => setBg(e.target.value)} />
      </label>

      <div className="compare">
        <div>
          <p>Antes</p>
          {original && <img src={original} alt="Foto original" />}
        </div>
        <div style={{ background: bg }}>
          <p>Depois</p>
          {result && <img src={result} alt="Foto sem fundo" />}
        </div>
      </div>
    </div>
  )
}
