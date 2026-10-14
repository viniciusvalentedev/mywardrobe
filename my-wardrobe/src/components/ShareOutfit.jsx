import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Chip from './Chip'
import ShareCard from './ShareCard'
import { Share } from './icons'
import { orderedPieces, outfitRating } from '../utils/outfits'
import { SHARE_FORMATS, downloadFile, imageToDataUrl, renderShareImage, shareFileName } from '../utils/shareImage'

const LOGO_URL = '/my-wardrobe-mark.svg'

// iPad recente se apresenta como Mac; o toque denuncia
const isIos = () =>
  /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

// Painel "Compartilhar conjunto". A imagem começa a ser gerada assim que o painel abre:
// quando a pessoa toca em Compartilhar o arquivo já está pronto, e o navigator.share
// sai direto do toque (o Safari recusa se houver uma espera longa no meio).
// `outfit`: { name, occasions, outfit_items } com a peça embutida em cada vínculo.
export default function ShareOutfit({ outfit, onClose }) {
  const [format, setFormat] = useState('feed')
  const [assets, setAssets] = useState(null) // logo e fotos das peças, já em dataURL
  const [results, setResults] = useState({}) // por formato: { file, url }
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [notice, setNotice] = useState('')
  const cardRef = useRef(null)
  const urls = useRef([])

  const name = outfit.name || 'Meu conjunto'
  const pieces = orderedPieces(outfit.outfit_items)
  const rating = outfitRating(pieces.map((p) => p.item))
  const result = results[format]

  useEffect(() => {
    const created = urls.current
    return () => created.forEach((url) => URL.revokeObjectURL(url))
  }, [])

  // 1) baixa as fotos uma vez; os dois formatos usam as mesmas
  useEffect(() => {
    if (assets) return
    let cancelled = false
    const list = orderedPieces(outfit.outfit_items)
    Promise.all([imageToDataUrl(LOGO_URL), ...list.map((p) => imageToDataUrl(p.item.image_url))])
      .then(([logo, ...photos]) => {
        if (!cancelled) setAssets({ logo, photos: Object.fromEntries(list.map((p, i) => [p.slot, photos[i]])) })
      })
      .catch((error) => {
        console.error(error)
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [outfit, assets, attempt])

  // 2) com o modelo na página, gera a imagem do formato escolhido (uma vez por formato)
  useEffect(() => {
    if (!assets || result) return
    let cancelled = false
    renderShareImage(cardRef.current, SHARE_FORMATS[format])
      .then((blob) => {
        if (cancelled) return
        const url = URL.createObjectURL(blob)
        urls.current.push(url)
        const file = new File([blob], shareFileName(outfit.name), { type: 'image/png' })
        setResults((all) => ({ ...all, [format]: { file, url } }))
      })
      .catch((error) => {
        console.error(error)
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [assets, format, result, outfit, attempt])

  const shareData = result && { files: [result.file] }
  const canShare = !!shareData && !!navigator.canShare?.(shareData)

  // Sem o compartilhar do sistema: baixa o arquivo. No iPhone o caminho até as Fotos
  // é a própria imagem do painel (tocar e segurar).
  function saveInstead() {
    if (isIos()) {
      setNotice('Toque e segure a imagem acima e escolha “Salvar em Fotos”.')
    } else {
      downloadFile(result.file, result.url)
      setNotice('Imagem baixada. Procure na pasta de downloads.')
    }
  }

  async function handleShare() {
    if (!result) return
    setNotice('')
    if (!canShare) {
      saveInstead()
      return
    }
    try {
      await navigator.share(shareData)
    } catch (error) {
      if (error.name === 'AbortError') return // fechou o painel do sistema sem enviar
      console.error(error)
      saveInstead()
    }
  }

  function chooseFormat(key) {
    setFormat(key)
    setNotice('')
  }

  function retry() {
    setFailed(false)
    setAttempt((n) => n + 1)
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div
        className="sheet share-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-outfit-title"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
      >
        <h2 id="share-outfit-title">Compartilhar conjunto</h2>
        <div className="chips share-formats" role="group" aria-label="Formato da imagem">
          {Object.entries(SHARE_FORMATS).map(([key, f]) => (
            <Chip key={key} selected={format === key} onClick={() => chooseFormat(key)}>
              {f.label}
            </Chip>
          ))}
        </div>

        <div className={`share-preview share-preview-${format}`} aria-live="polite">
          {result ? (
            <img src={result.url} alt={`Imagem do conjunto ${name}`} />
          ) : failed ? (
            <p className="msg msg-error" role="alert">
              Não deu para gerar a imagem agora. Confira a conexão e tente de novo.
            </p>
          ) : (
            <p className="muted">Gerando imagem...</p>
          )}
        </div>

        {notice && (
          <p className="msg msg-ok" role="status">
            {notice}
          </p>
        )}

        <div className="actions">
          {failed && !result ? (
            <button className="btn btn-primary btn-block" onClick={retry}>
              Tentar de novo
            </button>
          ) : (
            <button className="btn btn-primary btn-block" disabled={!result} onClick={handleShare}>
              <Share /> {!result ? 'Gerando imagem...' : canShare ? 'Compartilhar' : 'Salvar imagem'}
            </button>
          )}
          <button className="btn btn-outline btn-block" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>

      {assets &&
        createPortal(
          <div className="share-offscreen" aria-hidden="true">
            <ShareCard
              cardRef={cardRef}
              format={format}
              name={name}
              occasions={outfit.occasions ?? []}
              rating={rating}
              logo={assets.logo}
              pieces={pieces.map((p) => ({
                slot: p.slot,
                src: assets.photos[p.slot],
                alt: `${p.item.category} ${p.item.color}`,
              }))}
            />
          </div>,
          document.body
        )}
    </div>
  )
}
