import Stars from './Stars'
import { Heart, Sparkles } from './icons'
import { formatRating } from '../utils/outfits'

// Modelo da imagem compartilhada, em tamanho fixo (1080px de largura). Fica fora da
// tela e vira PNG em utils/shareImage.js; por isso as fotos chegam já em dataURL.
// `pieces`: peças na ordem dos espaços, cada uma com `slot`, `src` e `alt`.
export default function ShareCard({ cardRef, format, name, occasions, rating, pieces, logo }) {
  // Cima + Baixo (ou o vestido, que ocupa os dois) numa coluna; Extra e Calçado na outra.
  const main = pieces.filter((p) => ['top', 'bottom', 'dress'].includes(p.slot))
  const side = ['extra', 'shoes'].flatMap((slot) => pieces.filter((p) => p.slot === slot))
  const columns = [
    { key: 'main', list: main },
    { key: 'side', list: side },
  ].filter((column) => column.list.length > 0)

  return (
    <div ref={cardRef} className={`share-card share-card-${format}`}>
      <span className="share-blob share-blob-a" />
      <span className="share-blob share-blob-b" />
      <span className="share-blob share-blob-c" />
      <span className="share-deco share-deco-a">
        <Sparkles />
      </span>
      <span className="share-deco share-deco-b">
        <Heart filled />
      </span>

      <h2 className={name.length > 26 ? 'share-title share-title-long' : 'share-title'}>{name}</h2>

      <div className="share-pieces">
        {columns.map((column) => (
          <div key={column.key} className={`share-col share-col-${column.key}`}>
            {column.list.map((p) => (
              <div key={p.slot} className={`share-piece share-piece-${p.slot}`}>
                <img src={p.src} alt={p.alt} crossOrigin="anonymous" />
              </div>
            ))}
          </div>
        ))}
      </div>

      {(rating !== null || occasions.length > 0) && (
        <div className="share-meta">
          {rating !== null && (
            <div className="share-rating">
              <Stars value={Math.round(rating)} />
              <strong>{formatRating(rating)}</strong>
            </div>
          )}
          {occasions.length > 0 && (
            <div className="share-tags">
              {occasions.map((x) => (
                <span key={x}>{x}</span>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="share-brand">
        <img src={logo} alt="" crossOrigin="anonymous" />
        My Wardrobe
      </div>
    </div>
  )
}
