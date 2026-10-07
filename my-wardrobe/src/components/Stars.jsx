import { Star } from './icons'

// Nota somente leitura: cheia = preenchida, vazia = só contorno.
export default function Stars({ value, small }) {
  return (
    <span className={small ? 'stars stars-sm' : 'stars'} role="img" aria-label={`Nota ${value} de 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} filled={n <= value} />
      ))}
    </span>
  )
}
