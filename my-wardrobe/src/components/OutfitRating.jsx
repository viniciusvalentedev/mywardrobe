import Stars from './Stars'
import { formatRating } from '../utils/outfits'

// Nota do conjunto (média das peças): estrelas arredondadas e o valor com uma casa.
export default function OutfitRating({ value, small }) {
  const text = formatRating(value)
  return (
    <span className="outfit-rating">
      <span aria-hidden="true">
        <Stars value={Math.round(value)} small={small} />
      </span>
      <strong aria-hidden="true">{text}</strong>
      <span className="visually-hidden">Nota {text} de 5</span>
    </span>
  )
}
