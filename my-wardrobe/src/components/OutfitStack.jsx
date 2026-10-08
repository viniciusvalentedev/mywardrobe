import { orderedPieces } from '../utils/outfits'

// Peças empilhadas de um conjunto ou de um look do calendário.
// `links`: linhas de outfit_items ou outfit_log_items com a peça embutida em `item`.
export default function OutfitStack({ links, small }) {
  return (
    <div className={small ? 'outfit-stack outfit-stack-sm' : 'outfit-stack'}>
      {orderedPieces(links).map((p) => (
        <img
          key={p.slot}
          className={`outfit-piece outfit-piece-${p.slot}`}
          src={p.item.image_url}
          alt={`${p.item.category} ${p.item.color}`}
          loading="lazy"
        />
      ))}
    </div>
  )
}
